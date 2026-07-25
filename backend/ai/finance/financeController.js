/**
 * FINANCE MODULE - Controller
 * ============================
 * Moliya bo'limi uchun AI action handler'lari.
 *
 * QAMRAB OLINGAN ACTION'LAR:
 * 1. O'quvchi balansi va qarz ma'lumoti
 * 2. Qarzdorlar ro'yxati va umumiy moliyaviy holat
 * 3. To'lov qabul qilish (yangi to'lov yaratish)
 * 4. Balans qo'shish (deposit) va jarima
 * 5. O'qituvchi maoshini ko'rish va to'lash
 * 6. Xarajat (expense) qayd qilish
 */

const User              = require('../../models/users/User');
const Payment           = require('../../models/financial/Payment');
const BalanceTransaction = require('../../models/financial/BalanceTransaction');
const FinancialSummary  = require('../../models/financial/FinancialSummary');
const Salary            = require('../../models/financial/Salary');
const { extractJsonObject, normalizeCommandText, successResponse, errorResponse } = require('../utils/responseParser');
const { createUzbekSearchRegex } = require('../../utils/uzbekHelper');

const uzReg = (text) => new RegExp(createUzbekSearchRegex(text), 'i');

// ─── Yordamchi: kunlik moliyaviy summarini yangilash ─────────────────────────
const updateDailySummary = async (paymentType, amount, kind = 'income') => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let summary = await FinancialSummary.findOne({ date: { $gte: today } });
  if (!summary) summary = new FinancialSummary({ date: today });

  const bucket = paymentType === 'card' ? 'card' :
                 paymentType === 'bank_transfer' ? 'bankTransfer' : 'cash';

  if (kind === 'income') {
    summary.income[bucket] += amount;
    summary.income.total   += amount;
    summary.currentBalance[bucket] += amount;
    summary.currentBalance.total   += amount;
  } else {
    summary.expenses.other += amount;
    summary.expenses.total += amount;
    summary.currentBalance[bucket] -= amount;
    summary.currentBalance.total   -= amount;
  }
  await summary.save();
};

const findStudent = async (identifier) => {
  if (!identifier) return null;
  const id = String(identifier).trim();
  const reg = uzReg(id);
  const parts = id.split(/\s+/).filter(Boolean);
  let s = await User.findOne({ role: 'student', $or: [
    { studentId: id.toUpperCase() },
    { firstName: uzReg(parts[0]), lastName: uzReg(parts[1] || '') }
  ]});
  if (!s) s = await User.findOne({ role: 'student', $or: [{ firstName: reg }, { lastName: reg }] });
  return s;
};

const findTeacher = async (identifier) => {
  if (!identifier) return null;
  const id = String(identifier).trim();
  const reg = uzReg(id);
  const parts = id.split(/\s+/).filter(Boolean);
  let t = await User.findOne({ role: 'teacher', $or: [
    { teacherId: id.toUpperCase() },
    { firstName: uzReg(parts[0]), lastName: uzReg(parts[1] || '') }
  ]});
  if (!t) t = await User.findOne({ role: 'teacher', $or: [{ firstName: reg }, { lastName: reg }] });
  return t;
};

