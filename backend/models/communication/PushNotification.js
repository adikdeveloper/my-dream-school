const mongoose = require('mongoose');

const readReceiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  readAt: { type: Date, default: Date.now }
}, { _id: false });

const targetFilterSchema = new mongoose.Schema({
  // 'all' | 'roles' | 'classes' | 'users' | 'mixed'
  mode: { type: String, default: 'all' },
  roles: [String],
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  summary: String
}, { _id: false });

const pushNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 4000 },
  icon: { type: String, default: '🔔' },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  // 'info' | 'announcement' | 'warning' | 'event' | 'reminder'
  category: { type: String, default: 'info' },
  link: { type: String, default: null }, // optional internal URL
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Snapshot — saved at send time
  targetFilter: { type: targetFilterSchema, default: () => ({ mode: 'all' }) },
  // Resolved recipient list (frozen at send time)
  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  readBy: [readReceiptSchema],
  // Soft delete per-user
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

pushNotificationSchema.index({ recipients: 1, createdAt: -1 });
pushNotificationSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model('PushNotification', pushNotificationSchema);
