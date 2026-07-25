const express = require('express');
const { body, validationResult } = require('express-validator');
const Holiday = require('../../models/scheduling/Holiday');
const { auth, authorize } = require('../../middleware/auth');

const router = express.Router();

// @route   GET /api/holidays
// @desc    Get all holidays
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { academicYear, year, month } = req.query;

    let query = { isActive: true };

    if (academicYear) {
      query.academicYear = academicYear;
    }

    // Agar oy va yil berilgan bo'lsa, o'sha oy uchun bayramlarni olish
    if (year && month) {
      const holidays = await Holiday.getHolidaysForMonth(parseInt(year), parseInt(month));
      return res.json(holidays);
    }

    const holidays = await Holiday.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ date: 1 });

    res.json(holidays);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/holidays/check/:date
// @desc    Check if a date is a holiday
// @access  Private
router.get('/check/:date', auth, async (req, res) => {
  try {
    const holiday = await Holiday.isHoliday(req.params.date);
    res.json({
      isHoliday: !!holiday,
      holiday: holiday || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/holidays/range
// @desc    Get holidays in date range
// @access  Private
router.get('/range', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate va endDate talab qilinadi' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const holidays = await Holiday.find({
      isActive: true,
      $or: [
        { date: { $gte: start, $lte: end } },
        { endDate: { $gte: start, $lte: end } },
        { date: { $lte: start }, endDate: { $gte: end } }
      ]
    }).sort({ date: 1 });

    res.json(holidays);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/holidays
// @desc    Create a holiday
// @access  Private/Admin
router.post('/', auth, authorize('admin'), [
  body('name').notEmpty().trim().withMessage('Bayram nomi kiritilishi shart'),
  body('date').notEmpty().isISO8601().withMessage('Sana kiritilishi shart'),
  body('academicYear').notEmpty().withMessage('O\'quv yili kiritilishi shart'),
  body('type').optional().isIn(['national', 'religious', 'school', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const holidayData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Agar endDate berilmagan bo'lsa, date bilan bir xil qilish
    if (!holidayData.endDate) {
      holidayData.endDate = null;
    }

    const holiday = new Holiday(holidayData);
    const savedHoliday = await holiday.save();

    const populatedHoliday = await Holiday.findById(savedHoliday._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json(populatedHoliday);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/holidays/:id
// @desc    Update a holiday
// @access  Private/Admin
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('createdBy', 'firstName lastName');

    if (!holiday) {
      return res.status(404).json({ message: 'Bayram topilmadi' });
    }

    res.json(holiday);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/holidays/:id
// @desc    Delete a holiday (soft delete)
// @access  Private/Admin
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!holiday) {
      return res.status(404).json({ message: 'Bayram topilmadi' });
    }

    res.json({ message: 'Bayram o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