// ─── 1. TO'LOV QABUL QILISH ──────────────────────────────────────────────────
const parseCreatePayment = (msg) => {
  const n = normalizeCommandText(msg);
  const hasPayment = /(to'lov|tolov|payment|pul olish|pul oldim|to'la|tola)/i.test(n);
  const hasCreate  = /(qabul|qo'sh|qosh|qayd|yarat|add|create|insert|оплати|оплата|приня)/i.test(n);
  const hasFor     = /(uchun|dan|for|от|за)/i.test(n);
  if (hasPayment && (hasCreate || hasFor) && !/(qancha|necha|ko'rsat|korsat|show|qarz|debt)/i.test(n)) {
    return { type: 'create_payment' };
  }
  return null;
};

const handleCreatePayment = async (model, msg, adminId) => {
  const prompt =
    `To'lov qabul qilish.\nSo'rov: "${msg}"\n` +
    `JSON: {"studentIdentifier":"ismi yoki ID","amount":"summa (faqat raqam)",` +
    `"paymentType":"cash|card|bank_transfer","paymentMonth":"YYYY-MM (masalan 2026-05)",` +
    `"discount":0,"description":null,"notes":null}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI payment parse:', e.message); }
  if (!p?.studentIdentifier || !p?.amount) {
    return errorResponse('payment_fail', "O'quvchi ismi va to'lov summasini ko'rsating. Masalan: \"Abbosdan 500000 so'm naqd to'lov qabul qil 2026-05 uchun\"");
  }

  const student = await findStudent(p.studentIdentifier);
  if (!student) return errorResponse('payment_notfound', `"${p.studentIdentifier}" o'quvchi topilmadi.`);

  const amount = Number(p.amount);
  if (!amount || amount <= 0) return errorResponse('payment_invalid', "To'lov summasi noto'g'ri.");

  const discount = Number(p.discount) || 0;
  const actualPayment = Math.max(0, amount - discount);
  const paymentType   = ['cash', 'card', 'bank_transfer'].includes(p.paymentType) ? p.paymentType : 'cash';
  const now = new Date();
  const monthStr = p.paymentMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    // Generate receipt number
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const last = await Payment.findOne({ receiptNumber: new RegExp(`^KB-${year}${month}-`) }).sort({ receiptNumber: -1 });
    const seq = last?.receiptNumber ? parseInt(last.receiptNumber.split('-')[2]) + 1 : 1;
    const receiptNumber = `KB-${year}${month}-${String(seq).padStart(4, '0')}`;

    const payment = await new Payment({
      studentId: student._id,
      amount,
      discount,
      actualPayment,
      paymentType,
      paymentMonth: monthStr,
      paymentDate: now,
      description: p.description || null,
      notes: p.notes || `AI orqali qabul qilindi`,
      receivedBy: adminId,
      receiptNumber,
      status: 'completed'
    }).save();

    await updateDailySummary(paymentType, actualPayment, 'income');

    // Handle excess
    const monthlyFee = student.monthlyFee || 0;
    const prev = await Payment.find({ studentId: student._id, paymentMonth: monthStr, isDeleted: { $ne: true }, _id: { $ne: payment._id } });
    const prevTotal = prev.reduce((sum, p) => sum + p.amount, 0);
    const prevExcess = Math.max(0, prevTotal - monthlyFee);
    const newExcess  = Math.max(0, prevTotal + amount - monthlyFee);
    const incrementalExcess = newExcess - prevExcess;
    let balanceMessage = '';
    if (incrementalExcess > 0 && monthlyFee > 0) {
      const beforeBalance = student.balance || 0;
      student.balance = beforeBalance + incrementalExcess;
      await student.save();
      await new BalanceTransaction({
        studentId: student._id,
        amount: incrementalExcess,
        balanceBefore: beforeBalance,
        balanceAfter: student.balance,
        transactionType: 'excess_payment',
        relatedPaymentId: payment._id,
        usedForMonth: monthStr,
        notes: `${monthStr} oyi uchun ortiqcha to'lov`,
        createdBy: adminId
      }).save();
      balanceMessage = `\nOrtiqcha: ${incrementalExcess.toLocaleString()} so'm balansga qo'shildi.`;
    }

    return successResponse('create_payment',
      `To'lov qabul qilindi.\n` +
      `O'quvchi: ${student.firstName} ${student.lastName}\n` +
      `Summa: ${amount.toLocaleString()} so'm${discount ? ` (chegirma: ${discount.toLocaleString()})` : ''}\n` +
      `Turi: ${paymentType === 'cash' ? 'naqd' : paymentType === 'card' ? 'karta' : 'bank o\'tkazma'}\n` +
      `Oy: ${monthStr}\nChek raqami: ${receiptNumber}${balanceMessage}`
    );
  } catch (err) {
    return errorResponse('payment_error', `To'lov saqlashda xato: ${err.message}`);
  }
};

// ─── 2. BALANS QO'SHISH ─────────────────────────────────────────────────────
const parseAddBalance = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(balans|hisob|balance|hisobiga|hisobini)/i.test(n) &&
      /(qo'sh|qosh|to'ldir|toldir|deposit|add|пополни|добавь)/i.test(n) &&
      !/(qarz|debt|jarima|fine)/i.test(n)) {
    return { type: 'add_balance' };
  }
  return null;
};

