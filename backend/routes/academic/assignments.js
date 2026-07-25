const express = require('express');
const router = express.Router();
const Assignment = require('../../models/academic/Assignment');
const Class = require('../../models/academic/Class');
const PushNotification = require('../../models/communication/PushNotification');
const Coin = require('../../models/academic/Coin');
const { homeworkUpload } = require('../../middleware/upload');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting for assignment creation
const createAssignmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 assignments per 15 minutes
  message: 'Juda ko\'p vazifa yaratdingiz. 15 daqiqadan keyin qayta urinib ko\'ring.'
});

// Rate limiting for grading
const gradingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // max 30 grades per minute
  message: 'Juda tez baholayapsiz. Bir daqiqa kuting.'
});

// Sanitize function to prevent XSS
// Matn (sarlavha, tavsif, javob, izoh) React tomonidan chiqishda avtomatik
// escape qilinadi va hech qayerda dangerouslySetInnerHTML ishlatilmaydi, shuning
// uchun bu yerda HTML-entity kodlash kerak emas. Avval u apostrof/qiyshiq chiziqni
// (' -> &#x27;, / -> &#x2F;) buzib ko'rsatardi. Faqat NUL baytni olib tashlaymiz.
const sanitizeHtml = (text) => {
  if (!text) return text;
  return String(text).replace(/\0/g, '');
};

// Uy vazifa fayl biriktirmasini multer bilan qabul qilamiz (xatolarni toza JSON qaytaramiz)
const acceptHomeworkFile = (req, res, next) => {
  homeworkUpload.single('attachment')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Fayl yuklashda xatolik' });
    }
    next();
  });
};

// Get all assignments for a teacher
router.get('/teacher', auth, authorize('teacher'), async (req, res) => {
  try {
    const { classId, subjectId, status, page = 1, limit = 100 } = req.query;

    const filter = {
      teacher: req.user._id
    };

    if (classId) filter.class = classId;
    if (subjectId) filter.subject = subjectId;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [assignments, total] = await Promise.all([
      Assignment.find(filter)
        .populate('class', 'name')
        .populate('subject', 'name')
        .populate('submissions.student', 'firstName lastName studentId')
        .sort({ dueDate: -1 })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Assignment.countDocuments(filter)
    ]);

    // Har submission uchun coin holatini biriktiramiz (grade modalidagi checkbox uchun)
    const assignmentIds = assignments.map(a => a._id);
    const coins = await Coin.find({ assignment: { $in: assignmentIds } }).select('assignment student').lean();
    const coinSet = new Set(coins.map(c => `${c.assignment}_${c.student}`));
    assignments.forEach(a => {
      (a.submissions || []).forEach(s => {
        s.hasCoin = coinSet.has(`${a._id}_${s.student?._id || s.student}`);
      });
    });

    // Return array directly for backward compatibility
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Ma\'lumotlarni yuklashda xatolik yuz berdi' });
  }
});

// Get all assignments for a student
router.get('/student', auth, authorize('student'), async (req, res) => {
  try {
    // Find student's class
    const studentClass = await Class.findOne({
      students: req.user._id
    }).lean();

    if (!studentClass) {
      return res.json([]);
    }

    const assignments = await Assignment.find({
      class: studentClass._id,
      status: 'active'
    })
      .populate('subject', 'name')
      .populate('teacher', 'firstName lastName')
      .sort({ dueDate: 1 })
      .lean();

    // Add submission status for this student
    const assignmentsWithStatus = assignments.map(assignment => {
      const submission = assignment.submissions.find(
        s => s.student.toString() === req.user._id.toString()
      );

      return {
        ...assignment,
        mySubmission: submission || null
      };
    });

    res.json(assignmentsWithStatus);
  } catch (error) {
    res.status(500).json({ message: 'Ma\'lumotlarni yuklashda xatolik yuz berdi' });
  }
});

