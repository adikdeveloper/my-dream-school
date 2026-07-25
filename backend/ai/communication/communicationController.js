/**
 * COMMUNICATION MODULE - Controller
 * ===================================
 * Aloqa bo'limi uchun AI action handler'lari.
 *
 * QAMRAB OLINGAN ACTION'LAR:
 * 1. Lid yaratish, tahrirlash, o'chirish, ko'rish
 * 2. E'lon (announcement) yaratish, e'lon qilish
 * 3. Lidlar statistikasi va so'rovlar
 */

const Lead          = require('../../models/communication/Lead');
const Announcement  = require('../../models/communication/Announcement');
const ParentContact = require('../../models/communication/ParentContact');
const User          = require('../../models/users/User');
const Class         = require('../../models/academic/Class');
const { extractJsonObject, normalizeCommandText, successResponse, errorResponse } = require('../utils/responseParser');
const { createUzbekSearchRegex } = require('../../utils/uzbekHelper');

const uzReg = (text) => new RegExp(createUzbekSearchRegex(text), 'i');

// ─── 1. LID YARATISH ─────────────────────────────────────────────────────────
const parseCreateLead = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(lid|lead|ariza|murojaat|заявка|лид)/i.test(n) &&
      /(yarat|qo'sh|qosh|kirit|qayd|create|add|insert|qabul|создай|добавь)/i.test(n)) {
    return { type: 'create_lead' };
  }
  return null;
};

const handleCreateLead = async (model, msg) => {
  const prompt = `Yangi lid yaratish.\nSo'rov: "${msg}"\nJSON: {"firstName":"ismi","lastName":"familiyasi","phone":"telefon","source":"Telegram|Instagram|Veb-sayt|Tavsiya|Boshqa","status":"Yangi","notes":null,"interestedCourse":null}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI lead parse:', e.message); }
  if (!p?.firstName || !p?.phone) {
    return errorResponse('create_lead_fail', "Lid uchun ism va telefon kerak. Masalan: \"Anvar uchun lid qo'sh, telefon: +998901234567\"");
  }
  try {
    const lead = await new Lead({
      firstName: String(p.firstName).trim(),
      lastName:  String(p.lastName || '').trim(),
      phone:     String(p.phone).trim(),
      source:    p.source || 'Boshqa',
      status:    p.status || 'Yangi',
      notes:     p.notes || '',
      interestedCourse: p.interestedCourse || ''
    }).save();
    return successResponse('create_lead',
      `Yangi lid qo'shildi: ${lead.firstName} ${lead.lastName}\n` +
      `Telefon: ${lead.phone}\nManba: ${lead.source}\nHolat: ${lead.status}` +
      (lead.interestedCourse ? `\nQiziqarli kurs: ${lead.interestedCourse}` : '')
    );
  } catch (err) {
    return errorResponse('create_lead_error', `Lid yaratishda xato: ${err.message}`);
  }
};

// ─── 2. LID TAHRIRLASH ──────────────────────────────────────────────────────
const parseEditLead = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(lid|lead|заявка|лид)/i.test(n) &&
      /(o'zgartir|tahrirlash|yangilashtir|update|edit|change|set|status|holat|измени|обнови)/i.test(n)) {
    return { type: 'edit_lead' };
  }
  return null;
};

const handleEditLead = async (model, msg) => {
  const prompt = `Lid tahrirlash.\nSo'rov: "${msg}"\nJSON: {"leadIdentifier":"ismi yoki telefon","updates":{"firstName":null,"lastName":null,"phone":null,"source":null,"status":"Yangi|Aloqaga chiqildi|Sinov darsida|O'quvchi bo'ldi|Rad etildi","notes":null,"interestedCourse":null}}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI edit lead parse:', e.message); }
  if (!p?.leadIdentifier) return errorResponse('edit_lead_fail', "Lid ismini yoki telefonini ko'rsating.");

  const id = String(p.leadIdentifier).trim();
  let lead = null;
  if (/^\+?\d/.test(id)) {
    lead = await Lead.findOne({ phone: new RegExp(id.replace(/\D/g, ''), 'i') });
  }
  if (!lead) {
    const parts = id.split(/\s+/).filter(Boolean);
    lead = await Lead.findOne({ $or: [{ firstName: uzReg(parts[0]) }, { lastName: uzReg(parts[0]) }] });
  }
  if (!lead) return errorResponse('edit_lead_notfound', `"${id}" lid topilmadi.`);

  const upd = p.updates || {};
  const changed = [];
  for (const f of ['firstName','lastName','phone','source','status','notes','interestedCourse']) {
    if (upd[f] !== null && upd[f] !== undefined && upd[f] !== 'null') {
      lead[f] = upd[f];
      changed.push(`${f}: ${upd[f]}`);
    }
  }
  if (!changed.length) return errorResponse('edit_lead_no_changes', `${lead.firstName} ${lead.lastName} uchun o'zgartirish aniqlanmadi.`);
  await lead.save();
  return successResponse('edit_lead',
    `Lid yangilandi: ${lead.firstName} ${lead.lastName}\nO'zgartirishlar:\n${changed.map(c=>`- ${c}`).join('\n')}`
  );
};