const handleAddBalance = async (model, msg, adminId) => {
  const prompt = `Balansga pul qo'shish.\nSo'rov: "${msg}"\nJSON: {"studentIdentifier":"ismi yoki ID","amount":"summa","notes":null}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI add balance parse:', e.message); }
  if (!p?.studentIdentifier || !p?.amount) {
    return errorResponse('add_balance_fail', "O'quvchi ismi va summa kerak. Masalan: \"Abbos balansiga 100000 so'm qo'sh\"");
  }
  const student = await findStudent(p.studentIdentifier);
  if (!student) return errorResponse('add_balance_notfound', `"${p.studentIdentifier}" o'quvchi topilmadi.`);
  const amount = Number(p.amount);
  if (!amount || amount <= 0) return errorResponse('add_balance_invalid', "Summa noto'g'ri.");

  const prevBalance = student.balance || 0;
  student.balance = prevBalance + amount;
  await student.save();
  await new BalanceTransaction({
    studentId: student._id,
    amount,
    balanceBefore: prevBalance,
    balanceAfter: student.balance,
    transactionType: 'excess_payment',
    description: 'AI orqali hisobga qo\'shildi',
    notes: p.notes || null,
    createdBy: adminId
  }).save();

  return successResponse('add_balance',
    `${student.firstName} ${student.lastName} balansiga ${amount.toLocaleString()} so'm qo'shildi.\n` +
    `Eski balans: ${prevBalance.toLocaleString()} so'm\nYangi balans: ${student.balance.toLocaleString()} so'm`
  );
};

// ─── 3. JARIMA QO'YISH ──────────────────────────────────────────────────────
const parseFine = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(jarima|fine|penalty|штраф)/i.test(n) &&
      /(qo'y|qoy|sol|to'la|apply|charge|put|оштрафуй|наложи)/i.test(n)) {
    return { type: 'fine' };
  }
  return null;
};

const handleFine = async (model, msg, adminId) => {
  const prompt = `Jarima qo'yish.\nSo'rov: "${msg}"\nJSON: {"studentIdentifier":"ismi yoki ID","amount":"summa","reason":"jarima sababi (eng kamida 5 belgi)"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI fine parse:', e.message); }
  if (!p?.studentIdentifier || !p?.amount || !p?.reason) {
    return errorResponse('fine_fail', "O'quvchi ismi, summa va sababini ko'rsating. Masalan: \"Akbarga kech kelgani uchun 50000 so'm jarima qo'y\"");
  }
  const student = await findStudent(p.studentIdentifier);
  if (!student) return errorResponse('fine_notfound', `"${p.studentIdentifier}" o'quvchi topilmadi.`);
  const amount = Number(p.amount);
  if (!amount || amount <= 0) return errorResponse('fine_invalid', "Jarima summasi noto'g'ri.");
  if ((student.balance || 0) < amount) {
    return errorResponse('fine_insufficient', `O'quvchining balansida yetarli mablag' yo'q. Joriy balans: ${(student.balance || 0).toLocaleString()} so'm. Avval balansga pul qo'shing.`);
  }
  if (String(p.reason).trim().length < 5) {
    return errorResponse('fine_reason', "Jarima sababi eng kamida 5 belgidan iborat bo'lishi kerak.");
  }

  const prevBalance = student.balance;
  student.balance = prevBalance - amount;
  await student.save();
  await new BalanceTransaction({
    studentId: student._id,
    amount: -amount,
    balanceBefore: prevBalance,
    balanceAfter: student.balance,
    transactionType: 'fine',
    description: p.reason,
    createdBy: adminId
  }).save();
  await updateDailySummary('cash', amount, 'income');

  return successResponse('fine',
    `Jarima qo'yildi: ${student.firstName} ${student.lastName}\n` +
    `Summa: ${amount.toLocaleString()} so'm\nSabab: ${p.reason}\n` +
    `Yangi balans: ${student.balance.toLocaleString()} so'm`
  );
};

