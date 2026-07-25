const mongoose = require('mongoose');

const lastMessageSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  senderName: { type: String, default: '' },
  timestamp: { type: Date, default: null }
}, { _id: false });

const chatRoomSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['class', 'private', 'teachers_group', 'staff_group', 'custom_group'],
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  avatar: {
    type: String,
    default: null
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null,
    index: true
  },
  // For DM rooms: deterministic "smallerId:largerId" — prevents duplicates
  privateKey: {
    type: String,
    default: null,
    index: true,
    sparse: true
  },
  // For singleton groups (teachers_group / staff_group)
  groupKey: {
    type: String,
    default: null,
    index: true,
    sparse: true
  },
  lastMessage: {
    type: lastMessageSchema,
    default: () => ({})
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

chatRoomSchema.index({ participants: 1, updatedAt: -1 });
chatRoomSchema.index({ type: 1, classId: 1 }, { unique: true, partialFilterExpression: { type: 'class' } });
chatRoomSchema.index({ privateKey: 1 }, { unique: true, partialFilterExpression: { privateKey: { $type: 'string' } } });
chatRoomSchema.index({ groupKey: 1 }, { unique: true, partialFilterExpression: { groupKey: { $type: 'string' } } });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
