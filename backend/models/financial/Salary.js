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
  },
  // Dars almashtirish yozuvi bilan bog'liqlik (idempotent qaytarish uchun)
  substitution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LessonSubstitution'
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
  // Soliqdan oldingi summa (jami daromad - chegirmalar)
  grossSalary: {
    type: Number,
    default: 0
  },
  // Daromad solig'i stavkasi (O'zbekiston JShDS = 12%)
  incomeTaxRate: {
    type: Number,
    default: 0.12
  },
  // Ushlab qolingan daromad solig'i miqdori
  incomeTaxAmount: {
    type: Number,
    default: 0
  },
  // Soliqdan keyin o'qituvchi qo'liga oladigan sof summa
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

// Barcha summalarni va statistikani transaksiyalardan qayta hisoblaydi.
// Transaksiya amount'lari ishorali: dars o'tildi/o'rnini bosdi/bonus = musbat,
// dars qoldirildi/chegirma = manfiy. Shu sababli har bir o'qituvchi o'z
// stavkasida hisoblanadi (o'rnini bosishda ham).
salarySchema.methods.calculateNetSalary = function() {
  const txns = this.transactions || [];

  let earned = 0;       // jami musbat (o'tilgan + o'rnini bosgan + bonus)
  let deductions = 0;   // jami manfiy (qoldirilgan + chegirma)
  let bonuses = 0;
  let taught = 0, missed = 0, covered = 0;

  for (const t of txns) {
    const amt = Number(t.amount) || 0;
    if (amt >= 0) earned += amt; else deductions += Math.abs(amt);

    switch (t.type) {
      case 'lesson_taught': taught += 1; break;
      case 'lesson_missed': missed += 1; break;
      case 'lesson_covered': covered += 1; break;
      case 'bonus': bonuses += amt; break;
      default: break;
    }
  }

  this.totalEarned = earned;
  this.totalDeductions = deductions;
  this.totalBonuses = bonuses;
  this.totalLessonsTaught = taught;
  this.totalLessonsMissed = missed;
  this.totalLessonsCovered = covered;

  // Soliqdan oldingi (gross) summa
  const gross = earned - deductions;
  this.grossSalary = gross;

  // Daromad solig'i (JShDS) — faqat musbat daromaddan ushlanadi
  if (this.incomeTaxRate === undefined || this.incomeTaxRate === null) {
    this.incomeTaxRate = 0.12;
  }
  const taxable = Math.max(0, gross);
  this.incomeTaxAmount = Math.round(taxable * this.incomeTaxRate);

  // Sof maosh = gross - soliq
  this.netSalary = gross - this.incomeTaxAmount;
  return this.netSalary;
};

// Method to add a transaction
salarySchema.methods.addTransaction = function(transactionData) {
  this.transactions.push(transactionData);
  // Statistika va summalar transaksiyalardan to'liq qayta hisoblanadi
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
