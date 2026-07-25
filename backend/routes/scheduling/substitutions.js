const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Class = require('../../models/academic/Class');
const Schedule = require('../../models/scheduling/Schedule');
const User = require('../../models/users/User');
const LessonSubstitution = require('../../models/scheduling/LessonSubstitution');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');
const salaryController = require('../../controllers/salaryController');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const isValidId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

// Sanani yarim tunga normalizatsiya qiladi.
// "YYYY-MM-DD" ko'rinishidagi satrni LOCAL sana sifatida o'qiymiz — aks holda
// new Date("2026-06-15") UTC yarim tun bo'lib, server timezone'ida hafta kuni
// noto'g'ri chiqishi mumkin.
const normalizeDate = (d) => {
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  }
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

// classId + sana uchun amaldagi jadvalni topadi
async function getScheduleForDate(classId, date) {
  return Schedule.findOne({
    classId,
    isActive: true,
    startDate: { $lte: date },
    endDate: { $gte: date }
  })
    .populate('schedule.periods.subject', 'name code color')
    .populate('schedule.periods.teacher', 'firstName lastName');
}

// Tasdiqlangan almashtirish uchun maoshni o'tkazadi (idempotent)
async function applySalary(sub) {
  if (sub.salaryApplied) return;
  await salaryController.recordLessonCovered(sub.substituteTeacher, sub.originalTeacher, {
    date: sub.date,
    classId: sub.classId,
    subjectId: sub.subject,
    description: "O'rniga dars o'tildi",
    substitutionId: sub._id
  });
  sub.salaryApplied = true;
  await sub.save();
}

// Almashtirish bekor qilinsa maoshni qaytaradi
async function reverseSalary(sub) {
  if (!sub.salaryApplied) return;
  await salaryController.reverseSubstitutionSalary(sub._id, sub.substituteTeacher, sub.originalTeacher, sub.date);
  sub.salaryApplied = false;
  await sub.save();
}

const populateSub = (q) => q
  .populate('originalTeacher', 'firstName lastName')
  .populate('substituteTeacher', 'firstName lastName')
  .populate('classId', 'name grade section')
  .populate('subject', 'name code color')
  .populate('confirmedBy', 'firstName lastName role');

