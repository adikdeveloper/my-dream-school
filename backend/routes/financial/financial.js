const express = require('express');
const router = express.Router();
const FinancialSummary = require('../../models/financial/FinancialSummary');
const Payment = require('../../models/financial/Payment');
const StudentFee = require('../../models/financial/StudentFee');
const User = require('../../models/users/User');
const { auth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');

// Get current financial summary (kassa holati)
router.get('/current-balance', auth, requirePermission('report.view_financial'), async (req, res) => {
  try {

    // Get latest summary or create new one
    let summary = await FinancialSummary.findOne().sort({ date: -1 });

    if (!summary) {
      // Calculate from all payments
      const cashPayments = await Payment.aggregate([
        { $match: { status: 'completed', paymentType: 'cash' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const cardPayments = await Payment.aggregate([
        { $match: { status: 'completed', paymentType: 'card' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const bankPayments = await Payment.aggregate([
        { $match: { status: 'completed', paymentType: 'bank_transfer' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const cashTotal = cashPayments[0]?.total || 0;
      const cardTotal = cardPayments[0]?.total || 0;
      const bankTotal = bankPayments[0]?.total || 0;

      summary = new FinancialSummary({
        date: new Date(),
        income: {
          cash: cashTotal,
          card: cardTotal,
          bankTransfer: bankTotal,
          total: cashTotal + cardTotal + bankTotal
        },
        currentBalance: {
          cash: cashTotal,
          card: cardTotal,
          bankTransfer: bankTotal,
          total: cashTotal + cardTotal + bankTotal
        },
        createdBy: req.user._id
      });

      await summary.save();
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get financial summary by date range
router.get('/summary', auth, requirePermission('report.view_financial'), async (req, res) => {
  try {

    const { startDate, endDate } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const summaries = await FinancialSummary.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 });

    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get daily report
router.get('/daily-report', auth, requirePermission('report.view_financial'), async (req, res) => {
  try {

    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get payments for the day
    const payments = await Payment.find({
      paymentDate: {
        $gte: targetDate,
        $lt: nextDay
      },
      status: 'completed'
    }).populate('studentId', 'firstName lastName studentId');

    // Calculate totals
    const totals = await Payment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: targetDate,
            $lt: nextDay
          },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalsByType = {
      cash: 0,
      card: 0,
      bank_transfer: 0,
      total: 0
    };

    totals.forEach(t => {
      totalsByType[t._id] = t.total;
      totalsByType.total += t.total;
    });

    res.json({
      date: targetDate,
      payments,
      totals: totalsByType,
      paymentCount: payments.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get monthly income report
router.get('/monthly-income', auth, requirePermission('report.view_financial'), async (req, res) => {
  try {

    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const monthlyIncome = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: {
            $gte: new Date(`${targetYear}-01-01`),
            $lte: new Date(`${targetYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$paymentDate' },
            type: '$paymentType'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.month': 1 }
      }
    ]);

    // Format data by month
    const formattedData = [];
    for (let month = 1; month <= 12; month++) {
      const monthData = {
        month,
        cash: 0,
        card: 0,
        bank_transfer: 0,
        total: 0
      };

      monthlyIncome.forEach(item => {
        if (item._id.month === month) {
          monthData[item._id.type] = item.total;
          monthData.total += item.total;
        }
      });

      formattedData.push(monthData);
    }

    res.json({
      year: targetYear,
      monthlyIncome: formattedData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students with debt
router.get('/students-with-debt', auth, requirePermission('report.view_financial'), async (req, res) => {
  try {

    // Get all active students with fees
    const studentFees = await StudentFee.find({ isActive: true })
      .populate('studentId', 'firstName lastName studentId phone classId');

    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const studentsWithDebt = [];

    for (const fee of studentFees) {
      if (!fee.studentId) continue;

      // Check payment for current month
      const payment = await Payment.findOne({
        studentId: fee.studentId._id,
        paymentMonth: currentMonth,
        status: 'completed'
      });

      const paid = payment ? payment.amount : 0;
      const required = fee.finalMonthlyFee;
      const debt = required - paid;

      if (debt > 0) {
        studentsWithDebt.push({
          student: fee.studentId,
          monthlyFee: required,
          paidAmount: paid,
          debtAmount: debt,
          month: currentMonth
        });
      }
    }

    res.json({
      month: currentMonth,
      totalStudentsWithDebt: studentsWithDebt.length,
      students: studentsWithDebt,
      totalDebtAmount: studentsWithDebt.reduce((sum, s) => sum + s.debtAmount, 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update financial summary manually
router.post('/update-summary', auth, async (req, res) => {
  try {
    if (((req.user.role !== 'admin' && req.user.role !== 'director' && req.user.role !== 'accountant'))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { date, income, expenses, currentBalance, notes } = req.body;

    const summary = new FinancialSummary({
      date: date || new Date(),
      income,
      expenses,
      currentBalance,
      notes,
      createdBy: req.user._id
    });

    await summary.save();
    res.status(201).json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get detailed monthly transactions
router.get('/monthly-details/:year/:month', auth, requirePermission('report.view_financial'), async (req, res) => {
  try {

    const { year, month } = req.params;
    const targetYear = parseInt(year);
    const targetMonth = parseInt(month);

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Get all payments for this month
    const payments = await Payment.find({
      status: 'completed',
      paymentDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .populate('studentId', 'firstName lastName studentId phone profileImage classId')
      .populate({
        path: 'studentId',
        populate: {
          path: 'classId',
          select: 'className'
        }
      })
      .sort({ paymentDate: -1 });

    // Get daily breakdown
    const dailyBreakdown = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: '$paymentDate' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get payment type breakdown
    const paymentTypeBreakdown = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get class breakdown
    const classBreakdown = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'student.classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $unwind: { path: '$class', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: {
            classId: '$student.classId',
            className: '$class.className'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Calculate totals
    const totals = {
      cash: 0,
      card: 0,
      bank_transfer: 0,
      total: 0,
      paymentCount: payments.length
    };

    paymentTypeBreakdown.forEach(item => {
      totals[item._id] = item.total;
      totals.total += item.total;
    });

    // Get previous month comparison
    const prevStartDate = new Date(targetYear, targetMonth - 2, 1);
    const prevEndDate = new Date(targetYear, targetMonth - 1, 0, 23, 59, 59, 999);

    const prevMonthTotal = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paymentDate: {
            $gte: prevStartDate,
            $lte: prevEndDate
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const previousMonthData = prevMonthTotal[0] || { total: 0, count: 0 };
    const growthPercentage = previousMonthData.total > 0
      ? ((totals.total - previousMonthData.total) / previousMonthData.total * 100).toFixed(1)
      : 0;

    res.json({
      year: targetYear,
      month: targetMonth,
      payments,
      dailyBreakdown,
      paymentTypeBreakdown,
      classBreakdown,
      totals,
      comparison: {
        previousMonth: previousMonthData.total,
        previousCount: previousMonthData.count,
        growthPercentage: parseFloat(growthPercentage)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

