const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const Assignment = require('../../models/academic/Assignment');
const Announcement = require('../../models/communication/Announcement');
const Grade = require('../../models/academic/Grade');
const Attendance = require('../../models/academic/Attendance');
const User = require('../../models/users/User');
const Class = require('../../models/academic/Class');
const PushNotification = require('../../models/communication/PushNotification');
const { authorize } = require('../../middleware/auth');
const { requirePermission, hasPermission } = require('../../middleware/permissions');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const STAFF_ROLES = ['admin', 'director', 'supervisor', 'accountant', 'hr', 'reception', 'callcenter'];

// Filter snapshot'dan haqiqiy qabul qiluvchilar ID ro'yxatini hisoblash
async function resolveRecipients(filter) {
  if (!filter) return [];
  const conds = [];
  const explicitUsers = (filter.userIds || []).map(String);
  if (filter.mode === 'all') {
    const all = await User.find({ isActive: true }).select('_id').lean();
    return all.map((u) => u._id);
  }
  if (Array.isArray(filter.roles) && filter.roles.length) {
    conds.push({ role: { $in: filter.roles } });
  }
  if (Array.isArray(filter.classIds) && filter.classIds.length) {
    const classes = await Class.find({ _id: { $in: filter.classIds } }).select('students classTeacher subjects').lean();
    const classUserIds = new Set();
    classes.forEach((c) => {
      (c.students || []).forEach((s) => classUserIds.add(String(s)));
      if (c.classTeacher) classUserIds.add(String(c.classTeacher));
      (c.subjects || []).forEach((s) => s.teacher && classUserIds.add(String(s.teacher)));
    });
    if (classUserIds.size) conds.push({ _id: { $in: Array.from(classUserIds) } });
  }
  let users = [];
  if (conds.length) {
    users = await User.find({ $or: conds, isActive: true }).select('_id').lean();
  }
  const ids = new Set(users.map((u) => String(u._id)));
  explicitUsers.forEach((id) => ids.add(id));
  return Array.from(ids);
}

function buildFilterSummary(filter, classNameMap = {}) {
  if (!filter || filter.mode === 'all') return 'Barcha foydalanuvchilar';
  const parts = [];
  if (filter.roles?.length) {
    const labels = {
      admin: 'Adminlar',
      director: 'Direktorlar',
      teacher: "O'qituvchilar",
      student: "O'quvchilar",
      supervisor: 'Nazoratchilar',
      accountant: 'Hisobchilar',
      hr: 'HR',
      reception: 'Reception',
      callcenter: 'Call-center'
    };
    parts.push(filter.roles.map((r) => labels[r] || r).join(', '));
  }
  if (filter.classIds?.length) {
    const names = filter.classIds.map((id) => classNameMap[String(id)] || 'Sinf').join(', ');
    parts.push(`Sinflar: ${names}`);
  }
  if (filter.userIds?.length) {
    parts.push(`${filter.userIds.length} ta tanlangan foydalanuvchi`);
  }
  return parts.length ? parts.join(' • ') : 'Barchasi';
}

// POST /api/notifications — yangi bildirishnoma yuborish
router.post('/', auth, requirePermission('notification.send'), async (req, res) => {
  try {
    const { title, message, icon, priority, category, link, targetFilter } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "Sarlavha va xabar matni majburiy" });
    }
    const filter = targetFilter || { mode: 'all' };
    // 'all' filter uchun qo'shimcha ruxsat
    if (filter.mode === 'all') {
      const broadcastOk = await hasPermission(req.user, 'notification.broadcast_all');
      if (!broadcastOk) {
        return res.status(403).json({ message: "Barchaga yuborish uchun ruxsat yo'q" });
      }
    }
    const recipientIds = await resolveRecipients(filter);
    if (!recipientIds.length) {
      return res.status(400).json({ message: 'Qabul qiluvchi foydalanuvchi topilmadi' });
    }
    let classNameMap = {};
    if (filter.classIds?.length) {
      const classes = await Class.find({ _id: { $in: filter.classIds } }).select('name').lean();
      classes.forEach((c) => { classNameMap[String(c._id)] = c.name; });
    }
    const summary = buildFilterSummary(filter, classNameMap);

    const notification = await PushNotification.create({
      title: title.trim(),
      message: message.trim(),
      icon: icon || '🔔',
      priority: priority || 'normal',
      category: category || 'info',
      link: link || null,
      sender: req.user._id,
      targetFilter: { ...filter, summary },
      recipients: recipientIds
    });

    const populated = await PushNotification.findById(notification._id)
      .populate('sender', 'firstName lastName role profileImage')
      .lean();

    res.status(201).json({ notification: populated, recipientCount: recipientIds.length });
  } catch (err) {
    console.error('createNotification error:', err);
    res.status(500).json({ message: 'Bildirishnoma yuborishda xatolik' });
  }
});

