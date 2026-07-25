const express = require('express');
const router = express.Router();
const Payment = require('../../models/financial/Payment');
const StudentFee = require('../../models/financial/StudentFee');
const User = require('../../models/users/User');
const { auth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');
const FinancialSummary = require('../../models/financial/FinancialSummary');
const BalanceTransaction = require('../../models/financial/BalanceTransaction');

// Get all payments (Admin only)
router.get('/', auth, requirePermission('payment.view_all'), async (req, res) => {
  try {
    const { studentId, month, paymentType, startDate, endDate } = req.query;
    const filter = {};

    if (studentId) filter.studentId = studentId;
    if (month) filter.paymentMonth = month;
    if (paymentType) filter.paymentType = paymentType;
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('studentId', 'firstName lastName studentId phone profileImage')
      .populate('receivedBy', 'firstName lastName')
      .populate('deletedBy', 'firstName lastName')
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student's own payments
router.get('/my-payments', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payments = await Payment.find({ studentId: req.user._id, isDeleted: { $ne: true } })
      .populate('receivedBy', 'firstName lastName')
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// OPTIMIZED: Get all debtors in a single query (Admin only)
router.get('/all-debtors', auth, requirePermission('payment.view_all'), async (req, res) => {
  try {
    const startTime = Date.now();

    // Get all active students with monthlyFee > 0 and registrationDate
    const students = await User.find({
      role: 'student',
      isActive: { $ne: false },
      monthlyFee: { $gt: 0 },
      registrationDate: { $ne: null }
    })
      .populate('classId', 'grade section name')
      .select('firstName lastName studentId phone profileImage registrationDate leftDate monthlyFee classId')
      .lean();
    if (students.length === 0) {
      return res.json({ debtors: [], totalDebt: 0 });
    }

    // Get all non-deleted payments in one query
    const studentIds = students.map(s => s._id);
    const allPayments = await Payment.find({
      studentId: { $in: studentIds },
      isDeleted: { $ne: true }
    })
      .select('studentId paymentMonth amount discount')
      .lean();
    // Group payments by student and month
    const paymentsByStudent = {};
    allPayments.forEach(p => {
      const sid = p.studentId.toString();
      if (!paymentsByStudent[sid]) {
        paymentsByStudent[sid] = {};
      }
      if (!paymentsByStudent[sid][p.paymentMonth]) {
        paymentsByStudent[sid][p.paymentMonth] = 0;
      }
      paymentsByStudent[sid][p.paymentMonth] += p.amount;
    });

    // Calculate debts for each student
    const currentDate = new Date();
    currentDate.setDate(1);
    currentDate.setHours(0, 0, 0, 0);

    const debtors = [];
    let grandTotalDebt = 0;

    for (const student of students) {
      const sid = student._id.toString();
      const monthlyFee = student.monthlyFee;
      const studentPayments = paymentsByStudent[sid] || {};

      // Calculate months from enrollment to current (or leftDate)
      const startDate = new Date(student.registrationDate);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = student.leftDate ? new Date(student.leftDate) : new Date(currentDate);
      endDate.setDate(1);
      endDate.setHours(0, 0, 0, 0);

      const unpaidMonths = [];
      let totalDebt = 0;
      let iterDate = new Date(startDate);

      while (iterDate <= endDate) {
        const monthStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = iterDate.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' });

        const paidAmount = studentPayments[monthStr] || 0;
        const remainingDebt = Math.max(0, monthlyFee - paidAmount);

        if (remainingDebt > 0) {
          unpaidMonths.push({
            month: monthStr,
            monthName,
            monthlyFee,
            totalPaid: paidAmount,
            remainingDebt,
            paymentPercentage: monthlyFee > 0 ? Math.round((paidAmount / monthlyFee) * 100) : 0
          });
          totalDebt += remainingDebt;
        }

        iterDate.setMonth(iterDate.getMonth() + 1);
      }

      if (totalDebt > 0) {
        debtors.push({
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
          phone: student.phone,
          profileImage: student.profileImage,
          classId: student.classId,
          monthlyFee,
          unpaidMonths,
          totalDebt
        });
        grandTotalDebt += totalDebt;
      }
    }

    // Sort by total debt descending
    debtors.sort((a, b) => b.totalDebt - a.totalDebt);
    res.json({
      debtors,
      totalDebt: grandTotalDebt,
      totalDebtors: debtors.length
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unpaid months for a student
router.get('/unpaid-months/:studentId', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get student's enrollment date (registration date)
    const enrollmentDate = student.registrationDate || student.createdAt;
    const monthlyFee = student.monthlyFee || 0;
    if (!enrollmentDate) {
      return res.json({ unpaidMonths: [], message: 'No enrollment date found' });
    }

    if (monthlyFee === 0) {
      return res.json({
        unpaidMonths: [],
        partiallyPaidMonths: [],
        totalUnpaid: 0,
        totalPartiallyPaid: 0,
        totalDebt: 0,
        enrollmentDate,
        leftDate: student.leftDate,
        monthlyFee: 0,
        message: 'Monthly fee not set for this student'
      });
    }

    // Get all non-deleted payments for this student
    const payments = await Payment.find({
      studentId: req.params.studentId,
      isDeleted: { $ne: true }
    });

    // Create a map of payments by month
    const paymentsByMonth = new Map();
    payments.forEach(p => {
      if (!paymentsByMonth.has(p.paymentMonth)) {
        paymentsByMonth.set(p.paymentMonth, []);
      }
      paymentsByMonth.get(p.paymentMonth).push(p);
    });

    // Calculate all months from enrollment to current month
    const unpaidMonths = [];
    const partiallyPaidMonths = [];
    const startDate = new Date(enrollmentDate);
    const currentDate = new Date();

    // Set to first day of the month for proper comparison
    startDate.setDate(1);
    currentDate.setDate(1);

    // If student has left, use leftDate as end date
    const endDate = student.leftDate ? new Date(student.leftDate) : currentDate;
    endDate.setDate(1);

    let iterDate = new Date(startDate);

    while (iterDate <= endDate) {
      const monthStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = iterDate.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' });

      const monthPayments = paymentsByMonth.get(monthStr) || [];

      // Calculate total paid for this month (including discounts)
      const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalDiscount = monthPayments.reduce((sum, p) => sum + (p.discount || 0), 0);
      const totalActualPayment = monthPayments.reduce((sum, p) => sum + (p.actualPayment || 0), 0);

      const remainingDebt = Math.max(0, monthlyFee - totalPaid);

      if (remainingDebt > 0) {
        const monthData = {
          month: monthStr,
          monthName,
          monthlyFee,
          totalPaid,
          totalDiscount,
          totalActualPayment,
          remainingDebt,
          paymentPercentage: monthlyFee > 0 ? Math.round((totalPaid / monthlyFee) * 100) : 0
        };

        if (totalPaid > 0) {
          partiallyPaidMonths.push(monthData);
        } else {
          unpaidMonths.push(monthData);
        }
      }

      // Move to next month
      iterDate.setMonth(iterDate.getMonth() + 1);
    }

    res.json({
      unpaidMonths,
      partiallyPaidMonths,
      totalUnpaid: unpaidMonths.length,
      totalPartiallyPaid: partiallyPaidMonths.length,
      totalDebt: [...unpaidMonths, ...partiallyPaidMonths].reduce((sum, m) => sum + m.remainingDebt, 0),
      enrollmentDate,
      leftDate: student.leftDate,
      monthlyFee
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment statistics
router.get('/statistics', auth, requirePermission('payment.view_all'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { status: 'completed' };

    if (startDate || endDate) {
      matchStage.paymentDate = {};
      if (startDate) matchStage.paymentDate.$gte = new Date(startDate);
      if (endDate) matchStage.paymentDate.$lte = new Date(endDate);
    }

    // Total by payment type
    const totalsByType = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Total by month
    const totalsByMonth = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMonth',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 12 }
    ]);

    // Overall statistics
    const overallStats = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPayments: { $sum: 1 }
        }
      }
    ]);

    res.json({
      byType: totalsByType,
      byMonth: totalsByMonth,
      overall: overallStats[0] || { totalAmount: 0, totalPayments: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate automatic receipt number
async function generateReceiptNumber() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  // Find the last payment of the current month
  const lastPayment = await Payment.findOne({
    receiptNumber: new RegExp(`^KB-${year}${month}-`)
  }).sort({ receiptNumber: -1 });

  let sequence = 1;
  if (lastPayment && lastPayment.receiptNumber) {
    const lastNumber = parseInt(lastPayment.receiptNumber.split('-')[2]);
    sequence = lastNumber + 1;
  }

  return `KB-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

// Create new payment
router.post('/', auth, requirePermission('payment.create'), async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      studentId,
      amount,
      discount = 0,
      paymentType,
      paymentMonth,
      paymentDate,
      description,
      receiptNumber,
      transactionId,
      notes
    } = req.body;

    // Validate required fields
    if (!studentId || !amount || !paymentType || !paymentMonth) {
      return res.status(400).json({ message: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'To\'lov summasi noto\'g\'ri' });
    }

    // Validate discount
    if (discount && (isNaN(discount) || discount < 0 || discount > amount)) {
      return res.status(400).json({ message: 'Chegirma summasi noto\'g\'ri' });
    }

    // Validate student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    // Calculate actual payment (amount paid in cash/card/bank)
    const actualPayment = Math.max(0, amount - discount);

    // Generate receipt number automatically if not provided
    const autoReceiptNumber = receiptNumber || await generateReceiptNumber();

    const payment = new Payment({
      studentId,
      amount,
      discount,
      actualPayment,
      paymentType,
      paymentMonth,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      description,
      receiptNumber: autoReceiptNumber,
      transactionId,
      notes,
      receivedBy: req.user._id,
      status: 'completed'
    });

    await payment.save();

    // Update financial summary - only add actual payment (excluding discount)
    await updateFinancialSummary(paymentType, actualPayment, 'income');

    // Check if this is an excess payment (ortiqcha to'lov)
    const monthlyFee = student.monthlyFee || 0;

    // Get all payments for this month BEFORE this payment
    const previousMonthPayments = await Payment.find({
      studentId,
      paymentMonth,
      isDeleted: { $ne: true },
      _id: { $ne: payment._id } // Exclude current payment
    });

    // Calculate previous total paid for this month
    const previousTotalPaid = previousMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const previousExcess = Math.max(0, previousTotalPaid - monthlyFee);

    // Calculate new total with current payment
    const newTotalPaid = previousTotalPaid + amount;
    const newExcess = Math.max(0, newTotalPaid - monthlyFee);

    // Only the INCREMENTAL excess should be added to balance
    const incrementalExcess = newExcess - previousExcess;

    // If there's new excess payment, add it to student's balance
    if (incrementalExcess > 0 && monthlyFee > 0) {
      const previousBalance = student.balance || 0;
      student.balance = previousBalance + incrementalExcess;
      await student.save();

      // Create balance transaction record for the incremental excess
      const balanceTransaction = new BalanceTransaction({
        studentId,
        amount: incrementalExcess,
        balanceBefore: previousBalance,
        balanceAfter: student.balance,
        transactionType: 'excess_payment',
        relatedPaymentId: payment._id,
        usedForMonth: paymentMonth,
        notes: `${paymentMonth} oyi uchun ortiqcha to'lov hisobga qo'shildi`,
        createdBy: req.user._id
      });
      await balanceTransaction.save();
    }

    const excessAmount = incrementalExcess;

    const populatedPayment = await Payment.findById(payment._id)
      .populate('studentId', 'firstName lastName studentId phone')
      .populate('receivedBy', 'firstName lastName');

    res.status(201).json({
      payment: populatedPayment,
      excessAmount: excessAmount > 0 ? excessAmount : 0,
      newBalance: student.balance,
      message: excessAmount > 0 ? 'To\'lov qabul qilindi. Ortiqcha to\'lov hisobga qo\'shildi.' : 'To\'lov qabul qilindi'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update payment
router.put('/:id', auth, requirePermission('payment.edit'), async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const oldActualPayment = payment.actualPayment;
    const oldType = payment.paymentType;

    // Update payment fields
    Object.assign(payment, req.body);

    // Recalculate actual payment
    payment.actualPayment = Math.max(0, payment.amount - (payment.discount || 0));

    await payment.save();

    // Update financial summary if actual payment or type changed
    if (oldActualPayment !== payment.actualPayment || oldType !== payment.paymentType) {
      await updateFinancialSummary(oldType, -oldActualPayment, 'income'); // Remove old
      await updateFinancialSummary(payment.paymentType, payment.actualPayment, 'income'); // Add new
    }

    const updatedPayment = await Payment.findById(payment._id)
      .populate('studentId', 'firstName lastName studentId phone')
      .populate('receivedBy', 'firstName lastName');

    res.json(updatedPayment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete payment (Soft delete)
router.delete('/:id', auth, requirePermission('payment.delete'), async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if already deleted
    if (payment.isDeleted) {
      return res.status(400).json({ message: 'Payment already deleted' });
    }

    // Get student
    const student = await User.findById(payment.studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Soft delete - mark as deleted instead of removing from database
    payment.isDeleted = true;
    payment.deletedAt = new Date();
    payment.deletedBy = req.user._id;
    await payment.save();

    // Update financial summary - subtract actual payment (not discount)
    await updateFinancialSummary(payment.paymentType, -payment.actualPayment, 'income');

    // CRITICAL: Recalculate student's balance after payment deletion
    await recalculateStudentBalance(payment.studentId, payment.paymentMonth, req.user._id);

    const updatedPayment = await Payment.findById(payment._id)
      .populate('studentId', 'firstName lastName studentId phone')
      .populate('receivedBy', 'firstName lastName')
      .populate('deletedBy', 'firstName lastName');

    // Get updated student balance
    const updatedStudent = await User.findById(payment.studentId);

    res.json({
      message: 'Payment deleted successfully',
      payment: updatedPayment,
      newBalance: updatedStudent.balance,
      balanceWarning: updatedStudent.balance < 0 ? 'Hisob muzlatildi! Iltimos hisobni to\'ldiring.' : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to recalculate student balance after payment deletion
async function recalculateStudentBalance(studentId, affectedMonth, adminId) {
  try {
    // Get student
    const student = await User.findById(studentId);
    if (!student) {
      return;
    }

    const monthlyFee = student.monthlyFee || 0;
    // Get all non-deleted payments for this student
    const allPayments = await Payment.find({
      studentId,
      isDeleted: { $ne: true }
    }).sort({ paymentDate: 1 });
    // Group payments by month
    const paymentsByMonth = new Map();
    allPayments.forEach(p => {
      if (!paymentsByMonth.has(p.paymentMonth)) {
        paymentsByMonth.set(p.paymentMonth, []);
      }
      paymentsByMonth.get(p.paymentMonth).push(p);
    });

    // IMPORTANT: Get balance usage transactions BEFORE deactivating
    const balanceUsages = await BalanceTransaction.find({
      studentId,
      transactionType: { $in: ['use_for_payment', 'transfer_to_next', 'refund', 'use_for_other'] },
      isActive: true
    }).sort({ createdAt: 1 });
    // Deactivate only excess_payment transactions (not usage transactions)
    await BalanceTransaction.updateMany(
      {
        studentId,
        transactionType: 'excess_payment',
        isActive: true
      },
      { isActive: false }
    );

    // Calculate new balance from payments
    let newBalance = 0;
    const months = Array.from(paymentsByMonth.keys()).sort();
    for (const month of months) {
      const monthPayments = paymentsByMonth.get(month);
      const totalPaidForMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      // If payment exceeds monthly fee, add to balance
      if (totalPaidForMonth > monthlyFee && monthlyFee > 0) {
        const excessAmount = totalPaidForMonth - monthlyFee;
        newBalance += excessAmount;
        // Create new balance transaction for excess
        const balanceTransaction = new BalanceTransaction({
          studentId,
          amount: excessAmount,
          balanceBefore: newBalance - excessAmount,
          balanceAfter: newBalance,
          transactionType: 'excess_payment',
          relatedPaymentId: monthPayments[monthPayments.length - 1]._id,
          usedForMonth: month,
          notes: `${month} oyi uchun ortiqcha to'lov (qayta hisoblangan)`,
          createdBy: adminId
        });
        await balanceTransaction.save();
      }
    }
    // Apply all balance usage transactions to get final balance
    for (const usage of balanceUsages) {
      newBalance += usage.amount; // amount is negative for usage
    }

    // Update student balance
    const oldBalance = student.balance;
    student.balance = newBalance;
    await student.save();
  } catch (error) {
    throw error;
  }
}

// Helper function to update financial summary
async function updateFinancialSummary(paymentType, amount, type = 'income') {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let summary = await FinancialSummary.findOne({
      date: { $gte: today }
    });

    if (!summary) {
      summary = new FinancialSummary({ date: today });
    }

    if (type === 'income') {
      if (paymentType === 'cash') {
        summary.income.cash += amount;
        summary.currentBalance.cash += amount;
      } else if (paymentType === 'card') {
        summary.income.card += amount;
        summary.currentBalance.card += amount;
      } else if (paymentType === 'bank_transfer') {
        summary.income.bankTransfer += amount;
        summary.currentBalance.bankTransfer += amount;
      }
      summary.income.total += amount;
      summary.currentBalance.total += amount;
    }

    await summary.save();
  } catch (error) {
  }
}

module.exports = router;

