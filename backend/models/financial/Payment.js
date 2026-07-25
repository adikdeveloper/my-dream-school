const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  actualPayment: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentType: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer'], // naxt, karta, bank o'tkazmasi
    required: true,
    default: 'cash'
  },
  paymentMonth: {
    type: String,
    required: true // Format: "YYYY-MM" masalan "2025-01"
  },
  description: {
    type: String,
    default: null
  },
  // Kassa/Bank details
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Kim qabul qildi (admin)
    default: null
  },
  receiptNumber: {
    type: String,
    default: null
  },
  transactionId: {
    type: String,
    default: null // Bank o'tkazmasi uchun
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentSchema.index({ studentId: 1, paymentMonth: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ paymentType: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
