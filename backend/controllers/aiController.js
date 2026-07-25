const mongoose = require('mongoose');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const AiApiKey = require('../models/ai/AiApiKey');
const AiChatHistory = require('../models/ai/AiChatHistory');
const User = require('../models/users/User');
const Class = require('../models/academic/Class');
const Subject = require('../models/academic/Subject');
const Grade = require('../models/academic/Grade');
const Attendance = require('../models/academic/Attendance');
const Payment = require('../models/financial/Payment');
const Schedule = require('../models/scheduling/Schedule');
const Announcement = require('../models/communication/Announcement');
const Assignment = require('../models/academic/Assignment');
const FinancialSummary = require('../models/financial/FinancialSummary');
const BalanceTransaction = require('../models/financial/BalanceTransaction');
const { createUzbekSearchRegex } = require('../utils/uzbekHelper');



const GEMINI_API_BASE_URL = (process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const GEMINI_MODEL_CACHE_TTL_MS = Number(process.env.GEMINI_MODEL_CACHE_TTL_MS || 60 * 60 * 1000);
const geminiModelCache = new Map();

const normalizeGeminiModelName = (modelName) => String(modelName || '')
  .trim()
  .replace(/^models\//i, '');

const splitModelCandidates = (value) => String(value || '')
  .split(/[\s,;]+/)
  .map(normalizeGeminiModelName)
  .filter(Boolean);

const unique = (items) => [...new Set(items.filter(Boolean))];

const getConfiguredGeminiModelCandidates = () => unique([
  ...splitModelCandidates(process.env.GEMINI_MODEL),
  ...splitModelCandidates(process.env.GEMINI_MODELS),
  ...splitModelCandidates(process.env.GEMINI_MODEL_CANDIDATES),
  GEMINI_DEFAULT_MODEL,
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-pro-latest'
]);

const getGeminiModelAliases = (modelInfo = {}) => unique([
  normalizeGeminiModelName(modelInfo.name),
  normalizeGeminiModelName(modelInfo.baseModelId)
]);

const modelSupportsGenerateContent = (modelInfo = {}) => {
  const methods = [
    ...(modelInfo.supportedGenerationMethods || []),
    ...(modelInfo.supportedActions || [])
  ].map(method => String(method).toLowerCase());

  return methods.includes('generatecontent');
};

const getPreferredModelName = (modelInfo = {}) => {
  const aliases = getGeminiModelAliases(modelInfo);
  return aliases[0] || '';
};

const scoreGeminiModel = (modelInfo = {}) => {
  const aliases = getGeminiModelAliases(modelInfo).join(' ').toLowerCase();
  let score = 0;

  if (!/(embedding|aqa|imagen|image|veo|lyria|tts|speech|audio|live|bidi)/i.test(aliases)) {
    score += 1000;
  } else {
    score -= 500;
  }

  const versionMatch = aliases.match(/gemini-(\d+)(?:\.(\d+))?/);
  if (versionMatch) {
    score += Number(versionMatch[1]) * 100 + Number(versionMatch[2] || 0) * 10;
  }

  if (aliases.includes('flash')) score += 120;
  if (aliases.includes('pro')) score += 90;
  if (aliases.includes('latest')) score += 25;
  if (/(preview|experimental|exp)/i.test(aliases)) score -= 40;

  return score;
};

const requestGeminiJson = (url, apiKey) => new Promise((resolve, reject) => {
  const req = https.request(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'x-goog-api-key': apiKey
    }
  }, (res) => {
    let bodyText = '';

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      bodyText += chunk;
      if (bodyText.length > 2_000_000) {
        req.destroy(new Error("Gemini API javobi juda katta bo'ldi."));
      }
    });

    res.on('end', () => {
      let body = {};
      try {
        body = bodyText ? JSON.parse(bodyText) : {};
      } catch (parseError) {
        const error = new Error(`Gemini API JSON javobi o'qilmadi: ${parseError.message}`);
        error.statusCode = res.statusCode;
        reject(error);
        return;
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        const apiMessage = body?.error?.message || body?.message || bodyText || 'Nomalum xato';
        const error = new Error(`Gemini API xato [${res.statusCode}]: ${apiMessage}`);
        error.statusCode = res.statusCode;
        error.apiStatus = body?.error?.status;
        reject(error);
        return;
      }

      resolve(body);
    });
  });

  req.setTimeout(15000, () => {
    req.destroy(new Error("Gemini API model ro'yxatini olish muddati tugadi."));
  });

  req.on('error', reject);
  req.end();
});

const listGeminiModels = async (apiKey) => {
  const models = [];
  let pageToken = '';

  do {
    const url = new URL(`${GEMINI_API_VERSION}/models`, `${GEMINI_API_BASE_URL}/`);
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const body = await requestGeminiJson(url, apiKey);
    if (Array.isArray(body.models)) {
      models.push(...body.models);
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);

  return models;
};

const chooseGeminiModels = (availableModels) => {
  const supportedModels = availableModels.filter(modelSupportsGenerateContent);
  const configuredCandidates = getConfiguredGeminiModelCandidates();
  const orderedModels = [];

  for (const candidate of configuredCandidates) {
    const matched = supportedModels.find(modelInfo =>
      getGeminiModelAliases(modelInfo).includes(candidate)
    );
    if (matched) {
      orderedModels.push(getPreferredModelName(matched));
    }
  }

  orderedModels.push(...supportedModels
    .slice()
    .sort((a, b) => scoreGeminiModel(b) - scoreGeminiModel(a))
    .map(getPreferredModelName));

  return unique(orderedModels);
};

const chooseGeminiModel = (availableModels) => chooseGeminiModels(availableModels)[0] || null;

const isRetryableGeminiModelError = (error) => {
  const message = error?.message || String(error);
  return /503|UNAVAILABLE|Service Unavailable|high demand|overloaded|temporar|try again later/i.test(message);
};

const getGeminiCacheKey = (apiKey) =>
  `${GEMINI_API_VERSION}:${apiKey}:${getConfiguredGeminiModelCandidates().join('|')}`;

const resolveGeminiModelNames = async (apiKey, { forceRefresh = false } = {}) => {
  const cacheKey = getGeminiCacheKey(apiKey);
  const cached = geminiModelCache.get(cacheKey);

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    if (Array.isArray(cached.modelNames) && cached.modelNames.length > 0) {
      return cached.modelNames;
    }
    if (cached.modelName) {
      return [cached.modelName];
    }
  }

  const availableModels = await listGeminiModels(apiKey);
  const modelNames = chooseGeminiModels(availableModels);

  if (modelNames.length === 0) {
    throw new Error("Gemini API kalit uchun generateContent'ni qo'llab-quvvatlaydigan model topilmadi. Google AI Studio'da API key va model ruxsatlarini tekshiring.");
  }

  geminiModelCache.set(cacheKey, {
    modelName: modelNames[0],
    modelNames,
    expiresAt: Date.now() + GEMINI_MODEL_CACHE_TTL_MS
  });

  return modelNames;
};

const resolveGeminiModelName = async (apiKey, options = {}) =>
  (await resolveGeminiModelNames(apiKey, options))[0];

const demoteGeminiModel = (apiKey, modelName) => {
  const cacheKey = getGeminiCacheKey(apiKey);
  const cached = geminiModelCache.get(cacheKey);
  const cachedModelNames = cached?.modelNames || (cached?.modelName ? [cached.modelName] : []);
  const normalizedModelName = normalizeGeminiModelName(modelName);

  if (cachedModelNames.length <= 1 || !normalizedModelName) return;

  const remainingModels = cachedModelNames.filter(name => normalizeGeminiModelName(name) !== normalizedModelName);
  if (remainingModels.length === cachedModelNames.length) return;

  const modelNames = [...remainingModels, normalizedModelName];
  geminiModelCache.set(cacheKey, {
    modelName: modelNames[0],
    modelNames,
    expiresAt: cached.expiresAt || Date.now() + GEMINI_MODEL_CACHE_TTL_MS
  });
};

const ensureSupportedProvider = (provider = 'gemini') => {
  if (provider !== 'gemini') {
    throw new Error("Hozircha faqat Google Gemini API kalitlari qo'llab-quvvatlanadi.");
  }
};

const validateGeminiApiKey = async (apiKey) => {
  await runGeminiWithModelFallback(
    apiKey,
    ({ model }) => model.generateContent("Salom"),
    { forceRefresh: true, taskName: 'Gemini API key validation' }
  );
};