// ─── 4. O'QITUVCHI MAOSHI ───────────────────────────────────────────────────
const parseTeacherSalary = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(maosh|maoshi|salary|зарплата|оклад)/i.test(n) &&
      /(o'qituvchi|oqituvchi|teacher|учитель)/i.test(n)) {
    if (/(ko'rsat|korsat|qancha|show|how much|nech|сколько|покажи)/i.test(n)) {
      return { type: 'teacher_salary_view' };
    }
    if (/(to'la|tola|pay|ber|выдай|выплати)/i.test(n)) {
      return { type: 'teacher_salary_pay' };
    }
  }
  return null;
};

const handleTeacherSalaryView = async (model, msg) => {
  const prompt = `O'qituvchi maoshini ko'rish.\nSo'rov: "${msg}"\nJSON: {"teacherIdentifier":"ismi yoki ID","month":"oy raqami 1-12","year":"yil (masalan 2026)"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI teacher salary view parse:', e.message); }
  if (!p?.teacherIdentifier) return errorResponse('salary_fail', "O'qituvchi ismini ko'rsating.");
  const teacher = await findTeacher(p.teacherIdentifier);
  if (!teacher) return errorResponse('salary_notfound', `"${p.teacherIdentifier}" o'qituvchi topilmadi.`);

  const now = new Date();
  const year  = Number(p.year)  || now.getFullYear();
  const month = Number(p.month) || (now.getMonth() + 1);

  const salary = await Salary.getOrCreateMonthlySalary(teacher._id, year, month);
  return successResponse('teacher_salary_view',
    `O'qituvchi: ${teacher.firstName} ${teacher.lastName} (${month}-oy, ${year})\n` +
    `O'tilgan darslar: ${salary.totalLessonsTaught} ta\n` +
    `Qoldirilgan: ${salary.totalLessonsMissed} ta\n` +
    `O'rin bosgan: ${salary.totalLessonsCovered} ta\n` +
    `Dars narxi: ${salary.baseSalaryPerLesson.toLocaleString()} so'm\n` +
    `Jami: ${salary.totalEarned.toLocaleString()} so'm\n` +
    `Bonus: ${salary.totalBonuses.toLocaleString()} so'm\n` +
    `Ushlash: ${salary.totalDeductions.toLocaleString()} so'm\n` +
    `Sof maosh: ${salary.netSalary.toLocaleString()} so'm\n` +
    `Holat: ${salary.paymentStatus === 'paid' ? 'to\'langan' : salary.paymentStatus === 'partially_paid' ? 'qisman' : 'kutilmoqda'}`
  );
};

const handleTeacherSalaryPay = async (model, msg) => {
  const prompt = `O'qituvchi maoshini to'lash.\nSo'rov: "${msg}"\nJSON: {"teacherIdentifier":"ismi yoki ID","month":"oy 1-12","year":"yil","amount":"summa (null bo'lsa to'liq netSalary)"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI teacher salary pay parse:', e.message); }
  if (!p?.teacherIdentifier) return errorResponse('salary_pay_fail', "O'qituvchi ismini ko'rsating.");
  const teacher = await findTeacher(p.teacherIdentifier);
  if (!teacher) return errorResponse('salary_pay_notfound', `"${p.teacherIdentifier}" o'qituvchi topilmadi.`);

  const now = new Date();
  const year  = Number(p.year)  || now.getFullYear();
  const month = Number(p.month) || (now.getMonth() + 1);

  const salary = await Salary.getOrCreateMonthlySalary(teacher._id, year, month);
  const payAmount = Number(p.amount) || salary.netSalary;
  if (!payAmount || payAmount <= 0) {
    return errorResponse('salary_pay_zero', `${teacher.firstName} ${teacher.lastName} uchun ${month}-oyda to'lanadigan maosh yo'q.`);
  }

  salary.paymentDate   = new Date();
  salary.paymentStatus = payAmount >= salary.netSalary ? 'paid' : 'partially_paid';
  await salary.save();

  // Update teacher's balance
  teacher.balance = (teacher.balance || 0) + payAmount;
  await teacher.save();

  // Add expense to summary
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let summary = await FinancialSummary.findOne({ date: { $gte: today } });
  if (!summary) summary = new FinancialSummary({ date: today });
  summary.expenses.salaries += payAmount;
  summary.expenses.total    += payAmount;
  summary.currentBalance.cash  -= payAmount;
  summary.currentBalance.total -= payAmount;
  await summary.save();

  return successResponse('teacher_salary_pay',
    `Maosh to'landi: ${teacher.firstName} ${teacher.lastName}\n` +
    `Oy: ${month}/${year}\nSumma: ${payAmount.toLocaleString()} so'm\n` +
    `Holat: ${salary.paymentStatus === 'paid' ? 'To\'liq to\'landi' : 'Qisman'}\n` +
    `O'qituvchining hozirgi balansi: ${teacher.balance.toLocaleString()} so'm`
  );
};

// ─── 5. XARAJAT QAYD QILISH ─────────────────────────────────────────────────
const parseExpense = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(xarajat|sarflandi|xarajatga|expense|cost|расход)/i.test(n) &&
      /(qayd|qo'sh|yoz|add|create|record|запиши|добавь)/i.test(n)) {
    return { type: 'expense' };
  }
  return null;
};

