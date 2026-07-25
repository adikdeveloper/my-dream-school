/**
 * SCHEDULING MODULE - Controller
 * ================================
 * Jadval, vazifa va dam olish kunlari uchun AI action handler'lari.
 *
 * QAMRAB OLINGAN ACTION'LAR:
 * 1. Dam olish kuni (Holiday) yaratish
 * 2. Dam olish kunini o'chirish
 * 3. Vazifa (Assignment) yaratish
 * 4. Imtihon (Test) yaratish — qisqartirilgan, faqat asos
 * 5. Bayram kunlari ro'yxati
 */

const User       = require('../../models/users/User');
const Class      = require('../../models/academic/Class');
const Subject    = require('../../models/academic/Subject');
const Holiday    = require('../../models/scheduling/Holiday');
const Schedule   = require('../../models/scheduling/Schedule');
const Assignment = require('../../models/academic/Assignment');
const Test       = require('../../models/academic/Test');
const { extractJsonObject, normalizeCommandText, successResponse, errorResponse } = require('../utils/responseParser');
const { createUzbekSearchRegex } = require('../../utils/uzbekHelper');

const uzReg = (text) => new RegExp(createUzbekSearchRegex(text), 'i');

// ─── 1. DAM OLISH KUNI YARATISH ─────────────────────────────────────────────
const parseCreateHoliday = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(bayram|dam olish|ta'til|tatil|holiday|выходной|каникулы|праздник)/i.test(n) &&
      /(qo'sh|qosh|yarat|elon qil|create|add|insert|создай|добавь)/i.test(n)) {
    return { type: 'create_holiday' };
  }
  return null;
};

const handleCreateHoliday = async (model, msg, adminId) => {
  const prompt = `Bayram/dam olish kuni yaratish.\nSo'rov: "${msg}"\nJSON: {"name":"bayram nomi","date":"YYYY-MM-DD","endDate":"YYYY-MM-DD (ko'p kun bo'lsa)","type":"national|religious|school|other","description":null,"isRecurring":false,"academicYear":"2025-2026"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI holiday parse:', e.message); }
  if (!p?.name || !p?.date) {
    return errorResponse('holiday_fail', "Bayram nomi va sanasini ko'rsating. Masalan: \"Yangi yil bayrami 2026-01-01 sanasiga qo'sh\"");
  }
  try {
    const h = await new Holiday({
      name: String(p.name).trim(),
      date: new Date(p.date),
      endDate: p.endDate ? new Date(p.endDate) : null,
      type: ['national','religious','school','other'].includes(p.type) ? p.type : 'national',
      description: p.description || '',
      isRecurring: !!p.isRecurring,
      academicYear: p.academicYear || '2025-2026',
      createdBy: adminId,
      isActive: true
    }).save();
    const dateStr = h.endDate
      ? `${new Date(h.date).toLocaleDateString('uz-UZ')} – ${new Date(h.endDate).toLocaleDateString('uz-UZ')}`
      : new Date(h.date).toLocaleDateString('uz-UZ');
    return successResponse('create_holiday', `Dam olish kuni qo'shildi: ${h.name}\nSana: ${dateStr}\nTuri: ${h.type}`);
  } catch (err) {
    return errorResponse('holiday_error', `Dam olish kuni yaratishda xato: ${err.message}`);
  }
};

// ─── 2. DAM OLISH KUNINI O'CHIRISH ──────────────────────────────────────────
const parseDeleteHoliday = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(bayram|dam olish|ta'til|tatil|holiday)/i.test(n) &&
      /(o'chir|ochir|delete|remove|удали|убери)/i.test(n)) {
    return { type: 'delete_holiday' };
  }
  return null;
};

