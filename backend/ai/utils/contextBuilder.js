/**
 * CONTEXT BUILDER UTILITY
 * =======================
 * Har bir AI moduli uchun DB dan ma'lumot tortib, kontekst ob'ekt yaratadi.
 * Bu utility AI ning "nimani bilishi" ni boshqaradi.
 *
 * STRATEGIYA:
 * - Har bir modul faqat o'ziga kerakli ma'lumotni yuklaydi (lazy loading)
 * - Umumiy ma'lumotlar buildGeneralContext() orqali bir marta yuklanadi
 * - Og'ir so'rovlar (full student list) faqat chat modulida yuklanadi
 */

const User              = require('../../models/users/User');
const Class             = require('../../models/academic/Class');
const Subject           = require('../../models/academic/Subject');
const Grade             = require('../../models/academic/Grade');
const Attendance        = require('../../models/academic/Attendance');
const Payment           = require('../../models/financial/Payment');
const Schedule          = require('../../models/scheduling/Schedule');
const Announcement      = require('../../models/communication/Announcement');
const Assignment        = require('../../models/academic/Assignment');
const Test              = require('../../models/academic/Test');
const FinancialSummary  = require('../../models/financial/FinancialSummary');
const BalanceTransaction = require('../../models/financial/BalanceTransaction');

// ─── Chat uchun to'liq kontekst ───────────────────────────────────────────────
const buildChatContext = async () => {
  const [
    students, teachers, classes, subjects, grades,
    attendance, payments, schedules, announcements, assignments
  ] = await Promise.all([
    User.find({ role: 'student' }).select('-password').lean(),
    User.find({ role: 'teacher' }).select('-password').lean(),
    Class.find()
      .populate('students', 'firstName lastName')
      .populate('classTeacher', 'firstName lastName')
      .lean(),
    Subject.find().lean(),
    Grade.find()
      .populate('student', 'firstName lastName')
      .populate('subject', 'name')
      .sort({ date: -1 }).limit(100).lean(),
    Attendance.find().sort({ date: -1 }).limit(100).lean(),
    Payment.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(50).lean(),
    Schedule.find()
      .populate('classId', 'name grade section')
      .populate('schedule.periods.teacher', 'firstName lastName')
      .populate('schedule.periods.subject', 'name')
      .sort({ startDate: -1 }).limit(20).lean(),
    Announcement.find().sort({ createdAt: -1 }).limit(10).lean(),
    Assignment.find().sort({ createdAt: -1 }).limit(20).lean()
  ]);

  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPayments = completedPayments.reduce((sum, p) => sum + (p.actualPayment ?? p.amount ?? 0), 0);
  const paidStudents  = new Set(completedPayments.map(p => p.studentId?.toString()).filter(Boolean)).size;
  const attendanceStats = {
    total:   attendance.length,
    present: attendance.filter(a => ['present', 'keldi'].includes((a.status || '').toLowerCase())).length
  };

  // Formatted lists for prompt
  const studentList = students.map(s =>
    `- ${s.firstName} ${s.lastName} (ID: ${s.studentId || "yo'q"}), tel: ${s.phone || "yo'q"}, holati: ${s.isActive ? 'faol' : 'nofaol'}, oylik to'lov: ${s.monthlyFee || 0} so'm`
  ).join('\n');

  const teacherList = teachers.map(t =>
    `- ${t.firstName} ${t.lastName} (${t.teacherId || "ID yo'q"}) ${t.isActive ? 'faol' : 'nofaol'}, fanlar: ${t.subjects?.length || 0}, dars narxi: ${t.salaryPerLesson || 0} so'm`
  ).join('\n');

  const classList = classes.map(c =>
    `- ${c.grade}-${c.section} ${c.name || ''}, o'quvchilar: ${c.students?.length || 0}, rahbar: ${c.classTeacher?.firstName || ''} ${c.classTeacher?.lastName || ''}`
  ).join('\n');

  const subjectList      = subjects.map(s => `- ${s.name}`).join('\n');
  const announcementList = announcements.map(a => `- ${a.title}`).join('\n');
  const assignmentList   = assignments.map(a => `- ${a.title}`).join('\n');
  const scheduleList     = schedules.map(s => {
    const className = s.classId ? (s.classId.name || `${s.classId.grade}-${s.classId.section}`) : "Sinf yo'q";
    const periodsCount = (s.schedule || []).reduce((count, day) => count + (day.periods || []).filter(p => p.subject).length, 0);
    return `- ${className}: ${s.name}, ${periodsCount} ta dars`;
  }).join('\n');

  return {
    students, teachers, classes, subjects, grades, attendance, payments, schedules,
    totalStudents:   students.length,
    activeStudents:  students.filter(s => s.isActive).length,
    totalTeachers:   teachers.length,
    activeTeachers:  teachers.filter(t => t.isActive).length,
    totalClasses:    classes.length,
    totalSubjects:   subjects.length,
    attendanceStats,
    totalPayments,
    paidStudents,
    studentList,
    teacherList,
    classList,
    subjectList,
    announcementList,
    assignmentList,
    scheduleList
  };
};

