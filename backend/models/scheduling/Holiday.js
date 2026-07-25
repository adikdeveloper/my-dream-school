const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null // Agar bir necha kun davom etsa
  },
  type: {
    type: String,
    enum: ['national', 'religious', 'school', 'other'],
    default: 'national'
  },
  description: {
    type: String,
    default: ''
  },
  isRecurring: {
    type: Boolean,
    default: false // Har yili takrorlanadimi
  },
  academicYear: {
    type: String,
    required: true // Masalan: "2024-2025"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indekslar
holidaySchema.index({ date: 1 });
holidaySchema.index({ academicYear: 1 });
holidaySchema.index({ isActive: 1 });

// Berilgan sananing bayram kuni ekanligini tekshirish uchun statik metod
holidaySchema.statics.isHoliday = async function(date) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  const holiday = await this.findOne({
    isActive: true,
    $or: [
      // Bir kunlik bayram
      {
        date: {
          $gte: checkDate,
          $lt: new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
        },
        endDate: null
      },
      // Ko'p kunlik bayram
      {
        date: { $lte: checkDate },
        endDate: { $gte: checkDate }
      }
    ]
  });

  return holiday;
};

// Berilgan oy uchun barcha bayram kunlarini olish
holidaySchema.statics.getHolidaysForMonth = async function(year, month) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  return await this.find({
    isActive: true,
    $or: [
      { date: { $gte: startOfMonth, $lte: endOfMonth } },
      { endDate: { $gte: startOfMonth, $lte: endOfMonth } },
      { date: { $lte: startOfMonth }, endDate: { $gte: endOfMonth } }
    ]
  }).sort({ date: 1 });
};

module.exports = mongoose.model('Holiday', holidaySchema);