// Create new assignment
router.post('/',
  auth,
  authorize('teacher', 'admin', 'supervisor'),
  requirePermission('assignment.create'),
  createAssignmentLimiter,
  [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Sarlavha 3-200 belgi oralig\'ida bo\'lishi kerak'),
    body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Tavsif 10-2000 belgi oralig\'ida bo\'lishi kerak'),
    body('subject').isMongoId().withMessage('Noto\'g\'ri fan ID'),
    body('classId').isMongoId().withMessage('Noto\'g\'ri sinf ID'),
    body('dueDate').isISO8601().withMessage('Noto\'g\'ri sana formati'),
    body('maxScore').optional().isFloat({ min: 0, max: 100, gt: 0 }).withMessage('Maksimal ball 0 dan katta va 100 dan kichik bo\'lishi kerak (masalan: 0.5, 5, 10)')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validatsiya xatosi', errors: errors.array() });
      }

      let { title, description, subject, classId, dueDate, maxScore } = req.body;

      // Sanitize inputs to prevent XSS
      title = sanitizeHtml(title);
      description = sanitizeHtml(description);

      // Get all students in the class
      const classData = await Class.findById(classId).populate('students');

      if (!classData) {
        return res.status(404).json({ message: 'Sinf topilmadi' });
      }

      // Create submission entries for all students
      const submissions = classData.students.map(student => ({
        student: student._id,
        status: 'pending'
      }));

      const assignment = new Assignment({
        title,
        description,
        subject,
        class: classId,
        teacher: req.user._id,
        dueDate,
        maxScore: maxScore || 100,
        submissions
      });

      await assignment.save();

      const populatedAssignment = await Assignment.findById(assignment._id)
        .populate('class', 'name')
        .populate('subject', 'name')
        .populate('submissions.student', 'firstName lastName studentId');

      res.status(201).json(populatedAssignment);
    } catch (error) {
      res.status(500).json({ message: 'Vazifa yaratishda xatolik yuz berdi' });
    }
  }
);

// Student submits assignment
router.post('/:assignmentId/submit',
  auth,
  authorize('student'),
  acceptHomeworkFile,
  [
    param('assignmentId').isMongoId().withMessage('Noto\'g\'ri vazifa ID'),
    body('submissionText').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }).withMessage('Javob 5000 belgidan oshmasligi kerak')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validatsiya xatosi', errors: errors.array() });
      }

      const { assignmentId } = req.params;
      let { submissionText } = req.body;

      // Sanitize submission text
      submissionText = sanitizeHtml((submissionText || '').trim());
      const hasNewFile = !!req.file;

      const assignment = await Assignment.findById(assignmentId);

      if (!assignment) {
        return res.status(404).json({ message: 'Vazifa topilmadi' });
      }

      // Find student's submission
      const submissionIndex = assignment.submissions.findIndex(
        s => s.student.toString() === req.user._id.toString()
      );

      if (submissionIndex === -1) {
        return res.status(404).json({ message: 'Siz bu sinfda emassiz' });
      }

      // Check if already graded (do not allow resubmission for graded assignments)
      if (assignment.submissions[submissionIndex].status === 'graded') {
        return res.status(400).json({ message: 'Bu vazifa allaqachon baholangan. Qayta topshirish mumkin emas.' });
      }

      // Matn yoki fayl — kamida bittasi bo'lishi shart
      const existingAttachment = assignment.submissions[submissionIndex].attachmentUrl;
      if (!hasNewFile && !existingAttachment && (submissionText || '').length < 10) {
        return res.status(400).json({ message: 'Javob matni kamida 10 belgidan iborat bo\'lishi yoki fayl biriktirilishi kerak' });
      }

      // Allow resubmission for submitted but not graded assignments
      // Update submission (allow late submissions and resubmissions for non-graded work)
      const submittedAt = new Date();
      assignment.submissions[submissionIndex].submissionText = submissionText || undefined;
      assignment.submissions[submissionIndex].status = 'submitted';
      assignment.submissions[submissionIndex].submittedAt = submittedAt;
      assignment.submissions[submissionIndex].isLate = submittedAt > assignment.dueDate;
      if (hasNewFile) {
        assignment.submissions[submissionIndex].attachmentUrl = `/uploads/homework/${req.file.filename}`;
        assignment.submissions[submissionIndex].attachmentName = req.file.originalname;
      }

      await assignment.save();

      const updatedAssignment = await Assignment.findById(assignmentId)
        .populate('subject', 'name')
        .populate('teacher', 'firstName lastName');

      // Send response with warning if late
      const response = { assignment: updatedAssignment };
      if (new Date() > assignment.dueDate) {
        response.warning = 'Vazifa muddatidan keyin topshirildi';
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: 'Vazifa topshirishda xatolik yuz berdi' });
    }
  }
);

