const express = require('express');
const { body, validationResult } = require('express-validator');
const Class = require('../../models/academic/Class');
const User = require('../../models/users/User');
const Schedule = require('../../models/scheduling/Schedule');
const { auth, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');
const { syncClassToSchedule } = require('../../utils/scheduleSynchronizer');
const { ensureClassRoom } = require('../../controllers/chat/chatHelpers');
const { requirePermission } = require('../../middleware/permissions');

const router = express.Router();

// @route   GET /api/classes
// @desc    Get all classes with pagination (admin can see all, others only active)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Default 100, can be adjusted
    const skip = (page - 1) * limit;

    // Admin can see all classes including inactive ones
    const query = (req.user.role === 'admin' || req.user.role === 'director' || req.user.role === 'accountant') ? {} : { isActive: true };

    // Get total count for pagination
    const total = await Class.countDocuments(query);

    const classes = await Class.find(query)
      .select('name grade section group academicYear classTeacher students subjects room maxStudents isActive createdAt')
      .populate('classTeacher', 'firstName lastName email')
      .populate('students', 'firstName lastName studentId phone registrationDate')
      .populate('subjects.subject', 'name code')
      .populate('subjects.teacher', 'firstName lastName')
      .sort({ grade: 1, section: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Always return consistent format with classes array
    res.json({
      classes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalClasses: total,
        limit
      }
    });
  } catch (error) {
    logger.error('Error fetching all classes', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ message: 'Sinflarni yuklashda xatolik yuz berdi' });
  }
});

// @route   GET /api/classes/available-students
// @desc    Get students not assigned to any class
// @access  Private/Admin
router.get('/available-students', auth, authorize('admin', 'accountant'), async (req, res) => {
  try {
    // Get all active classes with their students
    const classes = await Class.find({ isActive: true })
      .select('students')
      .lean();

    // Extract all student IDs that are already in classes
    const assignedStudentIds = classes.flatMap(c =>
      (c.students || []).map(s => s.toString())
    );

    // Get all students that are not in any class
    const availableStudents = await User.find({
      role: 'student',
      _id: { $nin: assignedStudentIds }
    })
      .select('firstName lastName studentId email phone profileImage')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    res.json({
      students: availableStudents,
      count: availableStudents.length
    });
  } catch (error) {
    logger.error('Error fetching available students', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ message: 'Mavjud o\'quvchilarni yuklashda xatolik yuz berdi' });
  }
});

