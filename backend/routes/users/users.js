const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const User = require('../../models/users/User');
const Subject = require('../../models/academic/Subject');
const Class = require('../../models/academic/Class');
const { auth, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { compressImage, getRoleSubdir } = require('../../middleware/upload');
const { syncUserToSchedule } = require('../../utils/scheduleSynchronizer');
const { createUzbekSearchRegex } = require('../../utils/uzbekHelper');
const { ensureClassRoom } = require('../../controllers/chat/chatHelpers');
const { hasPermission } = require('../../middleware/permissions');
const { syncOpenSalaryRecords } = require('../../utils/salaryRateSync');


const router = express.Router();

// Rate limiters
const updateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1000, // 1000 requests per windowMs
  message: 'Juda ko\'p so\'rovlar yuborildi. Iltimos, keyinroq qayta urinib ko\'ring.',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordChangeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 attempts per windowMs
  message: 'Parolni o\'zgartirish bo\'yicha juda ko\'p urinishlar. Iltimos, 15 daqiqadan keyin qayta urinib ko\'ring.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Basic input sanitization utility
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Remove potential XSS/HTML tags and trim
  return str.replace(/<[^>]*>/g, '').trim();
};

// Safe boolean conversion
const parseBoolean = (value) => {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }
  return Boolean(value);
};