// Teacher grades a submission
router.post('/:assignmentId/grade',
  auth,
  authorize('teacher'),
  requirePermission('assignment.grade'),
  gradingLimiter,
  [
    param('assignmentId').isMongoId().withMessage('Noto\'g\'ri vazifa ID'),
    body('studentId').isMongoId().withMessage('Noto\'g\'ri o\'quvchi ID'),
    body('grade').isFloat({ min: 0, max: 100 }).withMessage('Ball 0-100 oralig\'ida bo\'lishi kerak'),
    body('feedback').optional().trim().isLength({ max: 1000 }).withMessage('Izoh 1000 belgidan oshmasligi kerak')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validatsiya xatosi', errors: errors.array() });
      }

      const { assignmentId } = req.params;
      const { studentId, grade, awardCoin } = req.body;
      let { feedback } = req.body;

      // Sanitize feedback
      feedback = sanitizeHtml(feedback);

      const assignment = await Assignment.findById(assignmentId);

      if (!assignment) {
        return res.status(404).json({ message: 'Vazifa topilmadi' });
      }

      // Check if teacher owns this assignment
      if (assignment.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }

      // Validate grade against assignment's maxScore
      if (grade > assignment.maxScore) {
        return res.status(400).json({
          message: `Ball ${assignment.maxScore} dan oshmasligi kerak`
        });
      }

      // Additional validation: grade must be a valid number
      if (isNaN(grade)) {
        return res.status(400).json({
          message: 'Ball raqam bo\'lishi kerak'
        });
      }

      // Find submission
      const submissionIndex = assignment.submissions.findIndex(
        s => s.student.toString() === studentId
      );

      if (submissionIndex === -1) {
        return res.status(404).json({ message: 'Topshiriq topilmadi' });
      }

      // Update grade and feedback
      assignment.submissions[submissionIndex].grade = grade;
      assignment.submissions[submissionIndex].feedback = feedback || '';
      assignment.submissions[submissionIndex].status = 'graded';
      assignment.submissions[submissionIndex].gradedAt = new Date();

      await assignment.save();

      // O'quvchiga "vazifangiz baholandi" inbox bildirishnomasini yuboramiz
      // (xatolik bo'lsa ham baholash saqlanib qoladi)
      try {
        await PushNotification.create({
          title: 'Uy vazifangiz baholandi',
          message: `"${assignment.title}" vazifasi uchun ${grade}/${assignment.maxScore} ball qo'yildi.`,
          icon: '📝',
          category: 'info',
          link: '/student/homework',
          sender: req.user._id,
          targetFilter: { mode: 'users', userIds: [studentId], summary: "1 o'quvchi" },
          recipients: [studentId]
        });
      } catch (notifyErr) {
        // bildirishnoma yuborilmadi — baholash baribir muvaffaqiyatli
      }

      // Coin: a'lo bajarilgan uy vazifa uchun (1 vazifaga maksimum 1 coin).
      // O'qituvchi checkboxiga qarab beriladi yoki olib tashlanadi.
      try {
        if (awardCoin === true) {
          const nowD = new Date();
          await Coin.updateOne(
            { assignment: assignment._id, student: studentId },
            {
              $setOnInsert: {
                assignment: assignment._id,
                student: studentId,
                subject: assignment.subject,
                teacher: assignment.teacher,
                class: assignment.class,
                amount: 1,
                reason: 'homework_excellent',
                month: nowD.getMonth() + 1,
                year: nowD.getFullYear(),
                date: nowD
              }
            },
            { upsert: true }
          );
        } else if (awardCoin === false) {
          await Coin.deleteOne({ assignment: assignment._id, student: studentId });
        }
      } catch (coinErr) {
        // coin amali xato bo'lsa, baholash baribir saqlanib qoladi
      }

      const updatedAssignment = await Assignment.findById(assignmentId)
        .populate('class', 'name')
        .populate('subject', 'name')
        .populate('submissions.student', 'firstName lastName studentId');

      res.json(updatedAssignment);
    } catch (error) {
      res.status(500).json({ message: 'Baholashda xatolik yuz berdi' });
    }
  }
);

