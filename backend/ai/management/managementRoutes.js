/**
 * MANAGEMENT MODULE - Routes
 * ==========================
 * Boshqaruv bo'limi AI endpoint'lari.
 *
 * ENDPOINT'LAR:
 * GET /api/ai/management/staff → Xodimlar statistikasi
 */

const express = require('express');
const router  = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const { buildManagementContext } = require('../utils/contextBuilder');

router.get('/staff', auth, authorize('admin'), async (req, res) => {
  try {
    const ctx = await buildManagementContext();
    res.json({
      totalStaff:  ctx.staff.length,
      activeStaff: ctx.staff.filter(s => s.isActive).length,
      byRole: ctx.staff.reduce((acc, s) => {
        acc[s.role] = (acc[s.role] || 0) + 1;
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