const createGeminiModel = async (apiKey, options = {}) => {
  const modelName = await resolveGeminiModelName(apiKey, options);
  const genAI = new GoogleGenerativeAI(apiKey);
  return {
    model: genAI.getGenerativeModel({ model: modelName }, { apiVersion: GEMINI_API_VERSION }),
    modelName
  };
};

const createGeminiModelCandidates = async (apiKey, options = {}) => {
  const modelNames = await resolveGeminiModelNames(apiKey, options);
  const genAI = new GoogleGenerativeAI(apiKey);
  return modelNames.map(modelName => ({
    model: genAI.getGenerativeModel({ model: modelName }, { apiVersion: GEMINI_API_VERSION }),
    modelName
  }));
};

const runGeminiWithModelFallback = async (apiKey, operation, options = {}) => {
  const {
    forceRefresh = false,
    modelCandidates = null,
    taskName = 'Gemini request'
  } = options;
  const candidates = modelCandidates || await createGeminiModelCandidates(apiKey, { forceRefresh });
  let lastError = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      return await operation(candidate, index);
    } catch (error) {
      lastError = error;
      const shouldTryNextModel = index < candidates.length - 1 && isRetryableGeminiModelError(error);
      if (!shouldTryNextModel) {
        throw error;
      }

      demoteGeminiModel(apiKey, candidate.modelName);
      console.warn(`${taskName} failed on ${candidate.modelName}. Trying ${candidates[index + 1].modelName}.`, error.message);
    }
  }

  throw lastError || new Error("Gemini API modeli bilan bog'lanishda xato yuz berdi.");
};

const formatGeminiError = (error) => {
  const message = error?.message || String(error);
  const configuredModels = getConfiguredGeminiModelCandidates().join(', ');

  if (/API key not valid/i.test(message)) {
    return "Gemini API kalit noto'g'ri. Google AI Studio'dan olingan API keyni kiriting.";
  }

  if (/API_KEY_INVALID|INVALID_ARGUMENT/i.test(message)) {
    return "Gemini API kalit yoki model sozlamasi rad etildi. Kalit Google AI Studio Gemini API uchun yaratilganini tekshiring.";
  }

  if (/PERMISSION_DENIED|403|permission/i.test(message)) {
    return "Gemini API ruxsati yo'q. Google Cloud'da API key cheklovlarini tekshiring: serverdan ishlashi uchun HTTP referrer cheklovi bo'lmasin va Generative Language API ruxsatli bo'lsin.";
  }

  if (isRetryableGeminiModelError(error)) {
    return "Gemini modeli hozir band yoki vaqtincha javob bermayapti. Backend boshqa mos Gemini modelga avtomatik o'tadi; agar barcha modellar band bo'lsa, bir ozdan keyin qayta urinib ko'ring.";
  }

  if (/quota|429|RESOURCE_EXHAUSTED/i.test(message)) {
    return "Gemini API quota yoki limit tugagan. Google AI Studio/Cloud'dagi limitlarni tekshiring.";
  }

  if (/not found|404|models\//i.test(message)) {
    return `Gemini modeli topilmadi yoki generateContent'ni qo'llab-quvvatlamaydi. Sozlangan model(lar): ${configuredModels}. Backend ListModels orqali mos model tanlaydi; agar xato davom etsa, API key ruxsatlarini tekshiring.`;
  }

  return `Gemini API tekshiruvida xato: ${message}`;
};

const resetDailyUsageIfNeeded = async (key) => {
  const now = new Date();
  const resetDate = new Date(key.dailyUsageReset);
  if (now.toDateString() !== resetDate.toDateString()) {
    await AiApiKey.updateOne(
      { _id: key._id },
      { $set: { dailyUsage: 0, dailyUsageReset: now } }
    );
    key.dailyUsage = 0;
    key.dailyUsageReset = now;
  }
};

const getUsageSummary = async () => {
  const keys = await AiApiKey.find({ isActive: true });

  for (const key of keys) {
    await resetDailyUsageIfNeeded(key);
  }

  const totalDailyUsed = keys.reduce((sum, k) => sum + k.dailyUsage, 0);
  const totalDailyLimit = keys.reduce((sum, k) => sum + k.rateLimitPerDay, 0);
  const totalUsage = keys.reduce((sum, k) => sum + k.usageCount, 0);

  return {
    totalDailyUsed,
    totalDailyLimit,
    totalDailyRemaining: totalDailyLimit - totalDailyUsed,
    totalUsage,
    keysCount: keys.length,
    keys: keys.map(k => ({
      _id: k._id,
      name: k.name,
      dailyUsed: k.dailyUsage,
      dailyLimit: k.rateLimitPerDay,
      dailyRemaining: k.rateLimitPerDay - k.dailyUsage,
      totalUsage: k.usageCount,
      lastUsed: k.lastUsed,
      isActive: k.isActive
    }))
  };
};

const getActiveApiKey = async () => {
  const key = await AiApiKey.findOne({ isActive: true, provider: 'gemini' }).sort({ isPrimary: -1, createdAt: -1 });
  if (!key) throw new Error("Aktiv Google Gemini API kalit topilmadi. Avval Gemini API kalit qo'shing.");

  await resetDailyUsageIfNeeded(key);

  if (key.dailyUsage >= key.rateLimitPerDay) {
    throw new Error("Kunlik limit tugadi. Iltimos ertaga qayta urinib ko'ring yoki limitni oshiring.");
  }

  return key;
};