const handleDeleteHoliday = async (model, msg) => {
  const prompt = `Bayram o'chirish.\nSo'rov: "${msg}"\nJSON: {"name":"bayram nomi","date":"YYYY-MM-DD (ixtiyoriy)"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI delete holiday parse:', e.message); }
  if (!p?.name && !p?.date) return errorResponse('holiday_del_fail', "Bayram nomini ko'rsating.");

  const filter = {};
  if (p.name) filter.name = uzReg(p.name);
  if (p.date) {
    const d = new Date(p.date); d.setHours(0,0,0,0);
    filter.date = { $gte: d, $lt: new Date(d.getTime() + 24 * 60 * 60 * 1000) };
  }
  const h = await Holiday.findOneAndDelete(filter);
  if (!h) return errorResponse('holiday_del_notfound', "Bayram topilmadi.");
  return successResponse('delete_holiday', `Bayram o'chirildi: ${h.name}`);
};

// ─── 3. BAYRAMLAR RO'YXATI ──────────────────────────────────────────────────
const parseHolidayList = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(bayram|dam olish|ta'til|tatil|holiday)/i.test(n) &&
      /(ko'rsat|korsat|ro'yxat|royxat|list|show|hammasi|nech|qancha|сколько|покажи)/i.test(n) &&
      !/(yarat|qo'sh|create|add|o'chir|delete)/i.test(n)) {
    return { type: 'holiday_list' };
  }
  return null;
};

const handleHolidayList = async () => {
  const list = await Holiday.find({ isActive: true }).sort({ date: 1 }).limit(20).lean();
  if (!list.length) return successResponse('holiday_list_empty', "Hozirda dam olish kunlari ro'yxati bo'sh.");
  const lines = list.map((h, i) => {
    const d = new Date(h.date).toLocaleDateString('uz-UZ');
    const end = h.endDate ? ` - ${new Date(h.endDate).toLocaleDateString('uz-UZ')}` : '';
    return `${i+1}. ${h.name} | ${d}${end} | ${h.type}`;
  }).join('\n');
  return successResponse('holiday_list', `Dam olish kunlari (${list.length}):\n${lines}`);
};

// ─── 4. VAZIFA (Assignment) YARATISH ────────────────────────────────────────
const parseCreateAssignment = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(vazifa|topshiriq|assignment|homework|задание)/i.test(n) &&
      /(yarat|qo'sh|ber|create|add|assign|задай|создай|добавь)/i.test(n)) {
    return { type: 'create_assignment' };
  }
  return null;
};

const handleCreateAssignment = async (model, msg) => {
  const prompt = `Vazifa (Assignment) yaratish.\nSo'rov: "${msg}"\nJSON: {"title":"vazifa sarlavhasi","description":"to'liq tavsif (eng kamida 10 belgi)","subjectName":"fan","className":"sinf (5-A)","teacherName":"o'qituvchi ismi","dueDate":"YYYY-MM-DD","maxScore":10}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI assignment parse:', e.message); }
  if (!p?.title || !p?.description || !p?.subjectName || !p?.className || !p?.teacherName || !p?.dueDate) {
    return errorResponse('assignment_fail', "Vazifa uchun: sarlavha, tavsif, fan, sinf, o'qituvchi va topshirish muddati kerak.");
  }

  const subject = await Subject.findOne({ name: new RegExp(String(p.subjectName).trim(), 'i'), isActive: true });
  if (!subject) return errorResponse('assignment_nosubject', `"${p.subjectName}" fani topilmadi.`);

  const m = String(p.className).match(/(\d+)\s*[-\s]?\s*([A-Za-z])/);
  if (!m) return errorResponse('assignment_noclass', `${p.className} sinf formati noto'g'ri (masalan: 5-A).`);
  const cls = await Class.findOne({ grade: Number(m[1]), section: m[2].toUpperCase(), isActive: true });
  if (!cls) return errorResponse('assignment_noclass2', `${m[1]}-${m[2]} sinfi topilmadi.`);

  const parts = String(p.teacherName).split(/\s+/).filter(Boolean);
  let teacher = await User.findOne({ role: 'teacher', $or: [{ firstName: uzReg(parts[0]), lastName: uzReg(parts[1] || '') }, { firstName: uzReg(parts[0]) }, { lastName: uzReg(parts[0]) }] });
  if (!teacher) return errorResponse('assignment_noteacher', `"${p.teacherName}" o'qituvchi topilmadi.`);

  try {
    const a = await new Assignment({
      title: String(p.title).trim(),
      description: String(p.description).trim(),
      subject: subject._id,
      class: cls._id,
      teacher: teacher._id,
      dueDate: new Date(p.dueDate),
      maxScore: Number(p.maxScore) || 10,
      status: 'active'
    }).save();
    return successResponse('create_assignment',
      `Vazifa yaratildi: ${a.title}\n` +
      `Fan: ${subject.name}\nSinf: ${cls.grade}-${cls.section}\n` +
      `O'qituvchi: ${teacher.firstName} ${teacher.lastName}\n` +
      `Muddati: ${new Date(a.dueDate).toLocaleDateString('uz-UZ')}\n` +
      `Maks ball: ${a.maxScore}`
    );
  } catch (err) {
    return errorResponse('assignment_error', `Vazifa yaratishda xato: ${err.message}`);
  }
};