// ─── 3. LID O'CHIRISH ───────────────────────────────────────────────────────
const parseDeleteLead = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(lid|lead|заявка|лид)/i.test(n) &&
      /(o'chir|ochir|delete|remove|удали|убери)/i.test(n)) {
    return { type: 'delete_lead' };
  }
  return null;
};

const handleDeleteLead = async (model, msg) => {
  const prompt = `Lid o'chirish.\nSo'rov: "${msg}"\nJSON: {"leadIdentifier":"ismi yoki telefon"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI delete lead parse:', e.message); }
  if (!p?.leadIdentifier) return errorResponse('delete_lead_fail', "Lid ismini ko'rsating.");

  const id = String(p.leadIdentifier).trim();
  let lead = null;
  if (/^\+?\d/.test(id)) {
    lead = await Lead.findOne({ phone: new RegExp(id.replace(/\D/g, ''), 'i') });
  }
  if (!lead) {
    const parts = id.split(/\s+/).filter(Boolean);
    lead = await Lead.findOne({ $or: [{ firstName: uzReg(parts[0]) }, { lastName: uzReg(parts[0]) }] });
  }
  if (!lead) return errorResponse('delete_lead_notfound', `"${id}" lid topilmadi.`);
  await Lead.findByIdAndDelete(lead._id);
  return successResponse('delete_lead', `Lid o'chirildi: ${lead.firstName} ${lead.lastName} (${lead.phone})`);
};

// ─── 4. LIDLAR RO'YXATI ─────────────────────────────────────────────────────
const parseLeadList = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(lid|lead|ariza|заявка|лид)/i.test(n) &&
      /(ko'rsat|korsat|ro'yxat|royxat|hammasi|list|show|all|chiqar|nech|qancha|сколько|покажи|список)/i.test(n) &&
      !/(yarat|qo'sh|edit|tahrir|o'chir|delete)/i.test(n)) {
    return { type: 'lead_list' };
  }
  return null;
};

const handleLeadList = async (model, msg) => {
  const prompt = `Lidlar ro'yxati so'rovi.\nSo'rov: "${msg}"\nJSON: {"target":"list|count","filter":"all|new|contacted|trial|converted|rejected","source":null}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { /* default */ }
  p = p || { target: 'list', filter: 'all' };

  const filter = {};
  const statusMap = { new: 'Yangi', contacted: 'Aloqaga chiqildi', trial: 'Sinov darsida', converted: "O'quvchi bo'ldi", rejected: 'Rad etildi' };
  if (p.filter && statusMap[p.filter]) filter.status = statusMap[p.filter];
  if (p.source) filter.source = new RegExp(p.source, 'i');

  if (p.target === 'count') {
    const c = await Lead.countDocuments(filter);
    return successResponse('lead_count', `Topilgan lidlar soni: ${c} ta`);
  }
  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(20);
  if (!leads.length) return successResponse('lead_list_empty', "Lidlar topilmadi.");
  const lines = leads.map((l,i) => `${i+1}. ${l.firstName} ${l.lastName || ''} | ${l.phone} | ${l.source} | ${l.status}`).join('\n');
  return successResponse('lead_list', `Lidlar (${leads.length} ta):\n${lines}`);
};

// ─── 5. E'LON YARATISH ──────────────────────────────────────────────────────
const parseCreateAnnouncement = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(e'lon|elon|xabar|announcement|объявление|оповещение)/i.test(n) &&
      /(yarat|chiqar|yubor|qo'sh|elon qil|elon ber|create|publish|send|опублик|объяви|разошли)/i.test(n)) {
    return { type: 'create_announcement' };
  }
  return null;
};

const handleCreateAnnouncement = async (model, msg, authorId) => {
  const prompt = `E'lon yaratish.\nSo'rov: "${msg}"\nJSON: {"title":"sarlavha","content":"e'lon matni","targetAudience":"all|students|teachers|parents|class","targetClassName":"sinf nomi (class uchun, masalan 5-A)","priority":"low|normal|high|urgent","publish":true}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { console.error('AI announcement parse:', e.message); }
  if (!p?.title || !p?.content) {
    return errorResponse('announce_fail', "E'lon uchun sarlavha va matn kerak. Masalan: \"Barcha o'quvchilarga e'lon: ertaga dars yo'q\"");
  }

  const data = {
    title:   String(p.title).trim(),
    content: String(p.content).trim(),
    targetAudience: ['all','students','teachers','parents','class'].includes(p.targetAudience) ? p.targetAudience : 'all',
    priority: ['low','normal','high','urgent'].includes(p.priority) ? p.priority : 'normal',
    author:  authorId,
    isPublished: p.publish !== false,
    publishDate: new Date()
  };

  if (data.targetAudience === 'class' && p.targetClassName) {
    const m = String(p.targetClassName).match(/(\d+)\s*[-\s]?\s*([A-Za-z])/);
    if (m) {
      const cls = await Class.findOne({ grade: Number(m[1]), section: m[2].toUpperCase(), isActive: true });
      if (cls) data.targetClass = cls._id;
      else return errorResponse('announce_noclass', `${p.targetClassName} sinfi topilmadi.`);
    }
  }

  try {
    const a = await new Announcement(data).save();
    return successResponse('create_announcement',
      `E'lon yaratildi va ${a.isPublished ? 'e\'lon qilindi' : 'qoralangan saqlandi'}.\n` +
      `Sarlavha: ${a.title}\nKim uchun: ${a.targetAudience}\nMuhimligi: ${a.priority}`
    );
  } catch (err) {
    return errorResponse('announce_error', `E'lon yaratishda xato: ${err.message}`);
  }
};

