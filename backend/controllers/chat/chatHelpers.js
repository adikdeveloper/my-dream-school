const ChatRoom = require('../../models/chat/ChatRoom');
const ChatMessage = require('../../models/chat/ChatMessage');
const User = require('../../models/users/User');
const Class = require('../../models/academic/Class');

const TEACHER_GROUP_KEY = 'global:teachers';
const STAFF_GROUP_KEY = 'global:staff';
const STAFF_ROLES = ['admin', 'director', 'supervisor', 'accountant', 'hr', 'reception', 'callcenter'];

const buildPrivateKey = (a, b) => {
  const [x, y] = [String(a), String(b)].sort();
  return `dm:${x}:${y}`;
};

const canDirectMessage = async (fromUser, toUser) => {
  if (!fromUser || !toUser) return false;
  if (String(fromUser._id) === String(toUser._id)) return false;
  if (!toUser.isActive) return false;

  const role = fromUser.role;
  const otherRole = toUser.role;

  // Admin/Director can DM anyone
  if (role === 'admin' || role === 'director') return true;
  if (otherRole === 'admin' || otherRole === 'director') return true;

  // Staff <-> Staff/Teacher freely
  if (STAFF_ROLES.includes(role) && (STAFF_ROLES.includes(otherRole) || otherRole === 'teacher')) return true;
  if (STAFF_ROLES.includes(otherRole) && role === 'teacher') return true;

  // Teacher <-> Teacher freely
  if (role === 'teacher' && otherRole === 'teacher') return true;

  // Teacher <-> Student of teacher's classes
  if (role === 'teacher' && otherRole === 'student') {
    if (!toUser.classId) return false;
    const cls = await Class.findById(toUser.classId).select('classTeacher subjects').lean();
    if (!cls) return false;
    if (String(cls.classTeacher) === String(fromUser._id)) return true;
    return (cls.subjects || []).some((s) => String(s.teacher) === String(fromUser._id));
  }
  if (role === 'student' && otherRole === 'teacher') {
    if (!fromUser.classId) return false;
    const cls = await Class.findById(fromUser.classId).select('classTeacher subjects').lean();
    if (!cls) return false;
    if (String(cls.classTeacher) === String(toUser._id)) return true;
    return (cls.subjects || []).some((s) => String(s.teacher) === String(toUser._id));
  }

  // Student <-> Student of same class
  if (role === 'student' && otherRole === 'student') {
    if (!fromUser.classId || !toUser.classId) return false;
    return String(fromUser.classId) === String(toUser.classId);
  }

  return false;
};

const ensureClassRoom = async (classId) => {
  const cls = await Class.findById(classId).select('name grade section classTeacher students subjects').lean();
  if (!cls) return null;

  const teacherIds = new Set();
  if (cls.classTeacher) teacherIds.add(String(cls.classTeacher));
  (cls.subjects || []).forEach((s) => {
    if (s.teacher) teacherIds.add(String(s.teacher));
  });
  const studentIds = (cls.students || []).map((id) => String(id));
  const participants = Array.from(new Set([...teacherIds, ...studentIds]));

  const roomName = `${cls.name || `${cls.grade}-${cls.section}`} sinfi`;

  let room = await ChatRoom.findOne({ type: 'class', classId: cls._id });
  if (!room) {
    room = await ChatRoom.create({
      type: 'class',
      name: roomName,
      classId: cls._id,
      participants,
      admins: Array.from(teacherIds),
      createdBy: cls.classTeacher || null,
      description: 'Avtomatik yaratilgan sinf chati'
    });
  } else {
    let dirty = false;
    if (room.name !== roomName) {
      room.name = roomName;
      dirty = true;
    }
    const currentSet = new Set(room.participants.map((id) => String(id)));
    const targetSet = new Set(participants);
    if (currentSet.size !== targetSet.size || [...targetSet].some((id) => !currentSet.has(id))) {
      room.participants = participants;
      dirty = true;
    }
    const currentAdmins = new Set(room.admins.map((id) => String(id)));
    const targetAdmins = teacherIds;
    if (currentAdmins.size !== targetAdmins.size || [...targetAdmins].some((id) => !currentAdmins.has(id))) {
      room.admins = Array.from(targetAdmins);
      dirty = true;
    }
    if (dirty) await room.save();
  }
  return room;
};

