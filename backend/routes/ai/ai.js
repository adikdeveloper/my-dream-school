const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const aiController = require('../../controllers/aiController');

// Chat routes
router.post('/chat', auth, authorize('admin'), aiController.chat);
router.get('/sessions', auth, authorize('admin'), aiController.getSessions);
router.get('/sessions/:sessionId', auth, authorize('admin'), aiController.getChatHistory);
router.delete('/sessions/:sessionId', auth, authorize('admin'), aiController.deleteSession);

// API Key management
router.get('/keys', auth, authorize('admin'), aiController.getApiKeys);
router.post('/keys', auth, authorize('admin'), aiController.addApiKey);
router.put('/keys/:id', auth, authorize('admin'), aiController.updateApiKey);
router.delete('/keys/:id', auth, authorize('admin'), aiController.deleteApiKey);

// Usage stats
router.get('/usage', auth, authorize('admin'), aiController.getUsage);

module.exports = router;
