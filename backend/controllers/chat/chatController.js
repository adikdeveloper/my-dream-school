const mongoose = require('mongoose');
const ChatRoom = require('../../models/chat/ChatRoom');
const ChatMessage = require('../../models/chat/ChatMessage');
const User = require('../../models/users/User');
const Class = require('../../models/academic/Class');
const { hasPermission } = require('../../middleware/permissions');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const {
  STAFF_ROLES,
  buildPrivateKey,
  canDirectMessage,
  ensureClassRoom,
  ensureGlobalGroup,
  updateLastMessage
} = require('./chatHelpers');

const safePopulateUser = 'firstName lastName role profileImage';

// GET /api/chat/rooms — barcha foydalanuvchining xonalari
exports.listRooms = async (req, res) => {
  try {
    const userId = req.user._id;

    // Tegishli singleton guruh va sinf chatlari mavjudligini ta'minlash
    if (req.user.role === 'teacher') {
      await ensureGlobalGroup('teachers_group');
    } else if (STAFF_ROLES.includes(req.user.role)) {
      await ensureGlobalGroup('staff_group');
    }
    if (req.user.role === 'student' && req.user.classId) {
      await ensureClassRoom(req.user.classId);
    }
    // Admin/director: ikkala global guruhga ham kirsin
    if (req.user.role === 'admin' || req.user.role === 'director') {
      await ensureGlobalGroup('teachers_group');
      await ensureGlobalGroup('staff_group');
    }

    const rooms = await ChatRoom.find({ participants: userId, isActive: true })
      .populate('participants', safePopulateUser)
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
      .lean();

    // Har bir room uchun o'qilmagan xabarlar sonini hisoblash
    const roomIds = rooms.map((r) => r._id);
    const unreadAgg = await ChatMessage.aggregate([
      { $match: { room: { $in: roomIds }, sender: { $ne: userId }, isDeleted: { $ne: true } } },
      { $match: { 'readBy.user': { $ne: userId } } },
      { $group: { _id: '$room', count: { $sum: 1 } } }
    ]);
    const unreadMap = Object.fromEntries(unreadAgg.map((u) => [String(u._id), u.count]));

    const result = rooms.map((r) => {
      let displayName = r.name;
      let displayAvatar = r.avatar;
      if (r.type === 'private') {
        const other = (r.participants || []).find((p) => String(p._id) !== String(userId));
        if (other) {
          displayName = `${other.firstName || ''} ${other.lastName || ''}`.trim();
          displayAvatar = other.profileImage || null;
        }
      }
      return {
        ...r,
        displayName,
        displayAvatar,
        unreadCount: unreadMap[String(r._id)] || 0
      };
    });

    res.json({ rooms: result });
  } catch (err) {
    console.error('listRooms error:', err);
    res.status(500).json({ message: 'Chatlarni yuklashda xatolik' });
  }
};

// GET /api/chat/rooms/:id
exports.getRoom = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id)
      .populate('participants', safePopulateUser)
      .populate('admins', safePopulateUser)
      .lean();
    if (!room) return res.status(404).json({ message: 'Chat topilmadi' });
    if (!room.participants.some((p) => String(p._id) === String(req.user._id))) {
      return res.status(403).json({ message: 'Sizga ruxsat yo\'q' });
    }
    res.json({ room });
  } catch (err) {
    console.error('getRoom error:', err);
    res.status(500).json({ message: 'Chatni yuklashda xatolik' });
  }
};

