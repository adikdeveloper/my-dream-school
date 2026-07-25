const mongoose = require('mongoose');

// Dars almashtirish (o'rnini bosish) yozuvi.
// Bir o'qituvchi (substituteTeacher) boshqa o'qituvchi (originalTeacher) o'rniga
// muayyan SANADAGI muayyan darsga kirganini bildiradi.
// Belgilashda SINF tanlanadi — o'sha kun/vaqt jadvalidagi o'qituvchi avtomatik
// originalTeacher bo'ladi.
const lessonSubstitutionSchema = new mongoose.Schema({
  // Aniq kalendar sana (yarim tunga normalizatsiya qilinadi)
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Hafta kuni (Monday..Saturday) — sanadan olinadi, moslashtirish uchun
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule'
  },
  // Kun jadvalidagi darsning indeksi
  periodIndex: {
    type: Number,
    required: true,
    min: 0
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  // Darsning (jadvaldagi) fani — vaqtincha jurnal shu fan bo'yicha ochiladi
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  // Jadval bo'yicha asl o'qituvchi (masalan Anvar) — avtomatik aniqlanadi
  originalTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // O'rniga o'tgan o'qituvchi (masalan Zuhra)
  substituteTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    default: '',
    maxlength: 300
  },
  // Bir dars = 1 soat
  hours: {
    type: Number,
    default: 1,
    min: 0
  },
  // pending: o'qituvchi belgilagan, tasdiq kutilmoqda
  // confirmed: asl o'qituvchi yoki admin/direktor tasdiqlagan
  // rejected: rad etilgan
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending',
    index: true
  },
  // Kim yaratdi (odatda substituteTeacher yoki admin)
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  confirmedAt: { type: Date },
  // Maosh o'tkazilganmi (idempotentlik uchun)
  salaryApplied: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Bir sana + sinf + dars uchun faqat bitta AKTIV (pending/confirmed) yozuv bo'lishi
// mumkin — rad etilganlar bundan mustasno (qayta belgilashga ruxsat). Partial unique
// index poyga holatini (TOCTOU) DB darajasida bloklaydi.
lessonSubstitutionSchema.index(
  { date: 1, classId: 1, periodIndex: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
);
lessonSubstitutionSchema.index({ substituteTeacher: 1, date: 1 });
lessonSubstitutionSchema.index({ originalTeacher: 1, status: 1 });

module.exports = mongoose.model('LessonSubstitution', lessonSubstitutionSchema);
