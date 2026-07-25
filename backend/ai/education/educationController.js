/**
 * EDUCATION MODULE - Controller
 * ==============================
 * Ta'lim bo'limi uchun AI action handler'lari.
 *
 * QAMRAB OLINGAN ACTION'LAR:
 * 1. O'quvchi yaratish (yakka va ommaviy)
 * 2. O'quvchi tahrirlash
 * 3. Baho qo'yish
 * 4. Davomat belgilash (yakka va sinf bo'yicha)
 * 5. Sinf yaratish
 *
 * STRATEGIYA:
 * - Har bir intent parse funksiyasida aniqlanadi
 * - tryHandleAction() barcha action'larni navbat bilan tekshiradi
 * - Har bir handler handled:true yoki null qaytaradi
 */

const User    = require('../../models/users/User');
const Class   = require('../../models/academic/Class');
const Subject = require('../../models/academic/Subject');
const { createUzbekSearchRegex } = require('../../utils/uzbekHelper');
const {
  normalizeCommandText, extractJsonObject, extractJsonArray,
  parseCount, successResponse, errorResponse
} = require('../utils/responseParser');

const uzReg = (text) => new RegExp(createUzbekSearchRegex(text), 'i');

// ─── Yordamchi: unique phone va studentId ─────────────────────────────────────
const genPhone = async () => {
  for (let i = 0; i < 20; i++) {
    const p = `+99890${String(Math.floor(1000000 + Math.random() * 9000000))}`;
    if (!await User.exists({ phone: p })) return p;
  }
  throw new Error("Unique demo telefon yaratib bo'lmadi.");
};

const genStudentId = async (prefix = 'ST') => {
  for (let i = 0; i < 20; i++) {
    const id = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    if (!await User.exists({ studentId: id })) return id;
  }
  throw new Error("Unique studentId yaratib bo'lmadi.");
};

// ─── O'QUVCHI YARATISH ────────────────────────────────────────────────────────
const genStudentsWithAI = async (model, msg, count) => {
  const prompt =
    `So'rov: "${msg}"\n${count} ta o'quvchi ma'lumotini yarat.\n` +
    `Faqat JSON Array: [{"firstName":"string","lastName":"string","studentId":"string|null",` +
    `"dateOfBirth":"YYYY-MM-DD|null","passportNumber":"string|null","phone":"string|null",` +
    `"address":"string|null","password":"string|null","parentName":"string|null",` +
    `"parentPhone":"string|null","parentJshshir":"string|null","className":"string|null",` +
    `"registrationDate":"YYYY-MM-DD|null","monthlyFee":"number|null","isActive":"boolean|null",` +
    `"leftDate":"YYYY-MM-DD|null"}]`;
  try {
    const res  = await model.generateContent(prompt);
    const data = extractJsonArray(res.response.text().trim());
    if (Array.isArray(data) && data.length > 0) {
      return data.slice(0, count).map(s => ({
        firstName: String(s.firstName || 'Oquvchi').trim(),
        lastName:  String(s.lastName  || '').trim(),
        studentId: s.studentId || null,
        dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : null,
        passportNumber: s.passportNumber || null,
        phone: s.phone || null, address: s.address || null,
        password: s.password || null, parentName: s.parentName || null,
        parentPhone: s.parentPhone || null, parentJshshir: s.parentJshshir || null,
        className: s.className || null,
        registrationDate: s.registrationDate ? new Date(s.registrationDate) : new Date(),
        monthlyFee: Number(s.monthlyFee) || null,
        isActive: s.isActive !== undefined ? s.isActive : true,
        leftDate: s.leftDate ? new Date(s.leftDate) : null
      }));
    }
  } catch (e) { console.error('AI student gen failed:', e.message); }
  return null;
};