// ─── 6. LIDLAR STATISTIKASI ──────────────────────────────────────────────────
const parseLeadStats = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(lid|lead|заявка|лид)/i.test(n) &&
      /(statistika|umumiy|holat|sources|manbalar|hammasi|статистика)/i.test(n)) {
    return { type: 'lead_stats' };
  }
  return null;
};

const handleLeadStats = async () => {
  const all = await Lead.find().select('status source createdAt').lean();
  const byStatus = {};
  const bySource = {};
  all.forEach(l => {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    bySource[l.source] = (bySource[l.source] || 0) + 1;
  });
  const statusLines = Object.entries(byStatus).map(([k,v]) => `- ${k}: ${v}`).join('\n');
  const sourceLines = Object.entries(bySource).map(([k,v]) => `- ${k}: ${v}`).join('\n');
  return successResponse('lead_stats',
    `Lidlar statistikasi (jami ${all.length} ta):\n\nHolatlar bo'yicha:\n${statusLines}\n\nManbalar bo'yicha:\n${sourceLines}`
  );
};

// ─── 7. OTA-ONALAR BILAN ALOQA HISOBOTI ─────────────────────────────────────
const parseParentContactReport = (msg) => {
  const n = normalizeCommandText(msg);
  if (/(ota.?ona|ota-ona|parent|родител)/i.test(n) &&
      /(aloqa|gaplash|hisobot|qamrov|statistika|coverage|report|свяж|отчёт)/i.test(n)) {
    return { type: 'parent_contact_report' };
  }
  return null;
};

const handleParentContactReport = async (model, msg) => {
  const prompt = `Ota-onalar bilan aloqa hisoboti.\nSo'rov: "${msg}"\nJSON: {"month":"YYYY-MM (default - joriy oy)"}`;
  let p = null;
  try { p = extractJsonObject((await model.generateContent(prompt)).response.text()); }
  catch (e) { /* default */ }
  const now = new Date();
  const month = p?.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [students, contacts] = await Promise.all([
    User.find({ role: 'student', isActive: true }).select('_id').lean(),
    ParentContact.find({ reportMonth: month }).select('student status').lean()
  ]);

  const byStudent = {};
  contacts.forEach((c) => {
    const sid = String(c.student);
    if (!byStudent[sid] || c.status === 'contacted') byStudent[sid] = c.status;
  });

  let contacted = 0, attempted = 0, notReached = 0, refused = 0;
  Object.values(byStudent).forEach((s) => {
    if (s === 'contacted') contacted++;
    else if (s === 'attempted') attempted++;
    else if (s === 'not_reached') notReached++;
    else if (s === 'refused') refused++;
  });
  const total = students.length;
  const pending = total - contacted - attempted - notReached - refused;
  const coverage = total > 0 ? Math.round((contacted / total) * 100) : 0;

  return successResponse('parent_contact_report',
    `OTA-ONALAR BILAN ALOQA HISOBOTI — ${month}\n` +
    `============================================\n` +
    `Jami faol o'quvchilar: ${total}\n` +
    `\nHolatlar:\n` +
    `- ✅ Gaplashildi: ${contacted}\n` +
    `- 📞 Urinish bo'ldi: ${attempted}\n` +
    `- ⛔ Yetib bormadi: ${notReached}\n` +
    `- 🚫 Rad etdi: ${refused}\n` +
    `- ⏳ Hali qilinmagan: ${pending}\n` +
    `\nQamrov: ${coverage}% (${contacted}/${total})\n` +
    (coverage < 50 ? '\n⚠️ Diqqat: Qamrov 50% dan past. Aloqa ishlarini jadallashtiring.' : '')
  );
};

// ─── ASOSIY DISPATCHER ────────────────────────────────────────────────────────
exports.tryHandleAction = async (message, model, adminId) => {
  if (parseParentContactReport(message)) return handleParentContactReport(model, message);
  if (parseLeadStats(message))           return handleLeadStats();
  if (parseDeleteLead(message))          return handleDeleteLead(model, message);
  if (parseEditLead(message))            return handleEditLead(model, message);
  if (parseCreateLead(message))          return handleCreateLead(model, message);
  if (parseLeadList(message))            return handleLeadList(model, message);
  if (parseCreateAnnouncement(message))  return handleCreateAnnouncement(model, message, adminId);
  return null;
};
