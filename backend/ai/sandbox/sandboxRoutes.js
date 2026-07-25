/**
 * AI SANDBOX MODULE - Routes
 * ===========================
 * AI Sandbox endpoint'lari — rol bo'yicha AI qoidalarini boshqarish.
 *
 * ENDPOINT'LAR:
 * GET    /api/ai/sandbox          → Barcha rollar sandboxi
 * GET    /api/ai/sandbox/:role    → Bitta rol sandbox
 * PUT    /api/ai/sandbox/:role    → Yangilash yoki yaratish
 * DELETE /api/ai/sandbox/:role    → Default ga qaytarish
 */

const express           = require('express');
const router            = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const sandboxController = require('./sandboxController');

router.get(   '/sandbox',       auth, authorize('admin'), sandboxController.getAllSandboxes);
router.get(   '/sandbox/:role', auth, authorize('admin'), sandboxController.getSandboxByRole);
router.put(   '/sandbox/:role', auth, authorize('admin'), sandboxController.upsertSandbox);
router.delete('/sandbox/:role', auth, authorize('admin'), sandboxController.resetSandbox);

module.exports = router;
