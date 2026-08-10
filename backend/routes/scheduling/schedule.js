const express = require('express');
const router = express.Router();
const Class = require('../../models/academic/Class');
const Schedule = require('../../models/scheduling/Schedule');
const TeacherLesson = require('../../models/scheduling/TeacherLesson');
const Holiday = require('../../models/scheduling/Holiday');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');
const { rateLimiters } = require('../../middleware/rateLimit');
const { securityMiddleware, sanitizeString } = require('../../middleware/security');
const { syncScheduleToClassAndUser } = require('../../utils/scheduleSynchronizer');

// Apply security middleware to all routes
router.use(securityMiddleware);

// Error logger helper - Production ready
const logError = (context, error, userId = null) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    userId,
    error: {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name
    }
  };

  // Only log in development - silent in production for security
  if (process.env.NODE_ENV === 'development') {
  }
  // In production, this would integrate with a logging service like Winston/Sentry
  // For now, errors are handled gracefully without console pollution
};

// Validation helper - Including Sunday
const isValidDay = (day) => {
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return validDays.includes(day);
};

const teacherLessonPopulate = [
  { path: 'classId', select: 'name grade section room' },
  { path: 'subject', select: 'name code color' }
];

const getTeacherLessonAccess = async (teacherId) => {
  const classes = await Class.find({
    isActive: true,
    subjects: { $elemMatch: { teacher: teacherId } }
  }).select('name grade section room subjects').populate('subjects.subject', 'name code color').lean();

  return classes.map(cls => ({
    _id: cls._id,
    name: cls.name,
    grade: cls.grade,
    section: cls.section,
    room: cls.room || '',
    subjects: (cls.subjects || [])
      .filter(item => String(item.teacher) === String(teacherId) && item.subject)
      .map(item => item.subject)
  }));
};

// Teacher-managed personal lesson list
router.get('/teacher/lesson-list/options', rateLimiters.api, auth, authorize('teacher'), async (req, res) => {
  try {
    res.json(await getTeacherLessonAccess(req.user._id));
  } catch (error) {
    logError('GET /schedule/teacher/lesson-list/options', error, req.user?.id);
    res.status(500).json({ message: 'Sinf va fanlarni yuklashda xatolik' });
  }
});

router.get('/teacher/lesson-list', rateLimiters.api, auth, authorize('teacher'), async (req, res) => {
  try {
    const lessons = await TeacherLesson.find({ teacher: req.user._id })
      .populate(teacherLessonPopulate)
      .sort({ day: 1, startTime: 1 });
    res.json(lessons);
  } catch (error) {
    logError('GET /schedule/teacher/lesson-list', error, req.user?.id);
    res.status(500).json({ message: 'Darslar ro\'yxatini yuklashda xatolik' });
  }
});

router.post('/teacher/lesson-list', rateLimiters.api, auth, authorize('teacher'), async (req, res) => {
  try {
    const { classId, subject, day, startTime, endTime, room = '', note = '' } = req.body;
    if (!classId || !subject || !isValidDay(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || '')) {
      return res.status(400).json({ message: 'Dars ma\'lumotlarini to\'liq va to\'g\'ri kiriting' });
    }
    if (startTime >= endTime) return res.status(400).json({ message: 'Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak' });

    const allowedClass = await Class.exists({
      _id: classId,
      isActive: true,
      subjects: { $elemMatch: { subject, teacher: req.user._id } }
    });
    if (!allowedClass) return res.status(403).json({ message: 'Bu sinf va fan sizga biriktirilmagan' });

    const conflict = await TeacherLesson.exists({
      teacher: req.user._id,
      day,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });
    if (conflict) return res.status(409).json({ message: 'Bu vaqtda boshqa dars mavjud' });

    const lesson = await TeacherLesson.create({
      teacher: req.user._id, classId, subject, day, startTime, endTime,
      room: sanitizeString(String(room)).slice(0, 60),
      note: sanitizeString(String(note)).slice(0, 300)
    });
    await lesson.populate(teacherLessonPopulate);
    res.status(201).json(lesson);
  } catch (error) {
    logError('POST /schedule/teacher/lesson-list', error, req.user?.id);
    const duplicate = error?.code === 11000;
    res.status(duplicate ? 409 : 500).json({ message: duplicate ? 'Bu dars ro\'yxatda mavjud' : 'Darsni saqlashda xatolik' });
  }
});

router.put('/teacher/lesson-list/:id', rateLimiters.api, auth, authorize('teacher'), async (req, res) => {
  try {
    const lesson = await TeacherLesson.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!lesson) return res.status(404).json({ message: 'Dars topilmadi' });
    const { classId, subject, day, startTime, endTime, room = '', note = '' } = req.body;
    if (!classId || !subject || !isValidDay(day) || !startTime || !endTime || startTime >= endTime) {
      return res.status(400).json({ message: 'Dars ma\'lumotlarini to\'g\'ri kiriting' });
    }
    const allowedClass = await Class.exists({ _id: classId, isActive: true, subjects: { $elemMatch: { subject, teacher: req.user._id } } });
    if (!allowedClass) return res.status(403).json({ message: 'Bu sinf va fan sizga biriktirilmagan' });
    const conflict = await TeacherLesson.exists({ _id: { $ne: lesson._id }, teacher: req.user._id, day, startTime: { $lt: endTime }, endTime: { $gt: startTime } });
    if (conflict) return res.status(409).json({ message: 'Bu vaqtda boshqa dars mavjud' });
    Object.assign(lesson, { classId, subject, day, startTime, endTime, room: sanitizeString(String(room)).slice(0, 60), note: sanitizeString(String(note)).slice(0, 300) });
    await lesson.save();
    await lesson.populate(teacherLessonPopulate);
    res.json(lesson);
  } catch (error) {
    logError('PUT /schedule/teacher/lesson-list', error, req.user?.id);
    res.status(500).json({ message: 'Darsni yangilashda xatolik' });
  }
});

router.delete('/teacher/lesson-list/:id', rateLimiters.api, auth, authorize('teacher'), async (req, res) => {
  try {
    const lesson = await TeacherLesson.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!lesson) return res.status(404).json({ message: 'Dars topilmadi' });
    res.json({ message: 'Dars o\'chirildi' });
  } catch (error) {
    logError('DELETE /schedule/teacher/lesson-list', error, req.user?.id);
    res.status(500).json({ message: 'Darsni o\'chirishda xatolik' });
  }
});

