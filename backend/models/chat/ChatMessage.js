const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'file'], default: 'file' },
  url: String,
  name: String,
  size: Number,
  mimeType: String
}, { _id: false });

const readReceiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  readAt: { type: Date, default: Date.now }
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  messageType: {
    type: String,
    enum: ['text', 'sticker'],
    default: 'text'
  },
  sticker: { type: String, default: null },
  text: {
    type: String,
    default: '',
    maxlength: 4000
  },
  attachments: [attachmentSchema],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  readBy: [readReceiptSchema],
  // Soft delete: hide message for these users (or for all if isDeleted=true)
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  // System messages: "X joined", "Y created the group"
  isSystem: { type: Boolean, default: false }
}, {
  timestamps: true
});

chatMessageSchema.index({ room: 1, createdAt: -1 });
chatMessageSchema.index({ room: 1, sender: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
