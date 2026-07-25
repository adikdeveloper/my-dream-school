const express = require('express');
const router = express.Router();
const StudentFee = require('../../models/financial/StudentFee');
const User = require('../../models/users/User');
const Payment = require('../../models/financial/Payment');
const { auth } = require('../../middleware/auth');

// Get all student fees
router.get('/', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fees = await StudentFee.find()
      .populate('studentId', 'firstName lastName studentId phone classId')
      .sort({ createdAt: -1 });

    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student's own fee
router.get('/my-fee', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fee = await StudentFee.findOne({ studentId: req.user._id });
    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get fee by student ID
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fee = await StudentFee.findOne({ studentId: req.params.studentId })
      .populate('studentId', 'firstName lastName studentId phone');

    if (!fee) {
      return res.status(404).json({ message: 'Student fee not found' });
    }

    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment status for a student
router.get('/payment-status/:studentId', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant')) && req.user._id.toString() !== req.params.studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fee = await StudentFee.findOne({ studentId: req.params.studentId });

    // If no fee is set, return empty data instead of 404
    if (!fee) {
      return res.json({
        studentFee: null,
        paymentStatus: [],
        message: 'Sizga hali oylik to\'lov belgilanmagan'
      });
    }

    // Get last 12 months of payments
    const currentDate = new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthStr);
    }

    const payments = await Payment.find({
      studentId: req.params.studentId,
      paymentMonth: { $in: months },
      status: 'completed'
    });

    const paymentMap = {};
    payments.forEach(payment => {
      if (!paymentMap[payment.paymentMonth]) {
        paymentMap[payment.paymentMonth] = 0;
      }
      paymentMap[payment.paymentMonth] += payment.amount;
    });

    const status = months.map(month => ({
      month,
      required: fee.finalMonthlyFee,
      paid: paymentMap[month] || 0,
      status: (paymentMap[month] || 0) >= fee.finalMonthlyFee ? 'paid' : 'unpaid'
    }));

    res.json({
      studentFee: fee,
      paymentStatus: status
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update student fee
router.post('/', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { studentId, monthlyFee, discount, discountReason, notes } = req.body;

    // Validate student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    let fee = await StudentFee.findOne({ studentId });

    if (fee) {
      // Update existing fee
      fee.monthlyFee = monthlyFee;
      fee.discount = discount || 0;
      fee.discountReason = discountReason;
      fee.notes = notes;
      await fee.save();
    } else {
      // Create new fee
      fee = new StudentFee({
        studentId,
        monthlyFee,
        discount: discount || 0,
        discountReason,
        notes
      });
      await fee.save();
    }

    const populatedFee = await StudentFee.findById(fee._id)
      .populate('studentId', 'firstName lastName studentId phone');

    res.json(populatedFee);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update student fee
router.put('/:id', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fee = await StudentFee.findById(req.params.id);
    if (!fee) {
      return res.status(404).json({ message: 'Student fee not found' });
    }

    Object.assign(fee, req.body);
    await fee.save();

    const updatedFee = await StudentFee.findById(fee._id)
      .populate('studentId', 'firstName lastName studentId phone');

    res.json(updatedFee);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete student fee
router.delete('/:id', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await StudentFee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student fee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

