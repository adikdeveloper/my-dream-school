/**
 * REPORTS MODULE - Controller
 * ============================
 * Statistika va hisobotlar uchun AI action handler'lari.
 *
 * QAMRAB OLINGAN HISOBOTLAR:
 * 1. Sinflar bo'yicha o'quvchi statistikasi
 * 2. O'qituvchi yuklamasi va statistikasi
 * 3. Eng yaxshi/yomon davomat ko'rsatuvchi sinflar
 * 4. Eng yaxshi/yomon o'quvchilar (baholar bo'yicha)
 * 5. Sinf jurnali umumlashma
 * 6. Moliyaviy hisobot oy bo'yicha
 * 7. Sinf bo'yicha to'lov holati
 */

const User       = require('../../models/users/User');
const Class      = require('../../models/academic/Class');
const Subject    = require('../../models/academic/Subject');
const Grade      = require('../../models/academic/Grade');
const Attendance = require('../../models/academic/Attendance');
const Payment    = require('../../models/financial/Payment');
const Salary     = require('../../models/financial/Salary');
const FinancialSummary = require('../../models/financial/FinancialSummary');
const { extractJsonObject, normalizeCommandText, successResponse, errorResponse } = require('../utils/responseParser');

// ─── 1. UMUMIY HISOBOT ──────────────────────────────────────────────────────
const parseGeneralReport = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(umumiy hisobot|umumiy statistika|umumiy holat|maktab holati|maktab statistikasi|общ|итог)/i.test(n)) {
    return { type: 'general_report' };
  }
  return null;
};

const handleGeneralReport = async () => {
  const [students, teachers, classes, subjects, debtors, todaySummary] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'teacher' }),
    Class.countDocuments({ isActive: true }),
    Subject.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'student', balance: { $lt: 0 } }),
    (async () => { const t = new Date(); t.setHours(0,0,0,0); return FinancialSummary.findOne({ date: { $gte: t } }); })()
  ]);
  const activeS = await User.countDocuments({ role: 'student', isActive: true });
  const activeT = await User.countDocuments({ role: 'teacher', isActive: true });

  return successResponse('general_report',
    `MAKTAB UMUMIY HISOBOTI\n` +
    `========================\n` +
    `O'quvchilar: ${students} (faol: ${activeS})\n` +
    `O'qituvchilar: ${teachers} (faol: ${activeT})\n` +
    `Sinflar: ${classes}\n` +
    `Fanlar: ${subjects}\n` +
    `Qarzdor o'quvchilar: ${debtors}\n\n` +
    (todaySummary
      ? `BUGUNGI MOLIYA:\n- Tushum: ${todaySummary.income.total.toLocaleString()} so'm\n- Xarajat: ${todaySummary.expenses.total.toLocaleString()} so'm\n- Kassa: ${todaySummary.currentBalance.total.toLocaleString()} so'm`
      : 'Bugun moliyaviy yozuv yo\'q')
  );
};

// ─── 2. SINFLAR BO'YICHA STATISTIKA ─────────────────────────────────────────
const parseClassReport = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(sinf|class|класс)/i.test(n) &&
      /(hisobot|statistika|holat|umumiy|report|статистика|отчёт)/i.test(n)) {
    return { type: 'class_report' };
  }
  return null;
};

const handleClassReport = async () => {
  const classes = await Class.find({ isActive: true })
    .populate('students', 'firstName lastName isActive balance')
    .populate('classTeacher', 'firstName lastName')
    .sort({ grade: 1, section: 1 })
    .lean();
  if (!classes.length) return successResponse('class_report_empty', "Faol sinflar topilmadi.");
  const lines = classes.map((c, i) => {
    const total = c.students?.length || 0;
    const active = (c.students || []).filter(s => s.isActive).length;
    const debt   = (c.students || []).filter(s => (s.balance || 0) < 0).length;
    const head   = c.classTeacher ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}` : 'noma\'lum';
    return `${i+1}. ${c.grade}-${c.section} | ${total} o'quvchi (faol: ${active}, qarzdor: ${debt}) | ${head}`;
  }).join('\n');
  return successResponse('class_report',
    `SINFLAR HISOBOTI (${classes.length} ta):\n${lines}`
  );
};