// GET /api/notifications — yuborilgan bildirishnomalar (admin/direktor)
router.get('/', auth, authorize('admin', 'director'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const query = {};
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
      const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: new RegExp(escaped, 'i') },
        { message: new RegExp(escaped, 'i') }
      ];
    }
    if (req.query.mine === 'true') {
      query.sender = req.user._id;
    }
    const [items, total] = await Promise.all([
      PushNotification.find(query)
        .populate('sender', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PushNotification.countDocuments(query)
    ]);
    res.json({
      notifications: items.map((n) => ({
        ...n,
        recipientCount: (n.recipients || []).length,
        readCount: (n.readBy || []).length,
        recipients: undefined,
        readBy: undefined
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('listNotifications error:', err);
    res.status(500).json({ message: 'Yuklashda xatolik' });
  }
});

// GET /api/notifications/inbox — foydalanuvchining bildirishnomalari
router.get('/inbox', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const onlyUnread = req.query.unread === 'true';
    const query = {
      recipients: req.user._id,
      deletedFor: { $ne: req.user._id }
    };
    if (onlyUnread) {
      query['readBy.user'] = { $ne: req.user._id };
    }
    const items = await PushNotification.find(query)
      .populate('sender', 'firstName lastName role profileImage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await PushNotification.countDocuments({
      recipients: req.user._id,
      deletedFor: { $ne: req.user._id },
      'readBy.user': { $ne: req.user._id }
    });

    const result = items.map((n) => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      icon: n.icon,
      priority: n.priority,
      category: n.category,
      link: n.link,
      sender: n.sender,
      createdAt: n.createdAt,
      isRead: (n.readBy || []).some((r) => String(r.user) === String(req.user._id))
    }));

    res.json({ notifications: result, unreadCount });
  } catch (err) {
    console.error('inbox error:', err);
    res.status(500).json({ message: 'Yuklashda xatolik' });
  }
});

