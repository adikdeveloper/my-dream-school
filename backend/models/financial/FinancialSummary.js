const mongoose = require('mongoose');

const financialSummarySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  // Daromadlar
  income: {
    cash: {
      type: Number,
      default: 0
    },
    card: {
      type: Number,
      default: 0
    },
    bankTransfer: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  // Xarajatlar (masalan o'qituvchi maoshlari)
  expenses: {
    salaries: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  // Joriy balans
  currentBalance: {
    cash: {
      type: Number,
      default: 0
    },
    card: {
      type: Number,
      default: 0
    },
    bankTransfer: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  // Izoh
  notes: {
    type: String,
    default: null
  },
  // Kim yaratdi
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
financialSummarySchema.index({ date: -1 });

module.exports = mongoose.model('FinancialSummary', financialSummarySchema);