// ─── 3. O'QITUVCHI YUKLAMASI ────────────────────────────────────────────────
const parseTeacherLoadReport = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(o'qituvchi|oqituvchi|teacher|учитель)/i.test(n) &&
      /(yuklama|load|fanlar|nech|qancha|сколько)/i.test(n)) {
    return { type: 'teacher_load' };
  }
  return null;
};

const handleTeacherLoadReport = async () => {
  const teachers = await User.find({ role: 'teacher', isActive: true })
    .populate('subjects', 'name')
    .lean();
  if (!teachers.length) return successResponse('teacher_load_empty', "Faol o'qituvchilar yo'q.");
  const sorted = teachers.sort((a, b) => (b.subjects?.length || 0) - (a.subjects?.length || 0));
  const lines = sorted.slice(0, 20).map((t, i) => {
    const subs = t.subjects?.length || 0;
    const subList = t.subjects?.map(s => s.name).join(', ') || '';
    return `${i+1}. ${t.firstName} ${t.lastName} | ${subs} fan${subList ? ': ' + subList : ''} | ${(t.salaryPerLesson || 0).toLocaleString()} so'm/dars`;
  }).join('\n');
  return successResponse('teacher_load', `O'QITUVCHILAR YUKLAMASI:\n${lines}`);
};

// ─── 4. ENG YAXSHI/YOMON DAVOMAT ─────────────────────────────────────────────
const parseAttendanceReport = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(davomat|qatnash|attendance|посеща)/i.test(n) &&
      /(hisobot|statistika|tahlil|umumiy|eng|top|best|worst|статистика|отчёт)/i.test(n)) {
    return { type: 'attendance_report' };
  }
  return null;
};

const handleAttendanceReport = async () => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const attendance = await Attendance.find({ date: { $gte: lastMonth } }).populate('class', 'grade section').lean();
  if (!attendance.length) return successResponse('attendance_empty', "Oxirgi oyda davomat yozuvlari yo'q.");
  const byClass = {};
  attendance.forEach(a => {
    if (!a.class) return;
    const key = `${a.class.grade}-${a.class.section}`;
    if (!byClass[key]) byClass[key] = { total: 0, present: 0 };
    byClass[key].total++;
    if (['present','keldi'].includes((a.status || '').toLowerCase())) byClass[key].present++;
  });
  const arr = Object.entries(byClass).map(([cls, s]) => ({
    cls, percent: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0, total: s.total
  })).sort((a, b) => b.percent - a.percent);

  const top = arr.slice(0, 5).map((c, i) => `${i+1}. ${c.cls}: ${c.percent}% (${c.total} yozuv)`).join('\n');
  const bottom = arr.slice(-5).reverse().map((c, i) => `${i+1}. ${c.cls}: ${c.percent}% (${c.total} yozuv)`).join('\n');
  return successResponse('attendance_report',
    `DAVOMAT HISOBOTI (oxirgi oy):\n` +
    `\nEng yuqori davomat:\n${top}\n` +
    (arr.length > 5 ? `\nEng past davomat:\n${bottom}` : '')
  );
};

// ─── 5. ENG YAXSHI O'QUVCHILAR (BAHOLAR) ────────────────────────────────────
const parseTopStudents = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(eng yaxshi|top|best|rank|reyting|чемпион|лучшие)/i.test(n) &&
      /(o'quvchi|oquvchi|student|talaba)/i.test(n)) {
    return { type: 'top_students' };
  }
  return null;
};