// Get student's schedule
router.get('/student', rateLimiters.api, auth, async (req, res) => {
  try {
    // Validate user ID
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the class where the student is enrolled
    const studentClass = await Class.findOne({
      students: req.user.id,
      isActive: true
    })
      .populate('subjects.subject', 'name code color')
      .populate('subjects.teacher', 'firstName lastName')
      .lean(); // Use lean for better performance

    if (!studentClass) {
      return res.status(404).json({ message: 'No active class found for student' });
    }

    // Get current schedule for the class
    const currentSchedule = await Schedule.findCurrentSchedule(studentClass._id);

    // Format the schedule data
    const schedule = {
      className: studentClass.name,
      grade: studentClass.grade,
      section: studentClass.section,
      academicYear: studentClass.academicYear,
      weeklySchedule: currentSchedule ? currentSchedule.schedule : [],
      subjects: studentClass.subjects || [],
      scheduleInfo: currentSchedule ? {
        name: currentSchedule.name,
        startDate: currentSchedule.startDate,
        endDate: currentSchedule.endDate,
        status: currentSchedule.getStatus(),
        semester: currentSchedule.semester
      } : null
    };

    res.json(schedule);
  } catch (error) {
    logError('GET /schedule/student', error, req.user?.id);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's schedule for student
router.get('/student/today', rateLimiters.api, auth, async (req, res) => {
  try {
    // Validate user ID
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Validate day
    if (!isValidDay(today)) {
      return res.status(400).json({ message: 'Invalid day' });
    }

    const studentClass = await Class.findOne({
      students: req.user.id,
      isActive: true
    })
      .lean();

    if (!studentClass) {
      return res.status(404).json({ message: 'No active class found for student' });
    }

    // Get current schedule for the class
    const currentSchedule = await Schedule.findCurrentSchedule(studentClass._id);

    // Find today's schedule
    const todaySchedule = currentSchedule?.schedule.find(day => day.day === today);

    const response = {
      day: today,
      className: studentClass.name,
      periods: todaySchedule ? todaySchedule.periods : []
    };

    res.json(response);
  } catch (error) {
    logError('GET /schedule/student/today', error, req.user?.id);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current period for student
router.get('/student/current', rateLimiters.api, auth, async (req, res) => {
  try {
    // Validate user ID
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Validate day
    if (!isValidDay(today)) {
      return res.status(400).json({ message: 'Invalid day' });
    }

    const studentClass = await Class.findOne({
      students: req.user.id,
      isActive: true
    })
      .lean();

    if (!studentClass) {
      return res.status(404).json({ message: 'No active class found for student' });
    }

    // Get current schedule for the class
    const currentSchedule = await Schedule.findCurrentSchedule(studentClass._id);

    // Find today's schedule
    const todaySchedule = currentSchedule?.schedule.find(day => day.day === today);

    let currentPeriod = null;
    let nextPeriod = null;

    if (todaySchedule && todaySchedule.periods) {
      // Find current and next period
      for (let i = 0; i < todaySchedule.periods.length; i++) {
        const period = todaySchedule.periods[i];

        if (currentTime >= period.startTime && currentTime < period.endTime) {
          currentPeriod = period;
          nextPeriod = todaySchedule.periods[i + 1] || null;
          break;
        } else if (currentTime < period.startTime) {
          nextPeriod = period;
          break;
        }
      }
    }

    res.json({
      day: today,
      currentTime,
      currentPeriod,
      nextPeriod,
      className: studentClass.name
    });
  } catch (error) {
    logError('GET /schedule/student/current', error, req.user?.id);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get schedule for specific day
router.get('/student/day/:day', rateLimiters.api, auth, async (req, res) => {
  try {
    // Validate user ID
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Sanitize and validate day parameter
    const day = sanitizeString(req.params.day);

    if (!isValidDay(day)) {
      return res.status(400).json({ message: 'Invalid day parameter' });
    }

    const studentClass = await Class.findOne({
      students: req.user.id,
      isActive: true
    })
      .lean();

    if (!studentClass) {
      return res.status(404).json({ message: 'No active class found for student' });
    }

    // Get current schedule for the class
    const currentSchedule = await Schedule.findCurrentSchedule(studentClass._id);

    // Find the specific day's schedule
    const daySchedule = currentSchedule?.schedule.find(scheduleDay => scheduleDay.day === day);

    const response = {
      day,
      className: studentClass.name,
      periods: daySchedule ? daySchedule.periods : []
    };

    res.json(response);
  } catch (error) {
    logError('GET /schedule/student/day/:day', error, req.user?.id);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher's schedule - OPTIMIZED
router.get('/teacher', rateLimiters.api, auth, authorize('teacher', 'admin', 'director', 'supervisor', 'accountant'), async (req, res) => {
  try {
    // Validate user ID
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Optimized query with projection to reduce data transfer
    const teacherUserId = req.query.teacherId || req.user._id || req.user.id;
    const classes = await Class.find({
      'subjects.teacher': teacherUserId,
      isActive: true
    })
      .select('name _id') // Only select needed fields
      .lean(); // Use lean for better performance

    // Build teacher schedule with optimized algorithm
    const teacherScheduleMap = new Map();
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Get the teacher's user ID as string for comparison
    const currentTeacherId = teacherUserId.toString();

    // Get schedules for all teacher's classes
    for (const classItem of classes) {
      const currentSchedule = await Schedule.findCurrentSchedule(classItem._id);

      if (currentSchedule) {
        currentSchedule.schedule.forEach(daySchedule => {
          // Get or create day entry
          if (!teacherScheduleMap.has(daySchedule.day)) {
            teacherScheduleMap.set(daySchedule.day, {
              day: daySchedule.day,
              periods: []
            });
          }

          const teacherDay = teacherScheduleMap.get(daySchedule.day);

          // Add only periods where this teacher teaches
          daySchedule.periods.forEach(period => {
            // Check if period has teacher and handle both populated and non-populated cases
            const periodTeacherId = period.teacher?._id?.toString() || period.teacher?.toString();
            if (periodTeacherId && periodTeacherId === currentTeacherId) {
              teacherDay.periods.push({
                ...period.toObject ? period.toObject() : { ...period },
                className: classItem.name,
                classId: classItem._id
              });
            }
          });
        });
      }
    }

    // Convert map to sorted array
    const teacherSchedule = Array.from(teacherScheduleMap.values());

    // Sort days and periods
    teacherSchedule.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
    teacherSchedule.forEach(day => {
      day.periods.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    res.json(teacherSchedule);
  } catch (error) {
    logError('GET /schedule/teacher', error, req.user?.id);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update period topic - OPTIMIZED
router.put('/teacher/period/:classId/:day/:periodIndex', rateLimiters.api, auth, authorize('teacher'), requirePermission('schedule.edit_topic'), async (req, res) => {
  try {
    // Validate user ID
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { classId, day, periodIndex } = req.params;
    const { topic } = req.body;

    // Sanitize and validate inputs
    const sanitizedDay = sanitizeString(day);
    const sanitizedTopic = sanitizeString(topic);

    if (!isValidDay(sanitizedDay)) {
      return res.status(400).json({ message: 'Kun noto\'g\'ri' });
    }

    const periodIdx = parseInt(periodIndex);
    if (isNaN(periodIdx) || periodIdx < 0) {
      return res.status(400).json({ message: 'Dars indeksi noto\'g\'ri' });
    }

    // Validate classId format
    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Sinf ID noto\'g\'ri' });
    }

    // Validate topic length
    if (sanitizedTopic.length > 200) {
      return res.status(400).json({ message: 'Mavzu juda uzun (maksimum 200 belgi)' });
    }

    // Get current schedule for the class
    const currentSchedule = await Schedule.findCurrentSchedule(classId);

    if (!currentSchedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    // Find the day schedule
    const daySchedule = currentSchedule.schedule.find(s => s.day === sanitizedDay);

    if (!daySchedule) {
      return res.status(404).json({ message: 'Kun jadvali topilmadi' });
    }

    // Check if period exists and belongs to this teacher
    const period = daySchedule.periods[periodIdx];

    if (!period) {
      return res.status(404).json({ message: 'Dars topilmadi' });
    }

    if (period.teacher._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    // Update topic
    period.topic = sanitizedTopic;
    await currentSchedule.save();

    // Return updated period
    const updatedSchedule = await Schedule.findById(currentSchedule._id)
      .populate('schedule.periods.subject', 'name code color')
      .populate('schedule.periods.teacher', 'firstName lastName')
      .lean();

    const updatedDaySchedule = updatedSchedule.schedule.find(s => s.day === sanitizedDay);
    const updatedPeriod = updatedDaySchedule.periods[periodIdx];

    res.json(updatedPeriod);
  } catch (error) {
    logError('PUT /schedule/teacher/period', error, req.user?.id);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============= ADMIN SCHEDULE MANAGEMENT ROUTES =============

// Get all schedules for a class
router.get('/class/:classId', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { classId } = req.params;

    // Validate classId format
    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Sinf ID noto\'g\'ri' });
    }

    // findByClass allaqachon barcha kerakli populate'larni bajaradi
    const schedules = await Schedule.findByClass(classId);

    // Add status to each schedule
    const schedulesWithStatus = schedules.map(schedule => ({
      ...schedule.toObject(),
      status: schedule.getStatus()
    }));

    res.json(schedulesWithStatus);
  } catch (error) {
    logError('GET /schedule/class/:classId', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Get current active schedule for a class
router.get('/class/:classId/current', rateLimiters.api, auth, async (req, res) => {
  try {
    const { classId } = req.params;

    // Validate classId format
    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Sinf ID noto\'g\'ri' });
    }

    let schedule;
    if (req.query.date) {
      const targetDate = new Date(req.query.date);
      if (Number.isNaN(targetDate.getTime())) {
        return res.status(400).json({ message: 'Sana noto\'g\'ri' });
      }
      targetDate.setHours(12, 0, 0, 0);
      schedule = await Schedule.findOne({
        classId,
        isActive: true,
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate }
      })
        .populate('schedule.periods.subject', 'name code color')
        .populate('schedule.periods.teacher', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .sort({ startDate: -1 });
    } else {
      schedule = await Schedule.findCurrentSchedule(classId);
    }

    if (!schedule) {
      if (req.query.date) {
        return res.json({
          schedule: [],
          startDate: null,
          endDate: null,
          status: 'not_found',
          message: 'Bu sana uchun jadval topilmadi'
        });
      }
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    res.json({
      ...schedule.toObject(),
      status: schedule.getStatus()
    });
  } catch (error) {
    logError('GET /schedule/class/:classId/current', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   GET /schedule/class/:classId/next-available-date
// @desc    Get next available start date for a class (after all existing schedules)
// @access  Private/Admin
router.get('/class/:classId/next-available-date', rateLimiters.api, auth, authorize('admin', 'director', 'supervisor'), async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Sinf ID noto\'g\'ri' });
    }

    // Find all active schedules for this class, sorted by startDate
    const schedules = await Schedule.find({
      classId,
      isActive: true
    }).sort({ startDate: 1 });

    // Barcha bayram kunlarini olish
    const holidays = await Holiday.find({ isActive: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sananing yakshanba yoki bayram ekanligini tekshirish
    const isSundayOrHoliday = (date) => {
      // Yakshanba (0)
      if (date.getDay() === 0) return true;
      // Bayram kunlarini tekshirish
      const dateOnly = date.toISOString().split('T')[0];
      return holidays.some(h => {
        const holidayDate = h.date.toISOString().split('T')[0];
        const holidayEndDate = h.endDate ? h.endDate.toISOString().split('T')[0] : null;
        if (holidayEndDate) {
          return dateOnly >= holidayDate && dateOnly <= holidayEndDate;
        }
        return dateOnly === holidayDate;
      });
    };

    // Bo'shliq faqat bayram/yakshanba kunlaridan iborat ekanligini tekshirish
    const isGapAllHolidays = (gapStart, gapEnd) => {
      if (!gapEnd) return false; // Cheksiz bo'shliq bayram bo'lishi mumkin emas

      const start = new Date(gapStart);
      const end = new Date(gapEnd);

      // Bo'shliqdagi har bir kunni tekshirish
      const current = new Date(start);
      while (current <= end) {
        if (!isSundayOrHoliday(current)) {
          return false; // Kamida bitta ish kuni bor
        }
        current.setDate(current.getDate() + 1);
      }
      return true; // Barcha kunlar bayram/yakshanba
    };

    // Keyingi mavjud ish kunini topish (yakshanba/bayramdan o'tib)
    const findNextWorkDay = (startDate) => {
      const date = new Date(startDate);
      let maxIterations = 60; // 2 oy davomida izlash
      while (isSundayOrHoliday(date) && maxIterations > 0) {
        date.setDate(date.getDate() + 1);
        maxIterations--;
      }
      return date;
    };

    let nextAvailableDate = new Date(today);

    if (schedules.length > 0) {
      const sortedSchedules = [...schedules].sort((a, b) => a.startDate - b.startDate);

      // Mavjud jadvallar oralig'ini olish (disabled sanalar uchun)
      const existingRanges = sortedSchedules.map(s => ({
        start: s.startDate.toISOString().split('T')[0],
        end: s.endDate.toISOString().split('T')[0],
        name: s.name
      }));

      // Bo'sh davrlarni topish (barcha gaps, o'tgan va kelgusi)
      const allGaps = [];

      // Birinchi jadvaldan oldingi bo'shliq
      const firstScheduleStart = sortedSchedules[0].startDate;
      // Bir yil oldindan boshlaymiz
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (firstScheduleStart > oneYearAgo) {
        const gapStart = oneYearAgo;
        const gapEnd = new Date(firstScheduleStart.getTime() - 24 * 60 * 60 * 1000);
        allGaps.push({
          start: gapStart,
          end: gapEnd,
          isAllHolidays: isGapAllHolidays(gapStart, gapEnd)
        });
      }

      // Jadvallar orasidagi bo'shliqlar
      for (let i = 0; i < sortedSchedules.length - 1; i++) {
        const currentEnd = sortedSchedules[i].endDate;
        const nextStart = sortedSchedules[i + 1].startDate;

        const gapStart = new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000);
        if (gapStart < nextStart) {
          const gapEnd = new Date(nextStart.getTime() - 24 * 60 * 60 * 1000);
          allGaps.push({
            start: gapStart,
            end: gapEnd,
            isAllHolidays: isGapAllHolidays(gapStart, gapEnd)
          });
        }
      }

      // Oxirgi jadvaldan keyingi bo'shliq (cheksiz)
      const latestEndDate = new Date(Math.max(...schedules.map(s => s.endDate.getTime())));
      const dayAfterLatest = new Date(latestEndDate.getTime() + 24 * 60 * 60 * 1000);
      allGaps.push({
        start: dayAfterLatest,
        end: null, // cheksiz
        isAllHolidays: false
      });

      // Tavsiya etiladigan boshlanish sanasi - eng yaqin bo'sh davr (faqat bayram bo'lmaganlar)
      const availableGaps = allGaps.filter(g => (g.end === null || g.end >= today) && !g.isAllHolidays);

      if (availableGaps.length > 0) {
        const firstAvailableGap = availableGaps[0];
        nextAvailableDate = firstAvailableGap.start < today ? today : firstAvailableGap.start;
        // Agar yakshanba/bayram bo'lsa, keyingi ish kunini topish
        nextAvailableDate = findNextWorkDay(nextAvailableDate);
      } else {
        // Agar barcha bo'shliqlar bayram bo'lsa, oxirgi jadvaldan keyin boshlash
        nextAvailableDate = findNextWorkDay(dayAfterLatest);
      }

      res.json({
        nextAvailableDate: nextAvailableDate.toISOString().split('T')[0],
        suggestedStartDate: nextAvailableDate.toISOString().split('T')[0],
        gaps: allGaps.map(g => ({
          start: g.start.toISOString().split('T')[0],
          end: g.end ? g.end.toISOString().split('T')[0] : null,
          isAllHolidays: g.isAllHolidays
        })),
        existingRanges: existingRanges,
        latestScheduleEnd: latestEndDate.toISOString().split('T')[0],
        hasExistingSchedules: true
      });
    } else {
      res.json({
        nextAvailableDate: today.toISOString().split('T')[0],
        suggestedStartDate: today.toISOString().split('T')[0],
        gaps: [{
          start: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0],
          end: null,
          isAllHolidays: false
        }],
        existingRanges: [],
        latestScheduleEnd: null,
        hasExistingSchedules: false
      });
    }
  } catch (error) {
    logError('GET /schedule/class/:classId/next-available-date', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   GET /schedule/expiring-schedules
// @desc    Get schedules that are expiring soon (within 3 days) or already expired
// @access  Private/Admin
router.get('/expiring-schedules', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    // Find expiring schedules (ending within 3 days)
    const expiringSchedules = await Schedule.find({
      isActive: true,
      endDate: {
        $gte: today,
        $lte: threeDaysLater
      }
    }).populate('classId', 'name grade section');

    // Find already expired schedules
    const expiredSchedules = await Schedule.find({
      isActive: true,
      endDate: { $lt: today }
    }).populate('classId', 'name grade section');

    // Helper: Check if class has future schedule
    const hasFutureSchedule = async (classId, currentEndDate) => {
      const futureSchedule = await Schedule.findOne({
        classId,
        isActive: true,
        startDate: { $gt: currentEndDate }
      });
      return !!futureSchedule;
    };

    // Calculate days remaining for expiring schedules (exclude if future schedule exists)
    const expiringWithDays = [];
    for (const schedule of expiringSchedules) {
      const hasFuture = await hasFutureSchedule(schedule.classId?._id, schedule.endDate);

      // Agar kelajakda jadval bor bo'lsa, ogohlantirish kerak emas
      if (hasFuture) continue;

      const endDate = new Date(schedule.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expiringWithDays.push({
        _id: schedule._id,
        name: schedule.name,
        className: schedule.classId?.name || 'Noma\'lum sinf',
        endDate: schedule.endDate,
        daysRemaining: diffDays
      });
    }

    // Calculate days overdue for expired schedules (exclude if future schedule exists)
    const expiredWithDays = [];
    for (const schedule of expiredSchedules) {
      const hasFuture = await hasFutureSchedule(schedule.classId?._id, schedule.endDate);

      // Agar kelajakda jadval bor bo'lsa, ogohlantirish kerak emas
      if (hasFuture) continue;

      const endDate = new Date(schedule.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - endDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expiredWithDays.push({
        _id: schedule._id,
        name: schedule.name,
        className: schedule.classId?.name || 'Noma\'lum sinf',
        endDate: schedule.endDate,
        daysOverdue: daysOverdue
      });
    }

    res.json({
      expiring: expiringWithDays,
      expired: expiredWithDays,
      totalExpiring: expiringWithDays.length,
      totalExpired: expiredWithDays.length
    });
  } catch (error) {
    logError('GET /schedule/expiring-schedules', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   POST /schedule/auto-extend-expired
// @desc    Automatically extend all expired schedules by 1 day
// @access  Private/Admin (or can be called by cron job)
router.post('/auto-extend-expired', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all expired active schedules
    const expiredSchedules = await Schedule.find({
      isActive: true,
      endDate: { $lt: today }
    });

    const extended = [];
    const failed = [];

    for (const schedule of expiredSchedules) {
      try {
        // Extend to today
        schedule.endDate = today;
        await schedule.save();
        extended.push({
          _id: schedule._id,
          name: schedule.name,
          newEndDate: schedule.endDate
        });
      } catch (err) {
        failed.push({
          _id: schedule._id,
          name: schedule.name,
          error: err.message
        });
      }
    }

    res.json({
      message: `${extended.length} ta jadval muddati uzaytirildi`,
      extended,
      failed,
      totalExtended: extended.length,
      totalFailed: failed.length
    });
  } catch (error) {
    logError('POST /schedule/auto-extend-expired', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Get single schedule by ID
router.get('/:id', rateLimiters.api, auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate id format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Jadval ID noto\'g\'ri' });
    }

    const schedule = await Schedule.findById(id)
      .populate('schedule.periods.subject', 'name code color')
      .populate('schedule.periods.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!schedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    res.json({
      ...schedule.toObject(),
      status: schedule.getStatus()
    });
  } catch (error) {
    logError('GET /schedule/:id', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Create new schedule
router.post('/', rateLimiters.api, auth, authorize('admin', 'director', 'supervisor'), requirePermission('schedule.edit'), async (req, res) => {
  try {
    const { classId, academicYear, semester, name, startDate, endDate, schedule, periodTimes } = req.body;

    // Validate required fields
    if (!classId || !academicYear || !name || !startDate || !endDate || !schedule) {
      return res.status(400).json({ message: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    // Validate classId format
    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Sinf ID noto\'g\'ri' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Sanalar noto\'g\'ri formatda' });
    }

    if (start >= end) {
      return res.status(400).json({ message: 'Tugash sanasi boshlanish sanasidan kechroq bo\'lishi kerak' });
    }

    // Verify class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    // Check for schedule overlap
    const scheduleValidator = require('../../utils/scheduleValidator');
    const overlapCheck = await scheduleValidator.checkScheduleOverlap(classId, start, end);

    if (overlapCheck.hasOverlap) {
      return res.status(400).json({
        message: 'Bu muddat boshqa jadval bilan to\'qnash keladi',
        overlappingSchedules: overlapCheck.overlappingSchedules.map(s => ({
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate
        }))
      });
    }

    // Check for teacher conflicts
    const conflictCheck = await scheduleValidator.validateScheduleForConflicts(classId, schedule);

    if (!conflictCheck.valid) {
      return res.status(400).json({
        message: 'O\'qituvchi to\'qnashuvi mavjud',
        conflicts: conflictCheck.conflicts.map(c => ({
          day: c.day,
          time: c.time,
          conflictingClass: c.className,
          message: `Bu o'qituvchi ${c.className} sinfida ${c.day} kuni ${c.time} vaqtida band`
        }))
      });
    }

    // Create new schedule
    const newSchedule = new Schedule({
      classId,
      academicYear,
      semester: semester || null,
      name: sanitizeString(name),
      startDate: start,
      endDate: end,
      periodTimes: periodTimes || [],
      schedule,
      isActive: true,
      createdBy: req.user.id
    });

    await newSchedule.save();

    // SYNCHRONIZATION: Update Class.subjects and User.subjects
    const syncResult = await syncScheduleToClassAndUser(classId, schedule);
    if (!syncResult.success) throw new Error(`Jadval biriktirishlarini sinxronlash xatosi: ${syncResult.error}`);

    // Populate and return
    const populatedSchedule = await Schedule.findById(newSchedule._id)
      .populate('schedule.periods.subject', 'name code color')
      .populate('schedule.periods.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      ...populatedSchedule.toObject(),
      status: populatedSchedule.getStatus()
    });
  } catch (error) {
    logError('POST /schedule', error, req.user?.id);
    res.status(500).json({ message: error.message || 'Server xatosi' });
  }
});

// @route   PUT /schedule/:id/extend
// @desc    Extend schedule end date by specified days
// @access  Private/Admin
router.put('/:id/extend', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { days, newEndDate } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Jadval ID noto\'g\'ri' });
    }

    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    let updatedEndDate;

    if (newEndDate) {
      updatedEndDate = new Date(newEndDate);
    } else if (days) {
      updatedEndDate = new Date(schedule.endDate);
      updatedEndDate.setDate(updatedEndDate.getDate() + parseInt(days));
    } else {
      // Default: extend by 1 day
      updatedEndDate = new Date(schedule.endDate);
      updatedEndDate.setDate(updatedEndDate.getDate() + 1);
    }

    // Check for overlap with other schedules
    const scheduleValidator = require('../../utils/scheduleValidator');
    const overlapCheck = await scheduleValidator.checkScheduleOverlap(
      schedule.classId,
      schedule.startDate,
      updatedEndDate,
      id
    );

    if (overlapCheck.hasOverlap) {
      return res.status(400).json({
        message: 'Yangi muddat boshqa jadval bilan to\'qnash keladi',
        overlappingSchedules: overlapCheck.overlappingSchedules.map(s => ({
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate
        }))
      });
    }

    schedule.endDate = updatedEndDate;
    await schedule.save();

    res.json({
      message: 'Jadval muddati uzaytirildi',
      schedule: {
        _id: schedule._id,
        name: schedule.name,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        status: schedule.getStatus()
      }
    });
  } catch (error) {
    logError('PUT /schedule/:id/extend', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Update schedule
router.put('/:id', rateLimiters.api, auth, authorize('admin', 'director', 'supervisor'), requirePermission('schedule.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { academicYear, semester, name, startDate, endDate, schedule, isActive, periodTimes } = req.body;
    // Validate id format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Jadval ID noto\'g\'ri' });
    }

    const existingSchedule = await Schedule.findById(id);

    if (!existingSchedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    // Update fields if provided
    if (academicYear) existingSchedule.academicYear = academicYear;
    if (semester !== undefined) existingSchedule.semester = semester;
    if (name) existingSchedule.name = sanitizeString(name);
    if (periodTimes) existingSchedule.periodTimes = periodTimes;
    if (schedule) existingSchedule.schedule = schedule;
    if (isActive !== undefined) existingSchedule.isActive = isActive;

    // Update dates if provided
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ message: 'Boshlanish sanasi noto\'g\'ri formatda' });
      }
      existingSchedule.startDate = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Tugash sanasi noto\'g\'ri formatda' });
      }
      existingSchedule.endDate = end;
    }

    // Check for schedule overlap (if dates are being updated)
    if (startDate || endDate) {
      const scheduleValidator = require('../../utils/scheduleValidator');
      const overlapCheck = await scheduleValidator.checkScheduleOverlap(
        existingSchedule.classId,
        existingSchedule.startDate,
        existingSchedule.endDate,
        id // Exclude current schedule from overlap check
      );

      if (overlapCheck.hasOverlap) {
        return res.status(400).json({
          message: 'Bu muddat boshqa jadval bilan to\'qnash keladi',
          overlappingSchedules: overlapCheck.overlappingSchedules.map(s => ({
            name: s.name,
            startDate: s.startDate,
            endDate: s.endDate
          }))
        });
      }
    }

    // Aktiv jadval tahrirlanganda ham yangi o'qituvchi to'qnashuvlarini tekshiramiz.
    if (schedule) {
      const scheduleValidator = require('../../utils/scheduleValidator');
      const conflictCheck = await scheduleValidator.validateScheduleForConflicts(
        existingSchedule.classId,
        schedule
      );


      if (!conflictCheck.valid) {
        return res.status(400).json({
          message: 'O\'qituvchi to\'qnashuvi mavjud',
          conflicts: conflictCheck.conflicts.map(c => ({
            day: c.day,
            time: c.time,
            conflictingClass: c.className,
            message: `Bu o'qituvchi ${c.className} sinfida ${c.day} kuni ${c.time} vaqtida band`
          }))
        });
      }
    }

    await existingSchedule.save();

    // SYNCHRONIZATION: Update Class.subjects and User.subjects if schedule changed
    if (schedule) {
      const syncResult = await syncScheduleToClassAndUser(existingSchedule.classId, schedule);
      if (!syncResult.success) throw new Error(`Jadval biriktirishlarini sinxronlash xatosi: ${syncResult.error}`);
    }

    // Populate and return
    const updatedSchedule = await Schedule.findById(id)
      .populate('schedule.periods.subject', 'name code color')
      .populate('schedule.periods.teacher', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    res.json({
      ...updatedSchedule.toObject(),
      status: updatedSchedule.getStatus()
    });
  } catch (error) {
    logError('PUT /schedule/:id', error, req.user?.id);
    res.status(500).json({ message: error.message || 'Server xatosi' });
  }
});

// Delete (archive) schedule
router.delete('/:id', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate id format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Jadval ID noto\'g\'ri' });
    }

    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    // Archive instead of delete
    schedule.isActive = false;
    await schedule.save();

    res.json({ message: 'Jadval arxivlandi', scheduleId: id });
  } catch (error) {
    logError('DELETE /schedule/:id', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   POST /schedule/:scheduleId/holidays
// @desc    Add holidays to a schedule
// @access  Private/Admin
router.post('/:scheduleId/holidays', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { holidays } = req.body;

    // Validate schedule ID
    if (!scheduleId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Jadval ID noto\'g\'ri' });
    }

    if (!holidays || !Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({ message: 'Bayram kunlari massiv ko\'rinishida bo\'lishi kerak' });
    }

    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    // Validate each holiday
    for (const holiday of holidays) {
      if (!holiday.date || !holiday.name) {
        return res.status(400).json({ message: 'Har bir bayram sanasi va nomi bo\'lishi kerak' });
      }

      const holidayDate = new Date(holiday.date);
      if (isNaN(holidayDate.getTime())) {
        return res.status(400).json({ message: 'Bayram sanasi noto\'g\'ri formatda' });
      }

      // Check if holiday is within schedule range
      if (holidayDate < schedule.startDate || holidayDate > schedule.endDate) {
        return res.status(400).json({
          message: `Bayram sanasi jadval davri ichida bo'lishi kerak (${schedule.startDate.toISOString().split('T')[0]} - ${schedule.endDate.toISOString().split('T')[0]})`
        });
      }
    }

    // Add holidays (avoiding duplicates)
    const existingHolidayDates = schedule.holidays.map(h => h.date.getTime());

    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      holidayDate.setHours(0, 0, 0, 0);

      if (!existingHolidayDates.includes(holidayDate.getTime())) {
        schedule.holidays.push({
          date: holidayDate,
          name: sanitizeString(holiday.name),
          description: holiday.description ? sanitizeString(holiday.description) : ''
        });
      }
    });

    await schedule.save();

    res.json({
      message: 'Bayram kunlari qo\'shildi',
      holidays: schedule.holidays
    });
  } catch (error) {
    logError('POST /schedule/:scheduleId/holidays', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   PUT /schedule/:scheduleId/holidays/:holidayId
// @desc    Update a holiday in schedule
// @access  Private/Admin
router.put('/:scheduleId/holidays/:holidayId', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { scheduleId, holidayId } = req.params;
    const { date, name, description } = req.body;

    // Validate IDs
    if (!scheduleId.match(/^[0-9a-fA-F]{24}$/) || !holidayId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID lar noto\'g\'ri' });
    }

    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    const holiday = schedule.holidays.id(holidayId);

    if (!holiday) {
      return res.status(404).json({ message: 'Bayram topilmadi' });
    }

    // Update holiday fields
    if (date) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ message: 'Sana noto\'g\'ri formatda' });
      }
      if (newDate < schedule.startDate || newDate > schedule.endDate) {
        return res.status(400).json({ message: 'Bayram sanasi jadval davri ichida bo\'lishi kerak' });
      }
      newDate.setHours(0, 0, 0, 0);
      holiday.date = newDate;
    }

    if (name) holiday.name = sanitizeString(name);
    if (description !== undefined) holiday.description = sanitizeString(description);

    await schedule.save();

    res.json({
      message: 'Bayram yangilandi',
      holiday: holiday
    });
  } catch (error) {
    logError('PUT /schedule/:scheduleId/holidays/:holidayId', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   DELETE /schedule/:scheduleId/holidays/:holidayId
// @desc    Delete a holiday from schedule
// @access  Private/Admin
router.delete('/:scheduleId/holidays/:holidayId', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { scheduleId, holidayId } = req.params;

    // Validate IDs
    if (!scheduleId.match(/^[0-9a-fA-F]{24}$/) || !holidayId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID lar noto\'g\'ri' });
    }

    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    const holiday = schedule.holidays.id(holidayId);

    if (!holiday) {
      return res.status(404).json({ message: 'Bayram topilmadi' });
    }

    // Remove holiday
    holiday.deleteOne();
    await schedule.save();

    res.json({ message: 'Bayram o\'chirildi' });
  } catch (error) {
    logError('DELETE /schedule/:scheduleId/holidays/:holidayId', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   POST /schedule/check-teacher-availability
// @desc    Check if a teacher is available at a specific time
// @access  Private/Admin
router.post('/check-teacher-availability', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { teacherId, day, startTime, endTime, excludeClassId } = req.body;

    // Validate required fields
    if (!teacherId || !day || !startTime || !endTime) {
      return res.status(400).json({ message: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    // Validate teacherId format
    if (!teacherId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'O\'qituvchi ID noto\'g\'ri' });
    }

    // Validate day
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!validDays.includes(day)) {
      return res.status(400).json({ message: 'Kun noto\'g\'ri' });
    }

    const scheduleValidator = require('../../utils/scheduleValidator');
    const availability = await scheduleValidator.checkTeacherAvailability(
      teacherId,
      day,
      startTime,
      endTime,
      excludeClassId
    );

    res.json(availability);
  } catch (error) {
    logError('POST /schedule/check-teacher-availability', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   POST /schedule/busy-teachers
// @desc    Get all busy teachers for given time slots
// @access  Private/Admin
router.post('/busy-teachers', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { excludeClassId } = req.body;

    // Get all active classes except the one being edited
    const query = { isActive: true };
    if (excludeClassId) {
      query._id = { $ne: excludeClassId };
    }

    const classes = await Class.find(query).select('_id name').lean();

    // Map to store busy teachers: { "day-startTime-endTime": [teacherId1, teacherId2, ...] }
    const busyTeachersMap = {};

    for (const classItem of classes) {
      const schedule = await Schedule.findCurrentSchedule(classItem._id);

      if (!schedule) continue;

      for (const daySchedule of schedule.schedule) {
        for (const period of daySchedule.periods) {
          if (!period.teacher) continue;

          const teacherId = period.teacher._id?.toString() || period.teacher.toString();
          const key = `${daySchedule.day}-${period.startTime}-${period.endTime}`;

          if (!busyTeachersMap[key]) {
            busyTeachersMap[key] = [];
          }

          if (!busyTeachersMap[key].includes(teacherId)) {
            busyTeachersMap[key].push(teacherId);
          }
        }
      }
    }

    res.json({ busyTeachers: busyTeachersMap });
  } catch (error) {
    logError('POST /schedule/busy-teachers', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   GET /schedule/:scheduleId/holidays
// @desc    Get all holidays for a schedule
// @access  Private
router.get('/:scheduleId/holidays', rateLimiters.api, auth, async (req, res) => {
  try {
    const { scheduleId } = req.params;

    if (!scheduleId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Jadval ID noto\'g\'ri' });
    }

    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      return res.status(404).json({ message: 'Jadval topilmadi' });
    }

    res.json({
      scheduleId: schedule._id,
      scheduleName: schedule.name,
      holidays: schedule.holidays.sort((a, b) => a.date - b.date)
    });
  } catch (error) {
    logError('GET /schedule/:scheduleId/holidays', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   GET /schedule/admin/teachers-monthly-status
// @desc    Get all teachers' monthly lesson status with grading info for admin
// @access  Private/Admin
router.get('/admin/teachers-monthly-status', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { year, month } = req.query;

    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    // Get start and end of month
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Get all teachers
    const User = require('../../models/users/User');
    const Grade = require('../../models/academic/Grade');
    const Attendance = require('../../models/academic/Attendance');

    const teachers = await User.find({ role: 'teacher', isActive: true })
      .select('firstName lastName phone email profileImage')
      .lean();

    // Get all classes with their schedules
    const allClasses = await Class.find({ isActive: true })
      .select('name grade section subjects')
      .lean();

    // Get all active schedules for this period
    const schedules = await Schedule.find({
      isActive: true,
      $or: [
        { startDate: { $lte: endOfMonth }, endDate: { $gte: startOfMonth } }
      ]
    }).populate('classId', 'name grade section').lean();

    // Get holidays for this period
    const holidays = await Holiday.find({
      $or: [
        { date: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ]
    }).lean();

    // Helper: Check if date is holiday or Sunday
    const isHolidayOrSunday = (date) => {
      if (date.getDay() === 0) return true; // Sunday
      const dateStr = date.toISOString().split('T')[0];
      return holidays.some(h => {
        const hStart = h.date.toISOString().split('T')[0];
        const hEnd = h.endDate ? h.endDate.toISOString().split('T')[0] : hStart;
        return dateStr >= hStart && dateStr <= hEnd;
      });
    };

    // Day mapping
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Process each teacher
    const teachersStatus = await Promise.all(teachers.map(async (teacher) => {
      const teacherId = teacher._id.toString();

      // Find classes where this teacher teaches
      const teacherClasses = allClasses.filter(cls =>
        cls.subjects?.some(s => s.teacher?.toString() === teacherId)
      );

      // Get teacher's lessons from schedules
      const teacherLessons = [];

      for (const schedule of schedules) {
        if (!schedule.schedule) continue;

        for (const daySchedule of schedule.schedule) {
          for (const period of daySchedule.periods) {
            const periodTeacherId = period.teacher?._id?.toString() || period.teacher?.toString();
            if (periodTeacherId === teacherId) {
              teacherLessons.push({
                classId: schedule.classId?._id || schedule.classId,
                className: schedule.classId?.name || 'Noma\'lum sinf',
                subjectId: period.subject?._id || period.subject,
                subjectName: period.subject?.name || '',
                day: daySchedule.day,
                startTime: period.startTime,
                endTime: period.endTime,
                scheduleStartDate: schedule.startDate,
                scheduleEndDate: schedule.endDate
              });
            }
          }
        }
      }

      // Calculate expected lesson days in this month
      const lessonDays = [];
      const currentDate = new Date(startOfMonth);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      while (currentDate <= endOfMonth) {
        const dayName = dayNames[currentDate.getDay()];
        const dateStr = currentDate.toISOString().split('T')[0];

        // Check if this day has lessons for this teacher
        const lessonsForDay = teacherLessons.filter(lesson => {
          if (lesson.day !== dayName) return false;
          const lessonStart = new Date(lesson.scheduleStartDate);
          const lessonEnd = new Date(lesson.scheduleEndDate);
          return currentDate >= lessonStart && currentDate <= lessonEnd;
        });

        if (lessonsForDay.length > 0 && !isHolidayOrSunday(currentDate)) {
          const isPast = currentDate <= today;

          lessonDays.push({
            date: dateStr,
            dayName,
            lessons: lessonsForDay.map(l => ({
              classId: l.classId,
              className: l.className,
              subjectId: l.subjectId,
              startTime: l.startTime,
              endTime: l.endTime
            })),
            isPast
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Get grades data for this teacher in this month
      const grades = await Grade.find({
        teacher: teacher._id,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }).select('date class subject').lean();

      // Get attendance data for this teacher in this month
      const attendances = await Attendance.find({
        teacher: teacher._id,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }).select('date class subject').lean();

      // Build graded days map
      const gradedDaysMap = new Map();
      grades.forEach(g => {
        const dateStr = g.date.toISOString().split('T')[0];
        const key = `${dateStr}_${g.class}_${g.subject}`;
        gradedDaysMap.set(key, true);
      });

      // Build attendance days map
      const attendanceDaysMap = new Map();
      attendances.forEach(a => {
        const dateStr = a.date.toISOString().split('T')[0];
        const key = `${dateStr}_${a.class}_${a.subject}`;
        attendanceDaysMap.set(key, true);
      });

      // Process lesson days with grading status
      let gradedCount = 0;
      let notGradedCount = 0;
      let upcomingCount = 0;

      const processedDays = lessonDays.map(day => {
        const lessonsWithStatus = day.lessons.map(lesson => {
          const key = `${day.date}_${lesson.classId}_${lesson.subjectId}`;
          const hasGrade = gradedDaysMap.has(key);
          const hasAttendance = attendanceDaysMap.has(key);

          let status = 'upcoming';
          if (day.isPast) {
            if (hasGrade || hasAttendance) {
              status = 'graded';
              gradedCount++;
            } else {
              status = 'not_graded';
              notGradedCount++;
            }
          } else {
            upcomingCount++;
          }

          return {
            ...lesson,
            hasGrade,
            hasAttendance,
            status
          };
        });

        return {
          ...day,
          lessons: lessonsWithStatus
        };
      });

      return {
        teacher: {
          _id: teacher._id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          phone: teacher.phone,
          profileImage: teacher.profileImage
        },
        classCount: teacherClasses.length,
        totalLessons: lessonDays.reduce((sum, d) => sum + d.lessons.length, 0),
        gradedCount,
        notGradedCount,
        upcomingCount,
        lessonDays: processedDays
      };
    }));

    // Filter out teachers with no lessons
    const activeTeachers = teachersStatus.filter(t => t.totalLessons > 0);

    res.json({
      year: targetYear,
      month: targetMonth,
      teachers: activeTeachers
    });

  } catch (error) {
    logError('GET /schedule/admin/teachers-monthly-status', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// @route   GET /schedule/admin/teacher/:teacherId/monthly-details
// @desc    Get specific teacher's monthly lesson details
// @access  Private/Admin
router.get('/admin/teacher/:teacherId/monthly-details', rateLimiters.api, auth, authorize('admin'), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { year, month } = req.query;

    if (!teacherId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'O\'qituvchi ID noto\'g\'ri' });
    }

    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const User = require('../../models/users/User');
    const Grade = require('../../models/academic/Grade');
    const Attendance = require('../../models/academic/Attendance');
    const Subject = require('../../models/academic/Subject');

    // Get teacher info
    const teacher = await User.findById(teacherId)
      .select('firstName lastName phone email profileImage')
      .lean();

    if (!teacher) {
      return res.status(404).json({ message: 'O\'qituvchi topilmadi' });
    }

    // Get schedules for this period
    const schedules = await Schedule.find({
      isActive: true,
      $or: [
        { startDate: { $lte: endOfMonth }, endDate: { $gte: startOfMonth } }
      ]
    })
      .populate('classId', 'name grade section')
      .populate('schedule.periods.subject', 'name code color')
      .lean();

    // Get holidays
    const holidays = await Holiday.find({
      $or: [
        { date: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ]
    }).lean();

    const isHolidayOrSunday = (date) => {
      if (date.getDay() === 0) return true;
      const dateStr = date.toISOString().split('T')[0];
      return holidays.some(h => {
        const hStart = h.date.toISOString().split('T')[0];
        const hEnd = h.endDate ? h.endDate.toISOString().split('T')[0] : hStart;
        return dateStr >= hStart && dateStr <= hEnd;
      });
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Find teacher's lessons from all schedules
    const teacherLessons = [];

    for (const schedule of schedules) {
      if (!schedule.schedule) continue;

      for (const daySchedule of schedule.schedule) {
        for (const period of daySchedule.periods) {
          const periodTeacherId = period.teacher?._id?.toString() || period.teacher?.toString();
          if (periodTeacherId === teacherId) {
            teacherLessons.push({
              classId: schedule.classId?._id || schedule.classId,
              className: schedule.classId?.name || 'Noma\'lum',
              subjectId: period.subject?._id || period.subject,
              subjectName: period.subject?.name || '',
              subjectColor: period.subject?.color || '#3b82f6',
              day: daySchedule.day,
              startTime: period.startTime,
              endTime: period.endTime,
              scheduleStartDate: schedule.startDate,
              scheduleEndDate: schedule.endDate
            });
          }
        }
      }
    }

    // Get grades for this teacher
    const grades = await Grade.find({
      teacher: teacherId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    })
      .populate('class', 'name')
      .populate('subject', 'name')
      .populate('student', 'firstName lastName')
      .lean();

    // Get attendance for this teacher
    const attendances = await Attendance.find({
      teacher: teacherId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    })
      .populate('class', 'name')
      .populate('subject', 'name')
      .lean();

    // Build lesson days calendar
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const calendar = [];
    const currentDate = new Date(startOfMonth);

    while (currentDate <= endOfMonth) {
      const dayName = dayNames[currentDate.getDay()];
      const dateStr = currentDate.toISOString().split('T')[0];
      const isHoliday = isHolidayOrSunday(currentDate);
      const isPast = currentDate <= today;

      const lessonsForDay = teacherLessons.filter(lesson => {
        if (lesson.day !== dayName) return false;
        const lessonStart = new Date(lesson.scheduleStartDate);
        const lessonEnd = new Date(lesson.scheduleEndDate);
        return currentDate >= lessonStart && currentDate <= lessonEnd;
      });

      // Get grades and attendance for this day
      const dayGrades = grades.filter(g => g.date.toISOString().split('T')[0] === dateStr);
      const dayAttendances = attendances.filter(a => a.date.toISOString().split('T')[0] === dateStr);

      const lessonsWithDetails = lessonsForDay.map(lesson => {
        const classGrades = dayGrades.filter(g =>
          g.class?._id?.toString() === lesson.classId?.toString() &&
          g.subject?._id?.toString() === lesson.subjectId?.toString()
        );
        const classAttendances = dayAttendances.filter(a =>
          a.class?._id?.toString() === lesson.classId?.toString() &&
          a.subject?._id?.toString() === lesson.subjectId?.toString()
        );

        const hasData = classGrades.length > 0 || classAttendances.length > 0;

        let status = 'upcoming';
        if (isPast && !isHoliday) {
          status = hasData ? 'completed' : 'missed';
        } else if (isHoliday) {
          status = 'holiday';
        }

        return {
          classId: lesson.classId,
          className: lesson.className,
          subjectId: lesson.subjectId,
          subjectName: lesson.subjectName,
          subjectColor: lesson.subjectColor,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          gradesCount: classGrades.length,
          attendanceCount: classAttendances.length,
          status
        };
      });

      calendar.push({
        date: dateStr,
        dayOfMonth: currentDate.getDate(),
        dayName,
        isHoliday,
        isPast,
        isToday: currentDate.toDateString() === new Date().toDateString(),
        lessons: lessonsWithDetails
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Summary statistics
    const stats = {
      totalExpectedLessons: 0,
      completedLessons: 0,
      missedLessons: 0,
      upcomingLessons: 0,
      totalGrades: grades.length,
      totalAttendance: attendances.length
    };

    calendar.forEach(day => {
      day.lessons.forEach(lesson => {
        if (lesson.status !== 'holiday') {
          stats.totalExpectedLessons++;
          if (lesson.status === 'completed') stats.completedLessons++;
          else if (lesson.status === 'missed') stats.missedLessons++;
          else if (lesson.status === 'upcoming') stats.upcomingLessons++;
        }
      });
    });

    // Get unique classes
    const uniqueClasses = [...new Map(
      teacherLessons.map(l => [l.classId?.toString(), { id: l.classId, name: l.className }])
    ).values()];

    res.json({
      teacher,
      year: targetYear,
      month: targetMonth,
      stats,
      classes: uniqueClasses,
      calendar
    });

  } catch (error) {
    logError('GET /schedule/admin/teacher/:teacherId/monthly-details', error, req.user?.id);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

module.exports = router;
