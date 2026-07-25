const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: false },
  phone: { type: String, required: true },
  source: { type: String, default: 'Boshqa' }, // Telegram, Instagram, Veb-sayt, Tavsiya, Boshqa
  status: { type: String, default: 'Yangi' }, // Yangi, Aloqaga chiqildi, Sinov darsida, O'quvchi bo'ldi, Rad etildi
  notes: { type: String, default: '' },
  interestedCourse: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

leadSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