// GET /api/notifications/inbox/unread-count
router.get('/inbox/unread-count', auth, async (req, res) => {
  try {
    const count = await PushNotification.countDocuments({
      recipients: req.user._id,
      deletedFor: { $ne: req.user._id },
      'readBy.user': { $ne: req.user._id }
    });
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Noto'g'ri ID" });
    await PushNotification.updateOne(
      { _id: req.params.id, recipients: req.user._id, 'readBy.user': { $ne: req.user._id } },
      { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

// POST /api/notifications/inbox/read-all
router.post('/inbox/read-all', auth, async (req, res) => {
  try {
    await PushNotification.updateMany(
      { recipients: req.user._id, 'readBy.user': { $ne: req.user._id } },
      { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

// DELETE /api/notifications/:id — hammada o'chirish (faqat sender yoki admin/director)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Noto'g'ri ID" });
    const n = await PushNotification.findById(req.params.id);
    if (!n) return res.status(404).json({ message: 'Topilmadi' });
    const isOwnerOrAdmin = String(n.sender) === String(req.user._id)
      || req.user.role === 'admin' || req.user.role === 'director';
    if (!isOwnerOrAdmin) {
      return res.status(403).json({ message: "Ruxsat yo'q" });
    }
    await PushNotification.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

// DELETE /api/notifications/:id/inbox — faqat o'zidan o'chirish (soft)
router.delete('/:id/inbox', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Noto'g'ri ID" });
    await PushNotification.updateOne(
      { _id: req.params.id, recipients: req.user._id },
      { $addToSet: { deletedFor: req.user._id } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

// GET /api/notifications/:id — bitta bildirishnomani olish (sender/admin uchun statistika bilan)
router.get('/:id', auth, authorize('admin', 'director'), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Noto'g'ri ID" });
    const n = await PushNotification.findById(req.params.id)
      .populate('sender', 'firstName lastName role')
      .populate('recipients', 'firstName lastName role')
      .populate('readBy.user', 'firstName lastName role')
      .lean();
    if (!n) return res.status(404).json({ message: 'Topilmadi' });
    res.json({ notification: n });
  } catch (err) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

// POST /api/notifications/preview — filter natijasini ko'rib chiqish
router.post('/preview', auth, authorize('admin', 'director'), async (req, res) => {
  try {
    const filter = req.body.targetFilter || { mode: 'all' };
    const ids = await resolveRecipients(filter);
    const users = await User.find({ _id: { $in: ids } })
      .select('firstName lastName role classId')
      .populate('classId', 'name')
      .lean();
    const byRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    res.json({ count: users.length, byRole, sample: users.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ message: 'Xatolik' });
  }
});

// Get notification counts for students
router.get('/student/counts', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.user._id);
    const currentDate = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(currentDate.getDate() - 7);

    // Get lastViewed timestamps
    const lastViewedHomework = user.lastViewed?.homework || new Date(0);
    const lastViewedGrades = user.lastViewed?.grades || new Date(0);
    const lastViewedAnnouncements = user.lastViewed?.announcements || new Date(0);

    // Count pending assignments (created after last view)
    const assignments = await Assignment.find({
      status: 'active',
      dueDate: { $gte: currentDate },
      createdAt: { $gt: lastViewedHomework }
    });

    let pendingAssignmentsCount = 0;
    for (const assignment of assignments) {
      const submission = assignment.submissions?.find(
        s => s.student.toString() === req.user._id.toString()
      );
      if (!submission || submission.status === 'pending') {
        pendingAssignmentsCount++;
      }
    }

    // Count new announcements (published after last view, max 7 days)
    const newAnnouncementsCount = await Announcement.countDocuments({
      isPublished: true,
      targetAudience: { $in: ['all', 'students'] },
      publishDate: {
        $gte: sevenDaysAgo,
        $gt: lastViewedAnnouncements
      }
    });

    // Count new grades (created after last view, max 7 days)
    const newGradesCount = await Grade.countDocuments({
      student: req.user._id,
      date: {
        $gte: sevenDaysAgo,
        $gt: lastViewedGrades
      }
    });

    res.json({
      pendingAssignments: pendingAssignmentsCount,
      newAnnouncements: newAnnouncementsCount,
      newGrades: newGradesCount,
      total: pendingAssignmentsCount + newAnnouncementsCount + newGradesCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notification counts for teachers
router.get('/teacher/counts', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.user._id);
    const currentDate = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(currentDate.getDate() - 7);

    // Get lastViewed timestamps
    const lastViewedAssignments = user.lastViewed?.assignments || new Date(0);
    const lastViewedAnnouncements = user.lastViewed?.announcements || new Date(0);

    // Count assignments pending grading (submitted after last view)
    const assignments = await Assignment.find({
      teacher: req.user._id
    });

    let pendingGradingCount = 0;
    for (const assignment of assignments) {
      const pendingSubmissions = assignment.submissions?.filter(
        s => s.status === 'submitted' && (!s.submittedAt || s.submittedAt > lastViewedAssignments)
      ).length || 0;
      pendingGradingCount += pendingSubmissions;
    }

    // Count new announcements (published after last view, max 7 days)
    const newAnnouncementsCount = await Announcement.countDocuments({
      isPublished: true,
      targetAudience: { $in: ['all', 'teachers'] },
      publishDate: {
        $gte: sevenDaysAgo,
        $gt: lastViewedAnnouncements
      }
    });

    res.json({
      pendingGrading: pendingGradingCount,
      newAnnouncements: newAnnouncementsCount,
      total: pendingGradingCount + newAnnouncementsCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notification counts for admins
router.get('/admin/counts', auth, async (req, res) => {
  try {
    if ((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'supervisor' && req.user.role !== 'accountant')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.user._id);
    const currentDate = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(currentDate.getDate() - 7);

    // Get lastViewed timestamps
    const lastViewedAnnouncements = user.lastViewed?.announcements || new Date(0);
    const lastViewedUsers = user.lastViewed?.users || new Date(0);

    // Count new announcements (published after last view, max 7 days)
    const newAnnouncementsCount = await Announcement.countDocuments({
      isPublished: true,
      publishDate: {
        $gte: sevenDaysAgo,
        $gt: lastViewedAnnouncements
      }
    });

    // Count pending users (inactive users created after last view)
    const pendingUsersCount = await User.countDocuments({
      isActive: false,
      createdAt: { $gt: lastViewedUsers }
    });

    res.json({
      newAnnouncements: newAnnouncementsCount,
      pendingUsers: pendingUsersCount,
      total: newAnnouncementsCount + pendingUsersCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark a section as viewed
router.post('/mark-viewed', auth, async (req, res) => {
  try {
    const { section } = req.body;

    if (!section) {
      return res.status(400).json({ message: 'Section is required' });
    }

    const validSections = ['homework', 'grades', 'announcements', 'assignments', 'users'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ message: 'Invalid section' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize lastViewed if it doesn't exist
    if (!user.lastViewed) {
      user.lastViewed = {};
    }

    user.lastViewed[section] = new Date();
    await user.save();

    res.json({ message: 'Section marked as viewed', section, timestamp: user.lastViewed[section] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

