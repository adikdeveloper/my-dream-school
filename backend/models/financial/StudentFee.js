const mongoose = require('mongoose');

const studentFeeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  monthlyFee: {
    type: Number,
    required: true,
    min: 0,
    default: 500000 // Default: 500,000 so'm per month
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 // Percentage (%)
  },
  discountReason: {
    type: String,
    default: null
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Calculate final fee after discount
studentFeeSchema.virtual('finalMonthlyFee').get(function() {
  if (this.discount > 0) {
    return this.monthlyFee - (this.monthlyFee * this.discount / 100);
  }
  return this.monthlyFee;
});

// Ensure virtuals are included in JSON
studentFeeSchema.set('toJSON', { virtuals: true });
studentFeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StudentFee', studentFeeSchema);
