const express = require('express');
const router = express.Router();
const BalanceTransaction = require('../../models/financial/BalanceTransaction');
const User = require('../../models/users/User');
const Payment = require('../../models/financial/Payment');
const FinancialSummary = require('../../models/financial/FinancialSummary');
const { auth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');

// Get student's balance and transaction history
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant')) && req.user._id.toString() !== req.params.studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    // Get all active balance transactions
    const transactions = await BalanceTransaction.find({
      studentId: req.params.studentId,
      isActive: true
    })
      .populate('createdBy', 'firstName lastName')
      .populate('relatedPaymentId', 'amount paymentMonth receiptNumber')
      .sort({ createdAt: -1 });

    res.json({
      currentBalance: student.balance || 0,
      transactions,
      studentName: `${student.firstName} ${student.lastName}`,
      studentId: student.studentId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Use balance for monthly payment
router.post('/use-for-payment', auth, requirePermission('balance.manage_student'), async (req, res) => {
  try {

    const { studentId, amount, paymentMonth, notes } = req.body;

    // Validate input
    if (!studentId || !amount || !paymentMonth) {
      return res.status(400).json({ message: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Summa noto\'g\'ri' });
    }

    // Get student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    // Check if student has enough balance
    if (student.balance < amount) {
      return res.status(400).json({
        message: 'O\'quvchining hisobida yetarli mablag\' yo\'q',
        currentBalance: student.balance,
        requestedAmount: amount
      });
    }

    // Create payment from balance
    const payment = new Payment({
      studentId,
      amount,
      discount: 0,
      actualPayment: 0, // Balance dan foydalanilgani uchun haqiqiy to'lov 0
      paymentType: 'cash', // Default type
      paymentMonth,
      description: `Hisobdagi mablag'dan to'landi`,
      notes: notes || 'Hisobdagi mablag\'dan foydalanildi',
      receivedBy: req.user._id,
      status: 'completed'
    });

    await payment.save();

    // Create balance transaction
    const balanceTransaction = new BalanceTransaction({
      studentId,
      amount: -amount,
      balanceBefore: student.balance,
      balanceAfter: student.balance - amount,
      transactionType: 'use_for_payment',
      relatedPaymentId: payment._id,
      usedForMonth: paymentMonth,
      notes,
      createdBy: req.user._id
    });

    // Update student balance
    student.balance -= amount;
    await student.save();
    await balanceTransaction.save();

    const populatedTransaction = await BalanceTransaction.findById(balanceTransaction._id)
      .populate('createdBy', 'firstName lastName')
      .populate('relatedPaymentId', 'amount paymentMonth receiptNumber');

    res.json({
      message: 'To\'lov muvaffaqiyatli amalga oshirildi',
      transaction: populatedTransaction,
      newBalance: student.balance,
      payment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Use balance for other purposes (requires mandatory description)
router.post('/use-for-other', auth, requirePermission('balance.manage_student'), async (req, res) => {
  try {

    const { studentId, amount, description, notes } = req.body;

    // Validate input
    if (!studentId || !amount || !description) {
      return res.status(400).json({
        message: 'Barcha majburiy maydonlarni to\'ldiring',
        required: ['studentId', 'amount', 'description']
      });
    }

    if (!description || description.trim().length < 5) {
      return res.status(400).json({
        message: 'Boshqa to\'lovga ishlatish uchun izoh majburiy (kamida 5 belgi)'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Summa noto\'g\'ri' });
    }

    // Get student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    // Check if student has enough balance
    if (student.balance < amount) {
      return res.status(400).json({
        message: 'O\'quvchining hisobida yetarli mablag\' yo\'q',
        currentBalance: student.balance,
        requestedAmount: amount
      });
    }

    // Create balance transaction
    const balanceTransaction = new BalanceTransaction({
      studentId,
      amount: -amount,
      balanceBefore: student.balance,
      balanceAfter: student.balance - amount,
      transactionType: 'use_for_other',
      description,
      notes,
      createdBy: req.user._id
    });

    // Update student balance
    student.balance -= amount;
    await student.save();
    await balanceTransaction.save();

    const populatedTransaction = await BalanceTransaction.findById(balanceTransaction._id)
      .populate('createdBy', 'firstName lastName');

    res.json({
      message: 'Operatsiya muvaffaqiyatli amalga oshirildi',
      transaction: populatedTransaction,
      newBalance: student.balance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Transfer balance to next month
router.post('/transfer-to-next', auth, requirePermission('balance.manage_student'), async (req, res) => {
  try {

    const { studentId, amount, targetMonth, notes } = req.body;

    // Validate input
    if (!studentId || !amount || !targetMonth) {
      return res.status(400).json({ message: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Summa noto\'g\'ri' });
    }

    // Get student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    // Check if student has enough balance
    if (student.balance < amount) {
      return res.status(400).json({
        message: 'O\'quvchining hisobida yetarli mablag\' yo\'q',
        currentBalance: student.balance,
        requestedAmount: amount
      });
    }

    // Create payment for target month
    const payment = new Payment({
      studentId,
      amount,
      discount: 0,
      actualPayment: 0,
      paymentType: 'cash',
      paymentMonth: targetMonth,
      description: `Hisobdan ${targetMonth} oyiga o'tkazildi`,
      notes: notes || 'Hisobdagi mablag\'dan keyingi oyga o\'tkazildi',
      receivedBy: req.user._id,
      status: 'completed'
    });

    await payment.save();

    // Create balance transaction
    const balanceTransaction = new BalanceTransaction({
      studentId,
      amount: -amount,
      balanceBefore: student.balance,
      balanceAfter: student.balance - amount,
      transactionType: 'transfer_to_next',
      relatedPaymentId: payment._id,
      usedForMonth: targetMonth,
      notes,
      createdBy: req.user._id
    });

    // Update student balance
    student.balance -= amount;
    await student.save();
    await balanceTransaction.save();

    const populatedTransaction = await BalanceTransaction.findById(balanceTransaction._id)
      .populate('createdBy', 'firstName lastName')
      .populate('relatedPaymentId', 'amount paymentMonth receiptNumber');

    res.json({
      message: `Mablag' ${targetMonth} oyiga o'tkazildi`,
      transaction: populatedTransaction,
      newBalance: student.balance,
      payment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Refund balance to student
router.post('/refund', auth, requirePermission('balance.manage_student'), async (req, res) => {
  try {

    const { studentId, amount, notes } = req.body;

    // Validate input
    if (!studentId || !amount) {
      return res.status(400).json({ message: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Summa noto\'g\'ri' });
    }

    // Get student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    // Check if student has enough balance
    if (student.balance < amount) {
      return res.status(400).json({
        message: 'O\'quvchining hisobida yetarli mablag\' yo\'q',
        currentBalance: student.balance,
        requestedAmount: amount
      });
    }

    // Create balance transaction
    const balanceTransaction = new BalanceTransaction({
      studentId,
      amount: -amount,
      balanceBefore: student.balance,
      balanceAfter: student.balance - amount,
      transactionType: 'refund',
      notes: notes || 'Mablag\' qaytarildi',
      createdBy: req.user._id
    });

    // Update student balance
    student.balance -= amount;
    await student.save();
    await balanceTransaction.save();

    const populatedTransaction = await BalanceTransaction.findById(balanceTransaction._id)
      .populate('createdBy', 'firstName lastName');

    res.json({
      message: 'Mablag\' qaytarildi',
      transaction: populatedTransaction,
      newBalance: student.balance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add balance to student account (Admin only)
router.post('/add', auth, requirePermission('balance.manage_student'), async (req, res) => {
  try {

    const { studentId, amount, notes } = req.body;

    // Validate input
    if (!studentId || !amount) {
      return res.status(400).json({ message: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Summa noto\'g\'ri' });
    }

    // Get student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    const previousBalance = student.balance || 0;

    // Create balance transaction
    const balanceTransaction = new BalanceTransaction({
      studentId,
      amount: amount,
      balanceBefore: previousBalance,
      balanceAfter: previousBalance + amount,
      transactionType: 'excess_payment',
      description: 'Hisobga qo\'shildi',
      notes: notes || 'Admin tomonidan hisobga qo\'shildi',
      createdBy: req.user._id
    });

    // Update student balance
    student.balance = previousBalance + amount;
    await student.save();
    await balanceTransaction.save();

    const populatedTransaction = await BalanceTransaction.findById(balanceTransaction._id)
      .populate('createdBy', 'firstName lastName');

    res.json({
      message: 'Mablag\' muvaffaqiyatli qo\'shildi',
      transaction: populatedTransaction,
      newBalance: student.balance,
      previousBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get balance statistics for all students (Admin only)
router.get('/statistics', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all students with balance > 0
    const studentsWithBalance = await User.find({
      role: 'student',
      balance: { $gt: 0 }
    }).select('firstName lastName studentId balance phone');

    // Calculate total balance
    const totalBalance = studentsWithBalance.reduce((sum, student) => sum + student.balance, 0);

    // Get recent transactions
    const recentTransactions = await BalanceTransaction.find({ isActive: true })
      .populate('studentId', 'firstName lastName studentId')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      studentsWithBalance,
      totalStudents: studentsWithBalance.length,
      totalBalance,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students with negative balance (frozen accounts)
router.get('/frozen-accounts', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all students with balance < 0
    const frozenStudents = await User.find({
      role: 'student',
      balance: { $lt: 0 },
      status: 'active'
    })
      .select('firstName lastName studentId balance phone classId')
      .populate('classId', 'name')
      .sort({ balance: 1 }) // Most negative first
      .limit(50);

    const totalFrozen = frozenStudents.length;
    const totalNegativeBalance = frozenStudents.reduce((sum, student) => sum + student.balance, 0);

    res.json({
      frozenStudents,
      totalFrozen,
      totalNegativeBalance,
      warning: totalFrozen > 0 ? `${totalFrozen} ta o'quvchining hisobi muzlatilgan!` : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Pay fine from student balance (Fine goes to school cash flow)
router.post('/pay-fine', auth, requirePermission('balance.manage_student'), async (req, res) => {
  try {

    const { studentId, amount, reason, paymentType = 'cash', notes } = req.body;

    // Validate input
    if (!studentId || !amount || !reason) {
      return res.status(400).json({
        message: 'Barcha majburiy maydonlarni to\'ldiring',
        required: ['studentId', 'amount', 'reason']
      });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        message: 'Jarima sababi majburiy (kamida 5 belgi)'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Summa noto\'g\'ri' });
    }

    // Get student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'O\'quvchi topilmadi' });
    }

    // Check if student has enough balance
    if (student.balance < amount) {
      return res.status(400).json({
        message: 'O\'quvchining hisobida yetarli mablag\' yo\'q',
        currentBalance: student.balance,
        requestedAmount: amount
      });
    }

    // Create balance transaction for fine
    const balanceTransaction = new BalanceTransaction({
      studentId,
      amount: -amount,
      balanceBefore: student.balance,
      balanceAfter: student.balance - amount,
      transactionType: 'fine',
      description: reason,
      notes,
      createdBy: req.user._id
    });

    // Update student balance
    student.balance -= amount;
    await student.save();
    await balanceTransaction.save();

    // Add fine amount to school cash flow (FinancialSummary)
    await updateFinancialSummaryForFine(paymentType, amount);

    const populatedTransaction = await BalanceTransaction.findById(balanceTransaction._id)
      .populate('createdBy', 'firstName lastName');

    res.json({
      message: 'Jarima muvaffaqiyatli to\'landi va maktab kassasiga qo\'shildi',
      transaction: populatedTransaction,
      newBalance: student.balance,
      fineAmount: amount,
      addedToCashFlow: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to update financial summary for fines
async function updateFinancialSummaryForFine(paymentType, amount) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let summary = await FinancialSummary.findOne({
      date: { $gte: today }
    });

    if (!summary) {
      summary = new FinancialSummary({ date: today });
    }

    // Add fine as income to the appropriate payment type
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

    await summary.save();
  } catch (error) {
  }
}

module.exports = router;