// ─── 5. IMTIHON (TEST) YARATISH (asosiy struktura) ──────────────────────────
const parseCreateTest = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(imtihon|test|nazorat|exam|контрольная|тест)/i.test(n) &&
      /(yarat|qo'sh|tashkil|create|add|задай|создай|организуй)/i.test(n)) {
    return { type: 'create_test' };
  }
  return null;
};

const handleCreateTest = async (model, msg, teacherId) => {
  const prompt = `Imtihon yaratish (asosiy ma'lumot).\nSo'rov: "${msg}"\nJSON: {"title":"sarlavha","description":null,"subjectName":"fan","className":"sinf (5-A)","teacherName":"o'qituvchi ismi","testDate":"YYYY-MM-DD","duration":45,"maxScore":100}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI test parse:', e.message); }
  if (!p?.title || !p?.subjectName || !p?.className || !p?.testDate) {
    return errorResponse('test_fail', "Imtihon uchun: sarlavha, fan, sinf va sanani ko'rsating.");
  }

  const subject = await Subject.findOne({ name: new RegExp(String(p.subjectName).trim(), 'i'), isActive: true });
  if (!subject) return errorResponse('test_nosubject', `"${p.subjectName}" fani topilmadi.`);

  const m = String(p.className).match(/(\d+)\s*[-\s]?\s*([A-Za-z])/);
  if (!m) return errorResponse('test_noclass', `${p.className} sinf formati noto'g'ri.`);
  const cls = await Class.findOne({ grade: Number(m[1]), section: m[2].toUpperCase(), isActive: true });
  if (!cls) return errorResponse('test_noclass2', `${m[1]}-${m[2]} sinfi topilmadi.`);

  let teacher = null;
  if (p.teacherName) {
    const parts = String(p.teacherName).split(/\s+/).filter(Boolean);
    teacher = await User.findOne({ role: 'teacher', $or: [{ firstName: uzReg(parts[0]), lastName: uzReg(parts[1] || '') }, { firstName: uzReg(parts[0]) }, { lastName: uzReg(parts[0]) }] });
  }
  teacher = teacher || await User.findById(teacherId);

  const testDate = new Date(p.testDate);
  const duration = Number(p.duration) || 45;
  const startTime = new Date(testDate);
  startTime.setHours(9, 0, 0, 0);
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  const month = testDate.getMonth() + 1;
  const year  = testDate.getFullYear();

  try {
    const exists = await Test.findOne({ class: cls._id, subject: subject._id, month, year });
    if (exists) return errorResponse('test_exists', `${cls.grade}-${cls.section} sinfi uchun ${month}-oyda bu fandan imtihon allaqachon mavjud.`);
    const t = await new Test({
      title: String(p.title).trim(),
      description: p.description || '',
      subject: subject._id,
      class: cls._id,
      teacher: teacher._id,
      month, year,
      questions: [],
      totalPoints: 0,
      startTime, endTime,
      duration,
      maxScore: Number(p.maxScore) || 100,
      testDate,
      isActive: true
    }).save();
    return successResponse('create_test',
      `Imtihon yaratildi: ${t.title}\n` +
      `Fan: ${subject.name}\nSinf: ${cls.grade}-${cls.section}\n` +
      `Sana: ${new Date(t.testDate).toLocaleDateString('uz-UZ')}\n` +
      `Davomiyligi: ${t.duration} daqiqa\nMaks ball: ${t.maxScore}\n` +
      `Eslatma: Savollarni saytdan qo'shing.`
    );
  } catch (err) {
    return errorResponse('test_error', `Imtihon yaratishda xato: ${err.message}`);
  }
};