const handleExpense = async (model, msg, adminId) => {
  const prompt = `Xarajat qayd qilish.\nSo'rov: "${msg}"\nJSON: {"amount":"summa","description":"nima uchun","paymentType":"cash|card|bank_transfer","notes":null}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI expense parse:', e.message); }
  if (!p?.amount || !p?.description) {
    return errorResponse('expense_fail', "Summa va xarajat sababini ko'rsating. Masalan: \"Toner uchun 250000 so'm xarajat qayd qil\"");
  }
  const amount = Number(p.amount);
  if (!amount || amount <= 0) return errorResponse('expense_invalid', "Summa noto'g'ri.");

  const paymentType = ['cash', 'card', 'bank_transfer'].includes(p.paymentType) ? p.paymentType : 'cash';
  await updateDailySummary(paymentType, amount, 'expense');
  const today = new Date(); today.setHours(0,0,0,0);
  const summary = await FinancialSummary.findOne({ date: { $gte: today } });
  if (summary) {
    summary.notes = summary.notes ? `${summary.notes}\n${p.description}` : p.description;
    await summary.save();
  }

  return successResponse('expense',
    `Xarajat qayd etildi.\nSumma: ${amount.toLocaleString()} so'm\n` +
    `Sabab: ${p.description}\nTuri: ${paymentType === 'cash' ? 'naqd' : paymentType === 'card' ? 'karta' : 'bank'}`
  );
};

