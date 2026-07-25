const express = require('express');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../../middleware/permissions');
const salaryController = require('../../controllers/salaryController');

const router = express.Router();

// @route   GET /api/salary/current
// @desc    Get current month's salary
router.get('/current', auth, authorize('teacher', 'admin', 'director', 'accountant', 'hr'), requireAnyPermission('salary.view_own', 'salary.view_all'), salaryController.getTeacherCurrentSalary);

// @route   GET /api/salary/monthly/:year/:month
router.get('/monthly/:year/:month', auth, authorize('teacher', 'admin', 'director', 'accountant', 'hr'), requireAnyPermission('salary.view_own', 'salary.view_all'), salaryController.getTeacherMonthlySalary);

// @route   PUT /api/salary/rate
router.put('/rate', auth, authorize('admin', 'director', 'accountant', 'hr'), requirePermission('salary.edit'), salaryController.updateTeacherSalaryRate);

module.exports = router;
