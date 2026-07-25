/**
 * AI CONFIG MODULE
 * ================
 * Gemini API sozlamalari va model tanlash logikasi.
 * Barcha AI modullari shu fayldan sozlamalarni oladi.
 */

const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Sozlamalar ───────────────────────────────────────────────────────────────
const GEMINI_API_BASE_URL = (process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
const GEMINI_API_VERSION  = process.env.GEMINI_API_VERSION || 'v1beta';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const GEMINI_MODEL_CACHE_TTL_MS = Number(process.env.GEMINI_MODEL_CACHE_TTL_MS || 60 * 60 * 1000);

const geminiModelCache = new Map();

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
const normalizeGeminiModelName = (modelName) =>
  String(modelName || '').trim().replace(/^models\//i, '');

const splitModelCandidates = (value) =>
  String(value || '').split(/[\s,;]+/).map(normalizeGeminiModelName).filter(Boolean);

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
  ].map(m => String(m).toLowerCase());
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
  if (versionMatch) score += Number(versionMatch[1]) * 100 + Number(versionMatch[2] || 0) * 10;
  if (aliases.includes('flash'))  score += 120;
  if (aliases.includes('pro'))    score += 90;
  if (aliases.includes('latest')) score += 25;
  if (/(preview|experimental|exp)/i.test(aliases)) score -= 40;
  return score;
};

// ─── Gemini API HTTP so'rovlari ───────────────────────────────────────────────
const requestGeminiJson = (url, apiKey) => new Promise((resolve, reject) => {
  const req = https.request(url, {
    method: 'GET',
    headers: { Accept: 'application/json', 'x-goog-api-key': apiKey }
  }, (res) => {
    let bodyText = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      bodyText += chunk;
      if (bodyText.length > 2_000_000) req.destroy(new Error("Gemini API javobi juda katta bo'ldi."));
    });
    res.on('end', () => {
      let body = {};
      try { body = bodyText ? JSON.parse(bodyText) : {}; }
      catch (parseError) {
        const err = new Error(`Gemini API JSON javobi o'qilmadi: ${parseError.message}`);
        err.statusCode = res.statusCode;
        return reject(err);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        const apiMessage = body?.error?.message || body?.message || bodyText || 'Nomalum xato';
        const err = new Error(`Gemini API xato [${res.statusCode}]: ${apiMessage}`);
        err.statusCode = res.statusCode;
        err.apiStatus  = body?.error?.status;
        return reject(err);
      }
      resolve(body);
    });
  });
  req.setTimeout(15000, () => req.destroy(new Error("Gemini API model ro'yxatini olish muddati tugadi.")));
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
    if (Array.isArray(body.models)) models.push(...body.models);
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return models;
};

const chooseGeminiModels = (availableModels) => {
  const supportedModels    = availableModels.filter(modelSupportsGenerateContent);
  const configuredCandidates = getConfiguredGeminiModelCandidates();
  const orderedModels = [];
  for (const candidate of configuredCandidates) {
    const matched = supportedModels.find(mi => getGeminiModelAliases(mi).includes(candidate));
    if (matched) orderedModels.push(getPreferredModelName(matched));
  }
  orderedModels.push(
    ...supportedModels.slice().sort((a, b) => scoreGeminiModel(b) - scoreGeminiModel(a)).map(getPreferredModelName)
  );
  return unique(orderedModels);
};

// ─── Model cache boshqaruvi ───────────────────────────────────────────────────
const getGeminiCacheKey = (apiKey) =>
  `${GEMINI_API_VERSION}:${apiKey}:${getConfiguredGeminiModelCandidates().join('|')}`;

const resolveGeminiModelNames = async (apiKey, { forceRefresh = false } = {}) => {
  const cacheKey = getGeminiCacheKey(apiKey);
  const cached   = geminiModelCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    if (Array.isArray(cached.modelNames) && cached.modelNames.length > 0) return cached.modelNames;
    if (cached.modelName) return [cached.modelName];
  }
  const availableModels = await listGeminiModels(apiKey);
  const modelNames      = chooseGeminiModels(availableModels);
  if (modelNames.length === 0) {
    throw new Error("Gemini API kalit uchun generateContent'ni qo'llab-quvvatlaydigan model topilmadi.");
  }
  geminiModelCache.set(cacheKey, { modelName: modelNames[0], modelNames, expiresAt: Date.now() + GEMINI_MODEL_CACHE_TTL_MS });
  return modelNames;
};

const resolveGeminiModelName = async (apiKey, options = {}) =>
  (await resolveGeminiModelNames(apiKey, options))[0];

