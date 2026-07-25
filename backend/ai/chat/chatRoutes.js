/**
 * CHAT MODULE - Routes
 * ====================
 * Asosiy suhbat API endpoint'lari.
 * Barcha route'lar auth + admin ruxsatini talab qiladi.
 *
 * ENDPOINT'LAR:
 * POST   /api/ai/chat                      → Xabar yuborish
 * GET    /api/ai/sessions                  → Sessiyalar ro'yxati
 * GET    /api/ai/sessions/:sessionId       → Sessiya tarixi
 * DELETE /api/ai/sessions                  → BARCHA sessiyalarni o'chirish
 * DELETE /api/ai/sessions/:sessionId       → Sessiyanyi o'chirish
 */

const express        = require('express');
const router         = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const chatController = require('./chatController');

router.post(  '/chat',                   auth, authorize('admin'), chatController.chat);
router.get(   '/sessions',               auth, authorize('admin'), chatController.getSessions);
router.get(   '/sessions/:sessionId',    auth, authorize('admin'), chatController.getChatHistory);
router.delete('/sessions',               auth, authorize('admin'), chatController.deleteAllSessions);
router.delete('/sessions/:sessionId',    auth, authorize('admin'), chatController.deleteSession);

module.exports = router;

