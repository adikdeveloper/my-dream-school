const mongoose = require('mongoose');

const monthlyGradeSummarySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true
  },
  academicYear: {
    type: String,
    required: true,
    index: true
  },
  // Kalendarlik oy (1-12)
  month: {
    type: Number,
    min: 1,
    max: 12,
    required: true,
    index: true
  },
  // O'quv yili oyi (sentyabr=1, iyun=10)
  academicMonth: {
    type: Number,
    min: 1,
    max: 10,
    required: true,
    index: true
  },
  // Kunlik ballar jami
  totalDailyScore: {
    type: Number,
    default: 0,
    min: 0
  },
  // Imtihon bali
  examScore: {
    type: Number,
    default: 0,
    min: 0
  },
  // Imtihon maksimal bali
  examMaxScore: {
    type: Number,
    default: 0,
    min: 0
  },
  // Jami ball (kunlik + imtihon)
  totalScore: {
    type: Number,
    default: 0,
    min: 0
  },
  // O'rtacha kunlik bal
  averageDailyScore: {
    type: Number,
    default: 0,
    min: 0
  },
  // Darslar soni
  lessonCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Kelgan kunlar soni
  attendedLessons: {
    type: Number,
    default: 0,
    min: 0
  },
  // Kelmagan kunlar soni
  absentLessons: {
    type: Number,
    default: 0,
    min: 0
  },
  // Sababli kelmagan
  excusedLessons: {
    type: Number,
    default: 0,
    min: 0
  },
  // Davomat foizi
  attendanceRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Ballar tafsiloti (har kun uchun)
  dailyGrades: [{
    date: Date,
    periodNumber: Number,
    score: Number,
    gradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grade'
    }
  }],
  // Yo'qlama tafsiloti (har kun uchun)
  dailyAttendance: [{
    date: Date,
    periodNumber: Number,
    status: {
      type: String,
      enum: ['present', 'absent', 'excused', 'keldi', 'kelmadi', 'sababli']
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance'
    }
  }],
  // Imtihon sanasi
  examDate: {
    type: Date,
    required: false
  },
  // Imtihon ID
  examGradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grade',
    required: false
  },
  // Oyning yakunlanganligi
  isFinalized: {
    type: Boolean,
    default: false
  },
  // Oxirgi yangilanish sanasi
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes
monthlyGradeSummarySchema.index({ student: 1, subject: 1, academicMonth: 1, academicYear: 1 }, { unique: true });
monthlyGradeSummarySchema.index({ class: 1, academicMonth: 1, academicYear: 1 });
monthlyGradeSummarySchema.index({ student: 1, academicYear: 1 });

// Method to calculate all statistics
monthlyGradeSummarySchema.methods.calculate = function() {
  // Kunlik ballar jami
  this.totalDailyScore = this.dailyGrades.reduce((sum, g) => sum + (g.score || 0), 0);

  // O'rtacha kunlik bal
  this.averageDailyScore = this.lessonCount > 0
    ? this.totalDailyScore / this.lessonCount
    : 0;

  // Jami ball
  this.totalScore = this.totalDailyScore + this.examScore;

  // Validate 100-point limit
  if (this.totalScore > 100) {
    throw new Error(`Oylik jami ball 100 dan oshmasligi kerak. Hozirgi: ${this.totalScore.toFixed(2)} (Kundalik: ${this.totalDailyScore.toFixed(2)}, Imtihon: ${this.examScore})`);
  }

  // Davomat foizi
  if (this.lessonCount > 0) {
    this.attendanceRate = (this.attendedLessons / this.lessonCount) * 100;
  } else {
    this.attendanceRate = 0;
  }

  this.lastCalculated = new Date();
};

// Static method to recalculate for a student/subject/month
monthlyGradeSummarySchema.statics.recalculate = async function(studentId, subjectId, classId, month, academicYear) {
  const Grade = mongoose.model('Grade');
  const Attendance = mongoose.model('Attendance');

  // Calculate academic month from calendar month (1-12)
  // Iyul (7) va Avgust (8) o'quv yilida yo'q
  if (month === 7 || month === 8) {
    throw new Error('Iyul va Avgust oylari o\'quv yilida mavjud emas');
  }

  // Sentyabr-Dekabr: 9,10,11,12 -> 1,2,3,4
  // Yanvar-Iyun: 1,2,3,4,5,6 -> 5,6,7,8,9,10
  const academicMonth = month >= 9 ? month - 8 : month + 4;

  // Find or create summary
  let summary = await this.findOne({
    student: studentId,
    subject: subjectId,
    class: classId,
    month: month,
    academicYear: academicYear
  });

  if (!summary) {
    summary = new this({
      student: studentId,
      subject: subjectId,
      class: classId,
      month: month,
      academicMonth: academicMonth,
      academicYear: academicYear
    });
  }

  // Get all daily grades for the month
  const grades = await Grade.find({
    student: studentId,
    subject: subjectId,
    class: classId,
    month: month,
    isExam: false
  }).sort({ date: 1, periodNumber: 1 });

  summary.dailyGrades = grades.map(g => ({
    date: g.date,
    periodNumber: g.periodNumber,
    score: g.score,
    gradeId: g._id
  }));

  summary.lessonCount = grades.length;

  // Get exam grade
  const examGrade = await Grade.findOne({
    student: studentId,
    subject: subjectId,
    class: classId,
    month: month,
    isExam: true
  });

  if (examGrade) {
    summary.examScore = examGrade.score;
    summary.examMaxScore = examGrade.examMaxScore || 0;
    summary.examDate = examGrade.date;
    summary.examGradeId = examGrade._id;
  }

  // Get attendance
  const attendance = await Attendance.find({
    student: studentId,
    class: classId,
    subject: subjectId,
    month: month
  }).sort({ date: 1, period: 1 });

  summary.dailyAttendance = attendance.map(a => ({
    date: a.date,
    periodNumber: a.period,
    status: a.status,
    attendanceId: a._id
  }));

  // Count attendance statuses
  summary.attendedLessons = attendance.filter(a =>
    ['present', 'keldi'].includes(a.status)
  ).length;

  summary.absentLessons = attendance.filter(a =>
    ['absent', 'kelmadi'].includes(a.status)
  ).length;

  summary.excusedLessons = attendance.filter(a =>
    ['excused', 'sababli'].includes(a.status)
  ).length;

  // Calculate all statistics
  summary.calculate();

  await summary.save();
  return summary;
};

module.exports = mongoose.model('MonthlyGradeSummary', monthlyGradeSummarySchema);
