const mongoose = require('mongoose');

// Question option schema
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Question schema
const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['single', 'multiple', 'text', 'image'],
    default: 'single'
  },
  points: {
    type: Number,
    required: true,
    min: 0.1,
    max: 25,
    default: 1
  },
  imageUrl: {
    type: String,
    default: ''
  },
  options: [optionSchema],
  correctAnswer: {
    type: String,
    default: ''
  }
});

// Test result schema
const testResultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  answers: [{
    questionIndex: Number,
    answer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    pointsEarned: Number
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  // Questions array
  questions: [questionSchema],
  // Total points (auto-calculated from questions)
  totalPoints: {
    type: Number,
    default: 0
  },
  // Test timing
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 45
  },
  // Legacy field for compatibility
  maxScore: {
    type: Number,
    default: 100
  },
  testDate: {
    type: Date,
    required: true
  },
  results: [testResultSchema],
  isCompleted: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index to ensure one test per month per class per subject
testSchema.index({ class: 1, subject: 1, month: 1, year: 1 }, { unique: true });

// Virtual to check if test is currently active
testSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startTime && now <= this.endTime;
});

// Virtual to check test status
testSchema.virtual('status').get(function() {
  const now = new Date();
  if (!this.isActive) return 'inactive';
  if (now < this.startTime) return 'upcoming';
  if (now > this.endTime) return 'ended';
  return 'active';
});

// Pre-save middleware to calculate total points
testSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    this.totalPoints = Math.round(this.totalPoints * 10) / 10; // Round to 1 decimal
  }
  next();
});

// Ensure virtuals are included in JSON output
testSchema.set('toJSON', { virtuals: true });
testSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Test', testSchema);
