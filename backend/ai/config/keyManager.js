/**
 * AI KEY MANAGER
 * ==============
 * API kalitlarni boshqarish: olish, limit tekshirish, usage hisoblash.
 *
 * QOIDALAR:
 * - Kalitlar DB dan olinadi (AiApiKey modeli)
 * - Kunlik limit tekshiriladi va avtomatik yangilanadi
 * - Usage statistikasi real-time yangilanadi
 */

const AiApiKey = require('../../models/ai/AiApiKey');

// ─── Kunlik usage reset ───────────────────────────────────────────────────────
const resetDailyUsageIfNeeded = async (key) => {
  const now       = new Date();
  const resetDate = new Date(key.dailyUsageReset);
  if (now.toDateString() !== resetDate.toDateString()) {
    await AiApiKey.updateOne(
      { _id: key._id },
      { $set: { dailyUsage: 0, dailyUsageReset: now } }
    );
    key.dailyUsage      = 0;
    key.dailyUsageReset = now;
  }
};

// ─── Faol API kalitni olish ───────────────────────────────────────────────────
const getActiveApiKey = async () => {
  const key = await AiApiKey.findOne({ isActive: true, provider: 'gemini' })
    .sort({ isPrimary: -1, createdAt: -1 });

  if (!key) {
    throw new Error("Aktiv Google Gemini API kalit topilmadi. Avval Gemini API kalit qo'shing.");
  }

  await resetDailyUsageIfNeeded(key);

  if (key.dailyUsage >= key.rateLimitPerDay) {
    throw new Error("Kunlik limit tugadi. Iltimos ertaga qayta urinib ko'ring yoki limitni oshiring.");
  }

  return key;
};

// ─── Usage statistikasi ───────────────────────────────────────────────────────
const getUsageSummary = async () => {
  const keys = await AiApiKey.find({ isActive: true });

  for (const key of keys) {
    await resetDailyUsageIfNeeded(key);
  }

  const totalDailyUsed  = keys.reduce((sum, k) => sum + k.dailyUsage, 0);
  const totalDailyLimit = keys.reduce((sum, k) => sum + k.rateLimitPerDay, 0);
  const totalUsage      = keys.reduce((sum, k) => sum + k.usageCount, 0);

  return {
    totalDailyUsed,
    totalDailyLimit,
    totalDailyRemaining: totalDailyLimit - totalDailyUsed,
    totalUsage,
    keysCount: keys.length,
    keys: keys.map(k => ({
      _id:            k._id,
      name:           k.name,
      dailyUsed:      k.dailyUsage,
      dailyLimit:     k.rateLimitPerDay,
      dailyRemaining: k.rateLimitPerDay - k.dailyUsage,
      totalUsage:     k.usageCount,
      lastUsed:       k.lastUsed,
      isActive:       k.isActive
    }))
  };
};

// ─── Usage sanashni oshirish ──────────────────────────────────────────────────
const incrementKeyUsage = async (keyDoc) => {
  keyDoc.usageCount += 1;
  keyDoc.dailyUsage += 1;
  keyDoc.lastUsed    = new Date();
  await keyDoc.save();
};

module.exports = {
  resetDailyUsageIfNeeded,
  getActiveApiKey,
  getUsageSummary,
  incrementKeyUsage
};