// GET /api/chat/rooms/:id/messages?before=<msgId>&limit=50
exports.listMessages = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const room = await ChatRoom.findById(req.params.id).select('participants').lean();
    if (!room) return res.status(404).json({ message: 'Chat topilmadi' });
    if (!room.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: 'Sizga ruxsat yo\'q' });
    }

    const query = { room: req.params.id, deletedFor: { $ne: req.user._id } };
    if (req.query.before) {
      const beforeMsg = await ChatMessage.findById(req.query.before).select('createdAt').lean();
      if (beforeMsg) query.createdAt = { $lt: beforeMsg.createdAt };
    }
    if (req.query.after) {
      const afterMsg = await ChatMessage.findById(req.query.after).select('createdAt').lean();
      if (afterMsg) query.createdAt = { $gt: afterMsg.createdAt };
    }

    const messages = await ChatMessage.find(query)
      .populate('sender', safePopulateUser)
      .populate({ path: 'replyTo', select: 'text sender', populate: { path: 'sender', select: 'firstName lastName' } })
      .sort({ createdAt: req.query.after ? 1 : -1 })
      .limit(limit)
      .lean();

    res.json({ messages: req.query.after ? messages : messages.reverse() });
  } catch (err) {
    console.error('listMessages error:', err);
    res.status(500).json({ message: 'Xabarlarni yuklashda xatolik' });
  }
};

// POST /api/chat/rooms — yangi xona (DM yoki maxsus guruh)
exports.createRoom = async (req, res) => {
  try {
    const { type, userId: targetUserId, name, description, participantIds } = req.body;
    if (type === 'private') {
      if (!targetUserId) return res.status(400).json({ message: 'Foydalanuvchi tanlanmagan' });
      if (String(targetUserId) === String(req.user._id)) {
        return res.status(400).json({ message: "O'zingizga xabar yozolmaysiz" });
      }
      const canCreate = await hasPermission(req.user, 'chat.create_private');
      if (!canCreate) {
        return res.status(403).json({ message: "Shaxsiy chat boshlash ruxsati yo'q" });
      }
      const target = await User.findById(targetUserId);
      if (!target) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

      const allowed = await canDirectMessage(req.user, target);
      if (!allowed) {
        return res.status(403).json({ message: "Bu foydalanuvchi bilan yozishish ruxsat etilmagan" });
      }

      const privateKey = buildPrivateKey(req.user._id, target._id);
      let room = await ChatRoom.findOne({ privateKey });
      if (!room) {
        room = await ChatRoom.create({
          type: 'private',
          name: `${target.firstName || ''} ${target.lastName || ''}`.trim() || 'Chat',
          participants: [req.user._id, target._id],
          privateKey,
          createdBy: req.user._id
        });
      }
      const populated = await ChatRoom.findById(room._id).populate('participants', safePopulateUser).lean();
      return res.json({ room: populated });
    }

    if (type === 'custom_group') {
      const canCreateGroup = await hasPermission(req.user, 'chat.create_group');
      if (!canCreateGroup) {
        return res.status(403).json({ message: "Guruh yaratish ruxsati yo'q" });
      }
      if (!name || !Array.isArray(participantIds) || participantIds.length < 2) {
        return res.status(400).json({ message: 'Guruh nomi va kamida 2 a\'zo kerak' });
      }
      const uniqueIds = Array.from(new Set([...participantIds.map(String), String(req.user._id)]));
      const room = await ChatRoom.create({
        type: 'custom_group',
        name,
        description: description || '',
        participants: uniqueIds,
        admins: [req.user._id],
        createdBy: req.user._id
      });
      const populated = await ChatRoom.findById(room._id).populate('participants', safePopulateUser).lean();
      return res.json({ room: populated });
    }

    res.status(400).json({ message: 'Noto\'g\'ri turdagi xona' });
  } catch (err) {
    console.error('createRoom error:', err);
    res.status(500).json({ message: 'Xona yaratishda xatolik' });
  }
};