const parseNonNegativeAmount = (value, fieldLabel) => {
  if (value === undefined || value === null || value === '') return null;

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    const error = new Error(`${fieldLabel} musbat son bo'lishi kerak`);
    error.statusCode = 400;
    throw error;
  }

  return amount;
};

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', auth, authorize('admin', 'accountant', 'reception', 'callcenter'), async (req, res) => {
  try {
    let { role, page = 1, limit = 10, search } = req.query;

    // Validate and sanitize inputs
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const query = role ? { role } : {};

    // Add search functionality
    if (search && search.trim()) {
      const searchTerm = sanitizeString(search.trim());
      const uzbekPattern = createUzbekSearchRegex(searchTerm);
      query.$or = [
        { firstName: { $regex: uzbekPattern, $options: 'i' } },
        { lastName: { $regex: uzbekPattern, $options: 'i' } },
        { studentId: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('classId', 'name grade section')
      .populate('subjects', 'name code')
      .populate('classes', 'name grade section')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    // Error is logged by error handling middleware
    res.status(500).json({ message: 'Foydalanuvchilarni yuklashda xatolik yuz berdi' });
  }
});

// @route   GET /api/users/student/stats
// @desc    Get student statistics
// @access  Private/Admin
router.get('/student/stats', auth, authorize('admin', 'accountant', 'reception', 'callcenter'), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeStudents = await User.countDocuments({ role: 'student', isActive: true });
    const inactiveStudents = await User.countDocuments({ role: 'student', isActive: false });

    // Calculate students created in the last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const newStudents = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: oneMonthAgo }
    });

    res.json({
      total: totalStudents,
      active: activeStudents,
      inactive: inactiveStudents,
      new: newStudents
    });
  } catch (error) {
    res.status(500).json({ message: 'Statistikani yuklashda xatolik yuz berdi' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('classId', 'name grade section')
      .populate('subjects', 'name code')
      .populate('classes', 'name grade section');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user can access this profile
    if ((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant' && req.user.role !== 'reception' && req.user.role !== 'callcenter') && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(user);
  } catch (error) {
    // Error is logged by error handling middleware
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri foydalanuvchi ID formati' });
    }
    res.status(500).json({ message: 'Foydalanuvchi ma\'lumotlarini yuklashda xatolik' });
  }
});

// Middleware to attach user role before multer processes the file
const attachUserRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Attach user info to request for multer to use
    req.targetUser = user;
    req.userRole = user.role; // Set role in a custom property for multer
    next();
  } catch (error) {
    // Error is logged by error handling middleware
    res.status(500).json({ message: 'Server error' });
  }
};

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Fayl hajmi 5MB dan oshmasligi kerak' });
    }
    if (err.message) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Fayl yuklashda xatolik' });
  }
  next();
};

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth, updateLimiter, attachUserRole, (req, res, next) => {
  upload.single('profileImage')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, compressImage, async (req, res) => {
  try {
    // Check if user can update this profile
    const isAdmin = (req.user.role === 'admin' || req.user.role === 'director' || req.user.role === 'accountant');
    const isOwnProfile = req.user._id.toString() === req.params.id;
    const isTeacherEditingStudent = req.user.role === 'teacher' && req.targetUser?.role === 'student';
    // Reception o'quvchi va o'qituvchini tahrirlay oladi
    const isReceptionEditing = req.user.role === 'reception' && ['student', 'teacher'].includes(req.targetUser?.role);

    if (!isAdmin && !isOwnProfile && !isTeacherEditingStudent && !isReceptionEditing) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Teacher/Reception edits student/teacher — qo'shimcha ruxsat tekshirish
    if ((isTeacherEditingStudent || isReceptionEditing) && !isOwnProfile) {
      const allowed = await hasPermission(req.user, 'teacher.edit_student_info');
      if (!allowed) {
        return res.status(403).json({ message: "O'quvchi ma'lumotlarini tahrirlash uchun ruxsat yo'q" });
      }
    }

    const user = req.targetUser; // Get from middleware

    // Prepare update data
    const updateData = {};

    // Update text fields with sanitization
    if (req.body.firstName) updateData.firstName = sanitizeString(req.body.firstName);
    if (req.body.lastName !== undefined) {
      const lastName = sanitizeString(req.body.lastName);
      if (!lastName && user.role !== 'admin' && user.role !== 'director') {
        return res.status(400).json({ message: 'Familiya kiritilishi shart' });
      }
      updateData.lastName = lastName;
    }
    if (req.body.email !== undefined) {
      const rawEmail = sanitizeString(req.body.email);
      if (rawEmail === null || rawEmail === '') {
        updateData.email = undefined;
      } else {
        const email = rawEmail.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ message: 'Noto\'g\'ri email formati' });
        }
        updateData.email = email;
      }
    }
    if (req.body.phone) updateData.phone = sanitizeString(req.body.phone);
    if (req.body.address) updateData.address = sanitizeString(req.body.address);
    if (req.body.dateOfBirth) updateData.dateOfBirth = req.body.dateOfBirth;
    if (req.body.studentId) updateData.studentId = sanitizeString(req.body.studentId);
    if (req.body.passportNumber) updateData.passportNumber = sanitizeString(req.body.passportNumber);
    if (req.body.passportSeriesNumber) updateData.passportSeriesNumber = sanitizeString(req.body.passportSeriesNumber).toUpperCase();
    if (req.body.jshshir) updateData.jshshir = sanitizeString(req.body.jshshir);
    if (req.body.parentName) updateData.parentName = sanitizeString(req.body.parentName);
    if (req.body.parentPhone) updateData.parentPhone = sanitizeString(req.body.parentPhone);
    if (req.body.parentJshshir) updateData.parentJshshir = sanitizeString(req.body.parentJshshir);
    if (req.body.specialty) updateData.specialty = sanitizeString(req.body.specialty);
    if (req.body.experience) updateData.experience = sanitizeString(req.body.experience);
    if (req.body.education) updateData.education = sanitizeString(req.body.education);
    if (req.body.classId) updateData.classId = req.body.classId;
    if (req.body.registrationDate) updateData.registrationDate = req.body.registrationDate;
    if (req.body.salaryPerLesson !== undefined) {
      if (user.role !== 'teacher') {
        return res.status(400).json({ message: "Maosh stavkasi faqat o'qituvchi uchun belgilanadi" });
      }

      const allowed = await hasPermission(req.user, 'salary.edit');
      if (!allowed) {
        return res.status(403).json({ message: "Maosh stavkasini o'zgartirish uchun ruxsat yo'q" });
      }

      const salaryRate = parseNonNegativeAmount(req.body.salaryPerLesson, 'Maosh miqdori');
      if (salaryRate === null) {
        return res.status(400).json({ message: 'Maosh miqdori kiritilishi kerak' });
      }
      updateData.salaryPerLesson = salaryRate;
    }
    // Handle monthlyFee for students
    if (req.body.monthlyFee !== undefined) {
      const fee = parseFloat(req.body.monthlyFee);
      if (!isNaN(fee) && fee >= 0) {
        updateData.monthlyFee = fee;
      }
    }
    // Handle leftDate: if 'null' string or empty string is sent, set to null to clear the field
    if (req.body.leftDate !== undefined) {
      if (req.body.leftDate === 'null' || req.body.leftDate === '') {
        updateData.leftDate = null;
      } else {
        updateData.leftDate = req.body.leftDate;
      }
    }

    // Handle subjects array
    if (req.body['subjects[]']) {
      updateData.subjects = Array.isArray(req.body['subjects[]'])
        ? req.body['subjects[]']
        : [req.body['subjects[]']];
    } else if (req.body.subjects) {
      updateData.subjects = Array.isArray(req.body.subjects)
        ? req.body.subjects
        : [req.body.subjects];
    }

    // Sync with Subject.teachers if this is a teacher and subjects are being updated
    if (user.role === 'teacher' && updateData.subjects !== undefined) {
      const oldSubjects = user.subjects ? user.subjects.map(s => s.toString()) : [];
      const newSubjects = updateData.subjects;

      // Find subjects to remove (in old but not in new)
      const subjectsToRemove = oldSubjects.filter(s => !newSubjects.includes(s));
      // Find subjects to add (in new but not in old)
      const subjectsToAdd = newSubjects.filter(s => !oldSubjects.includes(s));

      // Remove teacher from subjects they're no longer teaching
      if (subjectsToRemove.length > 0) {
        await Subject.updateMany(
          { _id: { $in: subjectsToRemove } },
          { $pull: { teachers: req.params.id } }
        );
      }

      // Add teacher to new subjects
      if (subjectsToAdd.length > 0) {
        await Subject.updateMany(
          { _id: { $in: subjectsToAdd } },
          { $addToSet: { teachers: req.params.id } }
        );
      }

      // Sync with Schedule model - remove teacher from schedules if subjects were removed
      await syncUserToSchedule(req.params.id, newSubjects, oldSubjects);
    }

    // Validate password if provided
    if (req.body.password) {
      const password = req.body.password;

      // Strong password validation
      if (password.length < 6) {
        return res.status(400).json({ message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
      }

      if (password.length > 128) {
        return res.status(400).json({ message: 'Parol juda uzun (maksimal 128 ta belgi)' });
      }

      // Check for password strength (at least one number or special character)
      const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      if (!hasNumberOrSpecial) {
        return res.status(400).json({ message: 'Parol xavfsizligi uchun kamida bitta raqam yoki maxsus belgi kiriting' });
      }

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Safe boolean conversion
    if (req.body.isActive !== undefined) {
      updateData.isActive = parseBoolean(req.body.isActive);

      // If student is being deactivated, remove from class
      if (user.role === 'student' && !updateData.isActive && user.classId) {
        updateData.classId = null; // Clear classId from user

        // Remove student from class's students array
        const Class = require('../../models/academic/Class');
        await Class.updateOne(
          { _id: user.classId },
          { $pull: { students: user._id } }
        );
      }
    }

    // Update profile image if uploaded (students cannot change their own image)
    const isStudentEditingOwnImage = req.user.role === 'student' && isOwnProfile;

    if (req.file && !isStudentEditingOwnImage) {
      // Use helper function to get role subdirectory
      const roleSubdir = getRoleSubdir(user.role);
      updateData.profileImage = `/uploads/profiles/${roleSubdir}/${req.file.filename}`;
    } else if (req.body.removeProfileImage === 'true' && !isStudentEditingOwnImage) {
      // Remove profile image if requested (not for students editing their own)
      updateData.profileImage = null;
    }

    const oldClassIdForChat = user.classId ? user.classId.toString() : null;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    // Chat sinf guruhlarini yangilash agar o'quvchining sinfi o'zgargan bo'lsa
    try {
      if (user.role === 'student') {
        const newClassIdForChat = updatedUser.classId ? updatedUser.classId.toString() : null;
        if (oldClassIdForChat && oldClassIdForChat !== newClassIdForChat) {
          await ensureClassRoom(oldClassIdForChat);
        }
        if (newClassIdForChat) {
          await ensureClassRoom(newClassIdForChat);
        }
      }
    } catch (chatErr) {
      console.warn('Chat room sync (user update) failed:', chatErr.message);
    }

    if (user.role === 'teacher' && updateData.salaryPerLesson !== undefined) {
      await syncOpenSalaryRecords(updatedUser._id, updateData.salaryPerLesson);
    }

    res.json(updatedUser);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    // Error is logged by error handling middleware
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `Bu ${field === 'phone' ? 'telefon raqam' : field === 'email' ? 'email' : 'ma\'lumot'} allaqachon mavjud`
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages[0] || 'Ma\'lumotlar formati noto\'g\'ri' });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri ID formati' });
    }
    res.status(500).json({ message: 'Ma\'lumotlarni saqlashda xatolik' });
  }
});

