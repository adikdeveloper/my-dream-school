const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../../models/academic/Attendance');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');
const User = require('../../models/users/User');
const Class = require('../../models/academic/Class');
const { resolveTeacherLessonAccess, getTeacherJournalScope } = require('../../services/teacherAccessResolver');
// Maosh faqat baho qo'yilganda hisoblanadi (grades.js da)

const router = express.Router();

async function validateAttendanceAccess(req, record) {
  const student = await User.findOne({ _id: record.student, role: 'student', isActive: true }).select('registrationDate classId').lean();
  if (!student) throw new Error("O'quvchi topilmadi yoki faol emas");
  const belongsToClass = String(student.classId || '') === String(record.class) || await Class.exists({ _id: record.class, students: student._id });
  if (!belongsToClass) throw new Error("O'quvchi ushbu sinfga biriktirilmagan");
  const lessonDate = new Date(record.date); lessonDate.setHours(0, 0, 0, 0);
  if (Number.isNaN(lessonDate.getTime())) throw new Error("Noto'g'ri sana");
  if (student.registrationDate) {
    const registrationDate = new Date(student.registrationDate); registrationDate.setHours(0, 0, 0, 0);
    if (lessonDate < registrationDate) throw new Error("O'quvchi kelgan sanadan oldin davomat qo'yib bo'lmaydi");
  }
  if (req.user.role === 'teacher') {
    const access = await resolveTeacherLessonAccess({ teacherId: req.user._id, classId: record.class, subjectId: record.subject, date: record.date });
    if (!access.allowed) throw new Error("Bu sana uchun ushbu sinf/fanga davomat qo'yish huquqi yo'q");
  }
}

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { studentId, classId, date, startDate, endDate } = req.query;
    let query = {};

    if (req.user.role === 'student') {
      query.student = req.user._id;
    } else if (studentId) {
      query.student = studentId;
    }

    if (classId) query.class = classId;

    if (req.user.role === 'teacher') {
      const subjectId = req.query.subjectId;
      if (!classId || !subjectId || !startDate || !endDate) return res.status(400).json({ message: "O'qituvchi uchun sinf, fan va sana oralig'i majburiy" });
      const scope = await getTeacherJournalScope(req.user._id, { classId, startDate, endDate });
      const allowed = scope.some(item => String(item._id) === String(classId) && item.subjects.some(subject => String(subject._id) === String(subjectId)));
      if (!allowed) return res.status(403).json({ message: "Bu jurnalni ko'rish huquqingiz yo'q" });
      query.subject = subjectId;
    }

    if (date) {
      query.date = new Date(date);
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'firstName lastName studentId')
      .populate('class', 'name grade section')
      .populate('subject', 'name code')
      .populate('teacher', 'firstName lastName')
      .sort({ date: -1, period: 1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/attendance/class/:classId
// @desc    Get attendance for a specific class and date
// @access  Private/Teacher/Admin
router.get('/class/:classId', auth, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Sana parametri kerak' });
    }

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);

    const attendance = await Attendance.find({
      class: classId,
      date: { $gte: dateOnly, $lt: nextDay }
    })
      .populate('student', 'firstName lastName studentId')
      .sort({ 'student.firstName': 1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/attendance/class/:classId/monthly
// @desc    Get monthly attendance for a specific class
// @access  Private/Teacher/Admin
router.get('/class/:classId/monthly', auth, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Boshlanish va tugash sanalari kerak' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      class: classId,
      date: { $gte: start, $lte: end }
    })
      .populate('student', 'firstName lastName studentId')
      .sort({ date: 1, 'student.firstName': 1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/attendance/bulk
// @desc    Create or update multiple attendance records
// @access  Private/Teacher/Admin
router.post('/bulk', auth, authorize('teacher', 'admin', 'supervisor'), requirePermission('attendance.create'), async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Davomat rekordlari massivi kerak' });
    }

    const savedRecords = [];
    const errors = [];

    for (const record of records) {
      try {
        await validateAttendanceAccess(req, record);
        const dateOnly = new Date(record.date);
        dateOnly.setHours(0, 0, 0, 0);
        const nextDay = new Date(dateOnly);
        nextDay.setDate(nextDay.getDate() + 1);

        // Extract month and calculate academicMonth
        const month = dateOnly.getMonth() + 1; // 1-12

        // Validate month (Iyul va Avgust o'quv yilida yo'q)
        // Sentyabr-Dekabr: 9,10,11,12 -> 1,2,3,4
        // Yanvar-Iyun: 1,2,3,4,5,6 -> 5,6,7,8,9,10
        const academicMonth = (month === 7 || month === 8) ? null : (month >= 9 ? month - 8 : month + 4);

        // Check if attendance already exists for this student on this date/period
        const existingAttendance = await Attendance.findOne({
          student: record.student,
          class: record.class,
          subject: record.subject,
          date: { $gte: dateOnly, $lt: nextDay },
          period: record.period
        });

        const attendanceData = {
          student: record.student,
          class: record.class,
          subject: record.subject,
          date: dateOnly,
          status: record.status,
          period: record.period,
          month: month,
          academicMonth: academicMonth,
          teacher: req.user._id,
          notes: record.notes || ''
        };

        if (existingAttendance) {
          // Update existing attendance
          const updated = await Attendance.findByIdAndUpdate(
            existingAttendance._id,
            attendanceData,
            { new: true }
          );
          savedRecords.push(updated);
        } else {
          // Create new attendance
          const newAttendance = new Attendance(attendanceData);
          await newAttendance.save();
          savedRecords.push(newAttendance);
        }
      } catch (err) {
        errors.push({
          student: record.student,
          date: record.date,
          period: record.period,
          error: err.message
        });
      }
    }

    // Maosh faqat baho qo'yilganda hisoblanadi (grades routes da)
    // Davomatni belgilash maoshga ta'sir qilmaydi

    res.status(201).json({
      message: 'Davomat muvaffaqiyatli saqlandi',
      savedCount: savedRecords.length,
      errorCount: errors.length,
      records: savedRecords,
      errors: errors
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/attendance
// @desc    Create or update attendance record (upsert)
// @access  Private/Teacher
router.post('/', auth, authorize('teacher', 'admin', 'supervisor'), requirePermission('attendance.create'), [
  body('student').isMongoId(),
  body('class').isMongoId(),
  body('subject').isMongoId(),
  body('date').isISO8601(),
  body('status').isIn(['present', 'absent', 'late', 'excused', 'keldi', 'kelmadi', 'sababli']),
  body('period').isInt({ min: 1, max: 10 }),
  body('notes').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await validateAttendanceAccess(req, req.body);
    } catch (accessError) {
      return res.status(403).json({ message: accessError.message });
    }

    const attendanceData = {
      ...req.body,
      teacher: req.user._id
    };

    // Upsert: Update if exists, create if not
    // Check for existing attendance on the same date (ignoring time)
    const dateOnly = new Date(attendanceData.date);
    dateOnly.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      student: attendanceData.student,
      class: attendanceData.class,
      subject: attendanceData.subject,
      date: { $gte: dateOnly, $lt: nextDay },
      period: attendanceData.period
    });

    let savedAttendance;
    if (existingAttendance) {
      // Update existing attendance
      savedAttendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        attendanceData,
        { new: true }
      );
    } else {
      // Create new attendance
      const attendance = new Attendance(attendanceData);
      savedAttendance = await attendance.save();
    }

    const populatedAttendance = await Attendance.findById(savedAttendance._id)
      .populate('student', 'firstName lastName studentId')
      .populate('class', 'name grade section')
      .populate('subject', 'name code')
      .populate('teacher', 'firstName lastName');

    // Maosh faqat baho qo'yilganda hisoblanadi (grades routes da)

    res.status(existingAttendance ? 200 : 201).json(populatedAttendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