// ─── 6. JADVAL KO'RISH ──────────────────────────────────────────────────────
const parseScheduleView = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(dars jadval|jadval|schedule|расписание)/i.test(n) &&
      /(ko'rsat|korsat|show|nech|qaysi|qachon|how|when|когда|покажи)/i.test(n)) {
    return { type: 'schedule_view' };
  }
  return null;
};

const handleScheduleView = async (model, msg) => {
  const prompt = `Jadval so'rovi.\nSo'rov: "${msg}"\nJSON: {"className":"sinf nomi (masalan 5-A)","day":"Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|null"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI schedule parse:', e.message); }
  if (!p?.className) {
    // List all classes' schedule count
    const schedules = await Schedule.find({ isActive: true }).populate('classId', 'grade section').sort({ startDate: -1 }).limit(10).lean();
    if (!schedules.length) return successResponse('schedule_empty', "Faol dars jadvallari topilmadi.");
    const lines = schedules.map((s,i) => {
      const cls = s.classId ? `${s.classId.grade}-${s.classId.section}` : 'noma\'lum';
      const periods = (s.schedule || []).reduce((sum, d) => sum + (d.periods || []).length, 0);
      return `${i+1}. ${cls} - ${s.name} (${periods} dars)`;
    }).join('\n');
    return successResponse('schedule_list', `Faol jadvallar:\n${lines}`);
  }
  const m = String(p.className).match(/(\d+)\s*[-\s]?\s*([A-Za-z])/);
  if (!m) return errorResponse('schedule_noclass', `${p.className} sinf formati noto'g'ri.`);
  const cls = await Class.findOne({ grade: Number(m[1]), section: m[2].toUpperCase(), isActive: true });
  if (!cls) return errorResponse('schedule_noclass2', `${m[1]}-${m[2]} sinfi topilmadi.`);

  const schedule = await Schedule.findCurrentSchedule(cls._id);
  if (!schedule) return successResponse('schedule_none', `${cls.grade}-${cls.section} sinfi uchun jadval topilmadi.`);
  const days = p.day
    ? schedule.schedule.filter(d => d.day === p.day)
    : schedule.schedule;
  if (!days.length) return successResponse('schedule_empty_day', "Ushbu kun uchun darslar yo'q.");
  const lines = days.map(d => {
    const periods = (d.periods || []).map((per, i) => {
      const subj = per.subject?.name || 'Bo\'sh';
      const teach = per.teacher ? `${per.teacher.firstName} ${per.teacher.lastName}` : '';
      return `  ${per.startTime}-${per.endTime} | ${subj}${teach ? ' | ' + teach : ''}`;
    }).join('\n');
    return `[${d.day}]\n${periods || '  (Darslar yo\'q)'}`;
  }).join('\n\n');
  return successResponse('schedule_view', `${cls.grade}-${cls.section} sinfi jadvali:\n${lines}`);
};

// ─── ASOSIY DISPATCHER ────────────────────────────────────────────────────────
exports.tryHandleAction = async (message, model, adminId) => {
  if (parseDeleteHoliday(message))    return handleDeleteHoliday(model, message);
  if (parseHolidayList(message))      return handleHolidayList();
  if (parseCreateHoliday(message))    return handleCreateHoliday(model, message, adminId);
  if (parseCreateAssignment(message)) return handleCreateAssignment(model, message);
  if (parseCreateTest(message))       return handleCreateTest(model, message, adminId);
  if (parseScheduleView(message))     return handleScheduleView(model, message);
  return null;
};
