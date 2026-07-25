/**
 * API KEYS MODULE - Routes
 * =========================
 * API kalitlar va usage statistikasi endpoint'lari.
 *
 * ENDPOINT'LAR:
 * GET    /api/ai/keys        → Barcha kalitlar (maskalangan)
 * POST   /api/ai/keys        → Yangi kalit qo'shish (validatsiya bilan)
 * PUT    /api/ai/keys/:id    → Kalitni yangilash
 * DELETE /api/ai/keys/:id    → Kalitni o'chirish
 * GET    /api/ai/usage       → Umumiy usage statistikasi
 */

const express         = require('express');
const router          = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const keysController  = require('./keysController');

router.get(   '/keys',       auth, authorize('admin'), keysController.getApiKeys);
router.post(  '/keys',       auth, authorize('admin'), keysController.addApiKey);
router.put(   '/keys/:id',   auth, authorize('admin'), keysController.updateApiKey);
router.delete('/keys/:id',   auth, authorize('admin'), keysController.deleteApiKey);
router.get(   '/usage',      auth, authorize('admin'), keysController.getUsage);

module.exports = router;
