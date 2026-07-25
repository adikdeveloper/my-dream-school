const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  academicYear: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    enum: [1, 2],
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  // Dars vaqtlari sozlamalari
  periodTimes: [{
    label: {
      type: String,
      required: true,
      trim: true
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    }
  }],
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true
    },
    periods: [{
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        default: null
      },
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      topic: {
        type: String,
        default: ''
      }
    }]
  }],
  // Bayram kunlari
  holidays: [{
    date: {
      type: Date,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
scheduleSchema.index({ classId: 1, startDate: 1, endDate: 1 });
scheduleSchema.index({ classId: 1, isActive: 1 });

// Virtual property to check if schedule is currently active based on dates
scheduleSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
});

// Static method to find current active schedule for a class
scheduleSchema.statics.findCurrentSchedule = async function(classId) {
  const now = new Date();

  // First try to find an active schedule that covers current date
  let schedule = await this.findOne({
    classId,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
  .populate('schedule.periods.subject', 'name code color')
  .populate('schedule.periods.teacher', 'firstName lastName email')
  .populate('createdBy', 'firstName lastName')
  .sort({ startDate: -1 });

  // If no active schedule found, return the most recent one
  if (!schedule) {
    schedule = await this.findOne({ classId })
      .populate('schedule.periods.subject', 'name code color')
      .populate('schedule.periods.teacher', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ startDate: -1 });
  }

  return schedule;
};

// Static method to find all schedules for a class
scheduleSchema.statics.findByClass = async function(classId, options = {}) {
  const query = { classId };

  if (options.activeOnly) {
    query.isActive = true;
  }

  return this.find(query)
    .populate('schedule.periods.subject', 'name code color')
    .populate('schedule.periods.teacher', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .sort({ startDate: -1 });
};

// Method to determine schedule status
scheduleSchema.methods.getStatus = function() {
  const now = new Date();

  if (!this.isActive) {
    return 'archived';
  }

  if (now < this.startDate) {
    return 'future';
  }

  if (now >= this.startDate && now <= this.endDate) {
    return 'active';
  }

  return 'expired';
};

// Method to check if a date is a holiday
scheduleSchema.methods.isHoliday = function(date) {
  if (!this.holidays || this.holidays.length === 0) {
    return false;
  }

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return this.holidays.some(holiday => {
    const holidayDate = new Date(holiday.date);
    holidayDate.setHours(0, 0, 0, 0);
    return holidayDate.getTime() === checkDate.getTime();
  });
};

// Method to get holiday info for a date
scheduleSchema.methods.getHolidayInfo = function(date) {
  if (!this.holidays || this.holidays.length === 0) {
    return null;
  }

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return this.holidays.find(holiday => {
    const holidayDate = new Date(holiday.date);
    holidayDate.setHours(0, 0, 0, 0);
    return holidayDate.getTime() === checkDate.getTime();
  }) || null;
};

// Pre-save hook to validate date ranges
scheduleSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('Tugash sanasi boshlanish sanasidan kechroq bo\'lishi kerak'));
  } else {
    next();
  }
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