// Get single assignment by ID
router.get('/:id',
  auth,
  [param('id').isMongoId().withMessage('Noto\'g\'ri vazifa ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validatsiya xatosi', errors: errors.array() });
      }

      const assignment = await Assignment.findById(req.params.id)
        .populate('class', 'name')
        .populate('subject', 'name')
        .populate('teacher', 'firstName lastName')
        .populate('submissions.student', 'firstName lastName studentId');

      if (!assignment) {
        return res.status(404).json({ message: 'Vazifa topilmadi' });
      }

      // Check authorization
      const isTeacher = req.user.role === 'teacher' &&
        assignment.teacher._id.toString() === req.user._id.toString();
      const isStudent = req.user.role === 'student' &&
        assignment.submissions.some(s => s.student._id.toString() === req.user._id.toString());

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: 'Vazifani yuklashda xatolik yuz berdi' });
    }
  }
);

// Update assignment
router.put('/:id',
  auth,
  authorize('teacher'),
  [
    param('id').isMongoId().withMessage('Noto\'g\'ri vazifa ID'),
    body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Sarlavha 3-200 belgi oralig\'ida bo\'lishi kerak'),
    body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Tavsif 10-2000 belgi oralig\'ida bo\'lishi kerak'),
    body('dueDate').optional().isISO8601().withMessage('Noto\'g\'ri sana formati'),
    body('maxScore').optional().isFloat({ min: 0, max: 100, gt: 0 }).withMessage('Maksimal ball 0 dan katta va 100 dan kichik bo\'lishi kerak (masalan: 0.5, 5, 10)'),
    body('status').optional().isIn(['active', 'closed']).withMessage('Status faqat active yoki closed bo\'lishi kerak')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validatsiya xatosi', errors: errors.array() });
      }

      let { title, description, dueDate, maxScore, status } = req.body;

      // Sanitize inputs
      if (title) title = sanitizeHtml(title);
      if (description) description = sanitizeHtml(description);

      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({ message: 'Vazifa topilmadi' });
      }

      // Check if teacher owns this assignment
      if (assignment.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }

      if (title) assignment.title = title;
      if (description) assignment.description = description;
      if (dueDate) assignment.dueDate = dueDate;
      if (maxScore) assignment.maxScore = maxScore;
      if (status) assignment.status = status;

      await assignment.save();

      const updatedAssignment = await Assignment.findById(assignment._id)
        .populate('class', 'name')
        .populate('subject', 'name')
        .populate('submissions.student', 'firstName lastName studentId');

      res.json(updatedAssignment);
    } catch (error) {
      res.status(500).json({ message: 'Vazifani yangilashda xatolik yuz berdi' });
    }
  }
);

// Delete assignment
router.delete('/:id',
  auth,
  authorize('teacher'),
  [param('id').isMongoId().withMessage('Noto\'g\'ri vazifa ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validatsiya xatosi', errors: errors.array() });
      }

      const assignment = await Assignment.findById(req.params.id);

      if (!assignment) {
        return res.status(404).json({ message: 'Vazifa topilmadi' });
      }

      // Check if teacher owns this assignment
      if (assignment.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }

      await Assignment.findByIdAndDelete(req.params.id);
      // Shu vazifaga bog'langan coinlarni ham olib tashlaymiz
      await Coin.deleteMany({ assignment: req.params.id });

      res.json({ message: 'Vazifa o\'chirildi' });
    } catch (error) {
      res.status(500).json({ message: 'Vazifani o\'chirishda xatolik yuz berdi' });
    }
  }
);

module.exports = router;