// ─── 6. MOLIYA SO'ROVI (existing) ────────────────────────────────────────────
const parseFinancialIntent = (msg) => {
  const n = normalizeCommandText(msg);
  const hasFinance = /(to'lov|tolov|balans|qarz|tushum|kassa|pul|payment|balance|debt|income|cash|money|выручка|касса|долг|баланс)/i.test(n);
  const isQuery   = /(qancha|necha|kimda|qanday|how much|ko'rsat|korsat|ber|show|get|list|сколько|покажи)/i.test(n);
  if (hasFinance && isQuery) return { type: 'get_finance', originalMessage: msg };
  return null;
};

const handleFinanceQuery = async (model, msg) => {
  const prompt =
    `Moliyaviy ma'lumot so'rovi.\nSo'rov: "${msg}"\n` +
    `JSON: {"target":"student_balance|debt_list|general_summary|teacher_balance","studentIdentifier":"ismi yoki ID (student_balance uchun)","teacherIdentifier":"ismi (teacher_balance uchun)","period":"bugun|kecha|shu oy|hammasi"}`;
  let parsed = null;
  try { parsed = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI finance parse:', e.message); }
  if (!parsed) return null;

  // O'quvchi balansi
  if (parsed.target === 'student_balance' && parsed.studentIdentifier) {
    const s = await findStudent(parsed.studentIdentifier);
    if (!s) return errorResponse('finance_notfound', `"${parsed.studentIdentifier}" o'quvchi topilmadi.`);
    const bal = s.balance || 0;
    const info = bal < 0 ? `Qarzi: ${Math.abs(bal).toLocaleString()} so'm` :
                 bal > 0 ? `Ortiqcha to'lovi: ${bal.toLocaleString()} so'm` :
                 "To'lovlar to'liq, qarzi yo'q.";
    return successResponse('get_balance', `${s.firstName} ${s.lastName} (${s.studentId || 'ID yo\'q'}) balansi:\n${info}`);
  }

  // O'qituvchi balansi
  if (parsed.target === 'teacher_balance' && parsed.teacherIdentifier) {
    const t = await findTeacher(parsed.teacherIdentifier);
    if (!t) return errorResponse('finance_notfound', `"${parsed.teacherIdentifier}" o'qituvchi topilmadi.`);
    return successResponse('get_teacher_balance',
      `${t.firstName} ${t.lastName} (${t.teacherId || 'ID yo\'q'}) balansi: ${(t.balance || 0).toLocaleString()} so'm\n` +
      `Dars narxi: ${(t.salaryPerLesson || 0).toLocaleString()} so'm`
    );
  }

  // Qarzdorlar
  if (parsed.target === 'debt_list') {
    const debtors = await User.find({ role: 'student', balance: { $lt: 0 } })
      .select('firstName lastName balance studentId').sort({ balance: 1 }).limit(15);
    if (!debtors.length) return successResponse('get_debts', "Hozirda qarzi bor o'quvchilar topilmadi.");
    const list = debtors.map(d => `- ${d.firstName} ${d.lastName}: ${Math.abs(d.balance).toLocaleString()} so'm`).join('\n');
    const total = debtors.reduce((sum, d) => sum + Math.abs(d.balance), 0);
    return successResponse('get_debts', `Eng ko'p qarzi bor o'quvchilar (${debtors.length} ta):\n${list}\n\nJami qarz: ${total.toLocaleString()} so'm`);
  }

  // Umumiy holat
  if (parsed.target === 'general_summary') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const summary = await FinancialSummary.findOne({ date: { $gte: today } });
    if (!summary) return successResponse('get_finance_summary', "Bugun hali moliyaviy harakatlar qayd etilmadi.");
    return successResponse('get_finance_summary',
      `Bugungi moliyaviy holat:\n` +
      `- Jami tushum: ${summary.income.total.toLocaleString()} so'm\n` +
      `  (Naqd: ${summary.income.cash.toLocaleString()}, Karta: ${summary.income.card.toLocaleString()}, Bank: ${summary.income.bankTransfer.toLocaleString()})\n` +
      `- Jami xarajat: ${summary.expenses.total.toLocaleString()} so'm\n` +
      `  (Maosh: ${summary.expenses.salaries.toLocaleString()}, Boshqa: ${summary.expenses.other.toLocaleString()})\n` +
      `- Hozirgi kassa: ${summary.currentBalance.total.toLocaleString()} so'm`
    );
  }

  return null;
};

// ─── ASOSIY DISPATCHER ────────────────────────────────────────────────────────
exports.tryHandleAction = async (message, model, adminId) => {
  if (parseCreatePayment(message)) return handleCreatePayment(model, message, adminId);
  if (parseAddBalance(message))    return handleAddBalance(model, message, adminId);
  if (parseFine(message))          return handleFine(model, message, adminId);
  if (parseExpense(message))       return handleExpense(model, message, adminId);

  const teacherSalIntent = parseTeacherSalary(message);
  if (teacherSalIntent?.type === 'teacher_salary_view') return handleTeacherSalaryView(model, message);
  if (teacherSalIntent?.type === 'teacher_salary_pay')  return handleTeacherSalaryPay(model, message);

  if (parseFinancialIntent(message)) return handleFinanceQuery(model, message);
  return null;
};
