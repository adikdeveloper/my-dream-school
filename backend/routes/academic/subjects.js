const express = require('express');
const { body, validationResult } = require('express-validator');
const Subject = require('../../models/academic/Subject');
const User = require('../../models/users/User');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');

const router = express.Router();

// Validation rules for creating subject (POST)
const createSubjectValidation = [
  body('name')
    .notEmpty().withMessage('Fan nomi kiritilishi shart')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Fan nomi 2-100 belgidan iborat bo\'lishi kerak'),
  body('code')
    .notEmpty().withMessage('Fan kodi kiritilishi shart')
    .trim()
    .isLength({ min: 2, max: 20 }).withMessage('Fan kodi 2-20 belgidan iborat bo\'lishi kerak')
    .matches(/^[A-Z0-9\s-]+$/i).withMessage('Fan kodi faqat harflar, raqamlar, bo\'shliq va tire(-) dan iborat bo\'lishi kerak'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Tavsif 500 belgidan oshmasligi kerak'),
  body('credits')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 10 }).withMessage('Kredit soati 1 dan 10 gacha bo\'lishi kerak')
    .toInt(),
  body('color')
    .optional({ checkFalsy: true })
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Rang hex formatda bo\'lishi kerak (masalan: #3b82f6)'),
  body('isActive')
    .optional({ checkFalsy: true })
    .isBoolean().withMessage('isActive boolean qiymat bo\'lishi kerak')
    .toBoolean()
];

// Validation rules for updating subject (PUT)
const updateSubjectValidation = [
  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty().withMessage('Fan nomi bo\'sh bo\'lishi mumkin emas')
    .isLength({ min: 2, max: 100 }).withMessage('Fan nomi 2-100 belgidan iborat bo\'lishi kerak'),
  body('code')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty().withMessage('Fan kodi bo\'sh bo\'lishi mumkin emas')
    .isLength({ min: 2, max: 20 }).withMessage('Fan kodi 2-20 belgidan iborat bo\'lishi kerak')
    .matches(/^[A-Z0-9\s-]+$/i).withMessage('Fan kodi faqat harflar, raqamlar, bo\'shliq va tire(-) dan iborat bo\'lishi kerak'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Tavsif 500 belgidan oshmasligi kerak'),
  body('credits')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 10 }).withMessage('Kredit soati 1 dan 10 gacha bo\'lishi kerak')
    .toInt(),
  body('color')
    .optional({ checkFalsy: true })
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Rang hex formatda bo\'lishi kerak (masalan: #3b82f6)'),
  body('isActive')
    .optional({ checkFalsy: true })
    .isBoolean().withMessage('isActive boolean qiymat bo\'lishi kerak')
    .toBoolean()
];

// @route   GET /api/subjects
// @desc    Get all subjects (with optional filtering)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { isActive, page = 1, limit = 100 } = req.query;

    // Build filter query
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get subjects with pagination and populate teachers
    const subjects = await Subject.find(filter)
      .populate('teachers', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Subject.countDocuments(filter);

    res.json({
      subjects: subjects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Fanlarni yuklashda xatolik yuz berdi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/subjects/:id
// @desc    Get single subject by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }

    res.json(subject);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }
    res.status(500).json({
      message: 'Fanni yuklashda xatolik yuz berdi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/subjects
// @desc    Create new subject
// @access  Private/Admin
router.post('/', auth, authorize('admin'), requirePermission('subject.manage'), createSubjectValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validatsiya xatoligi',
        errors: errors.array()
      });
    }

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({ code: req.body.code });
    if (existingSubject) {
      return res.status(400).json({
        message: 'Ushbu kod bilan fan allaqachon mavjud'
      });
    }

    const subject = new Subject(req.body);
    const savedSubject = await subject.save();

    // Sync with User.subjects - add this subject to all teachers
    if (req.body.teachers && req.body.teachers.length > 0) {
      await User.updateMany(
        { _id: { $in: req.body.teachers }, role: 'teacher' },
        { $addToSet: { subjects: savedSubject._id } }
      );
    }

    res.status(201).json({
      message: 'Fan muvaffaqiyatli qo\'shildi',
      subject: savedSubject
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Ushbu kod bilan fan allaqachon mavjud'
      });
    }
    res.status(500).json({
      message: 'Fanni saqlashda xatolik yuz berdi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/subjects/:id
// @desc    Update subject
// @access  Private/Admin
router.put('/:id', auth, authorize('admin'), requirePermission('subject.manage'), updateSubjectValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validatsiya xatoligi',
        errors: errors.array()
      });
    }

    // Check if subject exists
    let subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }

    // Check if code is being changed and if new code already exists
    if (req.body.code && req.body.code !== subject.code) {
      const existingSubject = await Subject.findOne({ code: req.body.code });
      if (existingSubject) {
        return res.status(400).json({
          message: 'Ushbu kod bilan fan allaqachon mavjud'
        });
      }
    }

    // Sync with User.subjects if teachers are being updated
    if (req.body.teachers !== undefined) {
      const oldTeachers = subject.teachers.map(t => t.toString());
      const newTeachers = req.body.teachers;

      // Find teachers to remove (in old but not in new)
      const teachersToRemove = oldTeachers.filter(t => !newTeachers.includes(t));
      // Find teachers to add (in new but not in old)
      const teachersToAdd = newTeachers.filter(t => !oldTeachers.includes(t));

      // Remove subject from teachers who are no longer teaching it
      if (teachersToRemove.length > 0) {
        await User.updateMany(
          { _id: { $in: teachersToRemove }, role: 'teacher' },
          { $pull: { subjects: req.params.id } }
        );
      }

      // Add subject to new teachers
      if (teachersToAdd.length > 0) {
        await User.updateMany(
          { _id: { $in: teachersToAdd }, role: 'teacher' },
          { $addToSet: { subjects: req.params.id } }
        );
      }
    }

    // Update subject
    subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Fan muvaffaqiyatli yangilandi',
      subject: subject
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Ushbu kod bilan fan allaqachon mavjud'
      });
    }
    res.status(500).json({
      message: 'Fanni yangilashda xatolik yuz berdi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/subjects/:id
// @desc    Delete subject
// @access  Private/Admin
router.delete('/:id', auth, authorize('admin'), requirePermission('subject.manage'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }

    // Check if subject is being used in any classes/grades
    // This is optional - you can add checks here if needed
    // const Grade = require('../../models/Grade');
    // const gradesCount = await Grade.countDocuments({ subject: req.params.id });
    // if (gradesCount > 0) {
    //   return res.status(400).json({
    //     message: 'Ushbu fan ballar tizimida ishlatilmoqda. Avval ballarni o\'chiring'
    //   });
    // }

    // Remove subject from all teachers
    await User.updateMany(
      { subjects: req.params.id, role: 'teacher' },
      { $pull: { subjects: req.params.id } }
    );

    await Subject.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Fan muvaffaqiyatli o\'chirildi',
      id: req.params.id
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Fan topilmadi' });
    }
    res.status(500).json({
      message: 'Fanni o\'chirishda xatolik yuz berdi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
