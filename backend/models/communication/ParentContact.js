const mongoose = require('mongoose');

/**
 * Ota-onalar bilan oylik aloqa jurnali.
 *
 * Har bir o'quvchi uchun har bir oyda bitta yozuv bo'lishi kerak.
 * Aloqa qilinmagan oylarda yozuv bo'lmasligi mumkin — front-end uni
 * `status: 'pending'` ko'rinishida ko'rsatib boradi.
 */
const parentContactSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Sinf snapshot (tarixiy hisobotlar uchun)
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null,
    index: true
  },
  // Hisobot oyi - format YYYY-MM (masalan "2026-05")
  reportMonth: {
    type: String,
    required: true,
    match: /^\d{4}-(0[1-9]|1[0-2])$/,
    index: true
  },
  // Aloqa holati
  status: {
    type: String,
    enum: ['contacted', 'attempted', 'not_reached', 'refused'],
    required: true
  },
  // Aloqa kanali
  channel: {
    type: String,
    enum: ['call', 'visit', 'sms', 'telegram', 'whatsapp', 'meeting', 'other'],
    default: 'call'
  },
  // Aloqa qilingan sana
  contactDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  // Suhbat davomiyligi (daqiqa) — ixtiyoriy
  durationMinutes: {
    type: Number,
    min: 0,
    max: 480,
    default: null
  },
  // Asosiy mavzu
  topic: {
    type: String,
    enum: [
      'progress',         // O'zlashtirish
      'attendance',       // Davomat
      'behavior',         // Xulq
      'payment',          // To'lov
      'health',           // Sog'liq
      'announcement',     // E'lon/yangilik
      'complaint',        // Shikoyat
      'praise',           // Maqtov
      'general'           // Umumiy
    ],
    default: 'general'
  },
  // Qaysi ota-ona bilan gaplashildi (snapshot — kontakt vaqtidagi nomi)
  parentName: {
    type: String,
    trim: true,
    default: null
  },
  parentPhone: {
    type: String,
    trim: true,
    default: null
  },
  // Suhbat mazmuni / qisqacha izoh
  summary: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  // Ota-onaning reaktsiyasi yoki kayfiyati
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  // Keyingi qadam / kelishilgan ish
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date,
    default: null
  },
  followUpNotes: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  // Ushbu yozuvni kim qayd qildi (admin/director/teacher)
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Bitta o'quvchi uchun bir oyda bitta yozuv (oxirgi - eng yangi)
parentContactSchema.index({ student: 1, reportMonth: 1 });
parentContactSchema.index({ reportMonth: 1, status: 1 });
parentContactSchema.index({ classId: 1, reportMonth: 1 });
parentContactSchema.index({ contactDate: -1 });

// Joriy oyni qaytaruvchi helper
parentContactSchema.statics.currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Berilgan oy uchun barcha kontaktlar (bir o'quvchidan ko'p bo'lishi mumkin)
parentContactSchema.statics.findByMonth = function (reportMonth) {
  return this.find({ reportMonth })
    .populate('student', 'firstName lastName studentId parentName parentPhone phone classId')
    .populate('classId', 'grade section name')
    .populate('recordedBy', 'firstName lastName role')
    .sort({ contactDate: -1 });
};

module.exports = mongoose.model('ParentContact', parentContactSchema);
