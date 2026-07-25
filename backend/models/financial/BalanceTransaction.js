const mongoose = require('mongoose');

const balanceTransactionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  transactionType: {
    type: String,
    enum: [
      'excess_payment',      // Ortiqcha to'lov
      'transfer_to_next',    // Keyingi oyga o'tkazish
      'refund',              // Qaytarish
      'use_for_payment',     // To'lovga ishlatish
      'use_for_other',       // Boshqa to'lovga ishlatish
      'fine'                 // Jarima (maktab kassasiga tushadi)
    ],
    required: true
  },
  relatedPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null  // To'lovga bog'langan bo'lsa
  },
  usedForMonth: {
    type: String,
    default: null  // Qaysi oyga ishlatilgan (Format: "YYYY-MM")
  },
  description: {
    type: String,
    required: function () {
      // Boshqa to'lovga ishlatilsa, izoh majburiy
      return this.transactionType === 'use_for_other';
    },
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true  // Kim amalga oshirdi (admin)
  },
  isActive: {
    type: Boolean,
    default: true  // Bekor qilingan bo'lsa false
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
balanceTransactionSchema.index({ studentId: 1, createdAt: -1 });
balanceTransactionSchema.index({ transactionType: 1 });
balanceTransactionSchema.index({ relatedPaymentId: 1 });

module.exports = mongoose.model('BalanceTransaction', balanceTransactionSchema);