const normalizeCommandText = (text) => String(text || '')
  .toLowerCase()
  .replace(/[''`]/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

// Local helper replaced by global utility in utils/uzbekHelper.js
const normalizeUzbekRegex = (text) => new RegExp(createUzbekSearchRegex(text), 'i');

// ===== AI-powered student data generation =====
// Gemini generates realistic names/birthdays based on user's request
const generateStudentDataWithAI = async (model, userMessage, count) => {
  const prompt =
    `Foydalanuvchi so'rovi: "${userMessage}"\n` +
    `Yuqoridagi so'rovga asoslanib ${count} ta o'quvchi ma'lumotlarini yarat.\n` +
    `Qoidalar:\n` +
    `- Foydalanuvchi bergan barcha ma'lumotlarni (ism, familiya, tel, ota-ona, sinf, manzil va h.k.) ajratib ol.\n` +
    `- "password" maydoniga agar foydalanuvchi parol aytgan bo'lsa (masalan "paroli 123456 bo'lsin") o'sha parolni yoz, aks holda null qoldir.\n` +
    `- "className" maydoniga sinf nomi (masalan 5-B) ni yoz.\n` +
    `Faqat quyidagi JSON formatda qaytар (Array), boshqa hech narsa yozma:\n` +
    `[{\n` +
    `  "firstName": "string",\n` +
    `  "lastName": "string",\n` +
    `  "studentId": "string | null",\n` +
    `  "dateOfBirth": "YYYY-MM-DD | null",\n` +
    `  "passportNumber": "string | null",\n` +
    `  "phone": "string | null",\n` +
    `  "address": "string | null",\n` +
    `  "password": "string | null",\n` +
    `  "parentName": "string | null",\n` +
    `  "parentPhone": "string | null",\n` +
    `  "parentJshshir": "string | null",\n` +
    `  "className": "string | null",\n` +
    `  "registrationDate": "YYYY-MM-DD | null",\n` +
    `  "monthlyFee": "number | null",\n` +
    `  "isActive": "boolean | null",\n` +
    `  "leftDate": "YYYY-MM-DD | null"\n` +
    `}]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, count).map(s => ({
          firstName: String(s.firstName || 'Oquvchi').trim(),
          lastName: String(s.lastName || '').trim(),
          studentId: s.studentId || null,
          dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : null,
          passportNumber: s.passportNumber || null,
          phone: s.phone || null,
          address: s.address || null,
          password: s.password || null,
          parentName: s.parentName || null,
          parentPhone: s.parentPhone || null,
          parentJshshir: s.parentJshshir || null,
          className: s.className || null,
          registrationDate: s.registrationDate ? new Date(s.registrationDate) : new Date(),
          monthlyFee: Number(s.monthlyFee) || null,
          isActive: s.isActive !== undefined ? s.isActive : true,
          leftDate: s.leftDate ? new Date(s.leftDate) : null
        }));
      }
    }
  } catch (e) {
    console.error('AI name generation failed:', e.message);
  }
  return null;
};

const parseStudentCount = (message) => {
  const m = String(message || '').match(/\b(\d+)\s*(?:ta|t\u0430|nafar|dona|student|students|uchenik|\u0443\u0447\u0435\u043d\u0438\u043a|\u0443\u0447\u0435\u043d\u0438\u043a\u0430|\u0443\u0447\u0435\u043d\u0438\u043a\u043e\u0432)?\b/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n > 1) return Math.min(n, 50);
  }
  return 1;
};

const parseStudentCreateIntent = (message) => {
  const normalized = normalizeCommandText(message);

  // Student keywords: Uzbek, English, Russian
  const wantsStudent = /(o'quvchi|oquvchi|student|\u0443\u0447\u0435\u043d\u0438\u043a|\u0443\u0447\u0435\u043d\u0438\u043a\u0430|\u0443\u0447\u0435\u043d\u0438\u043a\u043e\u0432|\u0441\u0442\u0443\u0434\u0435\u043d\u0442|\u0441\u0442\u0443\u0434\u0435\u043d\u0442\u043e\u0432)/i.test(normalized);
  // Create keywords: Uzbek, English, Russian
  const wantsCreate = /(qo'sh|qosh|yarat|kirit|add|create|insert|\u0434\u043e\u0431\u0430\u0432\u044c|\u0441\u043e\u0437\u0434\u0430\u0439|\u0441\u0434\u0435\u043b\u0430\u0439)/i.test(normalized);

  if (!wantsStudent || !wantsCreate) return null;

  // Demo detection: Uzbek, English, Russian
  const isDemo = /\b(demo|test|sinov|\u0434\u0435\u043c\u043e|\u0442\u0435\u0441\u0442|\u0442\u0435\u0441\u0442\u043e\u0432\u044b\u0439|\u0442\u0435\u0441\u0442\u043e\u0432\u044b\u0445|\u0442\u0435\u0441\u0442\u043e\u0432\u044b\u0435)\b/i.test(normalized);
  const requestedCount = parseStudentCount(message);

  const classMatch = normalized.match(/\b(\d{1,2})\s*[- ]\s*([a-zA-Z])\b/);
  const feeMatch = normalized.match(/(?:oylik|tolov|to'lov|kontrakt|fee|\u043e\u043f\u043b\u0430\u0442\u0430|\u0441\u0443\u043c\u043c\u0430)\D{0,12}(\d[\d\s]*)/i);

  return {
    type: 'create_student',
    isDemo,
    requestedCount,
    originalMessage: message,   // pass original message to AI
    classGrade: classMatch ? Number(classMatch[1]) : null,
    classSection: classMatch ? classMatch[2].toUpperCase() : null,
    monthlyFee: feeMatch ? Number(feeMatch[1].replace(/\s/g, '')) : 0
  };
};

const generateUniquePhone = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = String(Math.floor(1000000 + Math.random() * 9000000));
    const phone = `+99890${suffix}`;
    const existing = await User.exists({ phone });
    if (!existing) return phone;
  }
  throw new Error("Unique demo telefon raqam yaratib bo'lmadi. Qayta urinib ko'ring.");
};

const generateUniqueStudentId = async (prefix = 'ST') => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    const studentId = `${prefix}-${stamp}-${random}`;
    const existing = await User.exists({ studentId });
    if (!existing) return studentId;
  }
  throw new Error("Unique o'quvchi ID yaratib bo'lmadi. Qayta urinib ko'ring.");
};

const findClassForIntent = async (intent) => {
  if (!intent.classGrade || !intent.classSection) {
    return null;
  }

  return Class.findOne({
    grade: intent.classGrade,
    section: intent.classSection,
    isActive: true
  });
};

const createSingleStudent = async (data, intent, classDoc) => {
  const [phone, studentId] = await Promise.all([
    data.phone || generateUniquePhone(),
    data.studentId || generateUniqueStudentId(intent.isDemo ? 'DEMO' : 'ST')
  ]);

  const password = data.password || (intent.isDemo ? 'Demo1234' : 'Student123');
  
  // Use className from AI data if classDoc not already found from intent
  let finalClassId = classDoc?._id || null;
  let finalClassName = classDoc ? `${classDoc.grade}-${classDoc.section}` : 'sinfga biriktirilmadi';

  if (!finalClassId && data.className) {
    const foundClass = await Class.findOne({ name: data.className.toUpperCase(), isActive: true });
    if (foundClass) {
      finalClassId = foundClass._id;
      finalClassName = data.className.toUpperCase();
    }
  }

  const studentData = {
    firstName: data.firstName,
    lastName: data.lastName || '',
    role: 'student',
    phone: phone,
    password: password,
    studentId: studentId,
    classId: finalClassId,
    dateOfBirth: data.dateOfBirth || null,
    passportNumber: data.passportNumber || null,
    address: data.address || null,
    parentName: data.parentName || (intent.isDemo ? 'Demo ota-ona' : null),
    parentPhone: data.parentPhone || null,
    parentJshshir: data.parentJshshir || null,
    registrationDate: data.registrationDate || new Date(),
    monthlyFee: data.monthlyFee !== null ? data.monthlyFee : (intent.monthlyFee || 0),
    isActive: data.isActive !== undefined ? data.isActive : true,
    leftDate: data.leftDate || null
  };

  const student = new User(studentData);
  await student.save();

  if (finalClassId) {
    await Class.findByIdAndUpdate(finalClassId, { $addToSet: { students: student._id } });
  }

  return { student, password, classText: finalClassName };
};

// model is passed in so AI can generate names
const createStudentFromIntent = async (intent, model) => {
  const count = intent.requestedCount || 1;
  const classDoc = await findClassForIntent(intent);
  const classText = classDoc
    ? `${classDoc.grade}-${classDoc.section} sinfiga biriktirildi`
    : 'sinfga biriktirilmadi';

  // Ask Gemini to generate student data (names, birthdays, etc.)
  let studentDataList = null;
  if (model) {
    studentDataList = await generateStudentDataWithAI(model, intent.originalMessage, count);
  }

  // Fallback: if AI didn't return valid data, use a simple default
  if (!studentDataList || studentDataList.length === 0) {
    studentDataList = Array.from({ length: count }, (_, i) => ({
      firstName: intent.firstName || 'Demo',
      lastName: intent.lastName && !['Demo', 'Oquvchi'].includes(intent.lastName)
        ? intent.lastName
        : `Oquvchi${count > 1 ? i + 1 : ''}`,
      dateOfBirth: null
    }));
  }

  // ---- Single student ----
  if (count === 1) {
    const data = studentDataList[0];
    const { student, password, classText } = await createSingleStudent(data, intent, classDoc);
    const dobLine = student.dateOfBirth
      ? `\nTug'ilgan sana: ${new Date(student.dateOfBirth).toLocaleDateString('uz-UZ')}`
      : '';
    return {
      handled: true,
      action: 'create_student',
      message:
        `O'quvchi yaratildi.\n` +
        `Ism-familiya: ${student.firstName} ${student.lastName}` +
        dobLine + `\n` +
        `O'quvchi ID: ${student.studentId}\n` +
        `Telefon: ${student.phone}\n` +
        `Parol: ${password}\n` +
        `Holat: ${classText}`
    };
  }

  // ---- Bulk students ----
  const results = [];
  const errors = [];

  for (let i = 0; i < count; i++) {
    try {
      const data = studentDataList[i] || studentDataList[studentDataList.length - 1];
      const { student, password, classText } = await createSingleStudent(data, intent, classDoc);
      results.push({ student, password, classText });
    } catch (err) {
      errors.push(`#${i + 1}: ${err.message}`);
    }
  }

  const successList = results.map((r, i) => {
    const dob = r.student.dateOfBirth
      ? ` | T.sana: ${new Date(r.student.dateOfBirth).getFullYear()}`
      : '';
    return `${i + 1}. ${r.student.firstName} ${r.student.lastName}${dob} | ID: ${r.student.studentId} | Tel: ${r.student.phone} | Parol: ${r.password}`;
  }).join('\n');

  const finalClassText = results[0]?.classText || classText;

  const summary =
    `Jami ${results.length} ta o'quvchi yaratildi (${finalClassText}).\n` +
    (errors.length ? `Xatoliklar: ${errors.length} ta\n` : '') +
    `\nRo'yxat:\n${successList}`;

  return {
    handled: true,
    action: 'create_students_bulk',
    message: summary
  };
};