// ============================================================
// GET /api/substitutions/class-day?classId=&date=
// Belgilash formasi uchun: tanlangan sinfning shu kundagi darslari
// ============================================================
router.get('/class-day', auth, authorize('teacher', 'admin', 'director', 'supervisor'), requirePermission('lesson.substitute'), async (req, res) => {
  try {
    const { classId, date } = req.query;
    if (!isValidId(classId) || !date) {
      return res.status(400).json({ message: 'Sinf va sana kerak' });
    }
    const day = normalizeDate(date);
    const dayName = DAY_NAMES[day.getDay()];

    const schedule = await getScheduleForDate(classId, day);
    if (!schedule) {
      return res.status(404).json({ message: 'Bu sana uchun aktiv jadval topilmadi' });
    }

    const daySchedule = schedule.schedule.find(s => s.day === dayName);
    if (!daySchedule || !daySchedule.periods.length) {
      return res.json({ day: dayName, periods: [] });
    }

    // Shu kun uchun mavjud (rad etilmagan) almashtirishlar
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    const existing = await LessonSubstitution.find({
      classId,
      date: { $gte: day, $lt: nextDay },
      status: { $ne: 'rejected' }
    }).populate('substituteTeacher', 'firstName lastName');

    const periods = daySchedule.periods.map((p, idx) => {
      const sub = existing.find(s => s.periodIndex === idx);
      return {
        periodIndex: idx,
        startTime: p.startTime,
        endTime: p.endTime,
        subject: p.subject ? { _id: p.subject._id, name: p.subject.name } : null,
        teacher: p.teacher ? { _id: p.teacher._id, name: `${p.teacher.firstName} ${p.teacher.lastName}` } : null,
        substitution: sub ? {
          _id: sub._id,
          status: sub.status,
          substituteTeacher: sub.substituteTeacher
            ? `${sub.substituteTeacher.firstName} ${sub.substituteTeacher.lastName}` : null
        } : null
      };
    });

    res.json({ day: dayName, scheduleId: schedule._id, periods });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ============================================================
// POST /api/substitutions  — almashtirishni belgilash
// body: { classId, date, periodIndex, reason, substituteTeacherId? }
// ============================================================
router.post('/', auth, authorize('teacher', 'admin', 'director', 'supervisor'), requirePermission('lesson.substitute'), async (req, res) => {
  try {
    const { classId, date, periodIndex, reason } = req.body;
    if (!isValidId(classId) || !date || periodIndex === undefined || periodIndex === null) {
      return res.status(400).json({ message: 'Sinf, sana va dars tanlanishi shart' });
    }
    const idx = parseInt(periodIndex);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ message: "Dars indeksi noto'g'ri" });
    }

    const day = normalizeDate(date);
    const dayName = DAY_NAMES[day.getDay()];

    const schedule = await getScheduleForDate(classId, day);
    if (!schedule) {
      return res.status(404).json({ message: 'Bu sana uchun aktiv jadval topilmadi' });
    }
    const daySchedule = schedule.schedule.find(s => s.day === dayName);
    const period = daySchedule && daySchedule.periods[idx];
    if (!period) {
      return res.status(404).json({ message: 'Bu kun/dars jadvalda topilmadi' });
    }
    if (!period.teacher) {
      return res.status(400).json({ message: "Bu darsga jadvalda o'qituvchi biriktirilmagan" });
    }

    const originalTeacherId = period.teacher._id.toString();

    // O'rniga o'tgan o'qituvchini aniqlash
    let substituteTeacherId;
    const isManager = ['admin', 'director'].includes(req.user.role);
    const isSupervisor = req.user.role === 'supervisor';
    if (req.user.role === 'teacher') {
      substituteTeacherId = req.user._id.toString();
    } else {
      // admin/director/supervisor — kim o'tganini ko'rsatishi kerak
      if (!isValidId(req.body.substituteTeacherId)) {
        return res.status(400).json({ message: "O'rniga o'tgan o'qituvchini tanlang" });
      }
      const subTeacher = await User.findById(req.body.substituteTeacherId);
      if (!subTeacher || subTeacher.role !== 'teacher') {
        return res.status(404).json({ message: "O'qituvchi topilmadi" });
      }
      if (!subTeacher.isActive) {
        return res.status(400).json({ message: "Nofaol o'qituvchini o'rinbosar etib tayinlab bo'lmaydi" });
      }
      substituteTeacherId = subTeacher._id.toString();
    }

    if (originalTeacherId === substituteTeacherId) {
      return res.status(400).json({ message: "O'qituvchini o'zi bilan almashtirib bo'lmaydi" });
    }

    // Takrorlanishni tekshirish
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    const dup = await LessonSubstitution.findOne({
      classId,
      periodIndex: idx,
      date: { $gte: day, $lt: nextDay },
      status: { $ne: 'rejected' }
    });
    if (dup) {
      return res.status(409).json({ message: 'Bu dars uchun almashtirish allaqachon belgilangan' });
    }

    // Admin/direktor belgilasa — darrov tasdiqlangan hisoblanadi
    const autoConfirm = isManager;

    const sub = new LessonSubstitution({
      date: day,
      day: dayName,
      classId,
      scheduleId: schedule._id,
      periodIndex: idx,
      startTime: period.startTime,
      endTime: period.endTime,
      subject: period.subject ? period.subject._id : undefined,
      originalTeacher: originalTeacherId,
      substituteTeacher: substituteTeacherId,
      reason: (reason || '').toString().slice(0, 300),
      markedBy: req.user._id,
      status: autoConfirm ? 'confirmed' : 'pending',
      confirmedBy: autoConfirm ? req.user._id : undefined,
      confirmedAt: autoConfirm ? new Date() : undefined
    });

    try {
      await sub.save();
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(409).json({ message: 'Bu dars uchun almashtirish allaqachon belgilangan' });
      }
      throw e;
    }

    // Maosh belgilash paytidayoq o'tkaziladi (Zuhraga +1, Anvardan -1).
    // Rad etilsa qaytariladi. Idempotent — qayta urinishda ikkilanmaydi.
    if (autoConfirm) {
      try {
        await applySalary(sub);
      } catch (e) {
        console.error('applySalary (create) failed:', e.message);
      }
    }

    const populated = await populateSub(LessonSubstitution.findById(sub._id));
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ============================================================
// GET /api/substitutions/mine?year=&month=
// O'qituvchining o'zi: o'rniga o'tgan + tasdiqlashi kerak bo'lganlar
// ============================================================
router.get('/mine', auth, authorize('teacher', 'admin', 'director', 'supervisor'), requirePermission('lesson.substitute'), async (req, res) => {
  try {
    const me = req.user._id;
    const dateFilter = buildMonthFilter(req.query.year, req.query.month);

    const base = dateFilter ? { date: dateFilter } : {};

    const asSubstitute = await populateSub(LessonSubstitution.find({ ...base, substituteTeacher: me }).sort({ date: -1 }));
    const asOriginal = await populateSub(LessonSubstitution.find({ ...base, originalTeacher: me }).sort({ date: -1 }));

    res.json({ asSubstitute, asOriginal });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ============================================================
// GET /api/substitutions/my-access?classId=
// O'qituvchi vaqtincha baho qo'ya oladigan sinf+fanlar (jurnal uchun)
// ============================================================
router.get('/my-access', auth, authorize('teacher', 'admin', 'director', 'supervisor'), requirePermission('lesson.substitute'), async (req, res) => {
  try {
    const today = normalizeDate(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const filter = {
      substituteTeacher: req.user._id,
      status: { $ne: 'rejected' },
      date: { $gte: today, $lt: tomorrow }
    };
    if (isValidId(req.query.classId)) filter.classId = req.query.classId;

    const subs = await LessonSubstitution.find(filter)
      .populate('classId', 'name grade section')
      .populate('subject', 'name code')
      .sort({ date: -1 });

    const access = subs.map(s => ({
      _id: s._id,
      classId: s.classId ? s.classId._id : null,
      className: s.classId ? s.classId.name : null,
      subjectId: s.subject ? s.subject._id : null,
      subjectName: s.subject ? s.subject.name : null,
      date: s.date,
      status: s.status
    })).filter(a => a.classId && a.subjectId);

    res.json(access);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ============================================================
// GET /api/substitutions/overlay?from=&to=&classId=
// Jadval ustiga qo'yish uchun (rol bo'yicha cheklangan)
// ============================================================
router.get('/overlay', auth, async (req, res) => {
  try {
    const filter = { status: { $ne: 'rejected' } };

    // Sana oralig'i (default: keng oraliq berilmasa hammasi)
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = normalizeDate(req.query.from);
      if (req.query.to) {
        const to = normalizeDate(req.query.to); to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }

    if (req.user.role === 'student') {
      const cls = await Class.findOne({ students: req.user._id, isActive: true }).select('_id');
      if (!cls) return res.json([]);
      filter.classId = cls._id;
      // O'quvchilarga faqat TASDIQLANGAN almashtirishlar ko'rsatiladi
      filter.status = 'confirmed';
    } else if (req.user.role === 'teacher') {
      filter.$or = [{ substituteTeacher: req.user._id }, { originalTeacher: req.user._id }];
    } else if (['admin', 'director', 'supervisor'].includes(req.user.role)) {
      if (isValidId(req.query.classId)) filter.classId = req.query.classId;
    } else {
      // accountant/hr/reception/callcenter va boshqalar — ruxsat yo'q
      return res.status(403).json({ message: "Ruxsat yo'q" });
    }

    const subs = await populateSub(LessonSubstitution.find(filter).sort({ date: -1 }));

    const result = subs.map(s => ({
      _id: s._id,
      date: s.date,
      day: s.day,
      periodIndex: s.periodIndex,
      startTime: s.startTime,
      endTime: s.endTime,
      classId: s.classId ? s.classId._id : null,
      className: s.classId ? s.classId.name : null,
      subjectName: s.subject ? s.subject.name : null,
      status: s.status,
      originalTeacher: s.originalTeacher
        ? { _id: s.originalTeacher._id, name: `${s.originalTeacher.firstName} ${s.originalTeacher.lastName}` } : null,
      substituteTeacher: s.substituteTeacher
        ? { _id: s.substituteTeacher._id, name: `${s.substituteTeacher.firstName} ${s.substituteTeacher.lastName}` } : null
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ============================================================
// GET /api/substitutions?year=&month=&classId=&teacherId=
// Admin/direktor hisoboti: kim kimning o'rniga necha soat
// ============================================================
router.get('/', auth, authorize('admin', 'director', 'supervisor'), requirePermission('lesson.substitute'), async (req, res) => {
  try {
    const filter = {};
    const dateFilter = buildMonthFilter(req.query.year, req.query.month);
    if (dateFilter) filter.date = dateFilter;
    if (isValidId(req.query.classId)) filter.classId = req.query.classId;
    if (isValidId(req.query.teacherId)) {
      filter.$or = [{ substituteTeacher: req.query.teacherId }, { originalTeacher: req.query.teacherId }];
    }
    if (req.query.status && ['pending', 'confirmed', 'rejected'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const subs = await populateSub(LessonSubstitution.find(filter).sort({ date: -1 }));

    // Xulosa: har bir o'rinbosar bo'yicha jami soat (faqat rad etilmaganlar)
    const summaryMap = new Map();
    for (const s of subs) {
      if (s.status === 'rejected' || !s.substituteTeacher) continue;
      const key = s.substituteTeacher._id.toString();
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          teacherId: s.substituteTeacher._id,
          teacherName: `${s.substituteTeacher.firstName} ${s.substituteTeacher.lastName}`,
          totalHours: 0,
          confirmedHours: 0,
          pendingHours: 0
        });
      }
      const e = summaryMap.get(key);
      const h = s.hours || 1;
      e.totalHours += h;
      if (s.status === 'confirmed') e.confirmedHours += h; else e.pendingHours += h;
    }

    res.json({ substitutions: subs, summary: Array.from(summaryMap.values()) });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ============================================================
// PUT /api/substitutions/:id/confirm  — tasdiqlash
// ============================================================
router.put('/:id/confirm', auth, authorize('teacher', 'admin', 'director', 'supervisor'), requirePermission('lesson.substitute'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID noto'g'ri" });
    const sub = await LessonSubstitution.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Almashtirish topilmadi' });

    const isManager = ['admin', 'director', 'supervisor'].includes(req.user.role);
    const isOriginal = sub.originalTeacher.toString() === req.user._id.toString();
    if (!isManager && !isOriginal) {
      return res.status(403).json({ message: 'Buni faqat asl o\'qituvchi yoki admin/direktor tasdiqlaydi' });
    }

    if (sub.status === 'rejected') {
      return res.status(409).json({ message: 'Bu almashtirish rad etilgan, qayta tasdiqlab bo\'lmaydi' });
    }
    if (sub.status === 'confirmed') {
      return res.json(await populateSub(LessonSubstitution.findById(sub._id)));
    }

    sub.status = 'confirmed';
    sub.confirmedBy = req.user._id;
    sub.confirmedAt = new Date();
    await sub.save();

    // Idempotent — maosh allaqachon belgilashda o'tkazilgan bo'lsa qayta urinish zararsiz
    try { await applySalary(sub); } catch (e) { console.error('applySalary (confirm) failed:', e.message); }

    const populated = await populateSub(LessonSubstitution.findById(sub._id));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ============================================================
// PUT /api/substitutions/:id/reject  — rad etish
// ============================================================
router.put('/:id/reject', auth, authorize('teacher', 'admin', 'director', 'supervisor'), requirePermission('lesson.substitute'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID noto'g'ri" });
    const sub = await LessonSubstitution.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Almashtirish topilmadi' });

    const isManager = ['admin', 'director', 'supervisor'].includes(req.user.role);
    const isOriginal = sub.originalTeacher.toString() === req.user._id.toString();
    if (!isManager && !isOriginal) {
      return res.status(403).json({ message: 'Buni faqat asl o\'qituvchi yoki admin/direktor rad etadi' });
    }

    if (sub.status === 'rejected') {
      return res.json(await populateSub(LessonSubstitution.findById(sub._id)));
    }

    // Maoshni qaytarish muvaffaqiyatli bo'lmasa rad etmaymiz (pul holati buzilmasin)
    try {
      await reverseSalary(sub);
    } catch (e) {
      console.error('reverseSalary (reject) failed:', e.message);
      return res.status(500).json({ message: "Maoshni qaytarib bo'lmadi, keyinroq urinib ko'ring" });
    }
    sub.status = 'rejected';
    sub.confirmedBy = req.user._id;
    sub.confirmedAt = new Date();
    await sub.save();

    const populated = await populateSub(LessonSubstitution.findById(sub._id));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ============================================================
// DELETE /api/substitutions/:id  — o'chirish
// ============================================================
router.delete('/:id', auth, authorize('teacher', 'admin', 'director', 'supervisor'), requirePermission('lesson.substitute'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "ID noto'g'ri" });
    const sub = await LessonSubstitution.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Almashtirish topilmadi' });

    const isManager = ['admin', 'director', 'supervisor'].includes(req.user.role);
    const isOwnerPending = sub.markedBy.toString() === req.user._id.toString() && sub.status === 'pending';
    if (!isManager && !isOwnerPending) {
      return res.status(403).json({ message: "O'chirish uchun ruxsat yo'q" });
    }

    // Avval maoshni qaytaramiz; muvaffaqiyatsiz bo'lsa o'chirmaymiz (aks holda
    // maoshdagi transaksiyalar "yetim" bo'lib qoladi va qaytarib bo'lmaydi)
    try {
      await reverseSalary(sub);
    } catch (e) {
      console.error('reverseSalary (delete) failed:', e.message);
      return res.status(500).json({ message: "Maoshni qaytarib bo'lmadi, almashtirish o'chirilmadi" });
    }
    await LessonSubstitution.findByIdAndDelete(sub._id);
    res.json({ message: "Almashtirish o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Oy/yil bo'yicha sana filtri tuzadi
function buildMonthFilter(year, month) {
  const y = parseInt(year);
  const m = parseInt(month);
  if (!y || !m || m < 1 || m > 12) return null;
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { $gte: start, $lte: end };
}

module.exports = router;