// POST /api/chat/rooms/:id/messages
exports.sendMessage = async (req, res) => {
  try {
    const { text, attachments, replyTo, messageType, sticker } = req.body;
    const isSticker = messageType === 'sticker' && sticker;
    if (!isSticker && (!text || !text.trim()) && (!attachments || !attachments.length)) {
      return res.status(400).json({ message: 'Xabar bo\'sh' });
    }
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Chat topilmadi' });
    if (!room.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: 'Sizga ruxsat yo\'q' });
    }

    const message = await ChatMessage.create({
      room: room._id,
      sender: req.user._id,
      messageType: isSticker ? 'sticker' : 'text',
      sticker: isSticker ? String(sticker).slice(0, 16) : null,
      text: isSticker ? '' : (text || '').trim(),
      attachments: isSticker ? [] : (attachments || []),
      replyTo: replyTo || null,
      readBy: [{ user: req.user._id }]
    });

    await updateLastMessage(room._id, message, req.user);

    const populated = await ChatMessage.findById(message._id)
      .populate('sender', safePopulateUser)
      .populate({ path: 'replyTo', select: 'text sender messageType sticker', populate: { path: 'sender', select: 'firstName lastName' } })
      .lean();

    res.status(201).json({ message: populated });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: 'Xabar yuborishda xatolik' });
  }
};

// PATCH /api/chat/messages/:msgId — tahrirlash (faqat o'z matnli xabari, 24 soat ichida)
exports.editMessage = async (req, res) => {
  try {
    if (!isValidId(req.params.msgId)) return res.status(400).json({ message: "Noto'g'ri ID" });
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Matn bo'sh" });
    const msg = await ChatMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Topilmadi' });
    if (String(msg.sender) !== String(req.user._id)) {
      return res.status(403).json({ message: "Faqat o'z xabaringizni tahrirlashingiz mumkin" });
    }
    if (msg.isDeleted) return res.status(400).json({ message: "O'chirilgan xabarni tahrirlab bo'lmaydi" });
    if (msg.messageType === 'sticker') return res.status(400).json({ message: 'Stikerni tahrirlab bo\'lmaydi' });
    // 24 soat cheklov
    const hoursSinceCreated = (Date.now() - new Date(msg.createdAt).getTime()) / 36e5;
    if (hoursSinceCreated > 24) {
      return res.status(400).json({ message: "Xabar 24 soatdan eski - tahrirlab bo'lmaydi" });
    }
    msg.text = text.trim();
    msg.editedAt = new Date();
    await msg.save();
    const populated = await ChatMessage.findById(msg._id)
      .populate('sender', safePopulateUser)
      .populate({ path: 'replyTo', select: 'text sender messageType sticker', populate: { path: 'sender', select: 'firstName lastName' } })
      .lean();
    res.json({ message: populated });
  } catch (err) {
    console.error('editMessage error:', err);
    res.status(500).json({ message: 'Tahrirlashda xatolik' });
  }
};

// POST /api/chat/rooms/:id/read — barcha xabarlarni o'qilgan deb belgilash
exports.markRead = async (req, res) => {
  try {
    const room = await ChatRoom.findById(req.params.id).select('participants').lean();
    if (!room) return res.status(404).json({ message: 'Chat topilmadi' });
    if (!room.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: 'Sizga ruxsat yo\'q' });
    }
    await ChatMessage.updateMany(
      { room: req.params.id, 'readBy.user': { $ne: req.user._id }, sender: { $ne: req.user._id } },
      { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ message: 'Xatolik' });
  }
};

