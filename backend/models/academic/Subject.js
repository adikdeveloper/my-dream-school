const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  credits: {
    type: Number,
    min: 1,
    max: 10,
    default: 3
  },
  color: {
    type: String,
    default: '#1e3a8a'
  },
  // Bu fanni o'qituvchi o'qituvchilar ro'yxati
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subject', subjectSchema);