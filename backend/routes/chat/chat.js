const express = require('express');
const { auth } = require('../../middleware/auth');
const chatController = require('../../controllers/chat/chatController');

const router = express.Router();

router.use(auth);

router.get('/rooms', chatController.listRooms);
router.get('/contacts', chatController.listContacts);
router.get('/unread-count', chatController.unreadCount);
router.post('/rooms', chatController.createRoom);
router.get('/rooms/:id', chatController.getRoom);
router.get('/rooms/:id/messages', chatController.listMessages);
router.post('/rooms/:id/messages', chatController.sendMessage);
router.post('/rooms/:id/read', chatController.markRead);
router.patch('/messages/:msgId', chatController.editMessage);
router.delete('/messages/:msgId', chatController.deleteMessage);

module.exports = router;
