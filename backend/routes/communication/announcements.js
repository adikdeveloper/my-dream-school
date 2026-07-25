const express = require('express');
const { body, validationResult } = require('express-validator');
const Announcement = require('../../models/communication/Announcement');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');

const router = express.Router();

// @route   GET /api/announcements
// @desc    Get announcements
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = { isPublished: true };

    // Filter based on user role
    if (req.user.role === 'student') {
      query.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'students' },
        { targetAudience: 'class', targetClass: req.user.classId }
      ];
    } else if (req.user.role === 'teacher') {
      query.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'teachers' }
      ];
    }

    const announcements = await Announcement.find(query)
      .populate('author', 'firstName lastName')
      .populate('targetClass', 'name grade section')
      .sort({ priority: -1, publishDate: -1 })
      .limit(50);

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/announcements
// @desc    Create announcement
// @access  Private/Admin
router.post('/', auth, authorize('admin', 'teacher', 'supervisor', 'hr'), requirePermission('announcement.create'), [
  body('title').notEmpty().trim(),
  body('content').notEmpty().trim(),
  body('targetAudience').isIn(['all', 'students', 'teachers', 'parents', 'class']),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const announcementData = {
      ...req.body,
      author: req.user._id
    };

    const announcement = new Announcement(announcementData);
    const savedAnnouncement = await announcement.save();

    const populatedAnnouncement = await Announcement.findById(savedAnnouncement._id)
      .populate('author', 'firstName lastName')
      .populate('targetClass', 'name grade section');

    res.status(201).json(populatedAnnouncement);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
