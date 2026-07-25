const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  grade: {
    type: Number,
    required: false,
    min: 0,
    max: 9
  },
  section: {
    type: String,
    required: true
  },
  group: {
    type: String,
    enum: ['MIT', 'Stanford', 'Oxford', null, ''],
    required: false
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  // NOTE: schedule array removed - now using separate Schedule model
  // Old schedule data can be migrated using backend/scripts/migrateSchedules.js
  academicYear: {
    type: String,
    required: true
  },
  room: {
    type: String
  },
  maxStudents: {
    type: Number,
    default: 30
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
classSchema.index({ name: 1 });
classSchema.index({ grade: 1, section: 1 });
classSchema.index({ isActive: 1 });
classSchema.index({ academicYear: 1 });
classSchema.index({ classTeacher: 1 });
classSchema.index({ 'students': 1 });

// Compound index for common queries
classSchema.index({ grade: 1, section: 1, academicYear: 1, isActive: 1 });

module.exports = mongoose.model('Class', classSchema);