const ensureGlobalGroup = async (kind) => {
  const isTeachers = kind === 'teachers_group';
  const groupKey = isTeachers ? TEACHER_GROUP_KEY : STAFF_GROUP_KEY;
  const name = isTeachers ? "O'qituvchilar guruhi" : 'Xodimlar guruhi';
  const description = isTeachers
    ? "Barcha o'qituvchilar uchun umumiy guruh"
    : 'Maktab xodimlari uchun umumiy guruh';

  // Admin va director har ikki guruhga ham a'zo bo'ladi
  const roleFilter = isTeachers
    ? { role: { $in: ['teacher', 'admin', 'director'] } }
    : { role: { $in: STAFF_ROLES } };
  const members = await User.find({ ...roleFilter, isActive: true })
    .select('_id role')
    .lean();
  const participantIds = members.map((m) => String(m._id));
  const adminIds = members.filter((m) => m.role === 'admin' || m.role === 'director').map((m) => String(m._id));

  let room = await ChatRoom.findOne({ groupKey });
  if (!room) {
    room = await ChatRoom.create({
      type: isTeachers ? 'teachers_group' : 'staff_group',
      name,
      description,
      groupKey,
      participants: participantIds,
      admins: adminIds.length ? adminIds : participantIds.slice(0, 1)
    });
  } else {
    let dirty = false;
    const currentSet = new Set(room.participants.map((id) => String(id)));
    const targetSet = new Set(participantIds);
    if (currentSet.size !== targetSet.size || [...targetSet].some((id) => !currentSet.has(id))) {
      room.participants = participantIds;
      dirty = true;
    }
    if (adminIds.length) {
      const adminsSet = new Set(room.admins.map((id) => String(id)));
      const targetAdminsSet = new Set(adminIds);
      if (adminsSet.size !== targetAdminsSet.size || [...targetAdminsSet].some((id) => !adminsSet.has(id))) {
        room.admins = adminIds;
        dirty = true;
      }
    }
    if (dirty) await room.save();
  }
  return room;
};

const syncRoomsForUser = async (user) => {
  if (!user) return;
  try {
    if (user.role === 'teacher') {
      await ensureGlobalGroup('teachers_group');
    } else if (STAFF_ROLES.includes(user.role)) {
      await ensureGlobalGroup('staff_group');
    } else if (user.role === 'student' && user.classId) {
      await ensureClassRoom(user.classId);
    }
  } catch (err) {
    console.error('syncRoomsForUser error:', err.message);
  }
};

const updateLastMessage = async (roomId, message, sender) => {
  const senderName = sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : '';
  let previewText = message.text;
  if (!previewText) {
    if (message.messageType === 'sticker' && message.sticker) {
      previewText = `${message.sticker} Stiker`;
    } else if (message.attachments?.length) {
      previewText = '📎 Fayl';
    } else {
      previewText = '';
    }
  }
  await ChatRoom.findByIdAndUpdate(roomId, {
    lastMessage: {
      text: previewText,
      sender: sender?._id || null,
      senderName,
      timestamp: message.createdAt || new Date()
    },
    updatedAt: new Date()
  });
};

module.exports = {
  STAFF_ROLES,
  TEACHER_GROUP_KEY,
  STAFF_GROUP_KEY,
  buildPrivateKey,
  canDirectMessage,
  ensureClassRoom,
  ensureGlobalGroup,
  syncRoomsForUser,
  updateLastMessage
};
