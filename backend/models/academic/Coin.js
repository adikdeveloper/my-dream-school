const mongoose = require('mongoose');

// O'quvchi uy vazifani a'lo bajargani uchun olgan coin.
// Har bir coin aniq bir uy vazifaga (assignment) bog'lanadi — assignment'da
// bitta o'qituvchi va bitta fan bo'lgani uchun, bir sinfga ikkita bir xil fan
// o'qituvchisi kirsa ham coinlar aralashmaydi (har biri o'z vazifasiga tegishli).
const coinSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  amount: { type: Number, default: 1 },
  reason: { type: String, default: 'homework_excellent' },
  month: { type: Number, min: 1, max: 12, index: true },
  year: { type: Number, index: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// 1 dars (vazifa) uchun 1 o'quvchiga MAKSIMUM 1 coin
coinSchema.index({ assignment: 1, student: 1 }, { unique: true });
coinSchema.index({ year: 1, month: 1 });

module.exports = mongoose.model('Coin', coinSchema);