// ─── Ta'lim uchun kontekst ────────────────────────────────────────────────────
const buildEducationContext = async () => {
  const [students, teachers, classes, subjects, grades, attendance, schedules] = await Promise.all([
    User.find({ role: 'student' }).select('firstName lastName studentId classId isActive monthlyFee phone').lean(),
    User.find({ role: 'teacher' }).select('firstName lastName teacherId subjects salaryPerLesson isActive').lean(),
    Class.find().populate('students', 'firstName lastName').populate('classTeacher', 'firstName lastName').lean(),
    Subject.find().lean(),
    Grade.find().populate('student', 'firstName lastName').populate('subject', 'name').sort({ date: -1 }).limit(50).lean(),
    Attendance.find().sort({ date: -1 }).limit(50).lean(),
    Schedule.find().populate('classId', 'name grade section').sort({ startDate: -1 }).limit(10).lean()
  ]);
  return { students, teachers, classes, subjects, grades, attendance, schedules };
};

// ─── Moliya uchun kontekst ────────────────────────────────────────────────────
const buildFinanceContext = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [payments, debtors, summary] = await Promise.all([
    Payment.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(50).lean(),
    User.find({ role: 'student', balance: { $lt: 0 } }).select('firstName lastName balance studentId').sort({ balance: 1 }).lean(),
    FinancialSummary.findOne({ date: { $gte: today } }).lean()
  ]);

  const totalIncome   = summary?.income?.total   || 0;
  const totalExpenses = summary?.expenses?.total || 0;
  const currentBalance = summary?.currentBalance?.total || 0;

  return { payments, debtors, totalIncome, totalExpenses, currentBalance, summary };
};

// ─── Boshqaruv uchun kontekst ─────────────────────────────────────────────────
const buildManagementContext = async () => {
  const staff = await User.find({
    role: { $in: ['admin', 'accountant', 'hr', 'reception', 'call-center'] }
  }).select('firstName lastName role isActive').lean();

  return { staff, branches: [], applications: [] };
};

// ─── Aloqa uchun kontekst ─────────────────────────────────────────────────────
const buildCommunicationContext = async () => {
  const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(20).lean();
  return { leads: [], notifications: announcements, reminders: [] };
};

// ─── O'quvchi uchun kontekst (FAQAT o'z ma'lumotlari) ─────────────────────────
/**
 * O'quvchining O'Z ma'lumotlaridan kontekst quradi.
 * MUHIM XAVFSIZLIK: barcha so'rovlar userId / o'quvchining o'z sinfi bilan
 * cheklangan. Hech qachon boshqa o'quvchilar yoki moliya ma'lumotlari olinmaydi.
 * @param {string} userId - O'quvchining ID si (req.user._id)
 */
