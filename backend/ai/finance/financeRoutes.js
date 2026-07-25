/**
 * FINANCE MODULE - Routes
 * =======================
 * Moliya bo'limi AI endpoint'lari.
 *
 * ENDPOINT'LAR:
 * GET /api/ai/finance/summary → Moliyaviy holat umumiy ko'rinishi
 * GET /api/ai/finance/debtors → Qarzdorlar ro'yxati
 */

const express = require('express');
const router  = express.Router();
const { auth, authorize } = require('../../middleware/auth');
const { buildFinanceContext } = require('../utils/contextBuilder');

// Moliyaviy statistika
router.get('/summary', auth, authorize('admin'), async (req, res) => {
  try {
    const ctx = await buildFinanceContext();
    res.json({
      totalPayments:   ctx.payments.length,
      totalIncome:     ctx.totalIncome,
      totalExpenses:   ctx.totalExpenses,
      currentBalance:  ctx.currentBalance,
      debtorCount:     ctx.debtors.length,
      totalDebt:       ctx.debtors.reduce((sum, d) => sum + Math.abs(d.balance || 0), 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Qarzdorlar ro'yxati
router.get('/debtors', auth, authorize('admin'), async (req, res) => {
  try {
    const ctx = await buildFinanceContext();
    res.json({ debtors: ctx.debtors });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
