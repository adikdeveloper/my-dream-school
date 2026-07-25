/**
 * PARENT CONTACTS - Routes
 * =========================
 * Ota-onalar bilan oylik aloqa jurnali.
 *
 * ENDPOINT'LAR:
 *   GET    /api/parent-contacts                    → ro'yxat (filterlar: month, classId, status)
 *   GET    /api/parent-contacts/stats              → oy bo'yicha umumiy statistika (jadval)
 *   GET    /api/parent-contacts/monthly-coverage   → oylar bo'yicha qamrov foizi
 *   GET    /api/parent-contacts/student/:id        → bitta o'quvchining barcha kontaktlari
 *   POST   /api/parent-contacts                    → yangi yozuv qo'shish
 *   PUT    /api/parent-contacts/:id                → tahrirlash
 *   DELETE /api/parent-contacts/:id                → o'chirish
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ParentContact = require('../../models/communication/ParentContact');
const User = require('../../models/users/User');
const Class = require('../../models/academic/Class');
const { auth, authorize } = require('../../middleware/auth');

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const isValidMonth = (m) => typeof m === 'string' && MONTH_REGEX.test(m);

const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ─── GET /api/parent-contacts ────────────────────────────────────────────────
router.get('/', auth, authorize('admin', 'accountant', 'teacher'), async (req, res) => {
  try {
    const { month, classId, status, studentId, sentiment, limit = 200 } = req.query;
    const filter = {};
    if (month && isValidMonth(month)) filter.reportMonth = month;
    if (classId) filter.classId = classId;
    if (status) filter.status = status;
    if (studentId) filter.student = studentId;
    if (sentiment) filter.sentiment = sentiment;

    const contacts = await ParentContact.find(filter)
      .populate('student', 'firstName lastName studentId parentName parentPhone phone classId')
      .populate('classId', 'grade section name')
      .populate('recordedBy', 'firstName lastName role')
      .sort({ contactDate: -1 })
      .limit(Math.min(500, parseInt(limit) || 200));

    res.json({ contacts, count: contacts.length });
  } catch (error) {
    res.status(500).json({ message: 'Aloqa yozuvlarini yuklashda xatolik', error: error.message });
  }
});

// ─── GET /api/parent-contacts/stats?month=YYYY-MM ───────────────────────────
router.get('/stats', auth, authorize('admin', 'accountant', 'teacher'), async (req, res) => {
  try {
    const month = isValidMonth(req.query.month) ? req.query.month : currentMonthStr();

    // 1. Faol o'quvchilar (ota-ona telefoni bor)
    const students = await User.find({ role: 'student', isActive: true })
      .select('firstName lastName studentId parentName parentPhone phone classId')
      .populate('classId', 'grade section name')
      .lean();

    // 2. Shu oyga oid barcha yozuvlar
    const contacts = await ParentContact.find({ reportMonth: month })
      .select('student status sentiment topic channel contactDate parentName')
      .lean();

    const byStudent = new Map();
    contacts.forEach((c) => {
      const sid = String(c.student);
      if (!byStudent.has(sid)) byStudent.set(sid, []);
      byStudent.get(sid).push(c);
    });

    let contactedCount = 0;
    let attemptedCount = 0;
    let notReachedCount = 0;
    let refusedCount = 0;
    let positiveSentiment = 0;
    let negativeSentiment = 0;
    const byClass = new Map();
    const byTopic = {};
    const byChannel = {};

    const enriched = students.map((s) => {
      const sid = String(s._id);
      const studentContacts = byStudent.get(sid) || [];
      const latest = studentContacts.sort((a, b) => new Date(b.contactDate) - new Date(a.contactDate))[0] || null;
      const status = latest ? latest.status : 'pending';

      if (status === 'contacted') contactedCount++;
      else if (status === 'attempted') attemptedCount++;
      else if (status === 'not_reached') notReachedCount++;
      else if (status === 'refused') refusedCount++;

      if (latest?.sentiment === 'positive') positiveSentiment++;
      if (latest?.sentiment === 'negative') negativeSentiment++;
      if (latest?.topic) byTopic[latest.topic] = (byTopic[latest.topic] || 0) + 1;
      if (latest?.channel) byChannel[latest.channel] = (byChannel[latest.channel] || 0) + 1;

      const classKey = s.classId?._id?.toString() || 'no_class';
      if (!byClass.has(classKey)) {
        byClass.set(classKey, {
          classId: s.classId?._id || null,
          className: s.classId ? `${s.classId.grade}-${s.classId.section}` : 'Sinfsiz',
          grade: s.classId?.grade || 0,
          section: s.classId?.section || '',
          total: 0, contacted: 0, attempted: 0, notReached: 0, refused: 0, pending: 0
        });
      }
      const cls = byClass.get(classKey);
      cls.total++;
      if (status === 'contacted') cls.contacted++;
      else if (status === 'attempted') cls.attempted++;
      else if (status === 'not_reached') cls.notReached++;
      else if (status === 'refused') cls.refused++;
      else cls.pending++;

      return {
        ...s,
        latestStatus: status,
        latestContact: latest,
        contactCount: studentContacts.length
      };
    });

    const classes = Array.from(byClass.values()).sort((a, b) =>
      (a.grade - b.grade) || a.section.localeCompare(b.section)
    );
    classes.forEach((c) => {
      c.coveragePercent = c.total > 0 ? Math.round((c.contacted / c.total) * 100) : 0;
    });

    const totalStudents = students.length;
    const totalAddressed = contactedCount + attemptedCount + notReachedCount + refusedCount;
    const pendingCount = totalStudents - totalAddressed;

    res.json({
      month,
      totals: {
        totalStudents,
        contacted: contactedCount,
        attempted: attemptedCount,
        notReached: notReachedCount,
        refused: refusedCount,
        pending: pendingCount,
        coveragePercent: totalStudents > 0 ? Math.round((contactedCount / totalStudents) * 100) : 0,
        positiveSentiment,
        negativeSentiment
      },
      byTopic,
      byChannel,
      classes,
      students: enriched
    });
  } catch (error) {
    res.status(500).json({ message: 'Statistikani yuklashda xatolik', error: error.message });
  }
});

// ─── GET /api/parent-contacts/monthly-coverage?months=6 ─────────────────────
router.get('/monthly-coverage', auth, authorize('admin', 'accountant', 'teacher'), async (req, res) => {
  try {
    const monthsToShow = Math.min(24, Math.max(1, parseInt(req.query.months) || 6));
    const totalActive = await User.countDocuments({ role: 'student', isActive: true });

    const now = new Date();
    const monthList = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthList.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const aggregated = await ParentContact.aggregate([
      { $match: { reportMonth: { $in: monthList } } },
      { $group: {
          _id: { month: '$reportMonth', student: '$student', status: '$status' },
          count: { $sum: 1 }
      }},
      { $group: {
          _id: { month: '$_id.month', student: '$_id.student' },
          statuses: { $push: { status: '$_id.status', count: '$count' } }
      }}
    ]);

    const studentsByMonth = {};
    aggregated.forEach((entry) => {
      const m = entry._id.month;
      if (!studentsByMonth[m]) studentsByMonth[m] = { contacted: new Set(), addressed: new Set() };
      entry.statuses.forEach((s) => {
        studentsByMonth[m].addressed.add(String(entry._id.student));
        if (s.status === 'contacted') {
          studentsByMonth[m].contacted.add(String(entry._id.student));
        }
      });
    });

    const series = monthList.map((m) => {
      const data = studentsByMonth[m] || { contacted: new Set(), addressed: new Set() };
      return {
        month: m,
        totalActive,
        addressed: data.addressed.size,
        contacted: data.contacted.size,
        coveragePercent: totalActive > 0 ? Math.round((data.contacted.size / totalActive) * 100) : 0
      };
    });

    res.json({ series, totalActive });
  } catch (error) {
    res.status(500).json({ message: 'Qamrov hisobotini olishda xatolik', error: error.message });
  }
});

// ─── GET /api/parent-contacts/student/:id ───────────────────────────────────
router.get('/student/:id', auth, authorize('admin', 'accountant', 'teacher'), async (req, res) => {
  try {
    const contacts = await ParentContact.find({ student: req.params.id })
      .populate('recordedBy', 'firstName lastName role')
      .populate('classId', 'grade section name')
      .sort({ contactDate: -1 });
    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ message: 'O\'quvchi tarixini yuklashda xatolik', error: error.message });
  }
});

// ─── POST /api/parent-contacts ──────────────────────────────────────────────
router.post(
  '/',
  auth,
  authorize('admin', 'accountant', 'teacher'),
  [
    body('student').notEmpty().withMessage("O'quvchi tanlanishi shart"),
    body('reportMonth').matches(MONTH_REGEX).withMessage('reportMonth YYYY-MM formatida bo\'lishi kerak'),
    body('status').isIn(['contacted', 'attempted', 'not_reached', 'refused']).withMessage('Status noto\'g\'ri'),
    body('channel').optional().isIn(['call', 'visit', 'sms', 'telegram', 'whatsapp', 'meeting', 'other']),
    body('topic').optional().isIn(['progress','attendance','behavior','payment','health','announcement','complaint','praise','general']),
    body('sentiment').optional().isIn(['positive','neutral','negative']),
    body('durationMinutes').optional().isInt({ min: 0, max: 480 }),
    body('summary').optional().isLength({ max: 2000 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      }

      const student = await User.findById(req.body.student);
      if (!student || student.role !== 'student') {
        return res.status(404).json({ message: "O'quvchi topilmadi" });
      }

      const payload = {
        student: student._id,
        classId: student.classId || null,
        reportMonth: req.body.reportMonth,
        status: req.body.status,
        channel: req.body.channel || 'call',
        contactDate: req.body.contactDate ? new Date(req.body.contactDate) : new Date(),
        durationMinutes: req.body.durationMinutes != null ? Number(req.body.durationMinutes) : null,
        topic: req.body.topic || 'general',
        parentName: req.body.parentName || student.parentName || null,
        parentPhone: req.body.parentPhone || student.parentPhone || null,
        summary: req.body.summary || '',
        sentiment: req.body.sentiment || 'neutral',
        followUpRequired: !!req.body.followUpRequired,
        followUpDate: req.body.followUpDate ? new Date(req.body.followUpDate) : null,
        followUpNotes: req.body.followUpNotes || '',
        recordedBy: req.user._id
      };

      const created = await ParentContact.create(payload);
      const populated = await ParentContact.findById(created._id)
        .populate('student', 'firstName lastName studentId parentName parentPhone phone classId')
        .populate('classId', 'grade section name')
        .populate('recordedBy', 'firstName lastName role');

      res.status(201).json(populated);
    } catch (error) {
      res.status(500).json({ message: 'Yozuv qo\'shishda xatolik', error: error.message });
    }
  }
);

// ─── PUT /api/parent-contacts/:id ───────────────────────────────────────────
router.put('/:id', auth, authorize('admin', 'accountant', 'teacher'), async (req, res) => {
  try {
    const contact = await ParentContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Yozuv topilmadi' });

    const updatable = ['status','channel','topic','sentiment','summary','parentName','parentPhone','durationMinutes','followUpRequired','followUpDate','followUpNotes'];
    updatable.forEach((f) => {
      if (req.body[f] !== undefined) contact[f] = req.body[f];
    });
    if (req.body.contactDate) contact.contactDate = new Date(req.body.contactDate);
    if (req.body.reportMonth && isValidMonth(req.body.reportMonth)) contact.reportMonth = req.body.reportMonth;

    await contact.save();
    const populated = await ParentContact.findById(contact._id)
      .populate('student', 'firstName lastName studentId parentName parentPhone phone classId')
      .populate('classId', 'grade section name')
      .populate('recordedBy', 'firstName lastName role');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Yangilashda xatolik', error: error.message });
  }
});

// ─── DELETE /api/parent-contacts/:id ────────────────────────────────────────
router.delete('/:id', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const removed = await ParentContact.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Yozuv topilmadi' });
    res.json({ message: 'Yozuv o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'O\'chirishda xatolik', error: error.message });
  }
});

module.exports = router;