const buildStudentContext = async (userId) => {
  const student = await User.findById(userId)
    .select('firstName lastName studentId classId grade')
    .lean();
  if (!student) return { studentName: '' };

  // O'quvchining o'z sinfi
  const studentClass = await Class.findOne({ students: userId, isActive: true })
    .populate('classTeacher', 'firstName lastName')
    .populate('subjects.subject', 'name code')
    .populate('subjects.teacher', 'firstName lastName')
    .lean();

  const classId = studentClass?._id;

  const [grades, attendance, assignments] = await Promise.all([
    Grade.find({ student: userId }).populate('subject', 'name').sort({ date: -1 }).limit(30).lean(),
    Attendance.find({ student: userId }).sort({ date: -1 }).limit(80).lean(),
    classId
      ? Assignment.find({ class: classId, status: 'active' })
          .populate('subject', 'name').sort({ dueDate: 1 }).limit(15).lean()
      : []
  ]);

  let currentSchedule = null;
  if (classId) {
    try { currentSchedule = await Schedule.findCurrentSchedule(classId); }
    catch (e) { currentSchedule = null; }
  }

  const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
  const className = studentClass?.name || '';
  const grade = studentClass
    ? `${studentClass.grade || ''}${studentClass.section ? '-' + studentClass.section : ''}`
    : (student.grade || '');
  const classTeacher = studentClass?.classTeacher
    ? `${studentClass.classTeacher.firstName || ''} ${studentClass.classTeacher.lastName || ''}`.trim()
    : '';

  const subjectsList = (studentClass?.subjects || [])
    .map(s => {
      const subjName = s.subject?.name;
      if (!subjName) return null;
      const teacher = s.teacher ? `${s.teacher.firstName || ''} ${s.teacher.lastName || ''}`.trim() : '';
      return `- ${subjName}${teacher ? " (o'qituvchi: " + teacher + ')' : ''}`;
    })
    .filter(Boolean)
    .join('\n');

  // Dars jadvalidagi mavzular (faqat topic kiritilganlari)
  const topicLines = [];
  for (const day of (currentSchedule?.schedule || [])) {
    for (const p of (day.periods || [])) {
      if (p?.topic && String(p.topic).trim()) {
        const subjName = p.subject?.name || '';
        topicLines.push(`- ${day.day || ''}: ${subjName}${subjName ? ' — ' : ''}${String(p.topic).trim()}`);
      }
    }
  }
  const scheduleTopicsList = topicLines.slice(0, 25).join('\n');

  // Baholar
  const scores = grades.map(g => g.score).filter(v => typeof v === 'number');
  const gradeAverage = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const recentGradesList = grades.slice(0, 12)
    .map(g => `- ${g.subject?.name || 'Fan'}: ${g.score ?? '-'} ball${g.date ? ' (' + new Date(g.date).toLocaleDateString('uz-UZ') + ')' : ''}`)
    .join('\n');

  // Davomat
  const norm = (a) => (a.status || '').toLowerCase();
  const present = attendance.filter(a => ['present', 'keldi'].includes(norm(a))).length;
  const absent  = attendance.filter(a => ['absent', 'kelmadi'].includes(norm(a))).length;
  const late    = attendance.filter(a => ['late', 'kechikdi'].includes(norm(a))).length;
  const attTotal = attendance.length;
  const attRate = attTotal ? Math.round((present / attTotal) * 100) : 0;
  const attendanceSummary = attTotal
    ? `- Jami: ${attTotal} | Keldi: ${present} | Kelmadi: ${absent} | Kechikdi: ${late} | Davomat: ${attRate}%`
    : '';

  // Uy vazifalari
  const assignmentsList = (assignments || [])
    .map(a => {
      const sub = a.subject?.name || '';
      const due = a.dueDate ? new Date(a.dueDate).toLocaleDateString('uz-UZ') : '';
      const mine = (a.submissions || []).find(s => s.student?.toString() === userId.toString());
      const status = mine ? (mine.status === 'graded' ? 'baholangan' : 'topshirilgan') : 'topshirilmagan';
      return `- ${a.title || 'Vazifa'}${sub ? ' (' + sub + ')' : ''}${due ? ', muddat: ' + due : ''} — ${status}`;
    })
    .join('\n');

  return {
    studentName, className, grade, classTeacher,
    subjectsList, scheduleTopicsList, recentGradesList,
    gradeAverage, attendanceSummary, assignmentsList
  };
};

