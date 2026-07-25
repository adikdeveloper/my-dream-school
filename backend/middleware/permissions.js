const RolePermission = require('../models/permissions/RolePermission');
const { getDefaultPermissions, PERMISSIONS, decodeKey } = require('../models/permissions/permissionCatalog');

// In-memory cache: { role: { key: bool } }, TTL 15s
// Eslatma: bu jarayon-ichi cache. Ko'p instansli (cluster/PM2/bir nechta pod) deploy'da
// invalidateCache() faqat yozgan jarayonni tozalaydi — boshqa instanslar eski qiymatni
// TTL tugaguncha ko'rsatadi. Bitta instansda muammosiz. Tezroq qo'llanishi uchun TTL past.
let cache = null;
let cacheLoadedAt = 0;
const CACHE_TTL = 15 * 1000;

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
      result[doc.role][decodeKey(k)] = !!v; // saqlangan ":" kalitni asl "." holatga qaytaramiz
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
  // Direktor — eng yuqori rol (boshliq): har doim barcha ruxsatlarga ega, hech qachon
  // qulflanmaydi. Direktor o'zini cheklab qo'ya olmaydi.
  if (user.role === 'director') return true;
  // Admin (direktor yordamchisi) va boshqa barcha rollar — katalog/saqlangan qiymat
  // asosida. Direktor bularning ruxsatlarini dashboarddan boshqaradi.
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