// DELETE /api/chat/messages/:msgId?scope=me|everyone — o'chirish
exports.deleteMessage = async (req, res) => {
  try {
    if (!isValidId(req.params.msgId)) return res.status(400).json({ message: "Noto'g'ri ID" });
    const scope = req.query.scope === 'everyone' ? 'everyone' : 'me';
    const msg = await ChatMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Topilmadi' });

    // Xabar tegishli xonaga foydalanuvchi a'zo bo'lishi kerak
    const room = await ChatRoom.findById(msg.room).select('participants').lean();
    if (!room || !room.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(403).json({ message: "Ruxsat yo'q" });
    }

    if (scope === 'everyone') {
      const isAdmin = req.user.role === 'admin' || req.user.role === 'director';
      if (String(msg.sender) !== String(req.user._id) && !isAdmin) {
        return res.status(403).json({ message: "Faqat o'z xabaringizni hammasidan o'chira olasiz" });
      }
      const canDeleteEveryone = await hasPermission(req.user, 'chat.delete_for_everyone');
      if (!canDeleteEveryone && !isAdmin) {
        return res.status(403).json({ message: "Hammasi uchun o'chirish ruxsati yo'q" });
      }
      msg.isDeleted = true;
      msg.text = '';
      msg.attachments = [];
      msg.sticker = null;
      await msg.save();
    } else {
      // Faqat o'zim uchun yashirish
      if (!msg.deletedFor.some((id) => String(id) === String(req.user._id))) {
        msg.deletedFor.push(req.user._id);
        await msg.save();
      }
    }
    res.json({ success: true, scope });
  } catch (err) {
    console.error('deleteMessage error:', err);
    res.status(500).json({ message: 'Xatolik' });
  }
};

// GET /api/chat/contacts — DM uchun mavjud foydalanuvchilar
exports.listContacts = async (req, res) => {
  try {
    const me = req.user;
    let users = [];

    if (me.role === 'admin' || me.role === 'director') {
      users = await User.find({ _id: { $ne: me._id }, isActive: true })
        .select(`${safePopulateUser} classId`)
        .lean();
    } else if (STAFF_ROLES.includes(me.role)) {
      users = await User.find({
        _id: { $ne: me._id },
        isActive: true,
        role: { $in: [...STAFF_ROLES, 'teacher'] }
      })
        .select(safePopulateUser)
        .lean();
    } else if (me.role === 'teacher') {
      // Boshqa o'qituvchilar, xodimlar va o'z sinflarining o'quvchilari
      const teachersAndStaff = await User.find({
        _id: { $ne: me._id },
        isActive: true,
        role: { $in: [...STAFF_ROLES, 'teacher'] }
      })
        .select(safePopulateUser)
        .lean();
      const myClasses = await Class.find({
        $or: [{ classTeacher: me._id }, { 'subjects.teacher': me._id }]
      })
        .select('students')
        .lean();
      const studentIds = Array.from(new Set(myClasses.flatMap((c) => (c.students || []).map(String))));
      const students = await User.find({ _id: { $in: studentIds }, isActive: true })
        .select(`${safePopulateUser} classId`)
        .populate('classId', 'name grade section')
        .lean();
      users = [...teachersAndStaff, ...students];
    } else if (me.role === 'student') {
      // Sinfdoshlar + o'z sinfining o'qituvchilari
      if (me.classId) {
        const cls = await Class.findById(me.classId)
          .select('students classTeacher subjects')
          .lean();
        if (cls) {
          const teacherIds = new Set();
          if (cls.classTeacher) teacherIds.add(String(cls.classTeacher));
          (cls.subjects || []).forEach((s) => s.teacher && teacherIds.add(String(s.teacher)));
          const classmateIds = (cls.students || []).map(String).filter((id) => id !== String(me._id));
          const allIds = [...teacherIds, ...classmateIds];
          users = await User.find({ _id: { $in: allIds }, isActive: true })
            .select(`${safePopulateUser} classId`)
            .lean();
        }
      }
    }

    res.json({ contacts: users });
  } catch (err) {
    console.error('listContacts error:', err);
    res.status(500).json({ message: 'Kontaktlarni yuklashda xatolik' });
  }
};

// GET /api/chat/unread-count — umumiy o'qilmagan xabarlar
exports.unreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const rooms = await ChatRoom.find({ participants: userId, isActive: true }).select('_id').lean();
    const roomIds = rooms.map((r) => r._id);
    const count = await ChatMessage.countDocuments({
      room: { $in: roomIds },
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
      isDeleted: { $ne: true }
    });
    res.json({ count });
  } catch (err) {
    console.error('unreadCount error:', err);
    res.status(500).json({ count: 0 });
  }
};
