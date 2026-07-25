/**
 * EDUCATION MODULE - Routes
 * =========================
 * Ta'lim bo'limi AI endpoint'lari.
 * (Kelajakda alohida education-specific endpoint'lar qo'shiladi)
 *
 * ENDPOINT'LAR:
 * GET /api/ai/education/stats  → Ta'lim statistikasi
 * GET /api/ai/education/summary → Ta'lim bo'limi umumiy holati
 */

const express = require('express');
const router  = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const { buildEducationContext } = require('../utils/contextBuilder');

// Ta'lim bo'limi statistikasi
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const ctx = await buildEducationContext();
    res.json({
      students:   ctx.students.length,
      activeStudents: ctx.students.filter(s => s.isActive).length,
      teachers:   ctx.teachers.length,
      classes:    ctx.classes.length,
      subjects:   ctx.subjects.length,
      recentGrades: ctx.grades.length,
      recentAttendance: ctx.attendance.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
