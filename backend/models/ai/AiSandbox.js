const mongoose = require('mongoose');

/**
 * AI SANDBOX MODEL
 * ================
 * Har bir rol uchun AI qoidalarini (system prompt sandbox) saqlovchi model.
 * Rollar: admin, teacher, student, accountant, hr, reception, call-center
 *
 * Bu yerda saqlangan qoidalar AI ning xulq-atvori va javoblarini belgilaydi.
 */

const aiSandboxSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'accountant', 'hr', 'reception', 'call-center'],
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
    // Masalan: "Admin AI", "O'qituvchi AI", "O'quvchi AI"
  },
  systemPrompt: {
    type: String,
    required: true,
    default: ''
    // Rol uchun maxsus qoidalar va ko'rsatmalar
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
    // Qisqa tavsif
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

aiSandboxSchema.index({ role: 1 }, { unique: true });

module.exports = mongoose.model('AiSandbox', aiSandboxSchema);