// ===== STUDENT EDIT via AI =====

const parseStudentEditIntent = (message) => {
  const normalized = normalizeCommandText(message);

  // Edit keywords: Uzbek, English, Russian
  const wantsEdit = /(o'zgartir|tahrirlash|yangilashtir|update|edit|change|modify|rename|set|assign|biriktir|ko'chir|faollashtir|o'chirish emas|nofaol|aktivlashtir|deactivate|activate|\u0438\u0437\u043c\u0435\u043d\u0438|\u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440|\u043e\u0431\u043d\u043e\u0432\u0438|\u043f\u0435\u0440\u0435\u0432\u0435\u0434\u0438|\u0437\u0430\u043c\u0435\u043d\u0438)/i.test(normalized);
  // Student keywords
  const wantsStudent = /(o'quvchi|oquvchi|student|\u0443\u0447\u0435\u043d\u0438\u043a|\u0441\u0442\u0443\u0434\u0435\u043d\u0442)/i.test(normalized);

  // Also detect by ID pattern
  const hasStudentId = /\b(ST|DEMO)-[A-Z0-9]+-[A-Z0-9]+/i.test(message);

  if ((!wantsEdit || !wantsStudent) && !hasStudentId) return null;
  // Make sure this is edit not create
  const wantsCreate = /(qo'sh|qosh|yarat|kirit|add|create|insert|\u0434\u043e\u0431\u0430\u0432\u044c|\u0441\u043e\u0437\u0434\u0430\u0439)/i.test(normalized);
  if (wantsCreate && !wantsEdit) return null;

  return { type: 'edit_student', originalMessage: message };
};

const editStudentWithAI = async (model, message) => {
  // Step 1: Ask Gemini to parse the edit intent into JSON
  const parsePrompt =
    `Foydalanuvchi o'quvchi ma'lumotlarini tahrirlashni xohlayapti.\n` +
    `So'rov: "${message}"\n\n` +
    `Quyidagi JSON formatda qaytар, FAQAT JSON, boshqa hech narsa yozma:\n` +
    `{\n` +
    `  "studentIdentifier": "o'quvchi ismi, familiyasi yoki ID (masalan DEMO-XXX-YYY)",\n` +
    `  "updates": {\n` +
    `    "firstName": "yangi ism yoki null",\n` +
    `    "lastName": "yangi familiya yoki null",\n` +
    `    "className": "sinf nomi (masalan 5-A) yoki null",\n` +
    `    "monthlyFee": "oylik to'lov raqami yoki null",\n` +
    `    "isActive": "true yoki false yoki null",\n` +
    `    "dateOfBirth": "YYYY-MM-DD yoki null",\n` +
    `    "phone": "telefon raqami yoki null",\n` +
    `    "address": "manzil yoki null",\n` +
    `    "passportNumber": "pasport raqami yoki null",\n` +
    `    "parentName": "ota-ona ismi yoki null",\n` +
    `    "parentPhone": "ota-ona telefoni yoki null",\n` +
    `    "parentJshshir": "ota-ona JSHSHIR yoki null",\n` +
    `    "leftDate": "ketgan sana (YYYY-MM-DD) yoki null",\n` +
    `    "password": "yangi parol yoki null"\n` +
    `  }\n` +
    `}\n` +
    `Faqat o'zgartirilishi kerak bo'lgan maydonlarni null emas qilib yoz, qolganlarini null qilib qoldir.`;

  let parsed = null;
  try {
    const result = await model.generateContent(parsePrompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('AI edit parse failed:', e.message);
  }

  if (!parsed || !parsed.studentIdentifier) {
    return {
      handled: true,
      action: 'edit_student_fail',
      message: "O'quvchi ma'lumotlarini o'zgartirish uchun o'quvchi ismini yoki ID sini ko'rsating.\nMasalan: \"Abbos Karimov ning sinfini 5-A ga o'zgartir\""
    };
  }

  // Step 2: Find the student
  const identifier = String(parsed.studentIdentifier).trim();
  let student = null;

  // Try by studentId first
  const idMatch = identifier.match(/\b(ST|DEMO)-[A-Z0-9]+-[A-Z0-9]+/i);
  if (idMatch) {
    student = await User.findOne({ studentId: idMatch[0].toUpperCase(), role: 'student' });
  }

  // Try by full name
  if (!student) {
    const nameParts = identifier.split(/\s+/).filter(Boolean);
    if (nameParts.length >= 2) {
      student = await User.findOne({
        role: 'student',
        firstName: normalizeUzbekRegex(nameParts[0]),
        lastName: normalizeUzbekRegex(nameParts.slice(1).join(' '))
      });
    }
    // Try partial name match
    if (!student && nameParts.length >= 1) {
      const searchRegex = normalizeUzbekRegex(nameParts[0]);
      student = await User.findOne({
        role: 'student',
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex }
        ]
      });
    }
  }

  if (!student) {
    return {
      handled: true,
      action: 'edit_student_notfound',
      message: `"${identifier}" ismli o'quvchi topilmadi. Ism yoki ID ni to'g'ri kiriting.`
    };
  }

  // Step 3: Apply updates
  const updates = parsed.updates || {};
  const changedFields = [];
  const fieldsToUpdate = [
    'firstName', 'lastName', 'phone', 'address', 'dateOfBirth',
    'passportNumber', 'parentName', 'parentPhone', 'parentJshshir',
    'monthlyFee', 'isActive', 'leftDate', 'password'
  ];

  for (const field of fieldsToUpdate) {
    if (updates[field] !== null && updates[field] !== undefined && updates[field] !== 'null') {
      student[field] = updates[field];
      changedFields.push(`${field}: ${updates[field]}`);
    }
  }

  // Special handling for class change
  if (updates.className) {
    const cls = await Class.findOne({ name: updates.className.toUpperCase(), isActive: true });
    if (cls) {
      student.classId = cls._id;
      changedFields.push(`sinf: ${updates.className}`);
    } else {
      changedFields.push(`sinf: "${updates.className}" topilmadi`);
    }
  }

  if (changedFields.length === 0) {
    return {
      handled: true,
      action: 'edit_student_no_changes',
      message: `${student.firstName} ${student.lastName} uchun o'zgartirish aniqlanmadi. Nima o'zgartirmoqchi ekanligingizni aniqroq yozing.`
    };
  }

  await student.save();

  return {
    handled: true,
    action: 'edit_student',
    message:
      `O'quvchi ma'lumotlari yangilandi.\n` +
      `O'quvchi: ${student.firstName} ${student.lastName} (${student.studentId})\n\n` +
      `O'zgartirishlar:\n` +
      changedFields.map(f => `- ${f}`).join('\n')
  };
};

const tryHandleAiAction = async (message, model) => {
  // Check class creation intent
  const classIntent = parseClassIntent(message);
  if (classIntent) {
    return createClassWithAI(model, message);
  }

  // Check attendance intent
  const attendanceIntent = parseAttendanceIntent(message);
  if (attendanceIntent) {
    return setAttendanceWithAI(model, message);
  }


  // Check financial intent
  const financialIntent = parseFinancialIntent(message);
  if (financialIntent) {
    return getFinancialDataWithAI(model, message);
  }

  // Check grade intent
  const gradeIntent = parseGradeIntent(message);
  if (gradeIntent) {
    return addGradeWithAI(model, message);
  }

  // Check edit intent FIRST (has priority over create when edit keywords present)
  const editIntent = parseStudentEditIntent(message);
  if (editIntent) {
    return editStudentWithAI(model, message);
  }

  const createIntent = parseStudentCreateIntent(message);
  if (createIntent?.type === 'create_student') {
    return createStudentFromIntent(createIntent, model);
  }

  return null;
};

// ===== ATTENDANCE MANAGEMENT via AI =====

const parseAttendanceIntent = (message) => {
  const normalized = normalizeCommandText(message);
  
  // Attendance keywords: Uzbek, English, Russian
  const hasAttendanceWord = /(davomat|keldi|kelmadi|qatnash|attendance|present|absent|late|посещаемость|пришел|отсутствует|был)/i.test(normalized);
  const hasActionWord = /(yoz|belgila|qo'y|qoy|set|mark|record|запиши|отметь)/i.test(normalized);
  
  if (hasAttendanceWord || (hasActionWord && /(darsda|sinfda)/i.test(normalized))) {
    return { type: 'set_attendance', originalMessage: message };
  }
  
  return null;
};

const setAttendanceWithAI = async (model, message) => {
  const parsePrompt = 
    `Foydalanuvchi davomatni belgilamoqchi.\n` +
    `So'rov: "${message}"\n\n` +
    `Quyidagi JSON formatda qaytар, FAQAT JSON, boshqa hech narsa yozma:\n` +
    `{\n` +
    `  "scope": "individual | class",\n` +
    `  "studentIdentifier": "o'quvchi ismi yoki ID (faqat individual uchun)",\n` +
    `  "classGrade": "sinf raqami (masalan 5)",\n` +
    `  "classSection": "sinf harfi (masalan A)",\n` +
    `  "status": "present | absent | late",\n` +
    `  "subjectName": "fan nomi (ixtiyoriy)",\n` +
    `  "period": "dars raqami (1-10, default 1)",\n` +
    `  "date": "YYYY-MM-DD (default bugun)"\n` +
    `}`;

  let parsed = null;
  try {
    const result = await model.generateContent(parsePrompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('AI attendance parse failed:', e.message);
  }

  if (!parsed) return null;

  const date = parsed.date ? new Date(parsed.date) : new Date();
  date.setHours(12,0,0,0);
  const period = Number(parsed.period) || 1;
  const status = parsed.status === 'absent' ? 'kelmadi' : (parsed.status === 'late' ? 'kechikdi' : 'keldi');

  // Handle Individual
  if (parsed.scope === 'individual' && parsed.studentIdentifier) {
    const studentIdentifier = String(parsed.studentIdentifier).trim();
    const searchRegex = normalizeUzbekRegex(studentIdentifier);
    const student = await User.findOne({ 
      role: 'student', 
      $or: [
        { studentId: studentIdentifier.toUpperCase() },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ]
    });


    if (!student) {
      return { handled: true, action: 'attendance_notfound', message: `"${studentIdentifier}" ismli o'quvchi topilmadi.` };
    }

    return {
      handled: true,
      action: 'set_attendance_pending',
      data: {
        student: student._id,
        class: student.classId,
        status,
        date,
        period
      },
      message: `${student.firstName} ${student.lastName} bugun "${status}" deb belgilandi.`
    };
  }

  // Handle Class
  if (parsed.scope === 'class' && parsed.classGrade && parsed.classSection) {
    const classDoc = await Class.findOne({ 
      grade: Number(parsed.classGrade), 
      section: String(parsed.classSection).toUpperCase(),
      isActive: true
    }).populate('students');

    if (!classDoc) {
      return { handled: true, action: 'attendance_notfound', message: `${parsed.classGrade}-${parsed.classSection} sinfi topilmadi.` };
    }

    return {
      handled: true,
      action: 'set_attendance_bulk_pending',
      classId: classDoc._id,
      students: classDoc.students.map(s => s._id),
      status,
      date,
      period,
      message: `${classDoc.grade}-${classDoc.section} sinfidagi barcha (${classDoc.students.length} ta) o'quvchilar bugun "${status}" deb belgilandi.`
    };
  }

  return null;
};


// ===== CLASS MANAGEMENT via AI =====

const parseClassIntent = (message) => {
  const normalized = normalizeCommandText(message);
  
  const hasClassWord = /(sinf|class|группа|класс)/i.test(normalized);
  const hasActionWord = /(och|yarat|qo'sh|qosh|create|add|open|new|создай|открой|добавь)/i.test(normalized);
  const hasStudentWord = /(o'quvchi|oquvchi|student|o'quvchini|o'quvchi yarat)/i.test(normalized);
  
  // If it mentions creating a student, it's NOT a class creation intent
  if (hasClassWord && hasActionWord && !hasStudentWord) {
    return { type: 'create_class', originalMessage: message };
  }
  
  return null;
};

const createClassWithAI = async (model, message) => {
  const parsePrompt = 
    `Foydalanuvchi yangi sinf yaratmoqchi.\n` +
    `So'rov: "${message}"\n\n` +
    `Quyidagi JSON formatda qaytар, FAQAT JSON, boshqa hech narsa yozma:\n` +
    `{\n` +
    `  "grade": "sinf raqami (0-9)",\n` +
    `  "section": "sinf harfi (masalan A, B, C)",\n` +
    `  "group": "MIT | Stanford | Oxford | null",\n` +
    `  "teacherName": "sinf rahbari ismi/familiyasi",\n` +
    `  "academicYear": "o'quv yili (masalan 2024-2025)",\n` +
    `  "room": "xona raqami yoki null"\n` +
    `}\n` +
    `Eslatma: Agar o'quv yili aytilmagan bo'lsa, "2024-2025" deb ol.`;

  let parsed = null;
  try {
    const result = await model.generateContent(parsePrompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('AI class parse failed:', e.message);
  }

  if (!parsed || parsed.grade === undefined || !parsed.section) {
    return {
      handled: true,
      action: 'create_class_fail',
      message: "Sinf yaratish uchun sinf raqami va harfini ko'rsating.\nMasalan: \"5-B sinfini och, rahbari Sobir Sobirov bo'lsin\""
    };
  }

  // 1. Find Teacher
  let teacher = null;
  if (parsed.teacherName) {
    const teacherSearch = normalizeUzbekRegex(parsed.teacherName);
    teacher = await User.findOne({ 
      role: 'teacher',
      $or: [
        { firstName: teacherSearch },
        { lastName: teacherSearch }
      ]
    });
  }

  if (!teacher && parsed.teacherName) {
    return { handled: true, action: 'create_class_noteacher', message: `"${parsed.teacherName}" ismli o'qituvchi topilmadi. Iltimos, mavjud o'qituvchi ismini ayting.` };
  }

  if (!teacher) {
    return { handled: true, action: 'create_class_needteacher', message: "Sinf yaratish uchun sinf rahbarini ham ko'rsatishingiz kerak." };
  }

  // 2. Check if class already exists
  const existingClass = await Class.findOne({ 
    grade: Number(parsed.grade), 
    section: String(parsed.section).toUpperCase(),
    academicYear: parsed.academicYear,
    isActive: true
  });

  if (existingClass) {
    return { handled: true, action: 'create_class_exists', message: `${parsed.grade}-${parsed.section} sinfi allaqachon mavjud.` };
  }

  // 3. Prepare Class Data
  const classData = {
    name: `${parsed.grade}-${parsed.section}`,
    grade: Number(parsed.grade),
    section: String(parsed.section).toUpperCase(),
    group: parsed.group || null,
    classTeacher: teacher._id,
    academicYear: parsed.academicYear || "2024-2025",
    room: parsed.room || null,
    isActive: true
  };

  try {
    const newClass = new Class(classData);
    await newClass.save();

    return {
      handled: true,
      action: 'create_class_success',
      message: `${classData.name} sinfi muvaffaqiyatli yaratildi. Sinf rahbari: ${teacher.firstName} ${teacher.lastName}.`
    };
  } catch (err) {
    return { handled: true, action: 'create_class_error', message: `Sinf yaratishda xato: ${err.message}` };
  }
};


// ===== FINANCIAL DATA via AI =====

const parseFinancialIntent = (message) => {
  const normalized = normalizeCommandText(message);
  
  const hasFinanceWord = /(to'lov|tolov|balans|qarz|tushum|kassa|pul|payment|balance|debt|income|cash|money|выручка|касса|долг|баланс)/i.test(normalized);
  const isQuestion = /(qancha|necha|kimda|qanday|how much|who|сколько|кто)/i.test(normalized);
  
  if (hasFinanceWord && (isQuestion || /(ko'rsat|korsat|ber|show|get|list)/i.test(normalized))) {
    return { type: 'get_finance', originalMessage: message };
  }
  
  return null;
};

const getFinancialDataWithAI = async (model, message) => {
  const parsePrompt = 
    `Foydalanuvchi moliyaviy ma'lumot so'rayapti.\n` +
    `So'rov: "${message}"\n\n` +
    `Quyidagi JSON formatda qaytар, FAQAT JSON, boshqa hech narsa yozma:\n` +
    `{\n` +
    `  "target": "student_balance | debt_list | general_summary",\n` +
    `  "studentIdentifier": "o'quvchi ismi yoki ID (faqat student_balance uchun)",\n` +
    `  "period": "bugun | kecha | shu oy | hammasi"\n` +
    `}`;

  let parsed = null;
  try {
    const result = await model.generateContent(parsePrompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('AI finance parse failed:', e.message);
  }

  if (!parsed) return null;

  if (parsed.target === 'student_balance' && parsed.studentIdentifier) {
    const studentIdentifier = String(parsed.studentIdentifier).trim();
    const searchRegex = normalizeUzbekRegex(studentIdentifier);
    const student = await User.findOne({ 
      role: 'student', 
      $or: [
        { studentId: studentIdentifier.toUpperCase() },
        { firstName: searchRegex },
        { lastName: searchRegex }
      ]
    });


    if (!student) {
      return { handled: true, action: 'finance_notfound', message: `"${studentIdentifier}" ismli o'quvchi topilmadi.` };
    }

    const balance = student.balance || 0;
    const status = balance < 0 ? `Qarzi: ${Math.abs(balance).toLocaleString()} som` : 
                   balance > 0 ? `Ortiqcha to'lovi: ${balance.toLocaleString()} som` : 
                   "To'lovlar to'liq, qarzi yo'q.";
    
    return {
      handled: true,
      action: 'get_balance',
      message: `${student.firstName} ${student.lastName} (${student.studentId || 'ID yo\'q'}) balansi:\n${status}`
    };
  }

  if (parsed.target === 'debt_list') {
    const debtors = await User.find({ role: 'student', balance: { $lt: 0 } })
      .select('firstName lastName balance studentId')
      .sort({ balance: 1 })
      .limit(10);

    if (debtors.length === 0) {
      return { handled: true, action: 'get_debts', message: "Hozirda qarzi bor o'quvchilar topilmadi." };
    }

    const list = debtors.map(d => `- ${d.firstName} ${d.lastName}: ${Math.abs(d.balance).toLocaleString()} som`).join('\n');
    return {
      handled: true,
      action: 'get_debts',
      message: `Eng ko'p qarzi bor o'quvchilar:\n${list}`
    };
  }

  if (parsed.target === 'general_summary') {
    const today = new Date();
    today.setHours(0,0,0,0);
    const summary = await FinancialSummary.findOne({ date: { $gte: today } });
    
    if (!summary) {
      return { handled: true, action: 'get_finance_summary', message: "Bugun hali moliyaviy tushumlar qayd etilmadi." };
    }

    return {
      handled: true,
      action: 'get_finance_summary',
      message: `Bugungi moliyaviy holat:\n` +
               `- Jami tushum: ${summary.income.total.toLocaleString()} som\n` +
               `  (Naqd: ${summary.income.cash.toLocaleString()}, Karta: ${summary.income.card.toLocaleString()}, Bank: ${summary.income.bankTransfer.toLocaleString()})\n` +
               `- Jami xarajat: ${summary.expenses.total.toLocaleString()} som\n` +
               `- Hozirgi kassa: ${summary.currentBalance.total.toLocaleString()} som`
    };
  }

  return null;
};


// ===== GRADE MANAGEMENT via AI =====

const parseGradeIntent = (message) => {
  const normalized = normalizeCommandText(message);
  
  // Grade keywords: Uzbek, English, Russian
  const hasGradeWord = /(baho|ball|grade|score|mark|оценка|балл)/i.test(normalized);
  const hasActionWord = /(qo'sh|qosh|yoz|kirit|qo'y|qoy|set|add|put|give|insert|поставь|добавь)/i.test(normalized);
  
  // Subject keywords as hint
  const hasSubjectHint = /(matematika|fizika|ona tili|ingliz|rus|tarix|kimyo|biologiya|geografiya|informatika|subject|fan)/i.test(normalized);

  if ((hasGradeWord && hasActionWord) || (hasSubjectHint && hasActionWord)) {
    return { type: 'add_grade', originalMessage: message };
  }

  return null;
};

const addGradeWithAI = async (model, message) => {
  const parsePrompt =
    `Foydalanuvchi o'quvchiga baho qo'ymoqchi.\n` +
    `So'rov: "${message}"\n\n` +
    `Quyidagi JSON formatda qaytар, FAQAT JSON, boshqa hech narsa yozma:\n` +
    `{\n` +
    `  "studentIdentifier": "o'quvchi ismi, familiyasi yoki ID",\n` +
    `  "subjectName": "fan nomi (masalan Matematika)",\n` +
    `  "score": "ball raqami (masalan 5 yoki 0.5)",\n` +
    `  "type": "baho turi: 'daily' (kundalik), 'exam' (imtihon), 'quiz', 'assignment', 'midterm', 'final'",\n` +
    `  "isExam": "true yoki false",\n` +
    `  "date": "YYYY-MM-DD (agar aytilmagan bo'lsa bugun)",\n` +
    `  "description": "izoh yoki null"\n` +
    `}\n` +
    `Qoidalar:\n` +
    `- Agar o'quvchi darsda qatnashgani uchun baho bo'lsa, score 0.5 va type 'daily' bo'lsin.\n` +
    `- Agar imtihon yoki nazorat ishi bo'lsa, isExam true bo'lsin.`;

  let parsed = null;
  try {
    const result = await model.generateContent(parsePrompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('AI grade parse failed:', e.message);
  }

  if (!parsed || !parsed.studentIdentifier || !parsed.subjectName || parsed.score === undefined) {
    return {
      handled: true,
      action: 'add_grade_fail',
      message: "Baho qo'yish uchun o'quvchi ismi, fan nomi va ballni ko'rsating.\nMasalan: \"Abbos Karimovga Matematikadan 5 baho qo'y\""
    };
  }

  // 1. Find Student
  const studentIdentifier = String(parsed.studentIdentifier).trim();
  const searchRegex = normalizeUzbekRegex(studentIdentifier);
  const nameParts = studentIdentifier.split(/\s+/).filter(Boolean);
  
  let student = await User.findOne({ 
    role: 'student', 
    $or: [
      { studentId: studentIdentifier.toUpperCase() },
      { firstName: normalizeUzbekRegex(nameParts[0]), lastName: normalizeUzbekRegex(nameParts[1] || '') }
    ]
  });

  if (!student) {
    // Try partial name
    student = await User.findOne({ 
      role: 'student',
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex }
      ]
    });
  }

  if (!student) {
    return { handled: true, action: 'add_grade_notfound', message: `"${studentIdentifier}" ismli o'quvchi topilmadi.` };
  }

  if (!student.isActive) {
    return { handled: true, action: 'add_grade_inactive', message: `${student.firstName} ${student.lastName} nofaol holatda, baho qo'yib bo'lmaydi.` };
  }

  if (!student.classId) {
    return { handled: true, action: 'add_grade_noclass', message: `${student.firstName} ${student.lastName} hech qaysi sinfga biriktirilmagan.` };
  }

  // 2. Find Subject
  const subjectName = String(parsed.subjectName).trim();
  const subject = await Subject.findOne({ 
    name: new RegExp(subjectName, 'i'),
    isActive: true
  });

  if (!subject) {
    return { handled: true, action: 'add_grade_nosubject', message: `"${subjectName}" fani topilmadi.` };
  }

  // 3. Prepare Grade Data
  const score = Number(parsed.score);
  const isExam = parsed.isExam === true || parsed.isExam === 'true';
  const gradeType = parsed.type || (isExam ? 'exam' : 'daily');
  const gradeDate = parsed.date ? new Date(parsed.date) : new Date();
  gradeDate.setHours(12, 0, 0, 0); // Standardize time

  // Validate Score Logic from Grade Model
  if (!isExam && score > 0.5) {
    return { 
      handled: true, 
      action: 'add_grade_invalid_score', 
      message: `Kundalik dars uchun maksimal 0.5 ball qo'yish mumkin. Siz ${score} ball kiritdingiz.` 
    };
  }

  return {
    handled: true,
    action: 'add_grade_pending', 
    data: {
      student: student._id,
      subject: subject._id,
      class: student.classId,
      score: score,
      maxScore: isExam ? (parsed.examMaxScore || 100) : 1,
      isExam: isExam,
      examMaxScore: isExam ? (parsed.examMaxScore || 100) : undefined,
      type: gradeType,
      date: gradeDate,
      description: parsed.description || 'AI orqali qo\'shildi'
    },
    studentName: `${student.firstName} ${student.lastName}`,
    subjectName: subject.name
  };
};


const getOrCreateChatHistory = async (userId, sessionId) => {
  const resolvedSessionId = sessionId || new mongoose.Types.ObjectId().toString();
  let chatHistory = await AiChatHistory.findOne({ sessionId: resolvedSessionId, userId });

  if (!chatHistory) {
    chatHistory = new AiChatHistory({
      userId,
      sessionId: resolvedSessionId,
      messages: []
    });
  }

  return chatHistory;
};

const saveChatExchange = async (chatHistory, userMessage, aiMessage) => {
  chatHistory.messages.push(
    { role: "user", content: userMessage },
    { role: "assistant", content: aiMessage }
  );

  if (chatHistory.messages.length <= 2) {
    chatHistory.title = userMessage.substring(0, 50);
  }

  await chatHistory.save();
};

const buildSystemContext = async (adminName = '') => {
  const [
    students, teachers, classes, subjects, grades,
    attendance, payments, schedules, announcements, assignments
  ] = await Promise.all([
    User.find({ role: 'student' }).select('-password').lean(),
    User.find({ role: 'teacher' }).select('-password').lean(),
    Class.find().populate('students', 'firstName lastName').populate('classTeacher', 'firstName lastName').lean(),
    Subject.find().lean(),
    Grade.find().populate('student', 'firstName lastName').populate('subject', 'name').sort({ date: -1 }).limit(100).lean(),
    Attendance.find().sort({ date: -1 }).limit(100).lean(),
    Payment.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(50).lean(),
    Schedule.find()
      .populate('classId', 'name grade section')
      .populate('schedule.periods.teacher', 'firstName lastName')
      .populate('schedule.periods.subject', 'name')
      .sort({ startDate: -1 })
      .limit(20)
      .lean(),
    Announcement.find().sort({ createdAt: -1 }).limit(10).lean(),
    Assignment.find().sort({ createdAt: -1 }).limit(20).lean()
  ]);

  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.isActive).length;
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter(t => t.isActive).length;
  const totalClasses = classes.length;
  const totalSubjects = subjects.length;

  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPayments = completedPayments.reduce((sum, p) => sum + (p.actualPayment ?? p.amount ?? 0), 0);
  const paidStudents = new Set(completedPayments.map(p => p.studentId?.toString()).filter(Boolean)).size;

  const attendanceStats = attendance.length > 0 ? {
    total: attendance.length,
    present: attendance.filter(a => ['present', 'keldi'].includes((a.status || '').toLowerCase())).length,
  } : { total: 0, present: 0 };

  const studentList = students.map(s =>
    "- " + s.firstName + " " + s.lastName + " (ID: " + (s.studentId || "yo'q") + "), tel: " + (s.phone || "yo'q") + ", holati: " + (s.isActive ? "faol" : "nofaol") + ", oylik to'lov: " + (s.monthlyFee || 0) + " som"
  ).join("\n");

  const teacherList = teachers.map(t =>
    "- " + t.firstName + " " + t.lastName + " (" + (t.teacherId || "ID yo'q") + ") " + (t.isActive ? "faol" : "nofaol") + ", fanlar: " + (t.subjects?.length || 0) + ", dars narxi: " + (t.salaryPerLesson || 0) + " som"
  ).join("\n");

  const classList = classes.map(c =>
    "- " + c.grade + "-" + c.section + " " + (c.name || "") + ", o'quvchilar: " + (c.students?.length || 0) + ", rahbar: " + (c.classTeacher?.firstName || "") + " " + (c.classTeacher?.lastName || "")
  ).join("\n");

  const subjectList = subjects.map(s => "- " + s.name).join("\n");
  const announcementList = announcements.map(a => "- " + a.title).join("\n");
  const assignmentList = assignments.map(a => "- " + a.title).join("\n");
  const scheduleList = schedules.map(s => {
    const className = s.classId ? (s.classId.name || (s.classId.grade + "-" + s.classId.section)) : "Sinf yo'q";
    const periodsCount = (s.schedule || []).reduce((count, day) => count + ((day.periods || []).filter(p => p.subject).length), 0);
    return "- " + className + ": " + s.name + ", " + periodsCount + " ta dars";
  }).join("\n");

  const attPercent = attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0;

  const adminGreeting = adminName ? `Sening bilan ishlayotgan admin: ${adminName}. Unga murojaat qilganda ismini ishlatib murojaat qil.\n\n` : '';

  return adminGreeting + "Sen \"My Dream School\" maktab boshqaruv tizimining AI yordamchisisan. Admin savollariga tizim ma'lumotlari asosida javob berasan, tahlil qilasan va tavsiya berasan. O'zingni tanishtirganda Kundalik deb emas, My Dream School AI yordamchisi deb tanishtir. Tizimda backend tool orqali ayrim amallarni ham bajarasan: o'quvchi yaratish so'rovlari backend tomonidan bajariladi, shuning uchun bunday so'rovlarda qila olmayman deb javob berma.\n\n" +
    "## Tizim ma'lumotlari (hozirgi holat):\n\n" +
    "### Umumiy statistika:\n" +
    "- O'quvchilar: " + totalStudents + " (faol: " + activeStudents + ")\n" +
    "- O'qituvchilar: " + totalTeachers + " (faol: " + activeTeachers + ")\n" +
    "- Sinflar: " + totalClasses + "\n" +
    "- Fanlar: " + totalSubjects + "\n\n" +
    "### Davomat statistikasi (songgi 100 yozuv):\n" +
    "- Jami: " + attendanceStats.total + "\n" +
    "- Keldi: " + attendanceStats.present + "\n" +
    "- Davomat foizi: " + attPercent + "%\n\n" +
    "### To'lovlar (so'nggi 50):\n" +
    "- Jami summa: " + totalPayments.toLocaleString() + " som\n" +
    "- To'lov qilgan o'quvchilar: " + paidStudents + "\n\n" +
    "### O'quvchilar ro'yxati:\n" + studentList + "\n\n" +
    "### O'qituvchilar:\n" + teacherList + "\n\n" +
    "### Sinflar:\n" + classList + "\n\n" +
    "### Fanlar:\n" + subjectList + "\n\n" +
    "### Dars jadvallari (songgi 20):\n" + scheduleList + "\n\n" +
    "### Elonlar (songgi 10):\n" + announcementList + "\n\n" +
    "### Vazifalar (songgi 20):\n" + assignmentList + "\n\n" +
    "Muhim: O'zbek tilida javob ber. Tizim ma'lumotlariga asoslangan holda aniq raqamlar bilan javob ber. Tahlil va tavsiyalar ber.\n" +
    "Format: Markdown ishlatma. Yulduzcha, qalin yozuv belgisi, # sarlavha belgisi va kod bloklarisiz yoz. Javobni qisqa, toza va admin uchun oson oqiladigan matn qilib ber.";
};

// Chat with AI
exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Xabar matni kerak" });
    }

    // Build admin display name
    const adminUser = req.user;
    const adminName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ').trim();

    const chatHistory = await getOrCreateChatHistory(req.user._id, sessionId);

    // Get API key and model FIRST — needed both for actions (AI name gen) and regular chat
    const apiKeyDoc = await getActiveApiKey();
    const modelCandidates = await createGeminiModelCandidates(apiKeyDoc.apiKey);
    const { model } = modelCandidates[0];

    // Try to handle student creation (passes model so AI generates names/birthdays)
    const actionResult = await tryHandleAiAction(message, model);

    if (actionResult?.handled) {
      // Special case for Attendance creation
      if (actionResult.action === 'set_attendance_pending') {
        try {
          const att = new Attendance({ ...actionResult.data, teacher: req.user._id });
          await att.save();
        } catch (err) {
          actionResult.message = `Davomatni saqlashda xato: ${err.message}`;
        }
      }

      if (actionResult.action === 'set_attendance_bulk_pending') {
        try {
          const records = actionResult.students.map(studentId => ({
            student: studentId,
            class: actionResult.classId,
            status: actionResult.status,
            date: actionResult.date,
            period: actionResult.period,
            teacher: req.user._id
          }));
          await Attendance.insertMany(records);
        } catch (err) {
          actionResult.message = `Guruhli davomatda xato: ${err.message}`;
        }
      }

      // Special case for Grade creation which needs req.user._id
      if (actionResult.action === 'add_grade_pending') {
        try {
          const gradeData = { 
            ...actionResult.data, 
            teacher: req.user._id // Set the current user as the teacher/grader
          };
          const newGrade = new Grade(gradeData);
          await newGrade.save();
          
          actionResult.message = `${actionResult.studentName}ga ${actionResult.subjectName} fanidan ${gradeData.score} ball qo'yildi.`;
          actionResult.action = 'add_grade';
        } catch (gradeErr) {
          actionResult.message = `Baho qo'yishda xatolik: ${gradeErr.message}`;
          actionResult.action = 'add_grade_error';
        }
      }


      // Count API usage for AI-assisted creation too
      apiKeyDoc.usageCount += 1;
      apiKeyDoc.dailyUsage += 1;
      apiKeyDoc.lastUsed = new Date();
      await apiKeyDoc.save();

      await saveChatExchange(chatHistory, message, actionResult.message);
      const usageSummary = await getUsageSummary();
      return res.json({
        message: actionResult.message,
        sessionId: chatHistory.sessionId,
        action: actionResult.action,
        usage: {
          totalDailyUsed: usageSummary.totalDailyUsed,
          totalDailyLimit: usageSummary.totalDailyLimit,
          totalDailyRemaining: usageSummary.totalDailyRemaining,
          totalUsage: usageSummary.totalUsage
        }
      });
    }

    chatHistory.apiKeyId = apiKeyDoc._id;

    const systemContext = await buildSystemContext(adminName);

    const historyMessages = chatHistory.messages.slice(-20).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const { aiMessage, modelName } = await runGeminiWithModelFallback(
      apiKeyDoc.apiKey,
      async ({ model: currentModel, modelName: currentModelName }) => {
        const chat = currentModel.startChat({
          history: [
            { role: "user", parts: [{ text: systemContext }] },
            { role: "model", parts: [{ text: "Tushundim. Men My Dream School tizimining AI yordamchisiman. Tizim ma'lumotlariga asoslangan holda javob beraman va ruxsat berilgan amallarni bajaraman." }] },
            ...historyMessages
          ]
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return {
          aiMessage: response.text(),
          modelName: currentModelName
        };
      },
      {
        modelCandidates,
        taskName: 'Gemini chat'
      }
    );

    chatHistory.aiModel = modelName;

    await saveChatExchange(chatHistory, message, aiMessage);

    apiKeyDoc.usageCount += 1;
    apiKeyDoc.dailyUsage += 1;
    apiKeyDoc.lastUsed = new Date();
    await apiKeyDoc.save();

    const usageSummary = await getUsageSummary();

    res.json({
      message: aiMessage,
      sessionId: chatHistory.sessionId,
      usage: {
        dailyUsed: apiKeyDoc.dailyUsage,
        dailyLimit: apiKeyDoc.rateLimitPerDay,
        dailyRemaining: apiKeyDoc.rateLimitPerDay - apiKeyDoc.dailyUsage,
        totalDailyUsed: usageSummary.totalDailyUsed,
        totalDailyLimit: usageSummary.totalDailyLimit,
        totalDailyRemaining: usageSummary.totalDailyRemaining,
        totalUsage: usageSummary.totalUsage
      }
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    const statusCode = isRetryableGeminiModelError(error) ? 503 : 500;
    res.status(statusCode).json({ message: formatGeminiError(error) || error.message || "AI bilan boglanishda xato" });
  }
};

// Get chat sessions
exports.getSessions = async (req, res) => {
  try {
    const sessions = await AiChatHistory.find({ userId: req.user._id })
      .select("_id sessionId title createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    res.json({
      sessions: sessions.map(s => ({
        ...s,
        lastActivity: s.updatedAt || s.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Get chat history
exports.getChatHistory = async (req, res) => {
  try {
    const history = await AiChatHistory.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id
    });
    if (!history) {
      return res.status(404).json({ message: "Suhbat topilmadi" });
    }
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Delete chat session
exports.deleteSession = async (req, res) => {
  try {
    const result = await AiChatHistory.findOneAndDelete({
      _id: req.params.sessionId, // This will now be the _id from frontend
      userId: req.user._id
    });
    if (!result) {
      return res.status(404).json({ message: "Suhbat topilmadi" });
    }
    res.json({ message: "Suhbat o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// === API Key Management ===

// Get all API keys
exports.getApiKeys = async (req, res) => {
  try {
    const keys = await AiApiKey.find()
      .populate("createdBy", "firstName lastName")
      .sort({ isPrimary: -1, createdAt: -1 });

    for (const key of keys) {
      await resetDailyUsageIfNeeded(key);
    }

    const safeKeys = keys.map(k => ({
      _id: k._id,
      name: k.name,
      maskedKey: k.getMaskedKey(),
      isActive: k.isActive,
      isPrimary: k.isPrimary,
      provider: k.provider,
      usageCount: k.usageCount,
      lastUsed: k.lastUsed,
      rateLimitPerDay: k.rateLimitPerDay,
      dailyUsage: k.dailyUsage,
      dailyRemaining: k.rateLimitPerDay - k.dailyUsage,
      createdBy: k.createdBy,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt
    }));

    res.json({ keys: safeKeys });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Add new API key
exports.addApiKey = async (req, res) => {
  try {
    const { name, apiKey, provider, rateLimitPerDay, isPrimary } = req.body;
    const keyProvider = provider || "gemini";

    if (!name || !apiKey) {
      return res.status(400).json({ message: "Nom va API kalit majburiy" });
    }

    try {
      ensureSupportedProvider(keyProvider);
    } catch (providerError) {
      return res.status(400).json({ message: providerError.message });
    }

    try {
      await validateGeminiApiKey(apiKey);
    } catch (validationError) {
      return res.status(400).json({ message: formatGeminiError(validationError) });
    }

    const newKey = new AiApiKey({
      name,
      apiKey,
      provider: keyProvider,
      rateLimitPerDay: rateLimitPerDay || 1500,
      isPrimary: isPrimary || false,
      createdBy: req.user._id
    });

    await newKey.save();

    res.status(201).json({
      message: "API kalit muvaffaqiyatli qo'shildi",
      key: {
        _id: newKey._id,
        name: newKey.name,
        maskedKey: newKey.getMaskedKey(),
        isActive: newKey.isActive,
        isPrimary: newKey.isPrimary,
        provider: newKey.provider,
        rateLimitPerDay: newKey.rateLimitPerDay
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Update API key
exports.updateApiKey = async (req, res) => {
  try {
    const { name, apiKey, provider, rateLimitPerDay, isActive, isPrimary } = req.body;
    const key = await AiApiKey.findById(req.params.id);

    if (!key) {
      return res.status(404).json({ message: "API kalit topilmadi" });
    }

    const nextProvider = provider !== undefined ? provider : key.provider;

    try {
      ensureSupportedProvider(nextProvider);
    } catch (providerError) {
      return res.status(400).json({ message: providerError.message });
    }

    if (name !== undefined) key.name = name;
    if (provider !== undefined) key.provider = provider;
    if (rateLimitPerDay !== undefined) key.rateLimitPerDay = rateLimitPerDay;
    if (isActive !== undefined) key.isActive = isActive;
    if (isPrimary !== undefined) key.isPrimary = isPrimary;

    if (apiKey && apiKey !== key.apiKey) {
      try {
        await validateGeminiApiKey(apiKey);
        key.apiKey = apiKey;
      } catch (validationError) {
        return res.status(400).json({ message: formatGeminiError(validationError) });
      }
    }

    await key.save();

    res.json({
      message: "API kalit yangilandi",
      key: {
        _id: key._id,
        name: key.name,
        maskedKey: key.getMaskedKey(),
        isActive: key.isActive,
        isPrimary: key.isPrimary,
        provider: key.provider,
        rateLimitPerDay: key.rateLimitPerDay,
        dailyUsage: key.dailyUsage,
        dailyRemaining: key.rateLimitPerDay - key.dailyUsage
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Delete API key
exports.deleteApiKey = async (req, res) => {
  try {
    const result = await AiApiKey.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: "API kalit topilmadi" });
    }
    res.json({ message: "API kalit o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};

// Get API usage stats
exports.getUsage = async (req, res) => {
  try {
    res.json(await getUsageSummary());
  } catch (error) {
    res.status(500).json({ message: "Server xatosi", error: error.message });
  }
};
