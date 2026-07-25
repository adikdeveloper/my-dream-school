const mongoose = require('mongoose');

/**
 * Maktab jihozlari (inventar) — xonalar bo'yicha.
 *
 * Har bir hujjat bitta XONANI ifodalaydi (qavat + xona raqami) va shu
 * xonadagi barcha jihozlar ro'yxatini (parta, stul, doska va h.k.) saqlaydi.
 * Misol: 1-qavat, 5-xona → 5 ta parta, 20 ta stul, 1 ta doska.
 */

// Bitta jihoz turi (xona ichida)
const equipmentItemSchema = new mongoose.Schema({
  // Jihoz nomi: "Parta", "Stul", "Doska", "Proyektor", ...
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  // Soni
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  // Holati
  condition: {
    type: String,
    enum: ['good', 'needs_repair', 'broken'],
    default: 'good'
  },
  // Qo'shimcha izoh (ixtiyoriy)
  note: {
    type: String,
    trim: true,
    maxlength: 300,
    default: ''
  }
}, { _id: true });

const roomSchema = new mongoose.Schema({
  // Qavat (1, 2, 3, ...). Yerto'la uchun 0 ishlatilishi mumkin.
  floor: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  // Xona raqami yoki belgisi: "5", "5-xona", "A-12"
  roomNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  // Xona nomi (ixtiyoriy): "Fizika xonasi", "Direktor kabineti"
  name: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  // Xona turi
  type: {
    type: String,
    enum: [
      'classroom',  // Sinfxona
      'lab',        // Laboratoriya
      'office',     // Ofis / Kabinet
      'library',    // Kutubxona
      'gym',        // Sport zali
      'cafeteria',  // Oshxona
      'storage',    // Ombor
      'restroom',   // Hojatxona
      'hall',       // Yo'lak / Zal
      'other'       // Boshqa
    ],
    default: 'classroom'
  },
  // Sig'imi (necha o'quvchiga mo'ljallangan) — ixtiyoriy
  capacity: {
    type: Number,
    min: 0,
    default: null
  },
  // Mas'ul shaxs (ixtiyoriy): xona biriktirilgan xodim ismi
  responsible: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  // Xonadagi jihozlar
  items: {
    type: [equipmentItemSchema],
    default: []
  },
  // Umumiy izoh
  note: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indekslar
roomSchema.index({ floor: 1, roomNumber: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ isActive: 1 });

// Xonadagi jihozlarning umumiy soni (virtual)
roomSchema.virtual('totalItems').get(function () {
  return (this.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
});

roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Room', roomSchema);
