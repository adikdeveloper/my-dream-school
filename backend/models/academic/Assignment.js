const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'graded'],
    default: 'pending',
    index: true
  },
  submissionText: {
    type: String,
    trim: true,
    minlength: [10, 'Javob kamida 10 belgidan iborat bo\'lishi kerak'],
    maxlength: [5000, 'Javob 5000 belgidan oshmasligi kerak']
  },
  submittedAt: {
    type: Date
  },
  grade: {
    type: Number,
    min: [0, 'Ball 0 dan kichik bo\'lishi mumkin emas'],
    // Note: max validation is handled in the route to compare against assignment.maxScore
    // Static max of 100 removed to support custom maxScore values (e.g., 5, 10, etc.)
    validate: {
      validator: function(value) {
        // Grade can be null/undefined (not yet graded)
        if (value == null) return true;
        // Grade must be a valid number >= 0
        return !isNaN(value) && value >= 0;
      },
      message: 'Ball to\'g\'ri raqam bo\'lishi kerak'
    }
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [1000, 'Izoh 1000 belgidan oshmasligi kerak']
  }
});

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Vazifa sarlavhasi majburiy'],
    trim: true,
    minlength: [3, 'Sarlavha kamida 3 belgidan iborat bo\'lishi kerak'],
    maxlength: [200, 'Sarlavha 200 belgidan oshmasligi kerak']
  },
  description: {
    type: String,
    required: [true, 'Vazifa tavsifi majburiy'],
    trim: true,
    minlength: [10, 'Tavsif kamida 10 belgidan iborat bo\'lishi kerak'],
    maxlength: [2000, 'Tavsif 2000 belgidan oshmasligi kerak']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Fan majburiy'],
    index: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Sinf majburiy'],
    index: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'O\'qituvchi majburiy'],
    index: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Topshirish muddati majburiy'],
    index: true
  },
  assignedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  maxScore: {
    type: Number,
    default: 100,
    min: [0.01, 'Maksimal ball 0 dan katta bo\'lishi kerak'],
    max: [100, 'Maksimal ball 100 dan oshmasligi kerak'],
    validate: {
      validator: function(value) {
        // maxScore must be greater than 0
        return value > 0;
      },
      message: 'Maksimal ball 0 dan katta bo\'lishi kerak (masalan: 0.5, 5, 10)'
    }
  },
  submissions: [assignmentSubmissionSchema],
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// Virtual to get submission count
assignmentSchema.virtual('submissionCount').get(function() {
  return this.submissions.filter(s => s.status !== 'pending').length;
});

// Virtual to get graded count
assignmentSchema.virtual('gradedCount').get(function() {
  return this.submissions.filter(s => s.status === 'graded').length;
});

module.exports = mongoose.model('Assignment', assignmentSchema);
