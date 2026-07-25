const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../../models/users/User');
const Class = require('../../models/academic/Class');
const { auth } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { verifyRecaptcha } = require('../../middleware/recaptcha');
const { ensureClassRoom, ensureGlobalGroup, STAFF_ROLES } = require('../../controllers/chat/chatHelpers');
const { hasPermission } = require('../../middleware/permissions');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Optional auth: tokenli bo'lsa req.user'ni o'rnatadi, bo'lmasa o'tkazadi
const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
    const user = await User.findById(decoded.userId).select('-password');
    if (user && user.isActive) req.user = user;
  } catch (e) { /* token noto'g'ri - anonim deb davom etamiz */ }
  next();
};

// @route   POST /api/auth/register
// @desc    Register a new user. Tekshiruv: birinchi user bo'lsa - har kim, boshqa holatda - ruxsat kerak
// @access  Mixed
router.post('/register', optionalAuth, upload.single('profileImage'), [
  body('phone').custom((value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    // Check if it's a valid Uzbek number (9 digits or 998 + 9 digits)
    if (cleaned.length === 9 || (cleaned.length === 12 && cleaned.startsWith('998'))) {
      return true;
    }
    throw new Error('Valid Uzbek phone number is required (9 or 12 digits)');
  }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('role').isIn(['admin', 'director', 'teacher', 'student', 'supervisor', 'accountant', 'hr', 'reception', 'callcenter']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      return res.status(400).json({
        message: errorMessages,
        errors: errors.array()
      });
    }

    let { phone, passportNumber, passportSeriesNumber, jshshir, password, firstName, lastName, role, studentId, teacherId, address, dateOfBirth, parentName, parentPhone, parentJshshir, email, specialty, experience, education, subjects, registrationDate, leftDate, classId, monthlyFee } = req.body;

    // Ruxsat tekshiruvi: birinchi foydalanuvchi bo'lsa - har kim, aks holda ruxsat kerak
    const totalUsers = await User.countDocuments();
    if (totalUsers > 0) {
      if (!req.user) {
        return res.status(401).json({ message: 'Foydalanuvchi yaratish uchun avval tizimga kiring' });
      }
      const permKey = role === 'student' ? 'teacher.create_student'
        : (['admin', 'director', 'supervisor', 'accountant', 'hr', 'reception', 'callcenter'].includes(role) ? 'class.edit'  // HR roli yo'q hozircha — admin/director ham qila oladi
            : 'teacher.create_student');
      const allowed = req.user.role === 'admin' || req.user.role === 'director'
        || await hasPermission(req.user, permKey);
      if (!allowed) {
        return res.status(403).json({ message: `${role} yaratish uchun ruxsat yo'q` });
      }
    }

    // Clean phone numbers (remove formatting)
    phone = phone.replace(/\D/g, '');
    if (!phone.startsWith('998')) {
      phone = '998' + phone;
    }
    phone = '+' + phone;

    if (parentPhone) {
      parentPhone = parentPhone.replace(/\D/g, '');
      if (!parentPhone.startsWith('998')) {
        parentPhone = '998' + parentPhone;
      }
      parentPhone = '+' + parentPhone;
    }

    // Check if user already exists with this phone number
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    // Create new user
    const userData = {
      phone,
      password,
      firstName,
      lastName,
      role
    };

    if (passportNumber) userData.passportNumber = passportNumber;
    if (passportSeriesNumber) userData.passportSeriesNumber = passportSeriesNumber.toUpperCase();
    if (jshshir) userData.jshshir = jshshir;
    if (address) userData.address = address;
    if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
    // Also accept birthDate field (used by accountant/hr forms)
    if (req.body.birthDate && !dateOfBirth) userData.dateOfBirth = req.body.birthDate;
    if (parentName) userData.parentName = parentName;
    if (parentPhone) userData.parentPhone = parentPhone;
    if (parentJshshir) userData.parentJshshir = parentJshshir;
    if (typeof email === 'string' && email.trim()) {
      userData.email = email.trim().toLowerCase();
    }
    if (specialty) userData.specialty = specialty;
    if (experience) userData.experience = experience;
    if (education) userData.education = education;
    if (registrationDate) userData.registrationDate = registrationDate;
    if (leftDate) userData.leftDate = leftDate;

    // Student specific: classId and monthlyFee
    if (role === 'student') {
      if (classId) userData.classId = classId;
      if (monthlyFee) {
        const fee = parseFloat(monthlyFee);
        if (!isNaN(fee) && fee >= 0) {
          userData.monthlyFee = fee;
        }
      }
    }

    // Handle subjects array for teachers
    if (role === 'teacher') {
      if (req.body['subjects[]']) {
        userData.subjects = Array.isArray(req.body['subjects[]'])
          ? req.body['subjects[]']
          : [req.body['subjects[]']];
      } else if (subjects) {
        userData.subjects = Array.isArray(subjects) ? subjects : [subjects];
      }
    }

    // Add profile image if uploaded
    if (req.file) {
      // Get the subdirectory based on role
      const roleSubdir = role === 'student' ? 'students' : role === 'teacher' ? 'teachers' : 'admins';
      userData.profileImage = `/uploads/profiles/${roleSubdir}/${req.file.filename}`;
    }

    if (role === 'student' && studentId) {
      userData.studentId = studentId;
    }
    if (role === 'teacher' && teacherId) {
      userData.teacherId = teacherId;
    }

    const user = new User(userData);
    await user.save();

    // If student has classId, add student to Class.students array
    if (role === 'student' && classId) {
      await Class.findByIdAndUpdate(
        classId,
        { $addToSet: { students: user._id } }
      );
    }

    // Avtomatik chat guruhlariga qo'shish
    try {
      if (role === 'student' && classId) {
        await ensureClassRoom(classId);
      } else if (role === 'teacher') {
        await ensureGlobalGroup('teachers_group');
      } else if (STAFF_ROLES.includes(role)) {
        await ensureGlobalGroup('staff_group');
      }
    } catch (chatErr) {
      console.warn('Chat group sync failed:', chatErr.message);
    }

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    // Error is logged by error handling middleware
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', verifyRecaptcha({ action: 'login' }), [
  body('phone').custom((value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    // Check if it's a valid Uzbek number (9 digits or 998 + 9 digits)
    if (cleaned.length === 9 || (cleaned.length === 12 && cleaned.startsWith('998'))) {
      return true;
    }
    throw new Error('Valid Uzbek phone number is required (9 or 12 digits)');
  }),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { phone, password } = req.body;

    // Clean phone number (remove formatting)
    phone = phone.replace(/\D/g, '');
    if (!phone.startsWith('998')) {
      phone = '998' + phone;
    }
    phone = '+' + phone;

    // Check if user exists (populate classId for students)
    const user = await User.findOne({ phone })
      .populate('classId', 'name grade section');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Telefon raqami yoki parol noto\'g\'ri' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Telefon raqami yoki parol noto\'g\'ri' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImage: user.profileImage,
        classId: user.classId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('classId', 'name grade section')
      .populate('subjects', 'name code')
      .populate('classes', 'name grade section');

    res.json(user);
  } catch (error) {
    // Error is logged by error handling middleware
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

