const Salary = require('../models/financial/Salary');

const RATE_BASED_TRANSACTION_TYPES = new Set([
  'lesson_taught',
  'lesson_covered',
  'lesson_missed'
]);

const syncOpenSalaryRecords = async (teacherId, salaryPerLesson) => {
  const salaryRate = Number(salaryPerLesson);
  if (!Number.isFinite(salaryRate) || salaryRate < 0) {
    throw new Error("Maosh miqdori musbat son bo'lishi kerak");
  }

  const salaries = await Salary.find({
    teacher: teacherId,
    paymentStatus: { $ne: 'paid' }
  });

  for (const salary of salaries) {
    salary.baseSalaryPerLesson = salaryRate;

    for (const transaction of salary.transactions || []) {
      if (!RATE_BASED_TRANSACTION_TYPES.has(transaction.type)) continue;
      transaction.amount = transaction.type === 'lesson_missed' ? -salaryRate : salaryRate;
    }

    salary.calculateNetSalary();
    await salary.save();
  }

  return salaries.length;
};

module.exports = {
  syncOpenSalaryRecords
};