// @route   GET /api/classes/teacher/students
// @desc    Get all students for classes where teacher is curator/class teacher, teaches, or is directly assigned
// @access  Private/Teacher
router.get('/teacher/students', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id).select('classes').lean();
    const directlyAssignedClassIds = (teacher?.classes || []).filter(Boolean);
    const teacherSchedules = await Schedule.find({
      'schedule.periods.teacher': req.user.id,
      isActive: true
    })
      .select('classId schedule.periods.subject schedule.periods.teacher')
      .populate('schedule.periods.subject', 'name code color')
      .lean();
    const scheduleClassIds = [...new Set(teacherSchedules.map(item => String(item.classId)).filter(Boolean))];
    const classFilters = [
      { classTeacher: req.user.id },
      { 'subjects.teacher': req.user.id }
    ];

    if (directlyAssignedClassIds.length > 0) {
      classFilters.push({ _id: { $in: directlyAssignedClassIds } });
    }
    if (scheduleClassIds.length > 0) {
      classFilters.push({ _id: { $in: scheduleClassIds } });
    }

    // Find classes where teacher is curator/class teacher, subject teacher, or directly assigned.
    const classes = await Class.find({
      $or: classFilters,
      isActive: true
    })
      .select('name grade section students')
      .populate('students', 'firstName lastName studentId email phone profileImage dateOfBirth address parentName parentPhone classId registrationDate')
      .lean();

    const classIds = classes.map(classData => classData._id);
    const classMap = new Map(classes.map(classData => [classData._id.toString(), classData]));
    const studentsByClassId = classIds.length > 0
      ? await User.find({
          role: 'student',
          classId: { $in: classIds }
        })
          .select('firstName lastName studentId email phone profileImage dateOfBirth address parentName parentPhone classId')
          .lean()
      : [];

    // Extract unique students from both Class.students and User.classId.
    // Some existing records can be synced in only one of those fields.
    const studentsMap = new Map();

    const getClassName = (classData) => {
      if (classData.name) return classData.name;
      return [classData.grade, classData.section]
        .filter(value => value !== undefined && value !== null && value !== '')
        .join('-');
    };

    const addStudent = (student, classData) => {
      if (!student || !student._id || !classData) return;

      const studentKey = student._id.toString();
      const className = getClassName(classData);

      if (!studentsMap.has(studentKey)) {
        studentsMap.set(studentKey, {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
          email: student.email,
          phone: student.phone,
          profileImage: student.profileImage,
          dateOfBirth: student.dateOfBirth,
          address: student.address,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          className,
          classes: className ? [className] : []
        });
        return;
      }

      const existing = studentsMap.get(studentKey);
      if (className && !existing.classes.includes(className)) {
        existing.classes.push(className);
        existing.className = existing.classes.join(', ');
      }
    };

    for (const classData of classes) {
      (classData.students || []).forEach(student => addStudent(student, classData));
    }

    studentsByClassId.forEach(student => {
      const classData = student.classId ? classMap.get(student.classId.toString()) : null;
      addStudent(student, classData);
    });

    const students = Array.from(studentsMap.values()).sort((a, b) => {
      const classCompare = (a.className || '').localeCompare(b.className || '', 'uz');
      if (classCompare !== 0) return classCompare;
      return `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(`${b.firstName || ''} ${b.lastName || ''}`, 'uz');
    });

    res.json(students);
  } catch (error) {
    logger.error('Error fetching teacher students', {
      error: error.message,
      stack: error.stack,
      teacherId: req.user?.id
    });
    res.status(500).json({ message: 'O\'quvchilarni yuklashda xatolik yuz berdi' });
  }
});

// @route   GET /api/classes/teacher/my-classes
// @desc    O'qituvchining o'zi kurator/rahbar, dars beradigan yoki bevosita biriktirilgan sinflari (id + nom)
// @access  Private/Teacher
router.get('/teacher/my-classes', auth, authorize('teacher'), async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id).select('classes').lean();
    const directlyAssignedClassIds = (teacher?.classes || []).filter(Boolean);
    const classFilters = [
      { classTeacher: req.user.id },
      { 'subjects.teacher': req.user.id }
    ];

    if (directlyAssignedClassIds.length > 0) {
      classFilters.push({ _id: { $in: directlyAssignedClassIds } });
    }

    const classes = await Class.find({
      $or: classFilters,
      isActive: true
    })
      .select('name grade section')
      .sort({ grade: 1, section: 1 })
      .lean();

    const result = classes.map(classItem => {
      const subjectMap = new Map();
      teacherSchedules
        .filter(item => String(item.classId) === String(classItem._id))
        .forEach(item => (item.schedule || []).forEach(day => (day.periods || []).forEach(period => {
          if (String(period.teacher?._id || period.teacher) !== String(req.user.id) || !period.subject) return;
          const subjectId = String(period.subject._id || period.subject);
          subjectMap.set(subjectId, {
            _id: period.subject._id || period.subject,
            name: period.subject.name || '',
            code: period.subject.code || '',
            color: period.subject.color || ''
          });
        })));

      return { ...classItem, scheduleSubjects: [...subjectMap.values()] };
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching teacher classes', {
      error: error.message,
      stack: error.stack,
      teacherId: req.user?.id
    });
    res.status(500).json({ message: 'Sinflarni yuklashda xatolik yuz berdi' });
  }
});

// @route   GET /api/classes/my-class/info
// @desc    Get student's class information and classmates
// @access  Private/Student
router.get('/my-class/info', auth, authorize('student'), async (req, res) => {
  try {
    // Get the current student's information
    const student = await User.findById(req.user.id).select('classId firstName lastName');

    if (!student || !student.classId) {
      logger.warn('Student has no class assigned', { studentId: req.user.id });
      return res.status(404).json({ message: 'Siz hali hech qanday sinfga biriktirilmagansiz' });
    }

    // Get the class information with active check
    const classData = await Class.findOne({
      _id: student.classId,
      isActive: true
    })
      .populate('classTeacher', 'firstName lastName email phone profileImage')
      .populate('students', 'firstName lastName studentId profileImage email phone dateOfBirth address parentName parentPhone')
      .populate('subjects.subject', 'name code')
      .populate('subjects.teacher', 'firstName lastName')
      .lean();

    if (!classData) {
      logger.warn('Class not found or inactive', {
        classId: student.classId,
        studentId: req.user.id
      });
      return res.status(404).json({ message: 'Sinf topilmadi yoki faol emas' });
    }

    // Mark current user in students list
    if (classData.students) {
      classData.students = classData.students.map(s => ({
        ...s,
        isCurrentUser: s._id.toString() === req.user.id
      }));
    }

    logger.info('Student class info retrieved successfully', {
      studentId: req.user.id,
      classId: classData._id,
      studentCount: classData.students?.length || 0
    });

    res.json(classData);
  } catch (error) {
    logger.error('Error fetching student class info', {
      error: error.message,
      stack: error.stack,
      studentId: req.user?.id
    });
    res.status(500).json({ message: 'Sinf ma\'lumotlarini yuklashda xatolik yuz berdi' });
  }
});

// @route   GET /api/classes/:id
// @desc    Get class by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // Validate MongoDB ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Noto\'g\'ri sinf ID formati' });
    }

    const classData = await Class.findById(req.params.id)
      .populate('classTeacher', 'firstName lastName email')
      .populate('students', 'firstName lastName studentId registrationDate')
      .populate('subjects.subject', 'name code color')
      .populate('subjects.teacher', 'firstName lastName');

    if (!classData) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    res.json(classData);
  } catch (error) {
    logger.error('Error fetching class by ID', {
      error: error.message,
      stack: error.stack,
      classId: req.params.id,
      userId: req.user?.id
    });
    res.status(500).json({ message: 'Sinf ma\'lumotlarini yuklashda xatolik yuz berdi' });
  }
});

// @route   POST /api/classes
// @desc    Create new class
// @access  Private/Admin
router.post('/', auth, authorize('admin', 'accountant', 'supervisor'), requirePermission('class.create'), [
  body('name').notEmpty().trim().escape().withMessage('Sinf nomi bo\'sh bo\'lmasligi kerak'),
  body('grade').optional({ checkFalsy: true }).isInt({ min: 0, max: 9 }).withMessage('Sinf darajasi 0-9 oralig\'ida bo\'lishi kerak'),
  body('section').notEmpty().trim().escape().withMessage('Bo\'lim bo\'sh bo\'lmasligi kerak'),
  body('group').optional().custom((value, { req }) => {
    if (!value || value === '') return true;
    const grade = parseInt(req.body.grade);
    if (grade >= 7 && ['MIT', 'Stanford', 'Oxford'].includes(value)) return true;
    if (grade < 7 && value) throw new Error('1-6 sinflarda guruh bo\'lmaydi');
    throw new Error('Noto\'g\'ri guruh nomi (faqat MIT, Stanford, Oxford)');
  }),
  body('classTeacher').isMongoId().withMessage('Noto\'g\'ri o\'qituvchi ID'),
  body('academicYear').notEmpty().trim().escape().withMessage('O\'quv yili bo\'sh bo\'lmasligi kerak'),
  body('room').optional().trim().escape(),
  body('maxStudents').optional().isInt({ min: 1, max: 100 }).withMessage('Maksimal o\'quvchilar soni 1-100 oralig\'ida')
], async (req, res) => {
  try {
    console.log('=== CLASS CREATE REQUEST ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Convert string values to numbers
    const classData = {
      ...req.body,
      maxStudents: req.body.maxStudents ? parseInt(req.body.maxStudents) : 30
    };

    // Sinf darajasi ixtiyoriy - faqat tanlangan bo'lsa raqamga aylantiramiz
    if (req.body.grade !== undefined && req.body.grade !== null && req.body.grade !== '') {
      classData.grade = parseInt(req.body.grade);
    } else {
      delete classData.grade;
    }

    const newClass = new Class(classData);
    const savedClass = await newClass.save();

    const populatedClass = await Class.findById(savedClass._id)
      .populate('classTeacher', 'firstName lastName email');

    // Avtomatik sinf chat guruhi yaratish
    try {
      await ensureClassRoom(savedClass._id);
    } catch (chatErr) {
      logger.warn('Class chat room create failed', { error: chatErr.message, classId: savedClass._id });
    }

    console.log('Class created successfully:', savedClass._id);
    res.status(201).json(populatedClass);
  } catch (error) {
    console.log('=== CLASS CREATE ERROR ===');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
    logger.error('Error creating new class', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      className: req.body?.name
    });
    res.status(500).json({ message: 'Sinf yaratishda xatolik yuz berdi' });
  }
});

// @route   PUT /api/classes/:id
// @desc    Update class
// @access  Private/Admin
router.put('/:id', auth, authorize('admin', 'accountant', 'supervisor'), requirePermission('class.edit'), [
  body('name').optional().trim().escape().notEmpty().withMessage('Sinf nomi bo\'sh bo\'lmasligi kerak'),
  body('grade').optional({ checkFalsy: true }).isInt({ min: 0, max: 9 }).withMessage('Sinf darajasi 0-9 oralig\'ida bo\'lishi kerak'),
  body('section').optional().trim().escape().notEmpty().withMessage('Bo\'lim bo\'sh bo\'lmasligi kerak'),
  body('group').optional().custom((value, { req }) => {
    if (!value || value === '') return true;
    const grade = parseInt(req.body.grade);
    if (grade >= 7 && ['MIT', 'Stanford', 'Oxford'].includes(value)) return true;
    if (grade < 7 && value) throw new Error('1-6 sinflarda guruh bo\'lmaydi');
    throw new Error('Noto\'g\'ri guruh nomi (faqat MIT, Stanford, Oxford)');
  }),
  body('classTeacher').optional().isMongoId().withMessage('Noto\'g\'ri o\'qituvchi ID'),
  body('students').optional().isArray().withMessage('O\'quvchilar array bo\'lishi kerak'),
  body('students.*').optional().isMongoId().withMessage('Noto\'g\'ri o\'quvchi ID'),
  body('academicYear').optional().trim().escape().notEmpty().withMessage('O\'quv yili bo\'sh bo\'lmasligi kerak'),
  body('room').optional().trim().escape(),
  body('maxStudents').optional().isInt({ min: 1, max: 100 }).withMessage('Maksimal o\'quvchilar soni 1-100 oralig\'ida'),
  body('isActive').optional().isBoolean().withMessage('isActive boolean bo\'lishi kerak')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validatsiya xatoligi',
        errors: errors.array()
      });
    }

    // Get old class data to compare subjects and students if they're being updated
    const oldClass = (req.body.subjects || req.body.students) ? await Class.findById(req.params.id) : null;
    const oldSubjects = oldClass ? oldClass.subjects : [];
    const oldStudents = oldClass ? (oldClass.students || []).map(s => s.toString()) : [];

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('classTeacher', 'firstName lastName email')
      .populate('students', 'firstName lastName studentId')
      .populate('subjects.subject', 'name code color')
      .populate('subjects.teacher', 'firstName lastName');

    if (!updatedClass) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    // Sync with Schedule if subjects were updated
    if (req.body.subjects) {
      await syncClassToSchedule(req.params.id, updatedClass.subjects, oldSubjects);
    }

    // Sync student classId if students were updated
    if (req.body.students) {
      const User = require('../../models/users/User');
      const newStudents = (req.body.students || []).map(s => s.toString());

      // Find students that were added (in newStudents but not in oldStudents)
      const addedStudents = newStudents.filter(id => !oldStudents.includes(id));

      // Find students that were removed (in oldStudents but not in newStudents)
      const removedStudents = oldStudents.filter(id => !newStudents.includes(id));

      // Update added students to set their classId
      if (addedStudents.length > 0) {
        await User.updateMany(
          { _id: { $in: addedStudents } },
          { $set: { classId: req.params.id } }
        );
        logger.info('Added students classId updated', {
          classId: req.params.id,
          addedCount: addedStudents.length
        });
      }

      // Update removed students to remove their classId
      if (removedStudents.length > 0) {
        await User.updateMany(
          { _id: { $in: removedStudents } },
          { $set: { classId: null } }
        );
        logger.info('Removed students classId cleared', {
          classId: req.params.id,
          removedCount: removedStudents.length
        });
      }
    }

    // Chat sinf guruhini yangilash (a'zolar, nom)
    try {
      await ensureClassRoom(req.params.id);
    } catch (chatErr) {
      logger.warn('Class chat room sync failed', { error: chatErr.message, classId: req.params.id });
    }

    logger.info('Class updated successfully', {
      classId: req.params.id,
      userId: req.user?.id
    });

    res.json(updatedClass);
  } catch (error) {
    logger.error('Error updating class', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      classId: req.params.id
    });
    res.status(500).json({ message: 'Sinfni yangilashda xatolik yuz berdi' });
  }
});

// @route   GET /api/classes/:classId/students
// @desc    Get all students in a specific class
// @access  Private/Teacher/Admin
router.get('/:classId/students', auth, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await Class.findById(classId)
      .populate('students', 'firstName lastName studentId email phone profileImage')
      .lean();

    if (!classData) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    res.json(classData.students || []);
  } catch (error) {
    logger.error('Error fetching class students', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      classId: req.params.classId
    });
    res.status(500).json({ message: 'O\'quvchilarni yuklashda xatolik yuz berdi' });
  }
});

// @route   DELETE /api/classes/:id
// @desc    Hard delete class (permanently remove from database)
// @access  Private/Admin
router.delete('/:id', auth, authorize('admin', 'accountant'), requirePermission('class.delete'), async (req, res) => {
  try {
    const classToDelete = await Class.findById(req.params.id);

    if (!classToDelete) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    // Clear classId from all students in this class
    if (classToDelete.students && classToDelete.students.length > 0) {
      await User.updateMany(
        { _id: { $in: classToDelete.students } },
        { $set: { classId: null } }
      );
      logger.info('Cleared classId from students', {
        classId: req.params.id,
        studentCount: classToDelete.students.length
      });
    }

    // Permanently delete the class
    await Class.findByIdAndDelete(req.params.id);

    logger.info('Class permanently deleted', {
      classId: req.params.id,
      className: classToDelete.name,
      userId: req.user?.id
    });

    res.json({
      message: 'Sinf muvaffaqiyatli o\'chirildi',
      deletedClass: {
        _id: classToDelete._id,
        name: classToDelete.name
      }
    });
  } catch (error) {
    logger.error('Error deleting class', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      classId: req.params.id
    });
    res.status(500).json({ message: 'Sinfni o\'chirishda xatolik yuz berdi' });
  }
});

module.exports = router;
