const mongoose = require('mongoose');

const teacherLessonSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  room: { type: String, trim: true, maxlength: 60, default: '' },
  note: { type: String, trim: true, maxlength: 300, default: '' }
}, { timestamps: true });

teacherLessonSchema.index({ teacher: 1, day: 1, startTime: 1 });
teacherLessonSchema.index({ teacher: 1, classId: 1, subject: 1, day: 1, startTime: 1 }, { unique: true });

teacherLessonSchema.pre('validate', function(next) {
  if (this.startTime >= this.endTime) {
    return next(new Error('Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak'));
  }
  next();
});

module.exports = mongoose.model('TeacherLesson', teacherLessonSchema);
