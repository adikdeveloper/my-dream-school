const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  schedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: false,
    index: true
  },
  // Oylik test natijasidan kelib chiqqan baho bo'lsa, shu testga bog'lanadi (dublikat oldini olish)
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: false,
    index: true
  },
  type: {
    type: String,
    enum: ['quiz', 'assignment', 'midterm', 'final', 'project', 'participation', 'daily', 'exam'],
    required: true
  },
  // Yangi maydonlar - jurnal tizimi uchun
  month: {
    type: Number,
    min: 1,
    max: 12,
    required: false,
    index: true
  },
  academicMonth: {
    type: Number,
    min: 1,
    max: 10,
    required: false,
    index: true
    // Sentyabr = 1, Oktyabr = 2, ..., Iyun = 10
    // Avtomatik hisoblanadi pre-save hook'da
  },
  periodNumber: {
    type: Number,
    min: 1,
    max: 10,
    required: false,
    // Kunning qaysi darsi (1-10)
  },
  isExam: {
    type: Boolean,
    default: false,
    // Imtihon yoki kunlik bal
  },
  examMaxScore: {
    type: Number,
    min: 0,
    required: false,
    // Imtihon maksimal bali (o'qituvchi belgilaydi)
  },
  score: {
    type: Number,
    required: true,
    min: 0
    // max removed - will be validated in pre-save hook based on isExam
  },
  maxScore: {
    type: Number,
    required: false,
    default: 100
  },
  weight: {
    type: Number,
    default: 1
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: true
  },
  academicYear: {
    type: String,
    required: false,
    default: function() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      // September to December = current year, January to August = previous year
      return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    }
  },
  semester: {
    type: String,
    enum: ['1', '2'],
    required: false,
    default: function() {
      const month = new Date().getMonth();
      // September to January = semester 1, February to June = semester 2
      return month >= 8 || month <= 0 ? '1' : '2';
    }
  }
}, {
  timestamps: true
});

// Pre-save hook to auto-calculate month and academicMonth
gradeSchema.pre('save', function(next) {
  if (this.date) {
    // Set calendar month if not provided
    if (!this.month) {
      this.month = this.date.getMonth() + 1; // 1-12
    }

    // Calculate academic month if not provided
    if (!this.academicMonth) {
      const jsMonth = this.date.getMonth(); // 0-11

      // Iyul (6) va Avgust (7) o'quv yilida emas
      if (jsMonth === 6 || jsMonth === 7) {
        return next(new Error('Iyul va Avgust oylari o\'quv yilida mavjud emas'));
      }

      // Sentyabr-Dekabr: 8,9,10,11 -> 1,2,3,4
      // Yanvar-Iyun: 0,1,2,3,4,5 -> 5,6,7,8,9,10
      this.academicMonth = jsMonth >= 8 ? jsMonth - 7 : jsMonth + 5;
    }
  }

  // Validate score based on isExam flag
  if (this.isExam) {
    // Imtihon bali - examMaxScore bilan cheklanadi
    if (this.examMaxScore && this.score > this.examMaxScore) {
      return next(new Error(`Imtihon bali ${this.examMaxScore} balldan oshmasligi kerak`));
    }
  } else {
    // Kundalik baho - maksimal 5 ball
    if (this.score > 5) {
      return next(new Error('Kundalik darsga maksimal 5 ball qo\'yish mumkin'));
    }
  }

  next();
});

module.exports = mongoose.model('Grade', gradeSchema);