// ─── O'qituvchi scope (FAQAT o'ziga biriktirilgan sinflar) ────────────────────
/**
 * O'qituvchiga biriktirilgan sinflarni qaytaradi.
 * MUHIM XAVFSIZLIK: so'rov DB darajasida teacherId bilan cheklangan —
 * o'qituvchi rahbar bo'lgan (classTeacher) yoki fan o'qitadigan
 * (subjects.teacher) sinflardan boshqasi hech qachon qaytarilmaydi.
 * @param {string} teacherId - O'qituvchining ID si (req.user._id)
 */
const getTeacherClasses = async (teacherId) => {
  return Class.find({
    isActive: true,
    $or: [
      { classTeacher: teacherId },
      { 'subjects.teacher': teacherId }
    ]
  })
    .populate('students', 'firstName lastName studentId isActive')
    .populate('subjects.subject', 'name')
    .populate('subjects.teacher', 'firstName lastName')
    .populate('classTeacher', 'firstName lastName')
    .lean();
};

/**
 * Sinf ichida o'qituvchiga ruxsat etilgan fanlar ro'yxati.
 * Sinf rahbari sinfning BARCHA fanlari bo'yicha tahlil olishi mumkin,
 * fan o'qituvchisi esa faqat o'zi o'qitadigan fanlar bo'yicha.
 */
const getAllowedSubjectsForClass = (classDoc, teacherId) => {
  const tid = String(teacherId);
  const isClassTeacher = String(classDoc.classTeacher?._id || classDoc.classTeacher) === tid;
  const subjects = (classDoc.subjects || []).filter(s => s.subject);
  if (isClassTeacher) {
    return { isClassTeacher, subjects };
  }
  return {
    isClassTeacher,
    subjects: subjects.filter(s => String(s.teacher?._id || s.teacher) === tid)
  };
};

// ─── O'qituvchi uchun kontekst (FAQAT o'z sinflari va o'quvchilari) ───────────
/**
 * O'qituvchining O'Z ma'lumotlaridan AI kontekst quradi.
 * MUHIM XAVFSIZLIK: barcha so'rovlar teacherId / o'qituvchining o'z sinflari
 * bilan cheklangan. Boshqa o'qituvchilar, boshqa sinflar, moliya, maoshlar
 * yoki boshqaruv ma'lumotlari BU KONTEKSTGA UMUMAN KIRITILMAYDI — shu sabab
 * AI ularni xohlasa ham oshkor qila olmaydi.
 * @param {string} teacherId - O'qituvchining ID si (req.user._id)
 */
