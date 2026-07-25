/**
 * API KEYS MODULE - Controller
 * ==============================
 * Gemini API kalitlarini boshqarish endpoint'lari.
 *
 * ENDPOINT'LAR:
 * GET    /api/ai/keys          → Barcha kalitlar ro'yxati
 * POST   /api/ai/keys          → Yangi kalit qo'shish
 * PUT    /api/ai/keys/:id      → Kalitni yangilash
 * DELETE /api/ai/keys/:id      → Kalitni o'chirish
 * GET    /api/ai/usage         → Umumiy usage statistikasi
 *
 * XAVFSIZLIK:
 * - API kalitlar maskalangan holda qaytariladi (getMaskedKey())
 * - Yangi kalit qo'shishda validatsiya o'tkaziladi
 * - Faqat admin ruxsati bilan ishlaydi
 */

const AiApiKey = require('../../models/ai/AiApiKey');
const { getUsageSummary, resetDailyUsageIfNeeded } = require('../config/keyManager');
const { ensureSupportedProvider, validateGeminiApiKey, formatGeminiError } = require('../config/aiConfig');

// ─── GET /api/ai/keys ─────────────────────────────────────────────────────────
exports.getApiKeys = async (req, res) => {
  try {
    const keys = await AiApiKey.find()
      .populate('createdBy', 'firstName lastName')
      .sort({ isPrimary: -1, createdAt: -1 });

    for (const key of keys) {
      await resetDailyUsageIfNeeded(key);
    }

    const safeKeys = keys.map(k => ({
      _id:            k._id,
      name:           k.name,
      maskedKey:      k.getMaskedKey(),
      isActive:       k.isActive,
      isPrimary:      k.isPrimary,
      provider:       k.provider,
      usageCount:     k.usageCount,
      lastUsed:       k.lastUsed,
      rateLimitPerDay: k.rateLimitPerDay,
      dailyUsage:     k.dailyUsage,
      dailyRemaining: k.rateLimitPerDay - k.dailyUsage,
      createdBy:      k.createdBy,
      createdAt:      k.createdAt,
      updatedAt:      k.updatedAt
    }));

    res.json({ keys: safeKeys });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── POST /api/ai/keys ────────────────────────────────────────────────────────
exports.addApiKey = async (req, res) => {
  try {
    const { name, apiKey, provider, rateLimitPerDay, isPrimary } = req.body;
    const keyProvider = provider || 'gemini';

    if (!name || !apiKey) {
      return res.status(400).json({ message: 'Nom va API kalit majburiy' });
    }

    try { ensureSupportedProvider(keyProvider); }
    catch (e) { return res.status(400).json({ message: e.message }); }

    try { await validateGeminiApiKey(apiKey); }
    catch (e) { return res.status(400).json({ message: formatGeminiError(e) }); }

    const newKey = new AiApiKey({
      name, apiKey, provider: keyProvider,
      rateLimitPerDay: rateLimitPerDay || 1500,
      isPrimary:       isPrimary       || false,
      createdBy:       req.user._id
    });
    await newKey.save();

    res.status(201).json({
      message: "API kalit muvaffaqiyatli qo'shildi",
      key: {
        _id:            newKey._id,
        name:           newKey.name,
        maskedKey:      newKey.getMaskedKey(),
        isActive:       newKey.isActive,
        isPrimary:      newKey.isPrimary,
        provider:       newKey.provider,
        rateLimitPerDay: newKey.rateLimitPerDay
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── PUT /api/ai/keys/:id ─────────────────────────────────────────────────────
exports.updateApiKey = async (req, res) => {
  try {
    const { name, apiKey, provider, rateLimitPerDay, isActive, isPrimary } = req.body;
    const key = await AiApiKey.findById(req.params.id);
    if (!key) return res.status(404).json({ message: 'API kalit topilmadi' });

    const nextProvider = provider !== undefined ? provider : key.provider;
    try { ensureSupportedProvider(nextProvider); }
    catch (e) { return res.status(400).json({ message: e.message }); }

    if (name            !== undefined) key.name            = name;
    if (provider        !== undefined) key.provider        = provider;
    if (rateLimitPerDay !== undefined) key.rateLimitPerDay = rateLimitPerDay;
    if (isActive        !== undefined) key.isActive        = isActive;
    if (isPrimary       !== undefined) key.isPrimary       = isPrimary;

    if (apiKey && apiKey !== key.apiKey) {
      try { await validateGeminiApiKey(apiKey); key.apiKey = apiKey; }
      catch (e) { return res.status(400).json({ message: formatGeminiError(e) }); }
    }

    await key.save();
    res.json({
      message: 'API kalit yangilandi',
      key: {
        _id:            key._id,
        name:           key.name,
        maskedKey:      key.getMaskedKey(),
        isActive:       key.isActive,
        isPrimary:      key.isPrimary,
        provider:       key.provider,
        rateLimitPerDay: key.rateLimitPerDay,
        dailyUsage:     key.dailyUsage,
        dailyRemaining: key.rateLimitPerDay - key.dailyUsage
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── DELETE /api/ai/keys/:id ──────────────────────────────────────────────────
exports.deleteApiKey = async (req, res) => {
  try {
    const key = await AiApiKey.findByIdAndDelete(req.params.id);
    if (!key) return res.status(404).json({ message: 'API kalit topilmadi' });
    res.json({ message: "API kalit o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── GET /api/ai/usage ────────────────────────────────────────────────────────
exports.getUsage = async (req, res) => {
  try {
    const summary = await getUsageSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};
