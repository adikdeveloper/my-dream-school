/**
 * COMMUNICATION MODULE - Routes
 * ==============================
 * Aloqa bo'limi AI endpoint'lari.
 *
 * ENDPOINT'LAR:
 * GET /api/ai/communication/stats → Aloqa statistikasi
 */

const express = require('express');
const router  = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const { buildCommunicationContext } = require('../utils/contextBuilder');

router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const ctx = await buildCommunicationContext();
    res.json({
      leads:         ctx.leads.length,
      notifications: ctx.notifications.length,
      reminders:     ctx.reminders.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
