/**
 * RESPONSE PARSER UTILITY
 * =======================
 * AI javoblarini parse qilish va normalizatsiya qilish.
 * JSON extraction, xato handling va matn tozalash.
 */

// ─── JSON extractors ──────────────────────────────────────────────────────────

/**
 * AI javobidan JSON ob'ektini ajratib oladi.
 * @param {string} text - AI javob matni
 * @returns {Object|null}
 */
const extractJsonObject = (text) => {
  if (!text) return null;
  const match = String(text).trim().match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

/**
 * AI javobidan JSON massivini ajratib oladi.
 * @param {string} text - AI javob matni
 * @returns {Array|null}
 */
const extractJsonArray = (text) => {
  if (!text) return null;
  const match = String(text).trim().match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

// ─── Matn normalizatsiya ──────────────────────────────────────────────────────

/**
 * Buyruq matnini normallashtiradi (kichik harf, bo'sh joy tozalash).
 * @param {string} text
 * @returns {string}
 */
const normalizeCommandText = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Sonni matndan ajratib oladi (e.g., "5 ta o'quvchi" → 5).
 * @param {string} message
 * @param {number} max - Maksimal ruxsat etilgan son
 * @returns {number}
 */
const parseCount = (message, max = 50) => {
  const m = String(message || '').match(/\b(\d+)\s*(?:ta|nafar|dona|student|students)?/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n > 1) return Math.min(n, max);
  }
  return 1;
};

// ─── Intent detectors ─────────────────────────────────────────────────────────

/**
 * Xabar "yaratish" niyatini bildiradi tekshiradi.
 */
const isCreateIntent = (normalized) =>
  /(qo'sh|qosh|yarat|kirit|add|create|insert|добавь|создай|сделай)/i.test(normalized);

/**
 * Xabar "tahrirlash" niyatini bildiradi tekshiradi.
 */
const isEditIntent = (normalized) =>
  /(o'zgartir|tahrirlash|yangilashtir|update|edit|change|modify|rename|set|assign|biriktir|ko'chir|faollashtir|aktivlashtir|deactivate|activate|измени|редактируй|обнови|переведи|замени)/i.test(normalized);

/**
 * Xabar "o'chirish" niyatini bildiradi tekshiradi.
 */
const isDeleteIntent = (normalized) =>
  /(o'chir|ochir|delete|remove|удали|убери)/i.test(normalized);

/**
 * Xabar "ko'rish/olish" niyatini bildiradi tekshiradi.
 */
const isViewIntent = (normalized) =>
  /(ko'rsat|korsat|ber|show|get|list|chiqar|топ|покажи|дай|список)/i.test(normalized);

// ─── Standard response builders ───────────────────────────────────────────────

/**
 * Muvaffaqiyatli AI javob ob'ekti yaratadi.
 */
const successResponse = (action, message, extra = {}) => ({
  handled: true,
  action,
  message,
  ...extra
});

/**
 * Xatolik AI javob ob'ekti yaratadi.
 */
const errorResponse = (action, message) => ({
  handled: true,
  action,
  message
});

module.exports = {
  extractJsonObject,
  extractJsonArray,
  normalizeCommandText,
  parseCount,
  isCreateIntent,
  isEditIntent,
  isDeleteIntent,
  isViewIntent,
  successResponse,
  errorResponse
};
