const mongoose = require('mongoose');

const quarterSchema = new mongoose.Schema({
  quarter: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
}, { _id: false });

const academicCalendarSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: [/^\d{4}-\d{4}$/, "O'quv yili YYYY-YYYY formatida bo'lishi kerak"]
  },
  quarters: {
    type: [quarterSchema],
    required: true,
    validate: {
      validator(value) {
        if (!Array.isArray(value) || value.length !== 4) return false;

        const sorted = [...value].sort((a, b) => a.quarter - b.quarter);
        if (sorted.map(item => item.quarter).join(',') !== '1,2,3,4') return false;

        for (let i = 0; i < sorted.length; i += 1) {
          const start = new Date(sorted[i].startDate).getTime();
          const end = new Date(sorted[i].endDate).getTime();
          if (Number.isNaN(start) || Number.isNaN(end) || start > end) return false;
          if (i > 0 && start <= new Date(sorted[i - 1].endDate).getTime()) return false;
        }

        return true;
      },
      message: "4 ta chorak sanalari to'g'ri va bir-biriga mos bo'lishi kerak"
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);