// @route   PUT /api/users/:id/password
// @desc    Update user password
// @access  Private
router.put('/:id/password', auth, passwordChangeLimiter, [
  body('currentPassword').notEmpty().withMessage('Joriy parol kiritilishi shart'),
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak')
    .matches(/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Parol xavfsizligi uchun kamida bitta raqam yoki maxsus belgi kiriting')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;

    // Check if user can update this password
    if ((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant') && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Joriy parol noto\'g\'ri' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Parol muvaffaqiyatli o\'zgartirildi' });
  } catch (error) {
    // Error is logged by error handling middleware
    res.status(500).json({ message: 'Parolni o\'zgartirishda xatolik' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id', auth, authorize('admin', 'accountant', 'reception', 'teacher'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Siz o\'zingizni o\'chira olmaysiz' });
    }

    // Reception faqat o'quvchi va o'qituvchini o'chira oladi
    if (req.user.role === 'reception' && !['student', 'teacher'].includes(user.role)) {
      return res.status(403).json({ message: "Reception faqat o'quvchi va o'qituvchini o'chira oladi" });
    }

    const Class = require('../../models/academic/Class');

    // O'qituvchi faqat o'quvchini, va faqat o'zining sinfidagi o'quvchini o'chira oladi
    if (req.user.role === 'teacher') {
      if (user.role !== 'student') {
        return res.status(403).json({ message: "O'qituvchi faqat o'quvchini o'chira oladi" });
      }
      const inMyClass = await Class.exists({
        $or: [{ classTeacher: req.user._id }, { 'subjects.teacher': req.user._id }],
        students: user._id
      });
      if (!inMyClass) {
        return res.status(403).json({ message: "Bu o'quvchi sizning sinfingizga tegishli emas" });
      }
    }

    // O'quvchi o'chirish uchun ruxsat
    if (user.role === 'student') {
      const allowed = await hasPermission(req.user, 'teacher.delete_student');
      if (!allowed) {
        return res.status(403).json({ message: "O'quvchini o'chirish ruxsati yo'q" });
      }
    }

    // If teacher, remove from all subjects
    if (user.role === 'teacher' && user.subjects && user.subjects.length > 0) {
      await Subject.updateMany(
        { teachers: req.params.id },
        { $pull: { teachers: req.params.id } }
      );
    }

    // O'quvchi o'chirilsa — uni barcha sinflar ro'yxatidan ham olib tashlaymiz
    if (user.role === 'student') {
      await Class.updateMany(
        { students: user._id },
        { $pull: { students: user._id } }
      );
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Foydalanuvchi muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    // Error is logged by error handling middleware
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Noto\'g\'ri foydalanuvchi ID formati' });
    }
    res.status(500).json({ message: 'Foydalanuvchini o\'chirishda xatolik' });
  }
});