const buildTeacherContext = async (teacherId) => {
  const classes = await getTeacherClasses(teacherId);
  const classIds = classes.map(c => c._id);

  const [grades, tests, schedules] = await Promise.all([
    Grade.find({ teacher: teacherId })
      .populate('student', 'firstName lastName')
      .populate('subject', 'name')
      .populate('class', 'name grade section')
      .sort({ date: -1 }).limit(150).lean(),
    Test.find({ teacher: teacherId })
      .populate('class', 'name')
      .populate('subject', 'name')
      .select('title class subject month year totalPoints results isCompleted')
      .sort({ year: -1, month: -1 }).limit(15).lean(),
    classIds.length
      ? Schedule.find({ classId: { $in: classIds }, isActive: true })
          .populate('classId', 'name grade section')
          .populate('schedule.periods.subject', 'name')
          .populate('schedule.periods.teacher', 'firstName lastName')
          .sort({ startDate: -1 }).limit(10).lean()
      : []
  ]);

  const tid = String(teacherId);
  const classNameOf = (c) => c?.name || [c?.grade, c?.section].filter(Boolean).join('-') || 'Sinf';

  // Sinflar va o'quvchilar ro'yxati
  const classLines = [];
  const studentLines = [];
  for (const cls of classes) {
    const { isClassTeacher, subjects } = getAllowedSubjectsForClass(cls, teacherId);
    const mySubjects = (cls.subjects || [])
      .filter(s => s.subject && String(s.teacher?._id || s.teacher) === tid)
      .map(s => s.subject.name);
    const activeStudents = (cls.students || []).filter(s => s.isActive !== false);
    classLines.push(
      `- ${classNameOf(cls)}: ${activeStudents.length} o'quvchi` +
      (isClassTeacher ? ' | sen sinf rahbarisan' : '') +
      (mySubjects.length ? ` | sen o'qitadigan fanlar: ${mySubjects.join(', ')}` : '') +
      (isClassTeacher && subjects.length ? ` | sinf fanlari: ${subjects.map(s => s.subject.name).join(', ')}` : '')
    );
    studentLines.push(
      `${classNameOf(cls)} o'quvchilari:\n` +
      activeStudents.map(s => `  - ${s.firstName} ${s.lastName}${s.studentId ? ' (ID: ' + s.studentId + ')' : ''}`).join('\n')
    );
  }

  // O'qituvchining o'zi qo'ygan so'nggi baholar
  const recentGradesList = grades.slice(0, 60).map(g => {
    const student = g.student ? `${g.student.firstName} ${g.student.lastName}` : "O'quvchi";
    const dateStr = g.date ? new Date(g.date).toLocaleDateString('uz-UZ') : '';
    return `- ${student} | ${g.subject?.name || 'Fan'} | ${classNameOf(g.class)} | ${g.score} ball${g.isExam ? ' (imtihon, maks: ' + (g.examMaxScore || '-') + ')' : ''}${dateStr ? ' | ' + dateStr : ''}`;
  }).join('\n');

  // O'qituvchining o'z dars jadvali (faqat o'z darslari)
  const myScheduleLines = [];
  for (const sch of schedules) {
    for (const day of (sch.schedule || [])) {
      for (const p of (day.periods || [])) {
        if (String(p.teacher?._id || p.teacher || '') === tid && p.subject) {
          myScheduleLines.push(`- ${day.day}: ${p.startTime}-${p.endTime} | ${p.subject.name} | ${classNameOf(sch.classId)}${p.topic ? ' | mavzu: ' + p.topic : ''}`);
        }
      }
    }
  }

  // O'qituvchining o'z testlari
  const testsList = tests.map(t =>
    `- ${t.title} | ${t.subject?.name || 'Fan'} | ${t.class?.name || 'Sinf'} | ${t.month}/${t.year} | ${t.totalPoints || 0} ball | topshirganlar: ${(t.results || []).length}`
  ).join('\n');

  return {
    classes,
    classesList: classLines.join('\n'),
    studentsList: studentLines.join('\n\n'),
    recentGradesList,
    myScheduleList: myScheduleLines.slice(0, 60).join('\n'),
    testsList,
    totalClasses: classes.length,
    totalStudents: classes.reduce((sum, c) => sum + (c.students || []).filter(s => s.isActive !== false).length, 0)
  };
};

module.exports = {
  buildChatContext,
  buildEducationContext,
  buildFinanceContext,
  buildManagementContext,
  buildCommunicationContext,
  buildStudentContext,
  getTeacherClasses,
  getAllowedSubjectsForClass,
  buildTeacherContext
};