const handleTopStudents = async () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const grades = await Grade.find({ date: { $gte: start } }).populate('student', 'firstName lastName').lean();
  if (!grades.length) return successResponse('top_students_empty', "Bu oyda baholar yo'q.");
  const byStudent = {};
  grades.forEach(g => {
    if (!g.student) return;
    const id = g.student._id.toString();
    if (!byStudent[id]) byStudent[id] = { name: `${g.student.firstName} ${g.student.lastName}`, total: 0, count: 0 };
    byStudent[id].total += g.score || 0;
    byStudent[id].count++;
  });
  const arr = Object.values(byStudent).map(s => ({ ...s, avg: s.count > 0 ? (s.total / s.count).toFixed(2) : 0 }))
    .sort((a, b) => b.avg - a.avg).slice(0, 10);
  const lines = arr.map((s, i) => `${i+1}. ${s.name} | ${s.count} baho | o'rtacha: ${s.avg}`).join('\n');
  return successResponse('top_students', `ENG YAXSHI O'QUVCHILAR (joriy oy):\n${lines}`);
};

// ─── 6. OY BO'YICHA MOLIYAVIY HISOBOT ───────────────────────────────────────
const parseMonthlyFinanceReport = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(moliya|moliyaviy|finance|finansial|финанс)/i.test(n) &&
      /(hisobot|statistika|oy|month|umumiy|umumlashma|report|отчёт|статист)/i.test(n)) {
    return { type: 'monthly_finance' };
  }
  return null;
};

const handleMonthlyFinanceReport = async (model, msg) => {
  const prompt = `Moliyaviy oy hisoboti.\nSo'rov: "${msg}"\nJSON: {"month":"YYYY-MM (masalan 2026-05)"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { /* default */ }
  const now = new Date();
  const monthStr = p?.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [y, m] = monthStr.split('-').map(Number);
  const startDate = new Date(y, m - 1, 1);
  const endDate   = new Date(y, m, 0, 23, 59, 59);

  const payments = await Payment.find({
    isDeleted: { $ne: true },
    paymentDate: { $gte: startDate, $lte: endDate },
    status: 'completed'
  });

  const summaries = await FinancialSummary.find({ date: { $gte: startDate, $lte: endDate } }).lean();

  const totalIncome   = payments.reduce((sum, p) => sum + (p.actualPayment || p.amount || 0), 0);
  const totalExpenses = summaries.reduce((sum, s) => sum + (s.expenses?.total || 0), 0);
  const totalSalaries = summaries.reduce((sum, s) => sum + (s.expenses?.salaries || 0), 0);

  const byType = { cash: 0, card: 0, bank_transfer: 0 };
  payments.forEach(p => {
    const t = p.paymentType || 'cash';
    byType[t] = (byType[t] || 0) + (p.actualPayment || p.amount || 0);
  });

  return successResponse('monthly_finance',
    `MOLIYAVIY HISOBOT — ${monthStr}\n` +
    `==================================\n` +
    `Jami tushum: ${totalIncome.toLocaleString()} so'm\n` +
    `- Naqd:           ${byType.cash.toLocaleString()} so'm\n` +
    `- Karta:          ${byType.card.toLocaleString()} so'm\n` +
    `- Bank o'tkazma:  ${byType.bank_transfer.toLocaleString()} so'm\n` +
    `\nJami xarajat: ${totalExpenses.toLocaleString()} so'm\n` +
    `- Maoshlar: ${totalSalaries.toLocaleString()} so'm\n` +
    `- Boshqa:   ${(totalExpenses - totalSalaries).toLocaleString()} so'm\n` +
    `\nSof: ${(totalIncome - totalExpenses).toLocaleString()} so'm\n` +
    `To'lovlar soni: ${payments.length} ta`
  );
};

// ─── 7. SINF BO'YICHA TO'LOV ────────────────────────────────────────────────
const parseClassPaymentReport = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(sinf|class)/i.test(n) && /(to'lov|tolov|payment|qarz|debt)/i.test(n)) {
    return { type: 'class_payment_report' };
  }
  return null;
};