// @route   PUT /api/users/:id/balance
// @desc    Update teacher balance (add/withdraw)
// @access  Private/Admin
router.put('/:id/balance', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    const { amount, type, description } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Noto\'g\'ri summa' });
    }

    if (!type || !['add', 'withdraw'].includes(type)) {
      return res.status(400).json({ message: 'Noto\'g\'ri operatsiya turi (add/withdraw)' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    if (user.role !== 'teacher') {
      return res.status(400).json({ message: 'Faqat o\'qituvchilar uchun!' });
    }

    const currentBalance = user.balance || 0;

    if (type === 'add') {
      user.balance = currentBalance + Number(amount);
    } else if (type === 'withdraw') {
      if (currentBalance < Number(amount)) {
        return res.status(400).json({ message: 'Hisobda yetarli mablag\' yo\'q' });
      }
      user.balance = currentBalance - Number(amount);
    }

    await user.save();

    res.json({
      message: type === 'add' ? 'Pul qo\'shildi' : 'Pul yechildi',
      balance: user.balance,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// @route   POST /api/users/:id/transfer
// @desc    O'quvchini boshqa sinf/guruhga ko'chirish (baholar va butun tarix saqlanadi)
// @access  admin, accountant, reception (director superuser)
router.post('/:id/transfer', auth, authorize('admin', 'accountant', 'reception'), async (req, res) => {
  try {
    const { newClassId } = req.body;
    if (!newClassId) {
      return res.status(400).json({ message: 'Yangi sinf (newClassId) talab qilinadi' });
    }

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    const newClass = await Class.findById(newClassId);
    if (!newClass) {
      return res.status(404).json({ message: 'Yangi sinf topilmadi' });
    }

    const oldClassId = student.classId ? student.classId.toString() : null;
    if (oldClassId === newClass._id.toString()) {
      return res.status(400).json({ message: 'O\'quvchi allaqachon shu sinfda' });
    }

    // Eski sinf ro'yxatidan olib tashlaymiz
    if (oldClassId) {
      await Class.updateOne({ _id: oldClassId }, { $pull: { students: student._id } });
    }
    // Yangi sinf ro'yxatiga qo'shamiz (dublikatsiz)
    await Class.updateOne({ _id: newClass._id }, { $addToSet: { students: student._id } });

    // O'quvchining joriy sinfini yangilaymiz. MUHIM: baholar/davomat/test natijalari
    // o'quvchi _id'siga bog'langani uchun ular O'CHMAYDI — butun tarix saqlanib qoladi.
    student.classId = newClass._id;
    await student.save();

    // Chat xonalarini sinxronlaymiz (xato bo'lsa ko'chirish baribir muvaffaqiyatli)
    try {
      if (oldClassId) await ensureClassRoom(oldClassId);
      await ensureClassRoom(newClass._id.toString());
    } catch (chatErr) {
      // chat sinxronizatsiyasi ikkilamchi
    }

    const updated = await User.findById(student._id)
      .select('-password')
      .populate('classId', 'name grade section');

    res.json({
      message: 'O\'quvchi muvaffaqiyatli ko\'chirildi. Barcha baholari va tarixi saqlanib qoldi.',
      user: updated
    });
  } catch (error) {
    res.status(500).json({ message: 'Ko\'chirishda xatolik', error: error.message });
  }
});

module.exports = router;
