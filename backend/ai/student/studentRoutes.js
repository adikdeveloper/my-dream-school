/**
 * STUDENT AI MODULE - Routes
 * ==========================
 * O'quvchi AI yordamchi endpoint'lari.
 * Barcha route'lar auth + authorize('student') talab qiladi —
 * shu sabab faqat tizimga kirgan o'quvchi o'z AI suhbatlariga kira oladi.
 *
 * ENDPOINT'LAR:
 * POST   /api/ai/student/chat                 → Xabar yuborish (o'quv yordami)
 * GET    /api/ai/student/sessions             → Sessiyalar ro'yxati
 * GET    /api/ai/student/sessions/:sessionId  → Sessiya tarixi
 * DELETE /api/ai/student/sessions/:sessionId  → Sessiyani o'chirish
 */

const express = require('express');
const router  = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const studentController = require('./studentController');

router.post(  '/chat',                auth, authorize('student'), studentController.chat);
router.get(   '/sessions',            auth, authorize('student'), studentController.getSessions);
router.get(   '/sessions/:sessionId', auth, authorize('student'), studentController.getChatHistory);
router.delete('/sessions/:sessionId', auth, authorize('student'), studentController.deleteSession);

module.exports = router;
