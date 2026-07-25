/**
 * REPORTS MODULE - Routes
 * ========================
 * Hisobot va statistika uchun AI endpoint'lari.
 *
 * ENDPOINT'LAR:
 * GET /api/ai/reports/overview → Maktab umumiy hisoboti
 */

const express = require('express');
const router  = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const User       = require('../../models/users/User');
const Class      = require('../../models/academic/Class');
const Subject    = require('../../models/academic/Subject');
const FinancialSummary = require('../../models/financial/FinancialSummary');

router.get('/overview', auth, authorize('admin'), async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [students, activeStudents, teachers, activeTeachers, classes, subjects, debtors, todaySummary] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      Class.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'student', balance: { $lt: 0 } }),
      FinancialSummary.findOne({ date: { $gte: today } }).lean()
    ]);
    res.json({
      students:       { total: students,  active: activeStudents },
      teachers:       { total: teachers,  active: activeTeachers },
      classes,
      subjects,
      debtors,
      todayFinance:   todaySummary || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
