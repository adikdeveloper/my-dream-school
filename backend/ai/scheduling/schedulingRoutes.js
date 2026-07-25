/**
 * SCHEDULING MODULE - Routes
 * ==========================
 * Jadval va bayramlar uchun AI endpoint'lari.
 *
 * ENDPOINT'LAR:
 * GET /api/ai/scheduling/holidays → Yaqin kelayotgan bayramlar
 * GET /api/ai/scheduling/upcoming → Yaqin imtihon/vazifalar
 */

const express  = require('express');
const router   = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const Holiday    = require('../../models/scheduling/Holiday');
const Assignment = require('../../models/academic/Assignment');
const Test       = require('../../models/academic/Test');

router.get('/holidays', auth, authorize('admin'), async (req, res) => {
  try {
    const upcoming = await Holiday.find({ isActive: true, date: { $gte: new Date() } })
      .sort({ date: 1 }).limit(10).lean();
    res.json({ holidays: upcoming });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/upcoming', auth, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const [tests, assignments] = await Promise.all([
      Test.find({ isActive: true, testDate: { $gte: now } }).populate('class subject', 'name grade section').sort({ testDate: 1 }).limit(10).lean(),
      Assignment.find({ status: 'active', dueDate: { $gte: now } }).populate('class subject', 'name grade section').sort({ dueDate: 1 }).limit(10).lean()
    ]);
    res.json({ tests, assignments });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
