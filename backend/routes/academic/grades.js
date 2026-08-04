const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const Grade = require('../../models/academic/Grade');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');
const scheduleValidator = require('../../utils/scheduleValidator');
const salaryController = require('../../controllers/salaryController');

const router = express.Router();

// Sanitize and validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id);
};

// @route   GET /api/grades
// @desc    Get grades with query validation
// @access  Private
router.get('/',
  auth,
  [
    query('studentId').optional().custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Noto\'g\'ri student ID');
      }
      return true;
    }),
    query('subjectId').optional().custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Noto\'g\'ri subject ID');
      }
      return true;
    }),
    query('classId').optional().custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error('Noto\'g\'ri class ID');
      }
      return true;
    }),
    query('startDate').optional().isISO8601().withMessage('Noto\'g\'ri boshlanish sanasi'),
    query('endDate').optional().isISO8601().withMessage('Noto\'g\'ri tugash sanasi'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page 1 dan katta bo\'lishi kerak'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit 1 dan 1000 gacha bo\'lishi kerak')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { studentId, subjectId, classId, startDate, endDate, page = 1, limit = 50 } = req.query;
      let query = {};

      // Security: Students can only see their own grades
      if (req.user.role === 'student') {
        query.student = req.user._id;
      } else if (studentId) {
        query.student = studentId;
      }

      if (subjectId) query.subject = subjectId;
      if (classId) query.class = classId;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get total count for pagination
      const totalCount = await Grade.countDocuments(query);

      // Fetch grades with pagination
      const grades = await Grade.find(query)
        .populate('student', 'firstName lastName studentId')
        .populate('subject', 'name code')
        .populate('teacher', 'firstName lastName')
        .populate('class', 'name grade section')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(); // Use lean() for better performance

      // Return paginated response
      res.json({
        grades,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// @route   POST /api/grades
// @desc    Create or update grade (upsert)
// @access  Private/Teacher
router.post('/', auth, authorize('teacher', 'admin', 'supervisor'), requirePermission('grade.create'), [
  body('student').isMongoId(),
  body('subject').isMongoId(),
  body('class').isMongoId(),
  body('type').isIn(['quiz', 'assignment', 'midterm', 'final', 'project', 'participation', 'daily', 'exam']),
  body('score').isFloat({ min: 0, max: 5 }),
  body('date').isISO8601(),
  body('description').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if student is active
    const User = require('../../models/users/User');
    const student = await User.findById(req.body.student);
    if (!student) {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }
    if (!student.isActive) {
      return res.status(403).json({ message: 'Nofaol o\'quvchiga baho qo\'yib bo\'lmaydi' });
    }

    // O'quvchi maktabga kelgan kundan boshlab baholanishi mumkin.
    if (student.registrationDate) {
      const gradeDate = new Date(req.body.date);
      const registrationDate = new Date(student.registrationDate);
      gradeDate.setHours(0, 0, 0, 0);
      registrationDate.setHours(0, 0, 0, 0);

      if (gradeDate < registrationDate) {
        return res.status(400).json({
          message: `O'quvchiga maktabga kelgan sanasidan (${registrationDate.toISOString().split('T')[0]}) oldingi dars uchun baho qo'yib bo'lmaydi`
        });
      }
    }

    // Validate grade date against schedule
    const validation = await scheduleValidator.validateGradeDate(req.body.class, req.body.date);

    // Allow admins to bypass validation with warning, but teachers must follow schedule
    if (!validation.valid) {
      if (req.user.role === 'teacher') {
        return res.status(400).json({
          message: `Baho qo'yish mumkin emas: ${validation.message}`,
          scheduleStatus: validation.schedule ? validation.schedule.getStatus() : null
        });
      }
      // Admin gets a warning but can proceed
      console.warn(`Admin ${req.user._id} creating grade outside schedule validity: ${validation.message}`);
    }

    // Egalik tekshiruvi: o'qituvchi faqat o'zi dars beradigan yoki almashtirish
    // (o'rnini bosish) orqali ruxsat olgan sinf+fanga baho qo'ya oladi.
    // admin/supervisor/director cheklanmaydi.
    if (req.user.role === 'teacher') {
      const Class = require('../../models/academic/Class');
      const cls = await Class.findById(req.body.class).select('subjects').lean();
      let allowed = !!(cls && (cls.subjects || []).some(s =>
        s.subject && s.subject.toString() === String(req.body.subject) &&
        s.teacher && s.teacher.toString() === req.user._id.toString()
      ));
      if (!allowed) {
        const LessonSubstitution = require('../../models/scheduling/LessonSubstitution');
        const d = new Date(req.body.date); d.setHours(0, 0, 0, 0);
        const nd = new Date(d); nd.setDate(nd.getDate() + 1);
        const sub = await LessonSubstitution.findOne({
          substituteTeacher: req.user._id,
          classId: req.body.class,
          subject: req.body.subject,
          date: { $gte: d, $lt: nd },
          status: { $ne: 'rejected' }
        });
        allowed = !!sub;
      }
      if (!allowed) {
        return res.status(403).json({ message: "Bu sinf/fanga baho qo'yish uchun ruxsatingiz yo'q" });
      }
    }

    const gradeData = {
      ...req.body,
      teacher: req.user._id,
      schedule: validation.schedule ? validation.schedule._id : null
    };

    // Upsert: Update if exists, create if not
    // Check for existing grade on the same date (ignoring time)
    const dateOnly = new Date(gradeData.date);
    dateOnly.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingGrade = await Grade.findOne({
      student: gradeData.student,
      subject: gradeData.subject,
      class: gradeData.class,
      date: { $gte: dateOnly, $lt: nextDay }
    });

    let savedGrade;
    if (existingGrade) {
      // Update existing grade
      savedGrade = await Grade.findByIdAndUpdate(
        existingGrade._id,
        gradeData,
        { new: true }
      );
    } else {
      // Create new grade
      const grade = new Grade(gradeData);
      savedGrade = await grade.save();
    }

    const populatedGrade = await Grade.findById(savedGrade._id)
      .populate('student', 'firstName lastName studentId')
      .populate('subject', 'name code')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name grade section');

    // Maoshni hisoblash - faqat yangi baho va kundalik baholar uchun
    if (!existingGrade && req.body.type !== 'exam') {
      try {
        await salaryController.recordLessonTaught(req.user._id, {
          date: req.body.date,
          classId: req.body.class,
          subjectId: req.body.subject,
          description: `Baho qo'yildi`
        });
      } catch (salaryError) {
        // Baho saqlash muvaffaqiyatli bo'lsa ham davom etamiz
      }
    }

    res.status(existingGrade ? 200 : 201).json(populatedGrade);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/grades/class-statistics
// @desc    Get grade statistics by class (current schedule only)
// @access  Private/Admin
router.get('/class-statistics', auth, authorize('admin'), async (req, res) => {
  try {
    const Class = require('../../models/academic/Class');
    const Schedule = require('../../models/scheduling/Schedule');

    // Get all active classes
    const allClasses = await Class.find({ isActive: true });

    // OPTIMIZED: Get all current schedules in ONE query instead of N queries
    const now = new Date();
    const allSchedules = await Schedule.find({
      classId: { $in: allClasses.map(c => c._id) },
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    // Create a map for O(1) lookup
    const scheduleMap = new Map();
    allSchedules.forEach(schedule => {
      scheduleMap.set(schedule.classId.toString(), schedule);
    });

    // Build match conditions for current schedules
    const scheduleConditions = [];
    for (const cls of allClasses) {
      const currentSchedule = scheduleMap.get(cls._id.toString());
      if (currentSchedule) {
        scheduleConditions.push({
          class: cls._id,
          date: {
            $gte: currentSchedule.startDate,
            $lte: currentSchedule.endDate
          }
        });
      }
    }

    // If no active schedules, return empty stats
    if (scheduleConditions.length === 0) {
      return res.json([]);
    }

    // Use aggregation to avoid N+1 query problem
    const classStatistics = await Grade.aggregate([
      {
        $match: {
          $or: scheduleConditions
        }
      },
      {
        $group: {
          _id: '$class',
          averageScore: { $avg: '$score' },
          maxScore: { $max: '$score' },
          minScore: { $min: '$score' },
          totalGrades: { $sum: 1 },
          students: { $addToSet: '$student' }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $unwind: {
          path: '$classInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          classId: '$_id',
          className: {
            $concat: [
              { $toString: '$classInfo.grade' },
              '-',
              '$classInfo.section',
              ' sinf'
            ]
          },
          studentCount: { $size: '$students' },
          averageScore: { $round: ['$averageScore', 2] },
          maxScore: 1,
          minScore: 1,
          totalGrades: 1
        }
      },
      {
        $sort: { averageScore: -1 }
      }
    ]);

    // Get all classes that have no grades in current schedule period
    const classesWithGrades = classStatistics.map(stat => stat.classId.toString());

    const classesWithoutGrades = allClasses
      .filter(cls => !classesWithGrades.includes(cls._id.toString()))
      .map(cls => ({
        className: `${cls.grade}-${cls.section} sinf`,
        classId: cls._id,
        studentCount: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        totalGrades: 0
      }));

    const result = [...classStatistics, ...classesWithoutGrades];
    result.sort((a, b) => b.averageScore - a.averageScore);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: 'Sinf statistikasini yuklashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/grades/class/:classId/students
// @desc    Get detailed grades for all students in a class with year and month filters
// @access  Private/Admin
router.get('/class/:classId/students', auth, authorize('admin'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { year, month } = req.query;

    // Validate classId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Noto\'g\'ri sinf ID' });
    }

    // Build date filter
    let dateFilter = {};
    if (year && month) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      // Validate year and month
      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: 'Noto\'g\'ri yil yoki oy' });
      }

      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    } else if (year) {
      const yearNum = parseInt(year);

      if (isNaN(yearNum)) {
        return res.status(400).json({ message: 'Noto\'g\'ri yil' });
      }

      const startDate = new Date(yearNum, 0, 1);
      const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    }

    // Use aggregation for better performance
    const studentStatistics = await Grade.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$student',
          averageScore: { $avg: '$score' },
          maxScore: { $max: '$score' },
          minScore: { $min: '$score' },
          totalGrades: { $sum: 1 },
          grades: {
            $push: {
              score: '$score',
              subject: '$subject',
              date: '$date',
              type: '$type'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $unwind: '$studentInfo'
      },
      {
        $lookup: {
          from: 'subjects',
          localField: 'grades.subject',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      {
        $project: {
          studentId: '$studentInfo.studentId',
          firstName: '$studentInfo.firstName',
          lastName: '$studentInfo.lastName',
          averageScore: { $round: ['$averageScore', 2] },
          maxScore: 1,
          minScore: 1,
          totalGrades: 1,
          grades: {
            $map: {
              input: '$grades',
              as: 'grade',
              in: {
                score: '$$grade.score',
                date: '$$grade.date',
                type: '$$grade.type',
                subject: {
                  $let: {
                    vars: {
                      subjectData: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$subjectInfo',
                              as: 'sub',
                              cond: { $eq: ['$$sub._id', '$$grade.subject'] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: { $ifNull: ['$$subjectData.name', 'Unknown'] }
                  }
                }
              }
            }
          }
        }
      },
      {
        $sort: { averageScore: -1 }
      }
    ]);

    res.json(studentStatistics);
  } catch (error) {
    res.status(500).json({
      message: 'O\'quvchilar ballarini yuklashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/grades/journal/:classId/:subjectId
// @desc    Get journal data (all grades and attendance for a class/subject/month)
// @access  Private/Admin
router.get('/journal/:classId/:subjectId', auth, authorize('admin'), [
  query('startDate').isISO8601().withMessage('Noto\'g\'ri boshlanish sanasi'),
  query('endDate').isISO8601().withMessage('Noto\'g\'ri tugash sanasi'),
  query('scheduleId').optional().custom((value) => {
    if (!isValidObjectId(value)) {
      throw new Error('Noto\'g\'ri jadval ID');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { classId, subjectId } = req.params;
    const { startDate, endDate, scheduleId } = req.query;

    // Validate IDs
    if (!isValidObjectId(classId) || !isValidObjectId(subjectId)) {
      return res.status(400).json({ message: 'Noto\'g\'ri ID' });
    }

    const Class = require('../../models/academic/Class');
    const Attendance = require('../../models/academic/Attendance');
    const Schedule = require('../../models/scheduling/Schedule');

    // Get class with students
    const classData = await Class.findById(classId)
      .populate('students', 'firstName lastName studentId')
      .lean();

    if (!classData) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    // Get all schedules that overlap with this date range
    // This is critical for handling multiple schedule versions in one month
    const schedules = await Schedule.find({
      classId: classId,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ],
      isActive: true
    }).sort({ startDate: 1 });

    // If a specific schedule is requested, filter to only that one
    let relevantSchedules = schedules;
    if (scheduleId) {
      relevantSchedules = schedules.filter(s => s._id.toString() === scheduleId.toString());
    }

    // Get all grades for the period
    const grades = await Grade.find({
      class: classId,
      subject: subjectId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
      .populate('student', 'firstName lastName studentId')
      .sort({ date: 1, periodNumber: 1 })
      .lean();

    // Get all attendance for the period
    const attendance = await Attendance.find({
      class: classId,
      subject: subjectId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
      .populate('student', 'firstName lastName studentId')
      .sort({ date: 1, period: 1 })
      .lean();

    // Organize data by student and date
    const studentData = {};

    classData.students.forEach(student => {
      studentData[student._id.toString()] = {
        studentId: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentCode: student.studentId,
        grades: {},
        attendance: {},
        totalDailyScore: 0,
        examScore: 0,
        examMaxScore: 0,
        averageScore: 0,
        lessonCount: 0,
        attendedCount: 0
      };
    });

    // Organize grades by student and date
    grades.forEach(grade => {
      const studentId = grade.student._id.toString();
      if (studentData[studentId]) {
        const dateKey = new Date(grade.date).toISOString().split('T')[0];
        const periodKey = `${dateKey}_${grade.periodNumber || 1}`;

        if (!studentData[studentId].grades[dateKey]) {
          studentData[studentId].grades[dateKey] = {};
        }

        studentData[studentId].grades[dateKey][grade.periodNumber || 1] = {
          _id: grade._id,
          score: grade.score,
          type: grade.type,
          isExam: grade.isExam,
          examMaxScore: grade.examMaxScore,
          periodNumber: grade.periodNumber
        };

        // Calculate totals
        if (grade.isExam) {
          studentData[studentId].examScore += grade.score;
          studentData[studentId].examMaxScore = grade.examMaxScore || 0;
        } else {
          studentData[studentId].totalDailyScore += grade.score;
          studentData[studentId].lessonCount += 1;
        }
      }
    });

    // Organize attendance by student and date
    attendance.forEach(att => {
      const studentId = att.student._id.toString();
      if (studentData[studentId]) {
        const dateKey = new Date(att.date).toISOString().split('T')[0];

        if (!studentData[studentId].attendance[dateKey]) {
          studentData[studentId].attendance[dateKey] = {};
        }

        studentData[studentId].attendance[dateKey][att.period] = {
          _id: att._id,
          status: att.status,
          period: att.period
        };

        // Count attendance
        if (['present', 'keldi'].includes(att.status)) {
          studentData[studentId].attendedCount += 1;
        }
      }
    });

    // Calculate lesson days information first (need this for attendance rate)
    // NOW SUPPORTS MULTIPLE SCHEDULE VERSIONS IN ONE MONTH
    const lessonDays = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalLessonPeriods = 0;

    // Track schedule versions for metadata
    const scheduleVersions = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });

      // Find which schedule applies to this date
      const applicableSchedule = relevantSchedules.find(s => {
        const schedStart = new Date(s.startDate);
        const schedEnd = new Date(s.endDate);
        return d >= schedStart && d <= schedEnd;
      });

      if (!applicableSchedule) {
        lessonDays[dateKey] = {
          hasLesson: false,
          periods: [],
          isHoliday: false,
          reason: 'Jadval topilmadi',
          scheduleId: null,
          scheduleVersion: null
        };
        continue;
      }

      // Track schedule version for metadata
      if (!scheduleVersions.find(sv => sv._id.toString() === applicableSchedule._id.toString())) {
        scheduleVersions.push({
          _id: applicableSchedule._id,
          name: applicableSchedule.name || 'Jadval',
          startDate: applicableSchedule.startDate,
          endDate: applicableSchedule.endDate,
          status: applicableSchedule.getStatus()
        });
      }

      // Check if holiday
      const isHolidayDay = applicableSchedule.isHoliday(d);
      const holidayInfo = applicableSchedule.getHolidayInfo(d);

      if (isHolidayDay) {
        lessonDays[dateKey] = {
          hasLesson: false,
          periods: [],
          isHoliday: true,
          reason: holidayInfo ? holidayInfo.name : 'Bayram kuni',
          scheduleId: applicableSchedule._id,
          scheduleVersion: applicableSchedule.name || 'Jadval'
        };
        continue;
      }

      const daySchedule = applicableSchedule.schedule.find(s => s.day === dayOfWeek);

      if (!daySchedule) {
        lessonDays[dateKey] = {
          hasLesson: false,
          periods: [],
          isHoliday: false,
          reason: `${dayOfWeek} kuni dars yo'q`,
          scheduleId: applicableSchedule._id,
          scheduleVersion: applicableSchedule.name || 'Jadval'
        };
        continue;
      }

      // Check if subject has lessons on this day
      const subjectPeriods = [];
      daySchedule.periods.forEach((period, index) => {
        if (period.subject && period.subject.toString() === subjectId.toString()) {
          subjectPeriods.push(index + 1); // Period numbers are 1-based
        }
      });

      if (subjectPeriods.length === 0) {
        lessonDays[dateKey] = {
          hasLesson: false,
          periods: [],
          isHoliday: false,
          reason: 'Bu fandan dars yo\'q',
          scheduleId: applicableSchedule._id,
          scheduleVersion: applicableSchedule.name || 'Jadval'
        };
      } else {
        lessonDays[dateKey] = {
          hasLesson: true,
          periods: subjectPeriods,
          isHoliday: false,
          reason: null,
          scheduleId: applicableSchedule._id,
          scheduleVersion: applicableSchedule.name || 'Jadval'
        };
        totalLessonPeriods += subjectPeriods.length;
      }
    }

    // Calculate averages
    Object.values(studentData).forEach(student => {
      if (student.lessonCount > 0) {
        student.averageScore = student.totalDailyScore / student.lessonCount;
      }
      student.totalScore = student.totalDailyScore + student.examScore;

      // Use total lesson periods from schedule instead of graded lessons
      if (totalLessonPeriods > 0) {
        student.attendanceRate = (student.attendedCount / totalLessonPeriods) * 100;
      } else {
        student.attendanceRate = 0;
      }

      // Update lessonCount to reflect actual lesson periods (for display)
      student.lessonCount = totalLessonPeriods;
    });

    res.json({
      class: {
        _id: classData._id,
        name: classData.name,
        grade: classData.grade,
        section: classData.section
      },
      // Now returns ALL schedule versions that apply to this date range
      scheduleVersions: scheduleVersions,
      // Backward compatibility: return first schedule as "schedule"
      schedule: scheduleVersions.length > 0 ? {
        _id: scheduleVersions[0]._id,
        name: scheduleVersions[0].name,
        startDate: scheduleVersions[0].startDate,
        endDate: scheduleVersions[0].endDate,
        status: scheduleVersions[0].status
      } : null,
      students: Object.values(studentData),
      lessonDays: lessonDays, // Now includes scheduleId and scheduleVersion for each day
      startDate,
      endDate,
      // Additional metadata
      totalScheduleVersions: scheduleVersions.length,
      hasMultipleVersions: scheduleVersions.length > 1
    });
  } catch (error) {
    res.status(500).json({
      message: 'Jurnal ma\'lumotlarini yuklashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/grades/journal-bulk
// @desc    Save multiple grades and attendance at once (bulk save for journal)
// @access  Private/Admin
router.post('/journal-bulk', auth, authorize('admin'), [
  body('classId').isMongoId().withMessage('Noto\'g\'ri sinf ID'),
  body('subjectId').isMongoId().withMessage('Noto\'g\'ri fan ID'),
  body('scheduleId').optional().isMongoId().withMessage('Noto\'g\'ri jadval ID'),
  body('grades').isArray().withMessage('Ballar array bo\'lishi kerak'),
  body('grades.*.student').isMongoId().withMessage('Noto\'g\'ri o\'quvchi ID'),
  body('grades.*.date').isISO8601().withMessage('Noto\'g\'ri sana'),
  body('grades.*.score').isFloat({ min: 0, max: 5 }).withMessage('Ball 0 dan 5 gacha bo\'lishi kerak'),
  body('grades.*.periodNumber').isInt({ min: 1, max: 10 }).withMessage('Dars raqami 1-10 oralig\'ida bo\'lishi kerak'),
  body('grades.*.isExam').optional().isBoolean(),
  body('grades.*.examMaxScore').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { classId, subjectId, scheduleId, grades } = req.body;
    const savedGrades = [];
    const errors_list = [];

    // Additional validation: check score limits based on isExam flag
    for (const gradeData of grades) {
      if (gradeData.isExam) {
        // Exam grade validation
        if (gradeData.examMaxScore && gradeData.score > gradeData.examMaxScore) {
          return res.status(400).json({
            message: `Imtihon bali ${gradeData.examMaxScore} balldan oshmasligi kerak`,
            studentId: gradeData.student
          });
        }
      } else {
        // Daily grade validation - max 5 points
        if (gradeData.score > 5) {
          return res.status(400).json({
            message: 'Kundalik darsga maksimal 5 ball qo\'yish mumkin',
            score: gradeData.score,
            studentId: gradeData.student
          });
        }
      }
    }

    // Process each grade
    for (const gradeData of grades) {
      try {
        const dateOnly = new Date(gradeData.date);
        dateOnly.setHours(0, 0, 0, 0);
        const nextDay = new Date(dateOnly);
        nextDay.setDate(nextDay.getDate() + 1);

        // Extract month and calculate academicMonth
        const month = dateOnly.getMonth() + 1; // 1-12

        // Validate month (Iyul va Avgust o'quv yilida yo'q)
        if (month === 7 || month === 8) {
          throw new Error('Iyul va Avgust oylari o\'quv yilida mavjud emas');
        }

        // Sentyabr-Dekabr: 9,10,11,12 -> 1,2,3,4
        // Yanvar-Iyun: 1,2,3,4,5,6 -> 5,6,7,8,9,10
        const academicMonth = month >= 9 ? month - 8 : month + 4;

        // Validate if lesson exists on this day (unless it's an exam)
        if (!gradeData.isExam) {
          const Schedule = require('../../models/scheduling/Schedule');

          // Agar scheduleId berilgan bo'lsa, shu jadvalni ishlatamiz
          // Aks holda joriy jadvalni topamiz
          let schedule;
          if (scheduleId) {
            schedule = await Schedule.findById(scheduleId);
          } else {
            schedule = await Schedule.findCurrentSchedule(classId);
          }

          if (schedule) {
            // Check if it's a holiday
            if (schedule.isHoliday && schedule.isHoliday(dateOnly)) {
              const holidayInfo = schedule.getHolidayInfo ? schedule.getHolidayInfo(dateOnly) : null;
              throw new Error(`${dateOnly.toISOString().split('T')[0]} - bayram kuni (${holidayInfo ? holidayInfo.name : 'Bayram'})`);
            }

            // Check if there's a lesson on this day
            const dayOfWeek = dateOnly.toLocaleDateString('en-US', { weekday: 'long' });
            const daySchedule = schedule.schedule.find(s => s.day === dayOfWeek);

            if (!daySchedule) {
              // Jadval topilmasa ham xato bermaslik - faqat log qilish
            }

            // Check if subject has lesson on this day
            if (daySchedule) {
              const hasSubject = daySchedule.periods.some(p =>
                p.subject && p.subject.toString() === subjectId.toString()
              );

              if (!hasSubject) {
                // Fan topilmasa ham xato bermaslik - faqat log qilish
              }
            }
            // Period tekshiruvini olib tashlaymiz - baholar saqlansin
          }
        }

        // Check if grade already exists
        const existingGrade = await Grade.findOne({
          student: gradeData.student,
          subject: subjectId,
          class: classId,
          date: { $gte: dateOnly, $lt: nextDay },
          periodNumber: gradeData.periodNumber
        });

        const gradeObj = {
          student: gradeData.student,
          subject: subjectId,
          class: classId,
          teacher: req.user._id,
          date: gradeData.date,
          score: gradeData.score,
          type: gradeData.isExam ? 'exam' : 'daily',
          periodNumber: gradeData.periodNumber,
          month: month,
          academicMonth: academicMonth,
          isExam: gradeData.isExam || false,
          examMaxScore: gradeData.examMaxScore || null
        };

        let savedGrade;
        if (existingGrade) {
          savedGrade = await Grade.findByIdAndUpdate(
            existingGrade._id,
            gradeObj,
            { new: true }
          );
        } else {
          const newGrade = new Grade(gradeObj);
          savedGrade = await newGrade.save();
        }

        savedGrades.push(savedGrade);
      } catch (err) {
        errors_list.push({
          student: gradeData.student,
          date: gradeData.date,
          error: err.message
        });
      }
    }
    // Maoshni hisoblash - faqat baho qo'yilgan darslar uchun
    // Har bir unikal dars uchun (sana + dars raqami bo'yicha) maosh yoziladi
    const lessonsForSalary = new Map();

    for (const grade of savedGrades) {
      // Faqat kundalik baholar uchun maosh (imtihonlar alohida)
      if (!grade.isExam) {
        const dateKey = new Date(grade.date).toISOString().split('T')[0];
        const key = `${req.user._id}_${grade.class}_${grade.subject}_${dateKey}_${grade.periodNumber}`;

        if (!lessonsForSalary.has(key)) {
          lessonsForSalary.set(key, {
            teacherId: req.user._id,
            lessonDetails: {
              date: grade.date,
              classId: grade.class,
              subjectId: grade.subject,
              description: `Baho qo'yildi (${grade.periodNumber}-dars)`
            }
          });
        }
      }
    }

    // Har bir unikal dars uchun maoshni yozish
    let salaryRecorded = 0;
    for (const lesson of lessonsForSalary.values()) {
      try {
        await salaryController.recordLessonTaught(lesson.teacherId, lesson.lessonDetails);
        salaryRecorded++;
      } catch (salaryError) {
        // Baho saqlash muvaffaqiyatli bo'lsa ham davom etamiz
      }
    }
    res.json({
      success: true,
      savedCount: savedGrades.length,
      errorCount: errors_list.length,
      grades: savedGrades,
      errors: errors_list,
      salaryRecorded: salaryRecorded
    });
  } catch (error) {
    res.status(500).json({
      message: 'Ballarni saqlashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/grades/exam
// @desc    Create exam grade (automatically added to last day of month)
// @access  Private/Admin
router.post('/exam', auth, authorize('admin'), [
  body('student').isMongoId().withMessage('Noto\'g\'ri o\'quvchi ID'),
  body('subject').isMongoId().withMessage('Noto\'g\'ri fan ID'),
  body('class').isMongoId().withMessage('Noto\'g\'ri sinf ID'),
  body('score').isFloat({ min: 0 }).withMessage('Ball 0 dan katta bo\'lishi kerak'),
  body('examMaxScore').isFloat({ min: 0 }).withMessage('Maksimal ball 0 dan katta bo\'lishi kerak'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Oy 1-12 oralig\'ida bo\'lishi kerak'),
  body('year').isInt({ min: 2020, max: 2100 }).withMessage('Yil noto\'g\'ri'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { student, subject, class: classId, score, examMaxScore, month, year, description } = req.body;

    // Validate score doesn't exceed max
    if (score > examMaxScore) {
      return res.status(400).json({ message: 'Ball maksimal balldan oshib ketmasligi kerak' });
    }

    // Validate month (Iyul va Avgust o'quv yilida yo'q)
    if (month === 7 || month === 8) {
      return res.status(400).json({ message: 'Iyul va Avgust oylari o\'quv yilida mavjud emas' });
    }

    // Validate 100-point balance: dailyMax + examMax <= 100
    // Calculate how many lesson periods exist in the month
    const Schedule = require('../../models/scheduling/Schedule');
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    // Find all schedules that overlap with this month
    const schedules = await Schedule.find({
      classId: classId,
      $or: [
        { startDate: { $lte: endOfMonth }, endDate: { $gte: startOfMonth } }
      ],
      isActive: true
    });

    let totalLessonPeriods = 0;

    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      // Find schedule for this date
      const daySchedule = schedules.find(s => {
        const schedStart = new Date(s.startDate);
        const schedEnd = new Date(s.endDate);
        return d >= schedStart && d <= schedEnd;
      });

      if (!daySchedule) continue;

      // Check if holiday
      if (daySchedule.isHoliday(d)) continue;

      // Find lessons for this subject
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
      const dayPlan = daySchedule.schedule.find(s => s.day === dayOfWeek);

      if (dayPlan) {
        const subjectPeriods = dayPlan.periods.filter(p =>
          p.subject && p.subject.toString() === subject.toString()
        );
        totalLessonPeriods += subjectPeriods.length;
      }
    }

    // Calculate max daily points
    const maxDailyPoints = totalLessonPeriods * 0.5;

    // Validate balance: maxDailyPoints + examMaxScore should <= 100
    if (maxDailyPoints + examMaxScore > 100) {
      return res.status(400).json({
        message: `Bu oyda ${totalLessonPeriods} ta dars bor (${maxDailyPoints} ball). Imtihon maksimal ${100 - maxDailyPoints} balldan oshmasligi kerak. Siz kiritgan: ${examMaxScore} ball`,
        totalLessonPeriods,
        maxDailyPoints,
        examMaxScore,
        maxAllowedExamScore: 100 - maxDailyPoints
      });
    }

    // Calculate last day of month for exam date
    // month (1-12), new Date needs (0-11), so month - 1
    // new Date(year, month, 0) gives last day of (month-1)
    const examDate = new Date(year, month, 0); // Last day of month (month ichida 1-12)
    const academicMonth = month >= 9 ? month - 8 : month + 4;

    // Check if exam already exists for this student/subject/month
    const existingExam = await Grade.findOne({
      student,
      subject,
      class: classId,
      month,
      isExam: true
    });

    const examData = {
      student,
      subject,
      class: classId,
      teacher: req.user._id,
      date: examDate,
      score,
      maxScore: examMaxScore,
      examMaxScore,
      type: 'exam',
      isExam: true,
      month,
      academicMonth,
      periodNumber: 1,
      description: description || `Oylik imtihon (${month}-oy)`
    };

    let savedExam;
    if (existingExam) {
      savedExam = await Grade.findByIdAndUpdate(
        existingExam._id,
        examData,
        { new: true }
      ).populate('student', 'firstName lastName studentId')
        .populate('subject', 'name code')
        .populate('class', 'name grade section');
    } else {
      const exam = new Grade(examData);
      savedExam = await exam.save();
      savedExam = await Grade.findById(savedExam._id)
        .populate('student', 'firstName lastName studentId')
        .populate('subject', 'name code')
        .populate('class', 'name grade section');
    }

    // Trigger monthly summary recalculation
    const MonthlyGradeSummary = require('../../models/academic/MonthlyGradeSummary');
    const academicYear = month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    await MonthlyGradeSummary.recalculate(student, subject, classId, month, academicYear);

    res.status(existingExam ? 200 : 201).json(savedExam);
  } catch (error) {
    res.status(500).json({
      message: 'Imtihon balini saqlashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/grades/exams/:classId/:month
// @desc    Get all exams for a class in a specific month
// @access  Private/Admin
router.get('/exams/:classId/:month', auth, authorize('admin'), async (req, res) => {
  try {
    const { classId, month } = req.params;
    const { year } = req.query;

    if (!isValidObjectId(classId)) {
      return res.status(400).json({ message: 'Noto\'g\'ri sinf ID' });
    }

    const monthNum = parseInt(month);
    const yearNum = year ? parseInt(year) : new Date().getFullYear();

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Oy 1-12 oralig\'ida bo\'lishi kerak' });
    }

    const exams = await Grade.find({
      class: classId,
      month: monthNum,
      isExam: true
    })
      .populate('student', 'firstName lastName studentId')
      .populate('subject', 'name code')
      .populate('teacher', 'firstName lastName')
      .sort({ subject: 1, student: 1 })
      .lean();

    res.json(exams);
  } catch (error) {
    res.status(500).json({
      message: 'Imtihonlarni yuklashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/grades/monthly-summary/:studentId
// @desc    Get monthly summary for a student (all subjects)
// @access  Private
router.get('/monthly-summary/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, month, academicMonth } = req.query;

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Noto\'g\'ri o\'quvchi ID' });
    }

    // Security: Students can only see their own summary
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    const MonthlyGradeSummary = require('../../models/academic/MonthlyGradeSummary');

    let query = { student: studentId };
    if (academicYear) query.academicYear = academicYear;
    if (month) query.month = parseInt(month);
    if (academicMonth) query.academicMonth = parseInt(academicMonth);

    const summaries = await MonthlyGradeSummary.find(query)
      .populate('subject', 'name code color')
      .populate('class', 'name grade section')
      .sort({ academicMonth: 1, subject: 1 })
      .lean();

    res.json(summaries);
  } catch (error) {
    res.status(500).json({
      message: 'Oylik natijalarni yuklashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/grades/monthly-summary/class/:classId
// @desc    Get monthly summary for entire class (all students, all subjects)
// @access  Private/Admin
router.get('/monthly-summary/class/:classId', auth, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { academicYear, month, academicMonth, subjectId } = req.query;

    if (!isValidObjectId(classId)) {
      return res.status(400).json({ message: 'Noto\'g\'ri sinf ID' });
    }

    const MonthlyGradeSummary = require('../../models/academic/MonthlyGradeSummary');

    let query = { class: classId };
    if (academicYear) query.academicYear = academicYear;
    if (month) query.month = parseInt(month);
    if (academicMonth) query.academicMonth = parseInt(academicMonth);
    if (subjectId && isValidObjectId(subjectId)) query.subject = subjectId;

    const summaries = await MonthlyGradeSummary.find(query)
      .populate('student', 'firstName lastName studentId')
      .populate('subject', 'name code color')
      .populate('class', 'name grade section')
      .sort({ student: 1, academicMonth: 1, subject: 1 })
      .lean();

    res.json(summaries);
  } catch (error) {
    res.status(500).json({
      message: 'Sinf oylik natijalarini yuklashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/grades/calculate-monthly
// @desc    Recalculate monthly summary for student/subject/month
// @access  Private/Admin
router.post('/calculate-monthly', auth, authorize('admin'), [
  body('studentId').isMongoId().withMessage('Noto\'g\'ri o\'quvchi ID'),
  body('subjectId').isMongoId().withMessage('Noto\'g\'ri fan ID'),
  body('classId').isMongoId().withMessage('Noto\'g\'ri sinf ID'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Oy 1-12 oralig\'ida bo\'lishi kerak'),
  body('academicYear').isString().withMessage('O\'quv yili noto\'g\'ri')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, subjectId, classId, month, academicYear } = req.body;

    const MonthlyGradeSummary = require('../../models/academic/MonthlyGradeSummary');
    const summary = await MonthlyGradeSummary.recalculate(
      studentId,
      subjectId,
      classId,
      month,
      academicYear
    );

    const populated = await MonthlyGradeSummary.findById(summary._id)
      .populate('student', 'firstName lastName studentId')
      .populate('subject', 'name code color')
      .populate('class', 'name grade section')
      .lean();

    res.json(populated);
  } catch (error) {
    res.status(500).json({
      message: 'Oylik natijani hisoblashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