const createOneStudent = async (data, intent, classDoc) => {
  const [phone, studentId] = await Promise.all([
    data.phone || genPhone(),
    data.studentId || genStudentId(intent.isDemo ? 'DEMO' : 'ST')
  ]);
  const password = data.password || (intent.isDemo ? 'Demo1234' : 'Student123');
  let classId = classDoc?._id || null;
  let classText = classDoc ? `${classDoc.grade}-${classDoc.section}` : 'sinfga biriktirilmadi';
  if (!classId && data.className) {
    const found = await Class.findOne({ name: data.className.toUpperCase(), isActive: true });
    if (found) { classId = found._id; classText = data.className.toUpperCase(); }
  }
  const student = new User({
    firstName: data.firstName, lastName: data.lastName || '', role: 'student',
    phone, password, studentId, classId,
    dateOfBirth: data.dateOfBirth || null, passportNumber: data.passportNumber || null,
    address: data.address || null,
    parentName: data.parentName || (intent.isDemo ? 'Demo ota-ona' : null),
    parentPhone: data.parentPhone || null, parentJshshir: data.parentJshshir || null,
    registrationDate: data.registrationDate || new Date(),
    monthlyFee: data.monthlyFee !== null ? data.monthlyFee : (intent.monthlyFee || 0),
    isActive: data.isActive !== undefined ? data.isActive : true,
    leftDate: data.leftDate || null
  });
  await student.save();
  if (classId) await Class.findByIdAndUpdate(classId, { $addToSet: { students: student._id } });
  return { student, password, classText };
};

