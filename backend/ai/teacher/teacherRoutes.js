/**
 * TEACHER AI MODULE - Routes
 * ==========================
 * O'qituvchi AI yordamchi endpoint'lari.
 * Barcha route'lar auth + authorize('teacher') talab qiladi —
 * faqat tizimga kirgan o'qituvchi, faqat O'Z sinflari doirasida.
 * (authorize('teacher') admin/direktorni ham o'tkazmaydi — bu modul
 * faqat o'qituvchi konteksti uchun.)
 *
 * ENDPOINT'LAR:
 * GET    /api/ai/teacher/scope                → Sinflar/fanlar (dropdown uchun)
 * POST   /api/ai/teacher/chat                 → AI suhbat (o'z ma'lumotlari)
 * GET    /api/ai/teacher/sessions             → Sessiyalar ro'yxati
 * GET    /api/ai/teacher/sessions/:sessionId  → Sessiya tarixi
 * DELETE /api/ai/teacher/sessions/:sessionId  → Sessiyani o'chirish
 * POST   /api/ai/teacher/analyze-grades       → Baholar tahlili
 * POST   /api/ai/teacher/generate-schedule    → Dars jadvali drafti
 * POST   /api/ai/teacher/generate-test        → Oylik test savollari drafti
 * POST   /api/ai/teacher/generate-lesson-plan → Dars reja (ishlanma) drafti
 */

const express = require('express');
const router  = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const teacherController = require('./teacherController');

router.get(   '/scope',               auth, authorize('teacher'), teacherController.getScope);
router.post(  '/chat',                auth, authorize('teacher'), teacherController.chat);
router.get(   '/sessions',            auth, authorize('teacher'), teacherController.getSessions);
router.get(   '/sessions/:sessionId', auth, authorize('teacher'), teacherController.getChatHistory);
router.delete('/sessions/:sessionId', auth, authorize('teacher'), teacherController.deleteSession);
router.post(  '/analyze-grades',      auth, authorize('teacher'), teacherController.analyzeGrades);
router.post(  '/generate-schedule',   auth, authorize('teacher'), teacherController.generateSchedule);
router.post(  '/generate-test',       auth, authorize('teacher'), teacherController.generateTest);
router.post(  '/generate-lesson-plan', auth, authorize('teacher'), teacherController.generateLessonPlan);

module.exports = router;
