/**
 * MANAGEMENT MODULE - Controller
 * ================================
 * Boshqaruv bo'limi uchun AI action handler'lari.
 *
 * QAMRAB OLINGAN ACTION'LAR:
 * 1. Xodim/o'qituvchi yaratish (teacher, accountant, supervisor, hr, reception, callcenter)
 * 2. Xodim tahrirlash
 * 3. Xodim o'chirish (faollashtirish/nofaollashtirish)
 * 4. Xodim qidirish va ma'lumot olish
 * 5. Xodimlar statistikasi
 * 6. Fan yaratish va boshqarish
 */

const User    = require('../../models/users/User');
const Subject = require('../../models/academic/Subject');
const Class   = require('../../models/academic/Class');
const { createUzbekSearchRegex } = require('../../utils/uzbekHelper');
const {
  normalizeCommandText, extractJsonObject, extractJsonArray,
  parseCount, successResponse, errorResponse
} = require('../utils/responseParser');

const uzReg = (text) => new RegExp(createUzbekSearchRegex(text), 'i');

// ─── ROL ANIQLASH ────────────────────────────────────────────────────────────
const ROLE_KEYWORDS = {
  teacher:    /(o'qituvchi|oqituvchi|teacher|учитель|преподаватель)/i,
  accountant: /(hisobchi|kassir|buxgalter|accountant|бухгалтер)/i,
  hr:         /(\bhr\b|kadrlar|кадры)/i,
  reception:  /(reception|qabulxona|qabulchi|администратор|reception)/i,
  callcenter: /(call.?center|call.?markaz|qo'ng'iroq markazi|colcenter|колл.?центр)/i,
  supervisor: /(supervisor|nazoratchi|nazorat|надзор|супервайзер)/i
};

const detectRoleFromMessage = (msg) => {
  const n = normalizeCommandText(msg);
  for (const [role, regex] of Object.entries(ROLE_KEYWORDS)) {
    if (regex.test(n)) return role;
  }
  return null;
};

const roleLabel = (role) => ({
  teacher: "O'qituvchi",
  accountant: 'Hisobchi',
  hr: 'HR xodim',
  reception: 'Reception',
  callcenter: 'Call markaz xodimi',
  supervisor: 'Nazoratchi',
  director: 'Direktor',
  admin: 'Admin'
}[role] || role);

// ─── Yordamchi: unique phone va teacherId ─────────────────────────────────────
const genPhone = async () => {
  for (let i = 0; i < 20; i++) {
    const p = `+99890${String(Math.floor(1000000 + Math.random() * 9000000))}`;
    if (!await User.exists({ phone: p })) return p;
  }
  throw new Error("Unique telefon yaratib bo'lmadi.");
};

const genTeacherId = async (prefix = 'TCH') => {
  for (let i = 0; i < 20; i++) {
    const id = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    if (!await User.exists({ teacherId: id })) return id;
  }
  throw new Error("Unique teacherId yaratib bo'lmadi.");
};

// ─── XODIM YARATISH ──────────────────────────────────────────────────────────
const parseCreateStaff = (msg) => {
  const n = normalizeCommandText(msg);
  const role = detectRoleFromMessage(msg);
  if (!role) return null;
  if (!/(qo'sh|qosh|yarat|kirit|add|create|insert|добавь|создай|ро'yxatga|royxatga)/i.test(n)) return null;
  if (/(o'quvchi|oquvchi|student|ученик)/i.test(n)) return null;
  return {
    type: 'create_staff',
    role,
    isDemo: /\b(demo|test|sinov|демо|тест)\b/i.test(n),
    requestedCount: parseCount(msg),
    originalMessage: msg
  };
};

const genStaffWithAI = async (model, msg, role, count) => {
  const prompt =
    `So'rov: "${msg}"\nRol: ${role}\n${count} ta xodim ma'lumotini yarat.\n` +
    `Faqat JSON Array: [{"firstName":"string","lastName":"string","phone":"string|null",` +
    `"password":"string|null","email":"string|null","specialty":"string|null",` +
    `"experience":"string|null","education":"string|null","address":"string|null",` +
    `"dateOfBirth":"YYYY-MM-DD|null","passportSeriesNumber":"string|null",` +
    `"jshshir":"string|null","salaryPerLesson":"number|null",` +
    `"subjectNames":["fan nomlari (faqat teacher uchun)"]}]`;
  try {
    const res  = await model.generateContent(prompt);
    const data = extractJsonArray(res.response.text().trim());
    if (Array.isArray(data) && data.length > 0) {
      return data.slice(0, count).map(s => ({
        firstName: String(s.firstName || 'Xodim').trim(),
        lastName:  String(s.lastName  || '').trim(),
        phone: s.phone || null,
        password: s.password || null,
        email: s.email || null,
        specialty: s.specialty || null,
        experience: s.experience || null,
        education: s.education || null,
        address: s.address || null,
        dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : null,
        passportSeriesNumber: s.passportSeriesNumber || null,
        jshshir: s.jshshir || null,
        salaryPerLesson: Number(s.salaryPerLesson) || null,
        subjectNames: Array.isArray(s.subjectNames) ? s.subjectNames : []
      }));
    }
  } catch (e) { console.error('AI staff gen failed:', e.message); }
  return null;
};

const createOneStaff = async (data, role, intent) => {
  const [phone] = await Promise.all([data.phone || genPhone()]);
  const password = data.password || (intent.isDemo ? 'Demo1234' : 'Xodim123!');

  const userData = {
    firstName: data.firstName,
    lastName:  data.lastName || '',
    role,
    phone,
    password,
    address: data.address || null,
    dateOfBirth: data.dateOfBirth || null,
    isActive: true
  };

  if (data.email) userData.email = data.email.toLowerCase();
  if (data.passportSeriesNumber) userData.passportSeriesNumber = String(data.passportSeriesNumber).toUpperCase();
  if (data.jshshir) userData.jshshir = data.jshshir;
  if (data.specialty) userData.specialty = data.specialty;
  if (data.experience) userData.experience = data.experience;
  if (data.education) userData.education = data.education;

  if (role === 'teacher') {
    userData.teacherId = await genTeacherId(intent.isDemo ? 'DEMO' : 'TCH');
    userData.salaryPerLesson = data.salaryPerLesson || 50000;

    if (data.subjectNames && data.subjectNames.length > 0) {
      const subjects = await Subject.find({
        $or: data.subjectNames.map(n => ({ name: new RegExp(String(n).trim(), 'i') })),
        isActive: true
      });
      if (subjects.length > 0) {
        userData.subjects = subjects.map(s => s._id);
      }
    }
  }

  const staff = new User(userData);
  await staff.save();

  // Sync teacher to subjects
  if (role === 'teacher' && userData.subjects) {
    await Subject.updateMany(
      { _id: { $in: userData.subjects } },
      { $addToSet: { teachers: staff._id } }
    );
  }

  return { staff, password };
};

const handleCreateStaff = async (intent, model) => {
  const { role } = intent;
  const count = intent.requestedCount || 1;
  let list = model ? await genStaffWithAI(model, intent.originalMessage, role, count) : null;

  if (!list || !list.length) {
    list = Array.from({ length: count }, (_, i) => ({
      firstName: 'Demo',
      lastName:  `${roleLabel(role)}${count > 1 ? i+1 : ''}`
    }));
  }

  if (count === 1) {
    try {
      const { staff, password } = await createOneStaff(list[0], role, intent);
      const subj = staff.subjects?.length ? `\nFanlar soni: ${staff.subjects.length}` : '';
      const tid  = staff.teacherId ? `\nXodim ID: ${staff.teacherId}` : '';
      const sal  = staff.salaryPerLesson ? `\nDars narxi: ${staff.salaryPerLesson.toLocaleString()} so'm` : '';
      return successResponse('create_staff',
        `${roleLabel(role)} yaratildi.\nIsm-familiya: ${staff.firstName} ${staff.lastName}${tid}\n` +
        `Telefon: ${staff.phone}\nParol: ${password}${sal}${subj}`
      );
    } catch (err) {
      return errorResponse('create_staff_error', `${roleLabel(role)} yaratishda xato: ${err.message}`);
    }
  }

  const results = [], errors = [];
  for (let i = 0; i < count; i++) {
    try { results.push(await createOneStaff(list[i] || list[list.length-1], role, intent)); }
    catch (err) { errors.push(`#${i+1}: ${err.message}`); }
  }
  const lines = results.map((r,i) => {
    const tid = r.staff.teacherId ? ` | ${r.staff.teacherId}` : '';
    return `${i+1}. ${r.staff.firstName} ${r.staff.lastName}${tid} | ${r.staff.phone} | Parol: ${r.password}`;
  }).join('\n');
  return successResponse('create_staff_bulk',
    `${results.length} ta ${roleLabel(role)} yaratildi.\n` +
    (errors.length ? `Xatoliklar: ${errors.length}\n` : '') + `\nRo'yxat:\n${lines}`
  );
};

// ─── XODIM TAHRIRLASH ────────────────────────────────────────────────────────
const parseEditStaff = (msg) => {
  const n = normalizeCommandText(msg);
  const role = detectRoleFromMessage(msg);
  if (!role) return null;
  if (/(o'quvchi|oquvchi|student)/i.test(n)) return null;
  const wantsEdit = /(o'zgartir|tahrirlash|yangilashtir|update|edit|change|set|assign|biriktir|faollashtir|nofaollashtir|aktivlashtir|deactivate|activate|измени|обнови|переведи|редактируй)/i.test(n);
  if (!wantsEdit) return null;
  if (/(qo'sh|yarat|create|add|insert|добавь|создай)/i.test(n) && !wantsEdit) return null;
  return { type: 'edit_staff', role };
};

const handleEditStaff = async (model, msg, role) => {
  const prompt =
    `Xodim ma'lumotlarini tahrirlash.\nRol: ${role}\nSo'rov: "${msg}"\n` +
    `JSON: {"staffIdentifier":"ismi yoki ID","updates":{"firstName":null,"lastName":null,` +
    `"phone":null,"address":null,"email":null,"specialty":null,"experience":null,` +
    `"education":null,"salaryPerLesson":null,"isActive":null,"dateOfBirth":null,` +
    `"passportSeriesNumber":null,"jshshir":null,"password":null,"subjectNames":[]}}`;

  let parsed = null;
  try { parsed = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI edit staff parse:', e.message); }
  if (!parsed?.staffIdentifier) {
    return errorResponse('edit_staff_fail', `${roleLabel(role)} ismini yoki ID sini ko'rsating.`);
  }

  const id = String(parsed.staffIdentifier).trim();
  let staff = null;
  const tidM = id.match(/\b(TCH|DEMO)-[A-Z0-9]+-[A-Z0-9]+/i);
  if (tidM) staff = await User.findOne({ teacherId: tidM[0].toUpperCase(), role });
  if (!staff) {
    const parts = id.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) staff = await User.findOne({ role, firstName: uzReg(parts[0]), lastName: uzReg(parts.slice(1).join(' ')) });
    if (!staff) staff = await User.findOne({ role, $or: [{ firstName: uzReg(parts[0]) }, { lastName: uzReg(parts[0]) }] });
  }
  if (!staff) return errorResponse('edit_staff_notfound', `"${id}" ${roleLabel(role)} topilmadi.`);

  const upd = parsed.updates || {};
  const changed = [];

  for (const f of ['firstName','lastName','phone','address','email','specialty','experience','education','dateOfBirth','passportSeriesNumber','jshshir','salaryPerLesson','isActive','password']) {
    if (upd[f] !== null && upd[f] !== undefined && upd[f] !== 'null') {
      staff[f] = upd[f];
      changed.push(`${f}: ${upd[f]}`);
    }
  }

  if (role === 'teacher' && Array.isArray(upd.subjectNames) && upd.subjectNames.length > 0) {
    const subs = await Subject.find({
      $or: upd.subjectNames.map(n => ({ name: new RegExp(String(n).trim(), 'i') })),
      isActive: true
    });
    if (subs.length > 0) {
      const oldSubs = (staff.subjects || []).map(s => s.toString());
      const newSubs = subs.map(s => s._id);
      staff.subjects = newSubs;
      const removeIds = oldSubs.filter(s => !newSubs.map(n => n.toString()).includes(s));
      const addIds    = newSubs.filter(s => !oldSubs.includes(s.toString()));
      if (removeIds.length) await Subject.updateMany({ _id: { $in: removeIds } }, { $pull: { teachers: staff._id } });
      if (addIds.length)    await Subject.updateMany({ _id: { $in: addIds } }, { $addToSet: { teachers: staff._id } });
      changed.push(`fanlar: ${subs.map(s => s.name).join(', ')}`);
    }
  }

  if (!changed.length) {
    return errorResponse('edit_staff_no_changes', `${staff.firstName} ${staff.lastName} uchun o'zgartirish aniqlanmadi.`);
  }
  await staff.save();
  return successResponse('edit_staff',
    `${roleLabel(role)} yangilandi: ${staff.firstName} ${staff.lastName}\nO'zgartirishlar:\n${changed.map(c=>`- ${c}`).join('\n')}`
  );
};

// ─── XODIM O'CHIRISH ─────────────────────────────────────────────────────────
const parseDeleteStaff = (msg) => {
  const n = normalizeCommandText(msg);
  const role = detectRoleFromMessage(msg);
  if (!role) return null;
  if (/(o'quvchi|oquvchi|student)/i.test(n)) return null;
  if (!/(o'chir|ochir|delete|remove|удали|убери|olib tashla|chiqarib)/i.test(n)) return null;
  return { type: 'delete_staff', role };
};

const handleDeleteStaff = async (model, msg, role) => {
  const prompt = `Xodimni o'chirish.\nRol: ${role}\nSo'rov: "${msg}"\nJSON: {"staffIdentifier":"ismi yoki ID"}`;
  let parsed = null;
  try { parsed = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI delete staff parse:', e.message); }
  if (!parsed?.staffIdentifier) {
    return errorResponse('delete_staff_fail', `${roleLabel(role)} ismini yoki ID sini ko'rsating.`);
  }
  const id = String(parsed.staffIdentifier).trim();
  let staff = null;
  const tidM = id.match(/\b(TCH|DEMO)-[A-Z0-9]+-[A-Z0-9]+/i);
  if (tidM) staff = await User.findOne({ teacherId: tidM[0].toUpperCase(), role });
  if (!staff) {
    const parts = id.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) staff = await User.findOne({ role, firstName: uzReg(parts[0]), lastName: uzReg(parts.slice(1).join(' ')) });
    if (!staff) staff = await User.findOne({ role, $or: [{ firstName: uzReg(parts[0]) }, { lastName: uzReg(parts[0]) }] });
  }
  if (!staff) return errorResponse('delete_staff_notfound', `"${id}" ${roleLabel(role)} topilmadi.`);

  // Soft delete - deactivate
  if (role === 'teacher' && staff.subjects?.length) {
    await Subject.updateMany({ teachers: staff._id }, { $pull: { teachers: staff._id } });
  }
  staff.isActive = false;
  await staff.save();

  return successResponse('delete_staff',
    `${roleLabel(role)} nofaollashtirildi: ${staff.firstName} ${staff.lastName}`
  );
};

// ─── XODIM QIDIRISH ──────────────────────────────────────────────────────────
const parseStaffQuery = (msg) => {
  const n = normalizeCommandText(msg);
  const role = detectRoleFromMessage(msg);
  if (!role) return null;
  if (/(o'quvchi|oquvchi|student)/i.test(n)) return null;
  if (/(qo'sh|yarat|create|add|insert|o'chir|delete|tahrirlash|edit|update)/i.test(n)) return null;
  if (/(ko'rsat|korsat|qidir|topil|show|get|find|list|chiqar|berib|nechta|qancha|kim|найди|покажи|сколько)/i.test(n)) {
    return { type: 'staff_query', role };
  }
  return null;
};

const handleStaffQuery = async (model, msg, role) => {
  const prompt = `Xodim qidirish so'rovi.\nRol: ${role}\nSo'rov: "${msg}"\nJSON: {"target":"list_all|count|find_one","staffIdentifier":"ismi (find_one uchun)","filter":"all|active|inactive"}`;
  let parsed = null;
  try { parsed = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI staff query parse:', e.message); }
  parsed = parsed || { target: 'list_all', filter: 'active' };

  const filter = { role };
  if (parsed.filter === 'active')   filter.isActive = true;
  if (parsed.filter === 'inactive') filter.isActive = false;

  if (parsed.target === 'count') {
    const count = await User.countDocuments(filter);
    return successResponse('staff_count', `${roleLabel(role)}lar soni: ${count} ta`);
  }

  if (parsed.target === 'find_one' && parsed.staffIdentifier) {
    const id = String(parsed.staffIdentifier).trim();
    const parts = id.split(/\s+/).filter(Boolean);
    let staff = await User.findOne({ role, $or: [{ firstName: uzReg(parts[0]) }, { lastName: uzReg(parts[0]) }] }).populate('subjects', 'name');
    if (!staff) return errorResponse('staff_not_found', `"${id}" ${roleLabel(role)} topilmadi.`);
    const subs = staff.subjects?.length ? `\nFanlar: ${staff.subjects.map(s => s.name).join(', ')}` : '';
    const tid  = staff.teacherId ? `\nID: ${staff.teacherId}` : '';
    return successResponse('staff_found',
      `${roleLabel(role)} topildi: ${staff.firstName} ${staff.lastName}${tid}\nTelefon: ${staff.phone}\nHolat: ${staff.isActive ? 'faol' : 'nofaol'}${subs}`
    );
  }

  // Default: list
  const list = await User.find(filter).select('firstName lastName phone teacherId isActive salaryPerLesson').limit(50).lean();
  if (!list.length) return successResponse('staff_list_empty', `${roleLabel(role)}lar topilmadi.`);
  const lines = list.map((s,i) => `${i+1}. ${s.firstName} ${s.lastName} | ${s.phone || ''} | ${s.isActive ? 'faol' : 'nofaol'}`).join('\n');
  return successResponse('staff_list', `${roleLabel(role)}lar (${list.length} ta):\n${lines}`);
};

// ─── FAN YARATISH ────────────────────────────────────────────────────────────
const parseCreateSubject = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(fan|subject|предмет)/i.test(n) && /(yarat|qo'sh|och|create|add|создай)/i.test(n)) {
    return { type: 'create_subject' };
  }
  return null;
};

const handleCreateSubject = async (model, msg) => {
  const prompt = `Fan yaratish.\nSo'rov: "${msg}"\nJSON: {"name":"fan nomi","code":"qisqa kod (masalan: MATH)","description":null,"credits":3,"color":null}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI subject parse:', e.message); }
  if (!p?.name) return errorResponse('create_subject_fail', "Fan nomini ko'rsating. Masalan: \"Matematika fanini qo'shing\"");

  const code = (p.code || p.name.slice(0, 4).toUpperCase()).replace(/\s+/g, '');
  const exists = await Subject.findOne({ $or: [{ name: new RegExp(`^${p.name}$`, 'i') }, { code }] });
  if (exists) return errorResponse('create_subject_exists', `"${p.name}" yoki "${code}" kod allaqachon mavjud.`);

  try {
    const subj = await new Subject({
      name: p.name,
      code,
      description: p.description || '',
      credits: p.credits || 3,
      color: p.color || '#1e3a8a',
      isActive: true
    }).save();
    return successResponse('create_subject',
      `Fan yaratildi: ${subj.name} (${subj.code}), kredit: ${subj.credits}`
    );
  } catch (err) {
    return errorResponse('create_subject_error', `Fan yaratishda xato: ${err.message}`);
  }
};

// ─── XODIMLAR STATISTIKASI ──────────────────────────────────────────────────
const parseStaffStats = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(xodim|hodim|staff|employee|работник)/i.test(n) &&
      /(statistika|umumiy|hammasi|all|nechta|qancha|жалпы|статистика)/i.test(n)) {
    return { type: 'staff_stats' };
  }
  return null;
};

const handleStaffStats = async () => {
  const all = await User.find({ role: { $in: ['teacher', 'accountant', 'hr', 'reception', 'callcenter', 'supervisor', 'admin'] } }).select('role isActive').lean();
  const byRole = {};
  all.forEach(u => {
    if (!byRole[u.role]) byRole[u.role] = { total: 0, active: 0 };
    byRole[u.role].total++;
    if (u.isActive) byRole[u.role].active++;
  });
  const lines = Object.entries(byRole).map(([role, s]) => `- ${roleLabel(role)}: ${s.total} ta (faol: ${s.active})`).join('\n');
  return successResponse('staff_stats',
    `Xodimlar statistikasi:\n${lines}\n\nJami: ${all.length} ta (faol: ${all.filter(u => u.isActive).length})`
  );
};

// ─── ASOSIY DISPATCHER ────────────────────────────────────────────────────────
exports.tryHandleAction = async (message, model) => {
  if (parseStaffStats(message))       return handleStaffStats();
  if (parseCreateSubject(message))    return handleCreateSubject(model, message);
  if (parseDeleteStaff(message))      return handleDeleteStaff(model, message, parseDeleteStaff(message).role);
  if (parseEditStaff(message))        return handleEditStaff(model, message, parseEditStaff(message).role);
  if (parseCreateStaff(message))      return handleCreateStaff(parseCreateStaff(message), model);
  if (parseStaffQuery(message))       return handleStaffQuery(model, message, parseStaffQuery(message).role);
  return null;
};