const parseCreateStudent = (msg) => {
  const n = normalizeCommandText(msg);
  if (!/(o'quvchi|oquvchi|student|ученик)/i.test(n)) return null;
  if (!/(qo'sh|qosh|yarat|kirit|add|create|insert|добавь|создай)/i.test(n)) return null;
  const cm = n.match(/\b(\d{1,2})\s*[- ]\s*([a-zA-Z])\b/);
  const fm = n.match(/(?:oylik|tolov|to'lov|fee|оплата)\D{0,12}(\d[\d\s]*)/i);
  return {
    type: 'create_student',
    isDemo: /\b(demo|test|sinov|демо|тест)\b/i.test(n),
    requestedCount: parseCount(msg),
    originalMessage: msg,
    classGrade: cm ? Number(cm[1]) : null,
    classSection: cm ? cm[2].toUpperCase() : null,
    monthlyFee: fm ? Number(fm[1].replace(/\s/g, '')) : 0
  };
};

const handleCreateStudent = async (intent, model) => {
  const count = intent.requestedCount || 1;
  const classDoc = intent.classGrade && intent.classSection
    ? await Class.findOne({ grade: intent.classGrade, section: intent.classSection, isActive: true })
    : null;
  let list = model ? await genStudentsWithAI(model, intent.originalMessage, count) : null;
  if (!list || !list.length) {
    list = Array.from({ length: count }, (_, i) => ({ firstName: 'Demo', lastName: `Oquvchi${count > 1 ? i+1 : ''}`, dateOfBirth: null }));
  }
  if (count === 1) {
    const { student, password, classText } = await createOneStudent(list[0], intent, classDoc);
    const dob = student.dateOfBirth ? `\nTug'ilgan sana: ${new Date(student.dateOfBirth).toLocaleDateString('uz-UZ')}` : '';
    return successResponse('create_student',
      `O'quvchi yaratildi.\nIsm-familiya: ${student.firstName} ${student.lastName}${dob}\n` +
      `O'quvchi ID: ${student.studentId}\nTelefon: ${student.phone}\nParol: ${password}\nHolat: ${classText}`
    );
  }
  const results = [], errors = [];
  for (let i = 0; i < count; i++) {
    try { results.push(await createOneStudent(list[i] || list[list.length-1], intent, classDoc)); }
    catch (err) { errors.push(`#${i+1}: ${err.message}`); }
  }
  const lines = results.map((r,i) => {
    const dob = r.student.dateOfBirth ? ` | ${new Date(r.student.dateOfBirth).getFullYear()}` : '';
    return `${i+1}. ${r.student.firstName} ${r.student.lastName}${dob} | ${r.student.studentId} | ${r.student.phone} | Parol: ${r.password}`;
  }).join('\n');
  return successResponse('create_students_bulk',
    `${results.length} ta o'quvchi yaratildi (${results[0]?.classText || 'sinfga biriktirilmadi'}).\n` +
    (errors.length ? `Xatoliklar: ${errors.length}\n` : '') + `\nRo'yxat:\n${lines}`
  );
};

// ─── O'QUVCHI TAHRIRLASH ──────────────────────────────────────────────────────
const parseEditStudent = (msg) => {
  const n = normalizeCommandText(msg);
  const wantsEdit = /(o'zgartir|tahrirlash|yangilashtir|update|edit|change|set|assign|biriktir|faollashtir|activate|deactivate|измени|обнови)/i.test(n);
  const wantsStudent = /(o'quvchi|oquvchi|student|ученик)/i.test(n);
  const hasId = /\b(ST|DEMO)-[A-Z0-9]+-[A-Z0-9]+/i.test(msg);
  if ((!wantsEdit || !wantsStudent) && !hasId) return null;
  if (/(qo'sh|qosh|yarat|kirit|add|create|insert|добавь|создай)/i.test(n) && !wantsEdit) return null;
  return { type: 'edit_student' };
};

const handleEditStudent = async (model, msg) => {
  const prompt =
    `O'quvchi ma'lumotlarini tahrirlash.\nSo'rov: "${msg}"\n` +
    `JSON qaytар: {"studentIdentifier":"ismi yoki ID","updates":{"firstName":null,"lastName":null,` +
    `"className":null,"monthlyFee":null,"isActive":null,"dateOfBirth":null,"phone":null,` +
    `"address":null,"passportNumber":null,"parentName":null,"parentPhone":null,"parentJshshir":null,` +
    `"leftDate":null,"password":null}}`;
  let parsed = null;
  try { parsed = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI edit parse:', e.message); }
  if (!parsed?.studentIdentifier) {
    return errorResponse('edit_student_fail', "O'quvchi ismini yoki ID sini ko'rsating.");
  }
  const id = String(parsed.studentIdentifier).trim();
  let student = null;
  const idM = id.match(/\b(ST|DEMO)-[A-Z0-9]+-[A-Z0-9]+/i);
  if (idM) student = await User.findOne({ studentId: idM[0].toUpperCase(), role: 'student' });
  if (!student) {
    const parts = id.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) student = await User.findOne({ role: 'student', firstName: uzReg(parts[0]), lastName: uzReg(parts.slice(1).join(' ')) });
    if (!student) student = await User.findOne({ role: 'student', $or: [{ firstName: uzReg(parts[0]) }, { lastName: uzReg(parts[0]) }] });
  }
  if (!student) return errorResponse('edit_student_notfound', `"${id}" ismli o'quvchi topilmadi.`);
  const upd = parsed.updates || {};
  const changed = [];
  for (const f of ['firstName','lastName','phone','address','dateOfBirth','passportNumber','parentName','parentPhone','parentJshshir','monthlyFee','isActive','leftDate','password']) {
    if (upd[f] !== null && upd[f] !== undefined && upd[f] !== 'null') { student[f] = upd[f]; changed.push(`${f}: ${upd[f]}`); }
  }
  if (upd.className) {
    const cls = await Class.findOne({ name: upd.className.toUpperCase(), isActive: true });
    if (cls) { student.classId = cls._id; changed.push(`sinf: ${upd.className}`); }
    else changed.push(`sinf: "${upd.className}" topilmadi`);
  }
  if (!changed.length) return errorResponse('edit_student_no_changes', `${student.firstName} ${student.lastName} uchun o'zgartirish aniqlanmadi.`);
  await student.save();
  return successResponse('edit_student',
    `O'quvchi yangilandi: ${student.firstName} ${student.lastName} (${student.studentId})\nO'zgartirishlar:\n${changed.map(c=>`- ${c}`).join('\n')}`
  );
};

// ─── SINF YARATISH ────────────────────────────────────────────────────────────
const parseCreateClass = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(sinf|class|класс)/i.test(n) && /(och|yarat|qo'sh|create|add|создай)/i.test(n) && !/(o'quvchi|student)/i.test(n)) return { type: 'create_class' };
  return null;
};

const handleCreateClass = async (model, msg) => {
  const prompt = `Sinf yaratish.\nSo'rov: "${msg}"\nJSON: {"grade":"raqam","section":"harf","teacherName":"rahbar ismi","academicYear":"2024-2025","group":null,"room":null}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI class parse:', e.message); }
  if (!p?.grade || !p?.section) return errorResponse('create_class_fail', "Sinf raqami va harfini ko'rsating. Masalan: \"5-B sinfini och\"");
  let teacher = null;
  if (p.teacherName) { const r = uzReg(p.teacherName); teacher = await User.findOne({ role: 'teacher', $or: [{ firstName: r }, { lastName: r }] }); }
  if (!teacher && p.teacherName) return errorResponse('create_class_noteacher', `"${p.teacherName}" o'qituvchi topilmadi.`);
  if (!teacher) return errorResponse('create_class_needteacher', "Sinf rahbarini ko'rsating.");
  const exists = await Class.findOne({ grade: Number(p.grade), section: String(p.section).toUpperCase(), academicYear: p.academicYear, isActive: true });
  if (exists) return errorResponse('create_class_exists', `${p.grade}-${p.section} sinfi allaqachon mavjud.`);
  try {
    await new Class({ name: `${p.grade}-${p.section}`, grade: Number(p.grade), section: String(p.section).toUpperCase(), group: p.group || null, classTeacher: teacher._id, academicYear: p.academicYear || '2024-2025', room: p.room || null, isActive: true }).save();
    return successResponse('create_class_success', `${p.grade}-${p.section} sinfi yaratildi. Rahbar: ${teacher.firstName} ${teacher.lastName}.`);
  } catch (err) { return errorResponse('create_class_error', `Sinf yaratishda xato: ${err.message}`); }
};

// ─── BAHO QO'YISH ─────────────────────────────────────────────────────────────
const parseAddGrade = (msg) => {
  const n = normalizeCommandText(msg);
  const hasGrade  = /(baho|ball|grade|score|mark|оценка)/i.test(n);
  const hasAction = /(qo'sh|qosh|yoz|qo'y|qoy|set|add|put|give|поставь|добавь)/i.test(n);
  const hasSubject = /(matematika|fizika|ona tili|ingliz|rus|tarix|kimyo|biologiya|informatika|fan|subject)/i.test(n);
  if ((hasGrade && hasAction) || (hasSubject && hasAction)) return { type: 'add_grade' };
  return null;
};

const handleAddGrade = async (model, msg) => {
  const prompt = `Baho qo'yish.\nSo'rov: "${msg}"\nJSON: {"studentIdentifier":"ismi yoki ID","subjectName":"fan","score":"ball","type":"daily|exam|quiz|assignment|midterm|final","isExam":"true|false","date":"YYYY-MM-DD","description":null}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI grade parse:', e.message); }
  if (!p?.studentIdentifier || !p?.subjectName || p?.score === undefined) {
    return errorResponse('add_grade_fail', "O'quvchi ismi, fan va ballni ko'rsating. Masalan: \"Abbosga Matematikadan 5 baho qo'y\"");
  }
  const id = String(p.studentIdentifier).trim();
  const reg = uzReg(id);
  const parts = id.split(/\s+/).filter(Boolean);
  let s = await User.findOne({ role: 'student', $or: [{ studentId: id.toUpperCase() }, { firstName: uzReg(parts[0]), lastName: uzReg(parts[1]||'') }] });
  if (!s) s = await User.findOne({ role: 'student', $or: [{ firstName: reg }, { lastName: reg }] });
  if (!s)           return errorResponse('add_grade_notfound', `"${id}" o'quvchi topilmadi.`);
  if (!s.isActive)  return errorResponse('add_grade_inactive', `${s.firstName} ${s.lastName} nofaol.`);
  if (!s.classId)   return errorResponse('add_grade_noclass', `${s.firstName} ${s.lastName} sinfga biriktirilmagan.`);
  const subject = await Subject.findOne({ name: new RegExp(String(p.subjectName).trim(), 'i'), isActive: true });
  if (!subject) return errorResponse('add_grade_nosubject', `"${p.subjectName}" fani topilmadi.`);
  const score  = Number(p.score);
  const isExam = p.isExam === true || p.isExam === 'true';
  if (!isExam && score > 0.5) return errorResponse('add_grade_invalid_score', `Kundalik uchun maksimal 0.5 ball. Siz ${score} kiritdingiz.`);
  let gradeDate = new Date(p.date || Date.now());
  if (isNaN(gradeDate.getTime())) {
    gradeDate = new Date();
  }
  gradeDate.setHours(12, 0, 0, 0);
  return { handled: true, action: 'add_grade_pending', data: { student: s._id, subject: subject._id, class: s.classId, score, maxScore: isExam ? 100 : 1, isExam, type: p.type || (isExam ? 'exam' : 'daily'), date: gradeDate, description: p.description || "AI orqali qo'shildi" }, studentName: `${s.firstName} ${s.lastName}`, subjectName: subject.name };
};

// ─── DAVOMAT ──────────────────────────────────────────────────────────────────
const parseAttendance = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(davomat|keldi|kelmadi|qatnash|attendance|present|absent|late)/i.test(n) ||
      (/(yoz|belgila|mark|set)/i.test(n) && /(darsda|sinfda)/i.test(n))) return { type: 'set_attendance' };
  return null;
};

const handleAttendance = async (model, msg) => {
  const prompt = `Davomat belgilash.\nSo'rov: "${msg}"\nJSON: {"scope":"individual|class","studentIdentifier":"ismi|ID","classGrade":"sinf raqami","classSection":"harf","status":"present|absent|late","period":"1-10","date":"YYYY-MM-DD"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI attendance parse:', e.message); }
  if (!p) return null;
  let date = new Date(p.date || Date.now());
  if (isNaN(date.getTime())) {
    date = new Date();
  }
  date.setHours(12, 0, 0, 0);
  const period = Number(p.period) || 1;
  const status = p.status === 'absent' ? 'kelmadi' : (p.status === 'late' ? 'kechikdi' : 'keldi');
  if (p.scope === 'individual' && p.studentIdentifier) {
    const id = String(p.studentIdentifier).trim();
    const reg = uzReg(id);
    const s = await User.findOne({ role: 'student', $or: [{ studentId: id.toUpperCase() }, { firstName: reg }, { lastName: reg }] });
    if (!s) return errorResponse('attendance_notfound', `"${id}" o'quvchi topilmadi.`);
    return { handled: true, action: 'set_attendance_pending', data: { student: s._id, class: s.classId, status, date, period }, message: `${s.firstName} ${s.lastName} "${status}" deb belgilandi.` };
  }
  if (p.scope === 'class' && p.classGrade && p.classSection) {
    const cls = await Class.findOne({ grade: Number(p.classGrade), section: String(p.classSection).toUpperCase(), isActive: true }).populate('students');
    if (!cls) return errorResponse('attendance_notfound', `${p.classGrade}-${p.classSection} sinfi topilmadi.`);
    return { handled: true, action: 'set_attendance_bulk_pending', classId: cls._id, students: cls.students.map(s => s._id), status, date, period, message: `${cls.grade}-${cls.section} sinfidagi ${cls.students.length} ta o'quvchi "${status}" deb belgilandi.` };
  }
  return null;
};

// ─── ASOSIY DISPATCHER ────────────────────────────────────────────────────────
exports.tryHandleAction = async (message, model) => {
  if (parseEditStudent(message))   return handleEditStudent(model, message);
  if (parseCreateStudent(message)) return handleCreateStudent(parseCreateStudent(message), model);
  if (parseCreateClass(message))   return handleCreateClass(model, message);
  if (parseAddGrade(message))      return handleAddGrade(model, message);
  if (parseAttendance(message))    return handleAttendance(model, message);
  return null;
};
