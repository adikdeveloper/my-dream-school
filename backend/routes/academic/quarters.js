const express = require('express');
const mongoose = require('mongoose');
const AcademicCalendar = require('../../models/academic/AcademicCalendar');
const User = require('../../models/users/User');
const Grade = require('../../models/academic/Grade');
const { auth, authorize } = require('../../middleware/auth');
const { getTeacherJournalScope } = require('../../services/teacherAccessResolver');
const quarterService = require('../../services/quarterGradeService');

const router = express.Router();

const isValidObjectId = value => value && mongoose.Types.ObjectId.isValid(value);

function normalizeAcademicYear(value) {
  const academicYear = String(value || '').trim();
  if (!academicYear) return quarterService.getAcademicYear();

  const match = /^(\d{4})-(\d{4})$/.exec(academicYear);
  if (!match) return null;
  if (Number(match[2]) !== Number(match[1]) + 1) return null;

  return academicYear;
}

function validateQuarterPayload(quarters) {
  if (!Array.isArray(quarters) || quarters.length !== 4) {
    return { error: "4 ta chorak sanalari kiritilishi shart" };
  }

  const normalized = [];
  for (const item of quarters) {
    const quarter = Number(item?.quarter);
    const startDate = new Date(item?.startDate);
    const endDate = new Date(item?.endDate);

    if (![1, 2, 3, 4].includes(quarter)) {
      return { error: "Chorak raqami 1 dan 4 gacha bo'lishi kerak" };
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { error: "Chorak sanalari noto'g'ri" };
    }
    if (startDate > endDate) {
      return { error: `${quarter}-chorakda boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas` };
    }

    normalized.push({ quarter, startDate, endDate });
  }

  normalized.sort((a, b) => a.quarter - b.quarter);

  if (normalized.map(item => item.quarter).join(',') !== '1,2,3,4') {
    return { error: "Har bir chorak faqat bir marta kiritilishi kerak" };
  }

  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].startDate <= normalized[index - 1].endDate) {
      return {
        error: `${normalized[index - 1].quarter}- va ${normalized[index].quarter}-chorak sanalari bir-biriga kirib ketmasligi kerak`
      };
    }
  }

  return { quarters: normalized };
}

async function loadCalendar(academicYear) {
  const saved = await AcademicCalendar.findOne({ academicYear }).lean();
  return quarterService.normalizeCalendar(saved, academicYear);
}

function calendarResponse(calendar) {
  return {
    ...calendar,
    currentQuarter: quarterService.getCurrentQuarter(calendar)
  };
}

