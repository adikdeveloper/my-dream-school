const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/users/User');
const Class = require('../models/academic/Class');
const Subject = require('../models/academic/Subject');
const Grade = require('../models/academic/Grade');
const Attendance = require('../models/academic/Attendance');
const Assignment = require('../models/academic/Assignment');
const Announcement = require('../models/communication/Announcement');
const Schedule = require('../models/scheduling/Schedule');
const Payment = require('../models/financial/Payment');
const StudentFee = require('../models/financial/StudentFee');
const scheduleValidator = require('../utils/scheduleValidator');

// @route   GET /api/stats/admin
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/admin', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    // Get counts using countDocuments for better performance
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      activeStudents,
      previousStudents,
      activeTeachers,
      previousTeachers
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Class.countDocuments(),
      Subject.countDocuments(),
      // Active students (logged in last 7 days or active flag)
      User.countDocuments({
        role: 'student',
        isActive: true
      }),
      // Students count from 30 days ago for comparison
      User.countDocuments({
        role: 'student',
        createdAt: {
          $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }),
      // Active teachers
      User.countDocuments({
        role: 'teacher',
        isActive: true
      }),
      // Teachers from 30 days ago
      User.countDocuments({
        role: 'teacher',
        createdAt: {
          $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      })
    ]);

    // Calculate percentage changes
    const studentChange = previousStudents > 0
      ? Math.round(((totalStudents - previousStudents) / previousStudents) * 100)
      : 0;

    const teacherChange = previousTeachers > 0
      ? Math.round(((totalTeachers - previousTeachers) / previousTeachers) * 100)
      : 0;

    res.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      activeStudents,
      activeTeachers,
      changes: {
        students: `${studentChange >= 0 ? '+' : ''}${studentChange}%`,
        teachers: `${teacherChange >= 0 ? '+' : ''}${teacherChange}%`,
        studentChangeType: studentChange >= 0 ? 'positive' : 'negative',
        teacherChangeType: teacherChange >= 0 ? 'positive' : 'negative'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/activities
// @desc    Get recent activities for admin dashboard
// @access  Private/Admin
router.get('/activities', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent activities from various sources
    const [recentUsers, recentClasses, recentGrades] = await Promise.all([
      User.find()
        .select('firstName lastName role createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Class.find()
        .select('name grade section createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Grade.find()
        .populate('student', 'firstName lastName')
        .populate('subject', 'name')
        .populate('class', 'name grade section')
        .select('grade date')
        .sort({ date: -1 })
        .limit(5)
        .lean()
    ]);

    // Combine and format activities
    const activities = [];

    // Add user registrations
    recentUsers.forEach(user => {
      activities.push({
        id: `user_${user._id}`,
        type: 'user_registered',
        message: `Yangi ${user.role === 'student' ? "o'quvchi" : "o'qituvchi"} ro'yxatdan o'tdi: ${user.firstName} ${user.lastName}`,
        time: getRelativeTime(user.createdAt),
        timestamp: user.createdAt,
        icon: user.role === 'student' ? '👤' : '👨‍🏫',
        color: user.role === 'student' ? '#3b82f6' : '#f59e0b'
      });
    });

    // Add class creations
    recentClasses.forEach(cls => {
      activities.push({
        id: `class_${cls._id}`,
        type: 'class_created',
        message: `${cls.grade}-${cls.section} sinf yaratildi`,
        time: getRelativeTime(cls.createdAt),
        timestamp: cls.createdAt,
        icon: '🏫',
        color: '#8b5cf6'
      });
    });

    // Add grade submissions
    recentGrades.forEach(grade => {
      if (grade.student && grade.subject && grade.class) {
        activities.push({
          id: `grade_${grade._id}`,
          type: 'grade_submitted',
          message: `${grade.class.grade}-${grade.class.section} sinf ${grade.subject.name} baholari kiritildi`,
          time: getRelativeTime(grade.date),
          timestamp: grade.date,
          icon: '📊',
          color: '#10b981'
        });
      }
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);
    const limitedActivities = activities.slice(0, limit);

    // Remove timestamp before sending
    const formattedActivities = limitedActivities.map(({ timestamp, ...rest }) => rest);

    res.json(formattedActivities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/teacher/classes
// @desc    Get teacher's classes performance statistics (OPTIMIZED - No N+1)
// @access  Private/Teacher
router.get('/teacher/classes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Get all classes where teacher teaches
    const classes = await Class.find({
      'subjects.teacher': teacherId
    })
      .populate('students', 'firstName lastName studentId')
      .populate('subjects.subject', 'name')
      .populate('subjects.teacher', 'firstName lastName')
      .lean();

    if (classes.length === 0) {
      return res.json([]);
    }

    // Extract all class IDs and subject IDs for this teacher
    const classIds = classes.map(c => c._id);
    const teacherSubjects = [];

    classes.forEach(cls => {
      cls.subjects.forEach(subj => {
        if (subj.teacher && subj.teacher._id.toString() === teacherId.toString()) {
          teacherSubjects.push({
            classId: cls._id,
            subjectId: subj.subject._id
          });
        }
      });
    });

    // Aggregate grades for all classes/subjects at once (NO N+1!)
    const gradesAgg = await Grade.aggregate([
      {
        $match: {
          class: { $in: classIds },
          subject: { $in: teacherSubjects.map(ts => ts.subjectId) }
        }
      },
      {
        $group: {
          _id: {
            class: '$class',
            subject: '$subject'
          },
          average: { $avg: '$score' },
          totalGrades: { $sum: 1 },
          excellentCount: {
            $sum: { $cond: [{ $gte: ['$score', 85] }, 1, 0] }
          },
          goodCount: {
            $sum: { $cond: [{ $and: [{ $gte: ['$score', 70] }, { $lt: ['$score', 85] }] }, 1, 0] }
          },
          averageCount: {
            $sum: { $cond: [{ $and: [{ $gte: ['$score', 60] }, { $lt: ['$score', 70] }] }, 1, 0] }
          },
          poorCount: {
            $sum: { $cond: [{ $lt: ['$score', 60] }, 1, 0] }
          }
        }
      }
    ]);

    // Aggregate attendance for all classes/subjects at once (NO N+1!)
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          class: { $in: classIds },
          subject: { $in: teacherSubjects.map(ts => ts.subjectId) }
        }
      },
      {
        $group: {
          _id: {
            class: '$class',
            subject: '$subject'
          },
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          }
        }
      }
    ]);

    // Create lookup maps for O(1) access
    const gradesMap = new Map();
    gradesAgg.forEach(g => {
      const key = `${g._id.class}_${g._id.subject}`;
      gradesMap.set(key, g);
    });

    const attendanceMap = new Map();
    attendanceAgg.forEach(a => {
      const key = `${a._id.class}_${a._id.subject}`;
      attendanceMap.set(key, a);
    });

    // Build response
    const classStats = classes.map(cls => {
      // Get teacher's subjects for this class
      const teacherSubjectsForClass = cls.subjects.filter(s =>
        s.teacher && s.teacher._id.toString() === teacherId.toString()
      );

      const subjectStats = teacherSubjectsForClass.map(subj => {
        const key = `${cls._id}_${subj.subject._id}`;
        const gradeData = gradesMap.get(key);
        const attendanceData = attendanceMap.get(key);

        const average = gradeData ? gradeData.average.toFixed(1) : 0;
        const attendanceRate = attendanceData && attendanceData.totalRecords > 0
          ? ((attendanceData.presentCount / attendanceData.totalRecords) * 100).toFixed(1)
          : 0;

        return {
          subjectId: subj.subject._id,
          subjectName: subj.subject.name,
          average: parseFloat(average),
          totalGrades: gradeData ? gradeData.totalGrades : 0,
          attendanceRate: parseFloat(attendanceRate),
          excellentCount: gradeData ? gradeData.excellentCount : 0,
          goodCount: gradeData ? gradeData.goodCount : 0,
          averageCount: gradeData ? gradeData.averageCount : 0,
          poorCount: gradeData ? gradeData.poorCount : 0
        };
      });

      return {
        classId: cls._id,
        className: cls.name,
        grade: cls.grade,
        section: cls.section,
        studentCount: cls.students.length,
        subjects: subjectStats
      };
    });

    res.json(classStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/teacher/students
// @desc    Get detailed student performance for a class and subject (OPTIMIZED)
// @access  Private/Teacher
router.get('/teacher/students', auth, authorize('teacher'), async (req, res) => {
  try {
    const { classId, subjectId } = req.query;
    const teacherId = req.user._id;

    // Input validation and sanitization
    if (!classId || !subjectId) {
      return res.status(400).json({ message: 'classId va subjectId talab qilinadi' });
    }

    if (!mongoose.Types.ObjectId.isValid(classId) || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Noto\'g\'ri ID format' });
    }

    // Verify teacher teaches this subject in this class
    const cls = await Class.findById(classId)
      .populate('students', 'firstName lastName studentId email profileImage')
      .lean();

    if (!cls) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    const teacherSubject = cls.subjects.find(s =>
      s.subject.toString() === subjectId &&
      s.teacher.toString() === teacherId.toString()
    );

    if (!teacherSubject) {
      return res.status(403).json({ message: 'Bu sinfda bu fanni o\'qitmaysiz' });
    }

    if (cls.students.length === 0) {
      return res.json([]);
    }

    const studentIds = cls.students.map(s => s._id);

    // Get current schedule for date filtering
    const currentSchedule = await scheduleValidator.getCurrentScheduleForClass(classId);
    const dateFilter = currentSchedule ? {
      date: {
        $gte: currentSchedule.startDate,
        $lte: currentSchedule.endDate
      }
    } : {};

    // Aggregate all student data at once (NO N+1!)
    const [gradesAgg, attendanceAgg, assignmentsAgg] = await Promise.all([
      // Grades aggregation (filtered by current schedule)
      Grade.aggregate([
        {
          $match: {
            student: { $in: studentIds },
            class: new mongoose.Types.ObjectId(classId),
            subject: new mongoose.Types.ObjectId(subjectId),
            ...dateFilter
          }
        },
        {
          $sort: { date: -1 }
        },
        {
          $group: {
            _id: '$student',
            average: { $avg: '$score' },
            totalGrades: { $sum: 1 },
            recentGrades: {
              $push: {
                score: '$score',
                date: '$date',
                type: '$type'
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            average: 1,
            totalGrades: 1,
            recentGrades: { $slice: ['$recentGrades', 5] }
          }
        }
      ]),
      // Attendance aggregation (filtered by current schedule)
      Attendance.aggregate([
        {
          $match: {
            student: { $in: studentIds },
            class: new mongoose.Types.ObjectId(classId),
            subject: new mongoose.Types.ObjectId(subjectId),
            ...dateFilter
          }
        },
        {
          $group: {
            _id: '$student',
            totalClasses: { $sum: 1 },
            presentCount: {
              $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
            }
          }
        }
      ]),
      // Assignments aggregation
      Assignment.aggregate([
        {
          $match: {
            class: new mongoose.Types.ObjectId(classId),
            subject: new mongoose.Types.ObjectId(subjectId)
          }
        },
        {
          $unwind: '$submissions'
        },
        {
          $match: {
            'submissions.student': { $in: studentIds }
          }
        },
        {
          $group: {
            _id: '$submissions.student',
            total: { $sum: 1 },
            submitted: {
              $sum: {
                $cond: [
                  { $in: ['$submissions.status', ['submitted', 'graded']] },
                  1,
                  0
                ]
              }
            },
            graded: {
              $sum: { $cond: [{ $eq: ['$submissions.status', 'graded'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Create lookup maps
    const gradesMap = new Map();
    gradesAgg.forEach(g => {
      gradesMap.set(g._id.toString(), g);
    });

    const attendanceMap = new Map();
    attendanceAgg.forEach(a => {
      attendanceMap.set(a._id.toString(), a);
    });

    const assignmentsMap = new Map();
    assignmentsAgg.forEach(a => {
      assignmentsMap.set(a._id.toString(), a);
    });

    // Build student statistics
    const studentStats = cls.students.map(student => {
      const studentIdStr = student._id.toString();

      const gradeData = gradesMap.get(studentIdStr);
      const attendanceData = attendanceMap.get(studentIdStr);
      const assignmentData = assignmentsMap.get(studentIdStr);

      const average = gradeData ? gradeData.average.toFixed(1) : 0;
      const attendanceRate = attendanceData && attendanceData.totalClasses > 0
        ? ((attendanceData.presentCount / attendanceData.totalClasses) * 100).toFixed(1)
        : 0;
      const completionRate = assignmentData && assignmentData.total > 0
        ? ((assignmentData.submitted / assignmentData.total) * 100).toFixed(1)
        : 0;

      return {
        studentId: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentNumber: student.studentId,
        email: student.email,
        profileImage: student.profileImage,
        average: parseFloat(average),
        totalGrades: gradeData ? gradeData.totalGrades : 0,
        recentGrades: gradeData ? gradeData.recentGrades : [],
        attendanceRate: parseFloat(attendanceRate),
        totalClasses: attendanceData ? attendanceData.totalClasses : 0,
        presentCount: attendanceData ? attendanceData.presentCount : 0,
        absentCount: attendanceData ? (attendanceData.totalClasses - attendanceData.presentCount) : 0,
        assignmentStats: {
          total: assignmentData ? assignmentData.total : 0,
          submitted: assignmentData ? assignmentData.submitted : 0,
          graded: assignmentData ? assignmentData.graded : 0,
          completionRate: parseFloat(completionRate)
        }
      };
    });

    // Sort by average descending
    studentStats.sort((a, b) => b.average - a.average);

    res.json(studentStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/teacher/attendance
// @desc    Get attendance statistics for teacher's classes
// @access  Private/Teacher
router.get('/teacher/attendance', auth, authorize('teacher'), async (req, res) => {
  try {
    const { classId, subjectId, startDate, endDate } = req.query;
    const teacherId = req.user._id;

    // Build filter with validation
    const filter = {};

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'Noto\'g\'ri classId' });
      }
      filter.class = new mongoose.Types.ObjectId(classId);
    }

    if (subjectId) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: 'Noto\'g\'ri subjectId' });
      }
      filter.subject = new mongoose.Types.ObjectId(subjectId);
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: 'Noto\'g\'ri startDate format' });
        }
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: 'Noto\'g\'ri endDate format' });
        }
        filter.date.$lte = end;
      }
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find(filter)
      .populate('student', 'firstName lastName studentId')
      .populate('class', 'name grade section')
      .populate('subject', 'name')
      .sort({ date: -1 })
      .limit(100)
      .lean();

    // Calculate statistics
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const absentCount = attendanceRecords.filter(a => a.status === 'absent').length;
    const lateCount = attendanceRecords.filter(a => a.status === 'late').length;
    const excusedCount = attendanceRecords.filter(a => a.status === 'excused').length;

    const attendanceRate = totalRecords > 0
      ? ((presentCount / totalRecords) * 100).toFixed(1)
      : 0;

    // Group by date
    const byDate = {};
    attendanceRecords.forEach(record => {
      const dateStr = new Date(record.date).toISOString().split('T')[0];
      if (!byDate[dateStr]) {
        byDate[dateStr] = {
          date: dateStr,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0
        };
      }
      byDate[dateStr][record.status]++;
      byDate[dateStr].total++;
    });

    const dateStats = Object.values(byDate).sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    res.json({
      summary: {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate: parseFloat(attendanceRate)
      },
      byDate: dateStats.slice(0, 30), // Last 30 days
      recentRecords: attendanceRecords.slice(0, 20)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/teacher/assignments
// @desc    Get assignment statistics for teacher
// @access  Private/Teacher
router.get('/teacher/assignments', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { classId, subjectId } = req.query;

    // Build filter with validation
    const filter = { teacher: teacherId };

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ message: 'Noto\'g\'ri classId' });
      }
      filter.class = new mongoose.Types.ObjectId(classId);
    }

    if (subjectId) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: 'Noto\'g\'ri subjectId' });
      }
      filter.subject = new mongoose.Types.ObjectId(subjectId);
    }

    // Get assignments
    const assignments = await Assignment.find(filter)
      .populate('class', 'name')
      .populate('subject', 'name')
      .lean();

    const stats = {
      total: assignments.length,
      active: assignments.filter(a => a.status === 'active').length,
      closed: assignments.filter(a => a.status === 'closed').length,
      submissions: {
        pending: 0,
        submitted: 0,
        graded: 0,
        total: 0
      },
      averageGrade: 0,
      completionRate: 0
    };

    let totalGradeSum = 0;
    let gradedCount = 0;

    assignments.forEach(assignment => {
      assignment.submissions.forEach(submission => {
        stats.submissions.total++;
        if (submission.status === 'pending') {
          stats.submissions.pending++;
        } else if (submission.status === 'submitted') {
          stats.submissions.submitted++;
        } else if (submission.status === 'graded') {
          stats.submissions.graded++;
          if (submission.grade != null) {
            totalGradeSum += submission.grade;
            gradedCount++;
          }
        }
      });
    });

    stats.averageGrade = gradedCount > 0
      ? (totalGradeSum / gradedCount).toFixed(1)
      : 0;

    stats.completionRate = stats.submissions.total > 0
      ? ((stats.submissions.graded / stats.submissions.total) * 100).toFixed(1)
      : 0;

    // Get assignment details with submission counts
    const assignmentDetails = assignments.map(a => {
      const pending = a.submissions.filter(s => s.status === 'pending').length;
      const submitted = a.submissions.filter(s => s.status === 'submitted').length;
      const graded = a.submissions.filter(s => s.status === 'graded').length;
      const total = a.submissions.length;

      return {
        _id: a._id,
        title: a.title,
        className: a.class.name,
        subjectName: a.subject.name,
        dueDate: a.dueDate,
        status: a.status,
        maxScore: a.maxScore,
        submissions: {
          pending,
          submitted,
          graded,
          total,
          completionRate: total > 0 ? ((graded / total) * 100).toFixed(1) : 0
        }
      };
    });

    res.json({
      summary: stats,
      assignments: assignmentDetails
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/class/:classId
// @desc    Get comprehensive statistics for a specific class (attendance & grades)
// @access  Private/Admin
router.get('/class/:classId', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { classId } = req.params;

    // Validate classId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ message: 'Noto\'g\'ri classId format' });
    }

    // Get class details
    const classData = await Class.findById(classId)
      .populate('students', 'firstName lastName studentId')
      .populate('subjects.subject', 'name code')
      .populate('subjects.teacher', 'firstName lastName')
      .lean();

    if (!classData) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    const studentIds = classData.students.map(s => s._id);
    const subjectIds = classData.subjects.map(s => s.subject._id);

    // Get attendance statistics
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId)
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get attendance by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceByDate = await Attendance.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId),
          date: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get attendance by subject
    const attendanceBySubject = await Attendance.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId)
        }
      },
      {
        $group: {
          _id: '$subject',
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          }
        }
      }
    ]);

    // Populate subject names
    const populatedAttendanceBySubject = await Promise.all(
      attendanceBySubject.map(async (item) => {
        const subject = await Subject.findById(item._id).select('name code').lean();
        return {
          subjectId: item._id,
          subjectName: subject ? subject.name : 'Noma\'lum',
          total: item.total,
          present: item.present,
          attendanceRate: item.total > 0 ? ((item.present / item.total) * 100).toFixed(1) : 0
        };
      })
    );

    // Get grades statistics
    const gradesStats = await Grade.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId)
        }
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$score' },
          totalGrades: { $sum: 1 },
          excellent: {
            $sum: { $cond: [{ $gte: ['$score', 85] }, 1, 0] }
          },
          good: {
            $sum: { $cond: [{ $and: [{ $gte: ['$score', 70] }, { $lt: ['$score', 85] }] }, 1, 0] }
          },
          average_range: {
            $sum: { $cond: [{ $and: [{ $gte: ['$score', 60] }, { $lt: ['$score', 70] }] }, 1, 0] }
          },
          poor: {
            $sum: { $cond: [{ $lt: ['$score', 60] }, 1, 0] }
          }
        }
      }
    ]);

    // Get grades by subject
    const gradesBySubject = await Grade.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId)
        }
      },
      {
        $group: {
          _id: '$subject',
          average: { $avg: '$score' },
          totalGrades: { $sum: 1 },
          excellent: {
            $sum: { $cond: [{ $gte: ['$score', 85] }, 1, 0] }
          },
          good: {
            $sum: { $cond: [{ $and: [{ $gte: ['$score', 70] }, { $lt: ['$score', 85] }] }, 1, 0] }
          },
          average_range: {
            $sum: { $cond: [{ $and: [{ $gte: ['$score', 60] }, { $lt: ['$score', 70] }] }, 1, 0] }
          },
          poor: {
            $sum: { $cond: [{ $lt: ['$score', 60] }, 1, 0] }
          }
        }
      }
    ]);

    // Populate subject names for grades
    const populatedGradesBySubject = await Promise.all(
      gradesBySubject.map(async (item) => {
        const subject = await Subject.findById(item._id).select('name code').lean();
        return {
          subjectId: item._id,
          subjectName: subject ? subject.name : 'Noma\'lum',
          average: item.average ? parseFloat(item.average.toFixed(1)) : 0,
          totalGrades: item.totalGrades,
          distribution: {
            excellent: item.excellent,
            good: item.good,
            average: item.average_range,
            poor: item.poor
          }
        };
      })
    );

    // Calculate overall attendance stats
    const totalAttendance = attendanceStats.reduce((sum, item) => sum + item.count, 0);
    const presentCount = attendanceStats.find(s => s._id === 'present')?.count || 0;
    const overallAttendanceRate = totalAttendance > 0
      ? ((presentCount / totalAttendance) * 100).toFixed(1)
      : 0;

    // Format attendance stats
    const formattedAttendanceStats = {
      present: attendanceStats.find(s => s._id === 'present')?.count || 0,
      absent: attendanceStats.find(s => s._id === 'absent')?.count || 0,
      late: attendanceStats.find(s => s._id === 'late')?.count || 0,
      excused: attendanceStats.find(s => s._id === 'excused')?.count || 0,
      total: totalAttendance,
      attendanceRate: parseFloat(overallAttendanceRate)
    };

    res.json({
      classInfo: {
        classId: classData._id,
        className: classData.name,
        grade: classData.grade,
        section: classData.section,
        studentCount: classData.students.length,
        subjectCount: classData.subjects.length
      },
      attendance: {
        overall: formattedAttendanceStats,
        byDate: attendanceByDate,
        bySubject: populatedAttendanceBySubject
      },
      grades: {
        overall: gradesStats.length > 0 ? {
          average: gradesStats[0].average ? parseFloat(gradesStats[0].average.toFixed(1)) : 0,
          totalGrades: gradesStats[0].totalGrades,
          distribution: {
            excellent: gradesStats[0].excellent,
            good: gradesStats[0].good,
            average: gradesStats[0].average_range,
            poor: gradesStats[0].poor
          }
        } : {
          average: 0,
          totalGrades: 0,
          distribution: { excellent: 0, good: 0, average: 0, poor: 0 }
        },
        bySubject: populatedGradesBySubject
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// @route   GET /api/stats/teacher/today
// @desc    Get teacher's today's dashboard statistics (REAL DATA)
// @access  Private/Teacher
router.get('/teacher/today', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Bugungi sana
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    // O'qituvchi dars beradigan sinflarni olish
    const teacherClasses = await Class.find({
      'subjects.teacher': teacherId
    }).populate('students', '_id').lean();

    if (teacherClasses.length === 0) {
      return res.json({
        totalStudents: 0,
        presentToday: 0,
        absentToday: 0,
        attendanceRate: 0,
        pendingGrades: 0,
        activeAssignments: 0
      });
    }

    // Barcha o'quvchilar ID larini yig'ish
    const allStudentIds = [];
    const classIds = [];

    teacherClasses.forEach(cls => {
      classIds.push(cls._id);
      cls.students.forEach(student => {
        if (!allStudentIds.includes(student._id.toString())) {
          allStudentIds.push(student._id.toString());
        }
      });
    });

    const totalStudents = allStudentIds.length;

    // Bugungi davomatni hisoblash
    const todayAttendance = await Attendance.aggregate([
      {
        $match: {
          class: { $in: classIds },
          date: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: '$student',
          status: { $first: '$status' }
        }
      }
    ]);

    // Kelganlarni hisoblash
    const presentToday = todayAttendance.filter(
      att => att.status === 'present' || att.status === 'keldi'
    ).length;

    const absentToday = todayAttendance.filter(
      att => att.status === 'absent' || att.status === 'kelmadi'
    ).length;

    // Davomat foizi
    const checkedStudents = todayAttendance.length;
    const attendanceRate = checkedStudents > 0
      ? Math.round((presentToday / checkedStudents) * 100)
      : 0;

    // Faol topshiriqlar soni
    const activeAssignments = await Assignment.countDocuments({
      teacher: teacherId,
      status: 'active'
    });

    // Kutilayotgan baholar (topshirilgan, lekin baholanmagan)
    const assignmentsWithSubmissions = await Assignment.find({
      teacher: teacherId,
      status: 'active'
    }).lean();

    let pendingGrades = 0;
    assignmentsWithSubmissions.forEach(assignment => {
      pendingGrades += assignment.submissions.filter(
        s => s.status === 'submitted'
      ).length;
    });

    res.json({
      totalStudents,
      presentToday,
      absentToday,
      attendanceRate,
      pendingGrades,
      activeAssignments
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to get relative time
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds} soniya oldin`;
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  if (hours < 24) return `${hours} soat oldin`;
  if (days < 30) return `${days} kun oldin`;
  return new Date(date).toLocaleDateString('uz-UZ');
}

// @route   GET /api/stats/teacher/ungraded-lessons
// @desc    Get today's lessons without grades for teacher (with localStorage key for frontend)
// @access  Private/Teacher
router.get('/teacher/ungraded-lessons', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Bugungi sana va vaqt
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD" format
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM" format

    // Hafta kunini olish (inglizcha nom)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[now.getDay()];

    // O'qituvchi dars beradigan sinflarni olish
    const teacherClasses = await Class.find({
      'subjects.teacher': teacherId
    }).populate('subjects.subject', 'name code').lean();

    if (teacherClasses.length === 0) {
      return res.json({
        todayKey: todayStr,
        ungradedLessons: [],
        totalUngraded: 0
      });
    }

    const ungradedLessons = [];

    // Har bir sinf uchun bugungi jadvalini tekshirish
    for (const cls of teacherClasses) {
      // Sinf jadvalini o'qish
      if (!cls.schedule || cls.schedule.length === 0) continue;

      // Bugungi kun jadvalini topish
      const todaySchedule = cls.schedule.find(s => s.day === dayName);
      if (!todaySchedule || !todaySchedule.periods || todaySchedule.periods.length === 0) continue;

      // Bu o'qituvchi o'qitadigan fanlarni aniqlash
      const teacherSubjectIds = cls.subjects
        .filter(s => s.teacher && s.teacher.toString() === teacherId.toString())
        .map(s => s.subject._id.toString());

      // Bugungi o'tgan darslarni tekshirish
      for (const period of todaySchedule.periods) {
        // Faqat bu o'qituvchining darslari va vaqti o'tgan darslar
        if (!period.subject || !period.teacher) continue;
        if (period.teacher.toString() !== teacherId.toString()) continue;
        if (period.endTime >= currentTime) continue; // Dars hali tugamagan

        // Bu dars uchun bugungi baholar borligini tekshirish
        const subjectId = period.subject.toString();
        const classId = cls._id;

        // Shu sinf va fan uchun bugungi baholar soni
        const todayGradesCount = await Grade.countDocuments({
          class: classId,
          subject: subjectId,
          date: {
            $gte: todayStart,
            $lte: todayEnd
          }
        });

        // Agar baholar yo'q bo'lsa, ro'yxatga qo'shish
        if (todayGradesCount === 0) {
          // Fan nomini topish
          const subjectData = cls.subjects.find(s =>
            s.subject._id.toString() === subjectId
          );

          ungradedLessons.push({
            classId: cls._id,
            className: cls.name,
            subjectId: subjectId,
            subjectName: subjectData?.subject?.name || 'Noma\'lum fan',
            time: `${period.startTime} - ${period.endTime}`,
            startTime: period.startTime,
            endTime: period.endTime,
            date: todayStr
          });
        }
      }
    }

    // Vaqt bo'yicha saralash (ertalabroq o'tgan darslar birinchi)
    ungradedLessons.sort((a, b) => a.startTime.localeCompare(b.startTime));

    res.json({
      todayKey: todayStr, // Frontend localStorage uchun kalit
      ungradedLessons,
      totalUngraded: ungradedLessons.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================
// ADMIN REPORTS — Daily / Weekly / Monthly / Yearly
// ============================================================

// Helper: get day name from Date object
function getDayName(date) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
}

// Helper: get today's scheduled lessons for all classes
async function getScheduledLessonsForDate(targetDate) {
  const dayName = getDayName(targetDate);
  if (dayName === 'Sunday') return [];

  // Find active schedules covering this date
  const schedules = await Schedule.find({
    isActive: true,
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  })
    .populate('schedule.periods.subject', 'name code')
    .populate('schedule.periods.teacher', 'firstName lastName')
    .lean();

  const lessons = [];
  for (const sched of schedules) {
    // Check if this date is a holiday
    const isHoliday = (sched.holidays || []).some(h => {
      const hd = new Date(h.date); hd.setHours(0, 0, 0, 0);
      const td = new Date(targetDate); td.setHours(0, 0, 0, 0);
      return hd.getTime() === td.getTime();
    });
    if (isHoliday) continue;

    const daySchedule = (sched.schedule || []).find(s => s.day === dayName);
    if (!daySchedule) continue;

    for (let pi = 0; pi < (daySchedule.periods || []).length; pi++) {
      const period = daySchedule.periods[pi];
      if (!period.subject || !period.teacher) continue;
      lessons.push({
        classId: sched.classId,
        subjectId: period.subject._id || period.subject,
        subjectName: period.subject.name || 'Nomalum',
        teacherId: period.teacher._id || period.teacher,
        teacherName: period.teacher.firstName
          ? `${period.teacher.firstName} ${period.teacher.lastName}`
          : 'Nomalum',
        startTime: period.startTime,
        endTime: period.endTime,
        periodIndex: pi
      });
    }
  }
  return lessons;
}

// @route   GET /api/stats/reports/daily
// @desc    Bugungi hisobot: bahosiz darslar, kelmaganlar, progress
// @access  Private/Admin
router.get('/reports/daily', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    // Accept optional date query param: ?date=YYYY-MM-DD
    const now = req.query.date ? new Date(req.query.date + 'T12:00:00') : new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Get all scheduled lessons for today
    const scheduledLessons = await getScheduledLessonsForDate(now);

    // 2. Get all classes with students
    const classes = await Class.find({ isActive: true })
      .populate('students', 'firstName lastName studentId')
      .lean();
    const classMap = new Map(classes.map(c => [c._id.toString(), c]));

    // 3. Get today's grades
    const todayGrades = await Grade.find({
      date: { $gte: todayStart, $lte: todayEnd }
    }).lean();

    // Group grades by class+subject
    const gradeKey = (classId, subjectId) => `${classId}_${subjectId}`;
    const gradedSet = new Map();
    todayGrades.forEach(g => {
      const key = gradeKey(g.class.toString(), g.subject.toString());
      if (!gradedSet.has(key)) gradedSet.set(key, new Set());
      gradedSet.get(key).add(g.student.toString());
    });

    // 4. Get today's attendance
    const todayAttendance = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd }
    }).lean();

    // Group absent students by class
    const absentByClass = new Map();
    const absentStudentsByClassSubject = new Map();
    todayAttendance.forEach(a => {
      const status = (a.status || '').toLowerCase();
      if (status === 'absent' || status === 'kelmadi') {
        const cid = a.class.toString();
        if (!absentByClass.has(cid)) absentByClass.set(cid, new Set());
        absentByClass.get(cid).add(a.student.toString());

        const key = `${cid}_${(a.subject || '').toString()}`;
        if (!absentStudentsByClassSubject.has(key)) absentStudentsByClassSubject.set(key, new Set());
        absentStudentsByClassSubject.get(key).add(a.student.toString());
      }
    });

    // 5. Calculate ungraded lessons
    const ungradedLessons = [];
    let totalExpected = 0;
    let totalCompleted = 0;

    for (const lesson of scheduledLessons) {
      const cls = classMap.get(lesson.classId.toString());
      if (!cls) continue;

      const key = gradeKey(lesson.classId.toString(), lesson.subjectId.toString());
      const gradedStudents = gradedSet.get(key) || new Set();
      const absentStudents = absentStudentsByClassSubject.get(key) || new Set();

      // Expected = total students - absent students
      const totalStudents = cls.students.length;
      const absentCount = absentStudents.size;
      const expectedGrades = totalStudents - absentCount;
      const actualGrades = gradedStudents.size;

      totalExpected += expectedGrades;
      totalCompleted += Math.min(actualGrades, expectedGrades);

      if (actualGrades < expectedGrades) {
        // Find ungraded students
        const ungradedStudents = cls.students
          .filter(s => {
            const sid = s._id.toString();
            return !gradedStudents.has(sid) && !absentStudents.has(sid);
          })
          .map(s => ({ _id: s._id, firstName: s.firstName, lastName: s.lastName }));

        ungradedLessons.push({
          classId: lesson.classId,
          className: cls.name || `${cls.grade}-${cls.section}`,
          subjectName: lesson.subjectName,
          teacherName: lesson.teacherName,
          teacherId: lesson.teacherId,
          time: `${lesson.startTime} - ${lesson.endTime}`,
          expectedGrades,
          actualGrades,
          ungradedStudents
        });
      }
    }

    // 6. Format absent students by class
    const absentStudentsList = [];
    for (const [classId, studentIds] of absentByClass) {
      const cls = classMap.get(classId);
      if (!cls) continue;
      const students = cls.students
        .filter(s => studentIds.has(s._id.toString()))
        .map(s => ({ _id: s._id, firstName: s.firstName, lastName: s.lastName }));
      absentStudentsList.push({
        classId,
        className: cls.name || `${cls.grade}-${cls.section}`,
        students,
        count: students.length
      });
    }
    absentStudentsList.sort((a, b) => b.count - a.count);

    const progress = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 100;

    res.json({
      date: now.toISOString().split('T')[0],
      progress,
      totalExpected,
      totalCompleted,
      totalScheduledLessons: scheduledLessons.length,
      ungradedLessons,
      absentStudents: absentStudentsList,
      totalAbsent: todayAttendance.filter(a => ['absent', 'kelmadi'].includes((a.status || '').toLowerCase())).length
    });
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/reports/weekly
// @desc    Shu hafta hisoboti
// @access  Private/Admin
router.get('/reports/weekly', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const now = new Date();
    // Monday of this week
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset, 0, 0, 0, 0);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const classes = await Class.find({ isActive: true })
      .populate('students', 'firstName lastName')
      .lean();
    const classMap = new Map(classes.map(c => [c._id.toString(), c]));

    // Get all attendance this week
    const weekAttendance = await Attendance.find({
      date: { $gte: weekStart, $lte: weekEnd }
    }).populate('student', 'firstName lastName').lean();

    // Get all grades this week
    const weekGrades = await Grade.find({
      date: { $gte: weekStart, $lte: weekEnd }
    }).lean();

    // Attendance stats
    let totalPresent = 0, totalAbsent = 0, totalExcused = 0, totalLate = 0;
    const absentByClass = new Map();
    const absentByDay = {};

    weekAttendance.forEach(a => {
      const status = (a.status || '').toLowerCase();
      if (status === 'present' || status === 'keldi') totalPresent++;
      else if (status === 'absent' || status === 'kelmadi') {
        totalAbsent++;
        const cid = a.class.toString();
        if (!absentByClass.has(cid)) absentByClass.set(cid, 0);
        absentByClass.set(cid, absentByClass.get(cid) + 1);

        const day = new Date(a.date).toISOString().split('T')[0];
        absentByDay[day] = (absentByDay[day] || 0) + 1;
      }
      else if (status === 'excused' || status === 'sababli') totalExcused++;
      else if (status === 'late') totalLate++;
    });

    // Calculate grading progress for week
    let totalExpected = 0, totalCompleted = 0;
    // Calculate lesson by lesson for each day in the week
    const tempDate = new Date(weekStart);
    while (tempDate <= weekEnd && tempDate <= now) {
      const dayLessons = await getScheduledLessonsForDate(new Date(tempDate));
      const dayStart = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 23, 59, 59, 999);

      const dayGrades = weekGrades.filter(g => {
        const gd = new Date(g.date);
        return gd >= dayStart && gd <= dayEnd;
      });
      const dayAtt = weekAttendance.filter(a => {
        const ad = new Date(a.date);
        return ad >= dayStart && ad <= dayEnd;
      });

      const gradedByClassSubject = new Map();
      dayGrades.forEach(g => {
        const key = `${g.class}_${g.subject}`;
        if (!gradedByClassSubject.has(key)) gradedByClassSubject.set(key, new Set());
        gradedByClassSubject.get(key).add(g.student.toString());
      });

      const absentByClassSubject = new Map();
      dayAtt.forEach(a => {
        const st = (a.status || '').toLowerCase();
        if (st === 'absent' || st === 'kelmadi') {
          const key = `${a.class}_${a.subject}`;
          if (!absentByClassSubject.has(key)) absentByClassSubject.set(key, new Set());
          absentByClassSubject.get(key).add(a.student.toString());
        }
      });

      for (const lesson of dayLessons) {
        const cls = classMap.get(lesson.classId.toString());
        if (!cls) continue;
        const key = `${lesson.classId}_${lesson.subjectId}`;
        const absent = absentByClassSubject.get(key)?.size || 0;
        const expected = cls.students.length - absent;
        const actual = gradedByClassSubject.get(key)?.size || 0;
        totalExpected += expected;
        totalCompleted += Math.min(actual, expected);
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Absent by class list
    const absentClassList = [];
    for (const [classId, count] of absentByClass) {
      const cls = classMap.get(classId);
      absentClassList.push({
        classId,
        className: cls ? (cls.name || `${cls.grade}-${cls.section}`) : 'Nomalum',
        absentCount: count
      });
    }
    absentClassList.sort((a, b) => b.absentCount - a.absentCount);

    const progress = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 100;

    res.json({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: now.toISOString().split('T')[0],
      progress,
      totalExpected,
      totalCompleted,
      attendance: {
        present: totalPresent,
        absent: totalAbsent,
        excused: totalExcused,
        late: totalLate,
        total: weekAttendance.length,
        rate: weekAttendance.length > 0 ? Math.round((totalPresent / weekAttendance.length) * 100) : 0
      },
      grades: {
        total: weekGrades.length
      },
      absentByClass: absentClassList,
      absentByDay
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/reports/monthly
// @desc    Tanlangan oy hisoboti (baho, davomat, moliya)
// @access  Private/Admin
router.get('/reports/monthly', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const today = new Date();
    const effectiveEnd = monthEnd < today ? monthEnd : today;

    const classes = await Class.find({ isActive: true })
      .populate('students', 'firstName lastName studentId')
      .lean();
    const classMap = new Map(classes.map(c => [c._id.toString(), c]));
    const allStudentIds = classes.flatMap(c => c.students.map(s => s._id));

    // Attendance for the month
    const monthAttendance = await Attendance.find({
      date: { $gte: monthStart, $lte: monthEnd }
    }).populate('student', 'firstName lastName').lean();

    let att = { present: 0, absent: 0, excused: 0, late: 0 };
    const absentCountByStudent = new Map();
    monthAttendance.forEach(a => {
      const st = (a.status || '').toLowerCase();
      if (st === 'present' || st === 'keldi') att.present++;
      else if (st === 'absent' || st === 'kelmadi') {
        att.absent++;
        const sid = a.student?._id?.toString() || a.student?.toString();
        if (sid) {
          absentCountByStudent.set(sid, {
            count: (absentCountByStudent.get(sid)?.count || 0) + 1,
            name: a.student?.firstName ? `${a.student.firstName} ${a.student.lastName}` : 'Nomalum',
            classId: a.class?.toString()
          });
        }
      }
      else if (st === 'excused' || st === 'sababli') att.excused++;
      else if (st === 'late') att.late++;
    });
    att.total = monthAttendance.length;
    att.rate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;

    // Most absent students
    const topAbsent = Array.from(absentCountByStudent.entries())
      .map(([sid, data]) => {
        const cls = data.classId ? classMap.get(data.classId) : null;
        return {
          studentId: sid,
          name: data.name,
          className: cls ? (cls.name || `${cls.grade}-${cls.section}`) : '-',
          absentDays: data.count
        };
      })
      .sort((a, b) => b.absentDays - a.absentDays)
      .slice(0, 20);

    // Grades for the month
    const monthGrades = await Grade.find({
      date: { $gte: monthStart, $lte: monthEnd }
    }).lean();

    // Calculate grading progress for the month (day by day up to effectiveEnd)
    let totalExpected = 0, totalCompleted = 0;
    const tempDate = new Date(monthStart);
    while (tempDate <= effectiveEnd) {
      if (tempDate.getDay() !== 0) { // skip Sunday
        const dayLessons = await getScheduledLessonsForDate(new Date(tempDate));
        const dayStart = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 23, 59, 59, 999);

        const dayGrades = monthGrades.filter(g => {
          const gd = new Date(g.date);
          return gd >= dayStart && gd <= dayEnd;
        });
        const dayAtt = monthAttendance.filter(a => {
          const ad = new Date(a.date);
          return ad >= dayStart && ad <= dayEnd;
        });

        const gradedMap = new Map();
        dayGrades.forEach(g => {
          const key = `${g.class}_${g.subject}`;
          if (!gradedMap.has(key)) gradedMap.set(key, new Set());
          gradedMap.get(key).add(g.student.toString());
        });

        const absentMap = new Map();
        dayAtt.forEach(a => {
          const st = (a.status || '').toLowerCase();
          if (st === 'absent' || st === 'kelmadi') {
            const key = `${a.class}_${a.subject}`;
            if (!absentMap.has(key)) absentMap.set(key, new Set());
            absentMap.get(key).add(a.student.toString());
          }
        });

        for (const lesson of dayLessons) {
          const cls = classMap.get(lesson.classId.toString());
          if (!cls) continue;
          const key = `${lesson.classId}_${lesson.subjectId}`;
          const absent = absentMap.get(key)?.size || 0;
          const expected = cls.students.length - absent;
          const actual = gradedMap.get(key)?.size || 0;
          totalExpected += expected;
          totalCompleted += Math.min(actual, expected);
        }
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const gradingProgress = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 100;

    // Ungraded lessons summary (which teachers have ungraded lessons)
    const ungradedByTeacher = new Map();
    // We need to recalculate for ungraded specifics
    const tempDate2 = new Date(monthStart);
    while (tempDate2 <= effectiveEnd) {
      if (tempDate2.getDay() !== 0) {
        const dayLessons = await getScheduledLessonsForDate(new Date(tempDate2));
        const dayStart = new Date(tempDate2.getFullYear(), tempDate2.getMonth(), tempDate2.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(tempDate2.getFullYear(), tempDate2.getMonth(), tempDate2.getDate(), 23, 59, 59, 999);
        const dayGrades = monthGrades.filter(g => {
          const gd = new Date(g.date);
          return gd >= dayStart && gd <= dayEnd;
        });
        const gradedMap2 = new Map();
        dayGrades.forEach(g => {
          const key = `${g.class}_${g.subject}`;
          if (!gradedMap2.has(key)) gradedMap2.set(key, new Set());
          gradedMap2.get(key).add(g.student.toString());
        });

        for (const lesson of dayLessons) {
          const cls = classMap.get(lesson.classId.toString());
          if (!cls) continue;
          const key = `${lesson.classId}_${lesson.subjectId}`;
          const graded = gradedMap2.get(key)?.size || 0;
          if (graded < cls.students.length) {
            const tid = lesson.teacherId.toString();
            if (!ungradedByTeacher.has(tid)) {
              ungradedByTeacher.set(tid, {
                teacherName: lesson.teacherName,
                ungradedCount: 0,
                details: []
              });
            }
            const t = ungradedByTeacher.get(tid);
            t.ungradedCount++;
            if (t.details.length < 5) { // limit details
              t.details.push({
                className: cls.name || `${cls.grade}-${cls.section}`,
                subjectName: lesson.subjectName,
                date: tempDate2.toISOString().split('T')[0]
              });
            }
          }
        }
      }
      tempDate2.setDate(tempDate2.getDate() + 1);
    }

    const ungradedTeachers = Array.from(ungradedByTeacher.values())
      .sort((a, b) => b.ungradedCount - a.ungradedCount);

    // Financial: payment stats for this month
    const paymentMonth = `${year}-${String(month).padStart(2, '0')}`;
    const studentFees = await StudentFee.find({ isActive: true }).lean();
    const feeMap = new Map(studentFees.map(f => [f.studentId.toString(), f]));

    const monthPayments = await Payment.find({
      paymentMonth: paymentMonth,
      status: 'completed',
      isDeleted: { $ne: true }
    }).lean();

    const paidStudents = new Set(monthPayments.map(p => p.studentId.toString()));

    let totalShouldPay = 0, totalPaid = 0, totalPartial = 0, totalUnpaid = 0;
    const unpaidList = [];

    for (const cls of classes) {
      for (const student of cls.students) {
        const sid = student._id.toString();
        const fee = feeMap.get(sid);
        const monthlyFee = fee ? fee.monthlyFee * (1 - (fee.discount || 0) / 100) : 500000;

        totalShouldPay++;

        const studentPayments = monthPayments.filter(p => p.studentId.toString() === sid);
        const totalPaidAmount = studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        if (totalPaidAmount >= monthlyFee) {
          totalPaid++;
        } else if (totalPaidAmount > 0) {
          totalPartial++;
        } else {
          totalUnpaid++;
          unpaidList.push({
            studentId: sid,
            name: `${student.firstName} ${student.lastName}`,
            className: cls.name || `${cls.grade}-${cls.section}`,
            monthlyFee: Math.round(monthlyFee),
            paidAmount: totalPaidAmount
          });
        }
      }
    }

    const finance = {
      totalStudents: totalShouldPay,
      paidCount: totalPaid,
      paidPercent: totalShouldPay > 0 ? Math.round((totalPaid / totalShouldPay) * 100) : 0,
      partialCount: totalPartial,
      partialPercent: totalShouldPay > 0 ? Math.round((totalPartial / totalShouldPay) * 100) : 0,
      unpaidCount: totalUnpaid,
      unpaidPercent: totalShouldPay > 0 ? Math.round((totalUnpaid / totalShouldPay) * 100) : 0,
      unpaidList: unpaidList.slice(0, 20)
    };

    res.json({
      month,
      year,
      monthName: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'][month - 1],
      gradingProgress,
      totalExpected,
      totalCompleted,
      attendance: att,
      topAbsent,
      ungradedTeachers,
      grades: {
        total: monthGrades.length
      },
      finance
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stats/reports/yearly
// @desc    Yillik hisobot (Avg 1 – Iyun 30)
// @access  Private/Admin
router.get('/reports/yearly', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const now = new Date();
    // Determine academic year: if current month >= August, year starts this year
    // Otherwise year started last year
    const currentMonth = now.getMonth(); // 0-indexed
    const academicStartYear = currentMonth >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const yearStart = new Date(academicStartYear, 7, 1, 0, 0, 0, 0); // Aug 1
    const yearEnd = new Date(academicStartYear + 1, 5, 30, 23, 59, 59, 999); // Jun 30
    const effectiveEnd = yearEnd < now ? yearEnd : now;

    const classes = await Class.find({ isActive: true })
      .populate('students', 'firstName lastName studentId')
      .lean();
    const classMap = new Map(classes.map(c => [c._id.toString(), c]));

    // Academic months: Aug(8), Sep(9), Oct(10), Nov(11), Dec(12), Jan(1), Feb(2), Mar(3), Apr(4), May(5), Jun(6)
    const academicMonths = [
      { month: 8, year: academicStartYear },
      { month: 9, year: academicStartYear },
      { month: 10, year: academicStartYear },
      { month: 11, year: academicStartYear },
      { month: 12, year: academicStartYear },
      { month: 1, year: academicStartYear + 1 },
      { month: 2, year: academicStartYear + 1 },
      { month: 3, year: academicStartYear + 1 },
      { month: 4, year: academicStartYear + 1 },
      { month: 5, year: academicStartYear + 1 },
      { month: 6, year: academicStartYear + 1 }
    ];

    const monthNames = ['', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

    // Get all attendance and grades for the year at once
    const allAttendance = await Attendance.find({
      date: { $gte: yearStart, $lte: effectiveEnd }
    }).lean();

    const allGrades = await Grade.find({
      date: { $gte: yearStart, $lte: effectiveEnd }
    }).lean();

    // All payments for the academic year
    const allPayments = await Payment.find({
      status: 'completed',
      isDeleted: { $ne: true },
      paymentDate: { $gte: yearStart, $lte: effectiveEnd }
    }).lean();

    const studentFees = await StudentFee.find({ isActive: true }).lean();
    const feeMap = new Map(studentFees.map(f => [f.studentId.toString(), f]));

    // Calculate per-month stats
    const monthlyStats = [];
    let yearTotalExpected = 0, yearTotalCompleted = 0;
    let yearAttPresent = 0, yearAttTotal = 0;
    let yearPaidMonths = 0, yearTotalStudentMonths = 0;

    for (const am of academicMonths) {
      const mStart = new Date(am.year, am.month - 1, 1, 0, 0, 0, 0);
      const mEnd = new Date(am.year, am.month, 0, 23, 59, 59, 999);

      // Skip future months
      if (mStart > effectiveEnd) {
        monthlyStats.push({
          month: am.month,
          year: am.year,
          monthName: monthNames[am.month],
          gradingProgress: null,
          attendanceRate: null,
          paymentPercent: null,
          isFuture: true
        });
        continue;
      }

      const mEffEnd = mEnd < effectiveEnd ? mEnd : effectiveEnd;

      // Month attendance
      const mAtt = allAttendance.filter(a => {
        const d = new Date(a.date);
        return d >= mStart && d <= mEnd;
      });
      const mPresent = mAtt.filter(a => ['present', 'keldi'].includes((a.status || '').toLowerCase())).length;
      const attRate = mAtt.length > 0 ? Math.round((mPresent / mAtt.length) * 100) : 0;
      yearAttPresent += mPresent;
      yearAttTotal += mAtt.length;

      // Month grades
      const mGrades = allGrades.filter(g => {
        const d = new Date(g.date);
        return d >= mStart && d <= mEnd;
      });

      // Calculate grading progress for this month
      let mExpected = 0, mCompleted = 0;
      const tmpDate = new Date(mStart);
      while (tmpDate <= mEffEnd) {
        if (tmpDate.getDay() !== 0) {
          const dayLessons = await getScheduledLessonsForDate(new Date(tmpDate));
          const dStart = new Date(tmpDate.getFullYear(), tmpDate.getMonth(), tmpDate.getDate(), 0, 0, 0, 0);
          const dEnd = new Date(tmpDate.getFullYear(), tmpDate.getMonth(), tmpDate.getDate(), 23, 59, 59, 999);

          const dGrades = mGrades.filter(g => { const gd = new Date(g.date); return gd >= dStart && gd <= dEnd; });
          const dAtt = mAtt.filter(a => { const ad = new Date(a.date); return ad >= dStart && ad <= dEnd; });

          const gMap = new Map();
          dGrades.forEach(g => {
            const key = `${g.class}_${g.subject}`;
            if (!gMap.has(key)) gMap.set(key, new Set());
            gMap.get(key).add(g.student.toString());
          });
          const aMap = new Map();
          dAtt.forEach(a => {
            const st = (a.status || '').toLowerCase();
            if (st === 'absent' || st === 'kelmadi') {
              const key = `${a.class}_${a.subject}`;
              if (!aMap.has(key)) aMap.set(key, new Set());
              aMap.get(key).add(a.student.toString());
            }
          });

          for (const lesson of dayLessons) {
            const cls = classMap.get(lesson.classId.toString());
            if (!cls) continue;
            const key = `${lesson.classId}_${lesson.subjectId}`;
            const absent = aMap.get(key)?.size || 0;
            const expected = cls.students.length - absent;
            const actual = gMap.get(key)?.size || 0;
            mExpected += expected;
            mCompleted += Math.min(actual, expected);
          }
        }
        tmpDate.setDate(tmpDate.getDate() + 1);
      }

      yearTotalExpected += mExpected;
      yearTotalCompleted += mCompleted;
      const gradingProg = mExpected > 0 ? Math.round((mCompleted / mExpected) * 100) : 100;

      // Month finance
      const payMonth = `${am.year}-${String(am.month).padStart(2, '0')}`;
      const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);
      const mPayments = allPayments.filter(p => p.paymentMonth === payMonth);
      const paidStudentIds = new Set(mPayments.map(p => p.studentId.toString()));
      const paymentPercent = totalStudents > 0 ? Math.round((paidStudentIds.size / totalStudents) * 100) : 0;
      yearPaidMonths += paidStudentIds.size;
      yearTotalStudentMonths += totalStudents;

      monthlyStats.push({
        month: am.month,
        year: am.year,
        monthName: monthNames[am.month],
        gradingProgress: gradingProg,
        gradingExpected: mExpected,
        gradingCompleted: mCompleted,
        attendanceRate: attRate,
        attendanceTotal: mAtt.length,
        paymentPercent,
        paidStudents: paidStudentIds.size,
        totalStudents,
        totalGrades: mGrades.length,
        isFuture: false
      });
    }

    const overallGradingProgress = yearTotalExpected > 0
      ? Math.round((yearTotalCompleted / yearTotalExpected) * 100) : 100;
    const overallAttendanceRate = yearAttTotal > 0
      ? Math.round((yearAttPresent / yearAttTotal) * 100) : 0;
    const overallPaymentPercent = yearTotalStudentMonths > 0
      ? Math.round((yearPaidMonths / yearTotalStudentMonths) * 100) : 0;

    res.json({
      academicYear: `${academicStartYear}-${academicStartYear + 1}`,
      yearStart: yearStart.toISOString().split('T')[0],
      yearEnd: yearEnd.toISOString().split('T')[0],
      overall: {
        gradingProgress: overallGradingProgress,
        attendanceRate: overallAttendanceRate,
        paymentPercent: overallPaymentPercent,
        totalGrades: allGrades.length,
        totalAttendance: allAttendance.length
      },
      monthlyStats
    });
  } catch (error) {
    console.error('Yearly report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

