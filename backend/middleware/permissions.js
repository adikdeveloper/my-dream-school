const RolePermission = require('../models/permissions/RolePermission');
const { getDefaultPermissions, PERMISSIONS } = require('../models/permissions/permissionCatalog');

// In-memory cache: { role: { key: bool } }, TTL 60s
let cache = null;
let cacheLoadedAt = 0;
const CACHE_TTL = 60 * 1000;

const loadAllPermissions = async () => {
  if (cache && Date.now() - cacheLoadedAt < CACHE_TTL) return cache;
  const docs = await RolePermission.find({}).lean();
  const result = getDefaultPermissions();
  docs.forEach((doc) => {
    if (!result[doc.role]) result[doc.role] = {};
    const stored = doc.permissions instanceof Map
      ? Object.fromEntries(doc.permissions)
      : (doc.permissions || {});
    Object.entries(stored).forEach(([k, v]) => {
      result[doc.role][k] = !!v;
    });
  });
  cache = result;
  cacheLoadedAt = Date.now();
  return result;
};

const invalidateCache = () => { cache = null; cacheLoadedAt = 0; };

// Foydalanuvchining ruxsatlarini olish
const getUserPermissions = async (user) => {
  if (!user || !user.role) return {};
  const all = await loadAllPermissions();
  return all[user.role] || {};
};

// Foydalanuvchida ruxsat bor-yo'qligini tekshirish (boolean)
const hasPermission = async (user, key) => {
  if (!user) return false;
  // Admin va Director har doim hammasi (xavfsizlik tarmog'i — UI'da o'chirilishi mumkin lekin xavfsizroq)
  if (user.role === 'admin' || user.role === 'director') {
    const perms = await getUserPermissions(user);
    // Agar yopiq qilingan bo'lsa - hurmat qilamiz (admin o'zi o'chirishi mumkin)
    return perms[key] !== false;
  }
  const perms = await getUserPermissions(user);
  return !!perms[key];
};

// Express middleware: ruxsat bo'lmasa 403
const requirePermission = (key) => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Avval kirish kerak" });
    const ok = await hasPermission(req.user, key);
    if (!ok) {
      return res.status(403).json({
        message: "Bu amal uchun ruxsat yo'q",
        missingPermission: key
      });
    }
    next();
  } catch (err) {
    console.error('requirePermission error:', err);
    return res.status(500).json({ message: 'Ruxsat tekshirishda xatolik' });
  }
};

// Bir nechta ruxsatdan biri bo'lsa yetadi
const requireAnyPermission = (...keys) => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Avval kirish kerak" });
    for (const k of keys) {
      if (await hasPermission(req.user, k)) return next();
    }
    return res.status(403).json({
      message: "Bu amal uchun ruxsat yo'q",
      missingPermission: keys.join(' yoki ')
    });
  } catch (err) {
    console.error('requireAnyPermission error:', err);
    return res.status(500).json({ message: 'Ruxsat tekshirishda xatolik' });
  }
};

module.exports = {
  loadAllPermissions,
  invalidateCache,
  getUserPermissions,
  hasPermission,
  requirePermission,
  requireAnyPermission
};
