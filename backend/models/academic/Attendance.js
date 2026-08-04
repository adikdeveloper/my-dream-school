const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: false
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused', 'keldi', 'kelmadi', 'sababli'],
    required: true,
    default: 'keldi'
  },
  notes: {
    type: String,
    default: ''
  },
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  // Oylik hisob-kitob uchun
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
  }
}, {
  timestamps: true
});

// Pre-save hook to auto-calculate month and academicMonth
attendanceSchema.pre('save', function(next) {
  if (this.date) {
    // Set calendar month if not provided
    if (!this.month) {
      this.month = this.date.getMonth() + 1; // 1-12
    }

    // Calculate academic month if not provided
    if (!this.academicMonth) {
      const jsMonth = this.date.getMonth(); // 0-11

      // Sentyabr-Dekabr: 8,9,10,11 -> 1,2,3,4
      // Yanvar-Iyun: 0,1,2,3,4,5 -> 5,6,7,8,9,10
      if (jsMonth !== 6 && jsMonth !== 7) {
        this.academicMonth = jsMonth >= 8 ? jsMonth - 7 : jsMonth + 5;
      }
    }
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