const handleClassPaymentReport = async (model, msg) => {
  const prompt = `Sinf to'lov hisoboti.\nSo'rov: "${msg}"\nJSON: {"className":"5-A"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { /* skip */ }
  if (!p?.className) return errorResponse('class_pay_fail', "Sinf nomini ko'rsating (masalan: 5-A).");
  const m = String(p.className).match(/(\d+)\s*[-\s]?\s*([A-Za-z])/);
  if (!m) return errorResponse('class_pay_format', "Sinf formati noto'g'ri.");
  const cls = await Class.findOne({ grade: Number(m[1]), section: m[2].toUpperCase(), isActive: true })
    .populate('students', 'firstName lastName balance monthlyFee studentId');
  if (!cls) return errorResponse('class_pay_notfound', `${m[1]}-${m[2]} sinfi topilmadi.`);
  if (!cls.students.length) return successResponse('class_pay_empty', `${cls.grade}-${cls.section} sinfida o'quvchilar yo'q.`);

  let totalDebt = 0;
  let totalExcess = 0;
  const lines = cls.students.map((s, i) => {
    const bal = s.balance || 0;
    if (bal < 0) totalDebt += Math.abs(bal);
    if (bal > 0) totalExcess += bal;
    const status = bal < 0 ? `qarz: ${Math.abs(bal).toLocaleString()}` :
                   bal > 0 ? `ortiqcha: ${bal.toLocaleString()}` :
                   'to\'liq';
    return `${i+1}. ${s.firstName} ${s.lastName} | oylik: ${(s.monthlyFee || 0).toLocaleString()} | ${status}`;
  }).join('\n');
  return successResponse('class_payment_report',
    `${cls.grade}-${cls.section} sinfi to'lov holati:\n${lines}\n\n` +
    `JAMI QARZ: ${totalDebt.toLocaleString()} so'm\nJAMI ORTIQCHA: ${totalExcess.toLocaleString()} so'm`
  );
};

// ─── 8. O'QITUVCHI MAOSH HISOBOTI ───────────────────────────────────────────
const parseTeacherSalaryReport = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(o'qituvchi|oqituvchi|teacher)/i.test(n) &&
      /(maosh|maoshi|salary|зарплата)/i.test(n) &&
      /(hisobot|umumiy|hammasi|statistika|all|общий|статистика)/i.test(n)) {
    return { type: 'teacher_salary_report' };
  }
  return null;
};

const handleTeacherSalaryReport = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const salaries = await Salary.find({ year, month }).populate('teacher', 'firstName lastName').lean();
  if (!salaries.length) return successResponse('teacher_salary_report_empty', `${month}/${year} oyi uchun maosh ma'lumotlari yo'q.`);
  const sorted = salaries.sort((a, b) => (b.netSalary || 0) - (a.netSalary || 0));
  const lines = sorted.map((s, i) => {
    const name = s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : 'noma\'lum';
    return `${i+1}. ${name} | darslar: ${s.totalLessonsTaught} | sof: ${(s.netSalary || 0).toLocaleString()} so'm | ${s.paymentStatus === 'paid' ? '✓' : '✗'}`;
  }).join('\n');
  const totalNet = salaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);
  const paidCount = salaries.filter(s => s.paymentStatus === 'paid').length;
  return successResponse('teacher_salary_report',
    `O'QITUVCHILAR MAOSH HISOBOTI — ${month}/${year}\n${lines}\n\n` +
    `Jami: ${totalNet.toLocaleString()} so'm | To'langan: ${paidCount}/${salaries.length}`
  );
};

// ─── ASOSIY DISPATCHER ────────────────────────────────────────────────────────
exports.tryHandleAction = async (message, model) => {
  if (parseGeneralReport(message))          return handleGeneralReport();
  if (parseTeacherSalaryReport(message))    return handleTeacherSalaryReport();
  if (parseClassPaymentReport(message))     return handleClassPaymentReport(model, message);
  if (parseMonthlyFinanceReport(message))   return handleMonthlyFinanceReport(model, message);
  if (parseTopStudents(message))            return handleTopStudents();
  if (parseAttendanceReport(message))       return handleAttendanceReport();
  if (parseTeacherLoadReport(message))      return handleTeacherLoadReport();
  if (parseClassReport(message))            return handleClassReport();
  return null;
};