// @route   GET /api/quarters/calendar
// @desc    O'quv yili chorak sanalarini olish (sozlanmagan bo'lsa standart sanalar)
// @access  Private
router.get('/calendar', auth, async (req, res) => {
  try {
    const academicYear = normalizeAcademicYear(req.query.academicYear);
    if (!academicYear) {
      return res.status(400).json({ message: "O'quv yili YYYY-YYYY formatida bo'lishi kerak" });
    }

    const calendar = await loadCalendar(academicYear);
    res.json(calendarResponse(calendar));
  } catch (error) {
    res.status(500).json({
      message: 'Chorak sanalarini yuklashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/quarters/calendar
// @desc    Chorak sanalarini saqlash (admin va direktor)
// @access  Private/Admin, Director
router.put('/calendar', auth, authorize('admin'), async (req, res) => {
  try {
    const academicYear = normalizeAcademicYear(req.body?.academicYear);
    if (!academicYear) {
      return res.status(400).json({ message: "O'quv yili YYYY-YYYY formatida bo'lishi kerak" });
    }

    const validation = validateQuarterPayload(req.body?.quarters);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    let calendarDoc = await AcademicCalendar.findOne({ academicYear });
    if (!calendarDoc) {
      calendarDoc = new AcademicCalendar({ academicYear, createdBy: req.user._id });
    }

    calendarDoc.quarters = validation.quarters;
    calendarDoc.updatedBy = req.user._id;
    await calendarDoc.save();

    const calendar = quarterService.normalizeCalendar(calendarDoc.toObject(), academicYear);
    res.json(calendarResponse(calendar));
  } catch (error) {
    if (error?.name === 'ValidationError' || error?.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Bu o'quv yili uchun chorak sanalari allaqachon mavjud" });
    }

    res.status(500).json({
      message: 'Chorak sanalarini saqlashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/quarters/class/:classId
// @desc    Sinf bo'yicha avtomatik chorak baholarini olish
// @access  Private/Admin, Director, Supervisor, Teacher
router.get('/class/:classId', auth, authorize('admin', 'teacher', 'supervisor'), async (req, res) => {
  try {
    const { classId } = req.params;
    if (!isValidObjectId(classId)) {
      return res.status(400).json({ message: "Noto'g'ri sinf ID" });
    }

    const academicYear = normalizeAcademicYear(req.query.academicYear);
    if (!academicYear) {
      return res.status(400).json({ message: "O'quv yili YYYY-YYYY formatida bo'lishi kerak" });
    }

    const calendar = await loadCalendar(academicYear);
    const currentQuarter = quarterService.getCurrentQuarter(calendar);
    const quarterNumber = req.query.quarter ? Number(req.query.quarter) : currentQuarter.quarter;

    if (![1, 2, 3, 4].includes(quarterNumber)) {
      return res.status(400).json({ message: "Chorak 1 dan 4 gacha bo'lishi kerak" });
    }

    const range = quarterService.getQuarterRange(calendar, quarterNumber);
    if (!range) {
      return res.status(400).json({ message: 'Chorak topilmadi' });
    }

    let subjectIds = null;
    if (req.user.role === 'teacher') {
      const scope = await getTeacherJournalScope(req.user._id, {
        classId,
        startDate: range.startDate,
        endDate: range.endDate
      });
      const classScope = scope.find(item => String(item._id) === String(classId));

      if (!classScope) {
        return res.status(403).json({ message: "Bu sinfning chorak baholarini ko'rish huquqingiz yo'q" });
      }

      subjectIds = (classScope.subjects || []).map(subject => String(subject._id));
    }

    const result = await quarterService.calculateClassQuarter({
      classId,
      quarter: quarterNumber,
      calendar,
      subjectIds
    });

    res.json({
      academicYear,
      calendar: calendarResponse(calendar),
      ...result
    });
  } catch (error) {
    if (error?.message === 'Sinf topilmadi') {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({
      message: 'Chorak baholarini hisoblashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/quarters/student/:studentId
// @desc    O'quvchi bo'yicha avtomatik chorak baholarini olish
// @access  Private/Admin, Director, Supervisor, Teacher, Student (o'zi)
router.get('/student/:studentId', auth, authorize('admin', 'teacher', 'student', 'supervisor'), async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ message: "Noto'g'ri o'quvchi ID" });
    }

    if (req.user.role === 'student' && String(req.user._id) !== String(studentId)) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    const academicYear = normalizeAcademicYear(req.query.academicYear);
    if (!academicYear) {
      return res.status(400).json({ message: "O'quv yili YYYY-YYYY formatida bo'lishi kerak" });
    }

    const student = await User.findById(studentId)
      .select('firstName lastName studentId classId role isActive')
      .lean();

    if (!student) {
      return res.status(404).json({ message: "O'quvchi topilmadi" });
    }

    const calendar = await loadCalendar(academicYear);
    const firstQuarter = quarterService.getQuarterRange(calendar, 1);
    const lastQuarter = quarterService.getQuarterRange(calendar, 4);

    if (req.user.role === 'teacher') {
      let allowed = false;

      if (student.classId) {
        const scope = await getTeacherJournalScope(req.user._id, {
          classId: student.classId,
          startDate: firstQuarter.startDate,
          endDate: lastQuarter.endDate
        });
        allowed = scope.some(item => String(item._id) === String(student.classId));
      }

      if (!allowed) {
        allowed = Boolean(await Grade.exists({
          student: studentId,
          teacher: req.user._id,
          date: { $gte: firstQuarter.startDate, $lte: lastQuarter.endDate }
        }));
      }

      if (!allowed) {
        return res.status(403).json({ message: "Bu o'quvchining chorak baholarini ko'rish huquqingiz yo'q" });
      }
    }

    const hasQuarterQuery = req.query.quarter !== undefined && req.query.quarter !== '';
    const requestedQuarter = hasQuarterQuery ? Number(req.query.quarter) : null;
    if (hasQuarterQuery && ![1, 2, 3, 4].includes(requestedQuarter)) {
      return res.status(400).json({ message: "Chorak 1 dan 4 gacha bo'lishi kerak" });
    }

    const quarterNumbers = hasQuarterQuery ? [requestedQuarter] : [1, 2, 3, 4];
    const quarters = await Promise.all(
      quarterNumbers.map(quarter => quarterService.calculateStudentQuarter({
        studentId,
        quarter,
        calendar
      }))
    );

    res.json({
      academicYear,
      calendar: calendarResponse(calendar),
      student: {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentId: student.studentId,
        classId: student.classId
      },
      quarters
    });
  } catch (error) {
    res.status(500).json({
      message: 'Chorak baholarini hisoblashda xatolik',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
