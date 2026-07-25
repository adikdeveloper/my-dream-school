const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: function () {
      return this.role && this.role !== 'admin' && this.role !== 'director';
    },
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'director', 'teacher', 'student', 'supervisor', 'accountant', 'hr', 'reception', 'callcenter'],
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  // Student specific fields
  studentId: {
    type: String,
    unique: true,
    sparse: true
  },
  // Student passport number
  passportNumber: {
    type: String,
    default: null
  },
  // Teacher passport series and number (e.g., KA1234567)
  passportSeriesNumber: {
    type: String,
    default: null,
    uppercase: true
  },
  // JSHSHIR (PINFL) - 14 digits
  jshshir: {
    type: String,
    default: null
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  parentName: {
    type: String,
    default: null
  },
  parentPhone: {
    type: String,
    default: null
  },
  parentJshshir: {
    type: String,
    default: null
  },
  profileImage: {
    type: String,
    default: null
  },
  registrationDate: {
    type: Date,
    default: null
  },
  leftDate: {
    type: Date,
    default: null
  },
  monthlyFee: {
    type: Number,
    default: 0, // Monthly tuition fee for the student
    min: 0
  },
  // Teacher specific fields
  teacherId: {
    type: String,
    unique: true,
    sparse: true
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  specialty: {
    type: String,
    default: null
  },
  experience: {
    type: String,
    default: null
  },
  education: {
    type: String,
    default: null
  },
  salaryPerLesson: {
    type: Number,
    default: 50000, // 50,000 so'm per lesson
    min: 0
  },
  balance: {
    type: Number,
    default: 0 // Current balance in account
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Last viewed timestamps for notifications
  lastViewed: {
    homework: {
      type: Date,
      default: null
    },
    grades: {
      type: Date,
      default: null
    },
    announcements: {
      type: Date,
      default: null
    },
    assignments: {
      type: Date,
      default: null
    },
    users: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: 'string' }
    }
  }
);

userSchema.pre('validate', function(next) {
  if (typeof this.email === 'string') {
    const trimmed = this.email.trim().toLowerCase();
    this.email = trimmed ? trimmed : undefined;
  } else if (this.email == null || this.email === '') {
    this.email = undefined;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
