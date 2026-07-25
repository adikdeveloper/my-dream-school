const mongoose = require('mongoose');

// Salary transaction schema for tracking individual lesson payments
const salaryTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['lesson_taught', 'lesson_missed', 'lesson_covered', 'bonus', 'deduction'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  relatedClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  relatedSubject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  // If this teacher covered for another teacher
  coveredForTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // If another teacher covered for this teacher
  coveredByTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: true });

// Monthly salary summary schema
const salarySchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  // Base salary configuration
  baseSalaryPerLesson: {
    type: Number,
    required: true,
    default: 50000, // 50,000 so'm per lesson
    min: 0
  },
  // Statistics
  totalLessonsTaught: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLessonsMissed: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLessonsCovered: {
    type: Number,
    default: 0,
    min: 0
  },
  // Financial calculations
  totalEarned: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  totalBonuses: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  // Detailed transactions
  transactions: [salaryTransactionSchema],
  // Payment status
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially_paid'],
    default: 'pending',
    index: true
  },
  paymentDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
salarySchema.index({ teacher: 1, year: 1, month: 1 }, { unique: true });

// Method to calculate net salary
salarySchema.methods.calculateNetSalary = function() {
  this.totalEarned = this.totalLessonsTaught * this.baseSalaryPerLesson;
  this.totalDeductions = this.totalLessonsMissed * this.baseSalaryPerLesson;
  this.netSalary = this.totalEarned - this.totalDeductions + this.totalBonuses;
  return this.netSalary;
};

// Method to add a transaction
salarySchema.methods.addTransaction = function(transactionData) {
  this.transactions.push(transactionData);

  // Update statistics based on transaction type
  switch (transactionData.type) {
    case 'lesson_taught':
      this.totalLessonsTaught += 1;
      break;
    case 'lesson_missed':
      this.totalLessonsMissed += 1;
      break;
    case 'lesson_covered':
      this.totalLessonsCovered += 1;
      break;
    case 'bonus':
      this.totalBonuses += transactionData.amount;
      break;
    case 'deduction':
      this.totalDeductions += Math.abs(transactionData.amount);
      break;
  }

  // Recalculate net salary
  this.calculateNetSalary();
};

// Static method to get or create salary record for a teacher
salarySchema.statics.getOrCreateMonthlySalary = async function(teacherId, year, month, baseSalary = null) {
  let salary = await this.findOne({ teacher: teacherId, year, month });

  if (!salary) {
    // Get teacher's personal salary rate if not provided
    let teacherRate = baseSalary;

    if (!teacherRate) {
      const mongoose = require('mongoose');
      const User = mongoose.model('User');
      const teacher = await User.findById(teacherId);
      teacherRate = teacher?.salaryPerLesson || 50000;
    }

    salary = new this({
      teacher: teacherId,
      year,
      month,
      baseSalaryPerLesson: teacherRate
    });
    await salary.save();
  }

  return salary;
};

module.exports = mongoose.model('Salary', salarySchema);