const demoteGeminiModel = (apiKey, modelName) => {
  const cacheKey = getGeminiCacheKey(apiKey);
  const cached   = geminiModelCache.get(cacheKey);
  const cachedModelNames = cached?.modelNames || (cached?.modelName ? [cached.modelName] : []);
  const normalizedModelName = normalizeGeminiModelName(modelName);
  if (cachedModelNames.length <= 1 || !normalizedModelName) return;
  const remainingModels = cachedModelNames.filter(n => normalizeGeminiModelName(n) !== normalizedModelName);
  if (remainingModels.length === cachedModelNames.length) return;
  const updatedModelNames = [...remainingModels, normalizedModelName];
  geminiModelCache.set(cacheKey, { modelName: updatedModelNames[0], modelNames: updatedModelNames, expiresAt: cached.expiresAt || Date.now() + GEMINI_MODEL_CACHE_TTL_MS });
};

// ─── Model instance yaratish ──────────────────────────────────────────────────
const createGeminiModelCandidates = async (apiKey, options = {}) => {
  const modelNames = await resolveGeminiModelNames(apiKey, options);
  const genAI = new GoogleGenerativeAI(apiKey);
  return modelNames.map(modelName => ({
    model: genAI.getGenerativeModel({ model: modelName }, { apiVersion: GEMINI_API_VERSION }),
    modelName
  }));
};

const isRetryableGeminiModelError = (error) => {
  const message = error?.message || String(error);
  return /503|UNAVAILABLE|Service Unavailable|high demand|overloaded|temporar|try again later/i.test(message);
};

const runGeminiWithModelFallback = async (apiKey, operation, options = {}) => {
  const { forceRefresh = false, modelCandidates = null, taskName = 'Gemini request' } = options;
  const candidates = modelCandidates || await createGeminiModelCandidates(apiKey, { forceRefresh });
  let lastError = null;
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    try {
      return await operation(candidate, index);
    } catch (error) {
      lastError = error;
      const shouldTryNextModel = index < candidates.length - 1 && isRetryableGeminiModelError(error);
      if (!shouldTryNextModel) throw error;
      demoteGeminiModel(apiKey, candidate.modelName);
      console.warn(`${taskName} failed on ${candidate.modelName}. Trying ${candidates[index + 1].modelName}.`, error.message);
    }
  }
  throw lastError || new Error("Gemini API modeli bilan bog'lanishda xato yuz berdi.");
};

// ─── Xato formatlash ─────────────────────────────────────────────────────────
const formatGeminiError = (error) => {
  const message = error?.message || String(error);
  const configuredModels = getConfiguredGeminiModelCandidates().join(', ');
  if (/API key not valid/i.test(message)) return "Gemini API kalit noto'g'ri. Google AI Studio'dan olingan API keyni kiriting.";
  if (/API_KEY_INVALID|INVALID_ARGUMENT/i.test(message)) return "Gemini API kalit yoki model sozlamasi rad etildi.";
  if (/PERMISSION_DENIED|403|permission/i.test(message)) return "Gemini API ruxsati yo'q. Google Cloud'da API key cheklovlarini tekshiring.";
  if (isRetryableGeminiModelError(error)) return "Gemini modeli hozir band yoki vaqtincha javob bermayapti. Keyinroq urinib ko'ring.";
  if (/quota|429|RESOURCE_EXHAUSTED/i.test(message)) return "Gemini API quota yoki limit tugagan. Google AI Studio/Cloud'dagi limitlarni tekshiring.";
  if (/not found|404|models\//i.test(message)) return `Gemini modeli topilmadi. Sozlangan model(lar): ${configuredModels}.`;
  return `Gemini API tekshiruvida xato: ${message}`;
};

const ensureSupportedProvider = (provider = 'gemini') => {
  if (provider !== 'gemini') throw new Error("Hozircha faqat Google Gemini API kalitlari qo'llab-quvvatlanadi.");
};

const validateGeminiApiKey = async (apiKey) => {
  await runGeminiWithModelFallback(
    apiKey,
    ({ model }) => model.generateContent("Salom"),
    { forceRefresh: true, taskName: 'Gemini API key validation' }
  );
};

module.exports = {
  GEMINI_API_VERSION,
  GEMINI_DEFAULT_MODEL,
  createGeminiModelCandidates,
  runGeminiWithModelFallback,
  isRetryableGeminiModelError,
  formatGeminiError,
  ensureSupportedProvider,
  validateGeminiApiKey,
  resolveGeminiModelName,
  resolveGeminiModelNames
};
