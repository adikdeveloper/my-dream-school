const express = require('express');
const { auth, authorize } = require('../../middleware/auth');
const { invalidateCache, getUserPermissions, loadAllPermissions } = require('../../middleware/permissions');
const RolePermission = require('../../models/permissions/RolePermission');
const { ROLES, PERMISSIONS, getGroupedCatalog, getDefaultPermissions, encodeKey, decodeKey } = require('../../models/permissions/permissionCatalog');

const router = express.Router();

// Direktor — eng yuqori rol. 'director' rolining ruxsatlarini faqat direktorning o'zi
// o'zgartira oladi (admin/yordamchi direktorni cheklab qo'ya olmasin).
const guardDirectorRole = (req, res) => {
  if (req.params.role === 'director' && req.user.role !== 'director') {
    res.status(403).json({ message: "Direktor rolini faqat direktorning o'zi o'zgartira oladi" });
    return false;
  }
  return true;
};

// Mongoose Map kalitlari nuqtani qo'llamaydi — saqlashda kodlaymiz, o'qiganda qaytaramiz.
const encodeMap = (obj) => {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { out[encodeKey(k)] = !!v; });
  return out;
};
const decodeStored = (stored) => {
  const out = {};
  Object.entries(stored || {}).forEach(([k, v]) => { out[decodeKey(k)] = !!v; });
  return out;
};

// GET /api/permissions/catalog — barcha ruxsatlar ro'yxati (admin/direktor)
router.get('/catalog', auth, authorize('admin', 'director'), (req, res) => {
  res.json({
    roles: ROLES,
    permissions: PERMISSIONS,
    grouped: getGroupedCatalog()
  });
});

// GET /api/permissions — barcha rollar uchun joriy ruxsatlar (admin/direktor)
router.get('/', auth, authorize('admin', 'director'), async (req, res) => {
  try {
    const all = await loadAllPermissions();
    res.json({ permissions: all });
  } catch (err) {
    console.error('list permissions:', err);
    res.status(500).json({ message: 'Xatolik' });
  }
});

// PUT /api/permissions/:role — bitta rol uchun ruxsatlar to'liq yangilash
router.put('/:role', auth, authorize('admin', 'director'), async (req, res) => {
  try {
    const { role } = req.params;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Noto'g'ri rol" });
    }
    if (!guardDirectorRole(req, res)) return;
    const permissions = req.body.permissions || {};
    // Faqat catalog ichidagi kalitlarga ruxsat; kalitni kodlab saqlaymiz
    const validKeys = new Set(PERMISSIONS.map((p) => p.key));
    const clean = {};
    Object.entries(permissions).forEach(([k, v]) => {
      if (validKeys.has(k)) clean[encodeKey(k)] = !!v;
    });

    const doc = await RolePermission.findOneAndUpdate(
      { role },
      { $set: { permissions: clean } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    invalidateCache();
    const stored = doc.permissions instanceof Map
      ? Object.fromEntries(doc.permissions)
      : (doc.permissions || {});
    res.json({ role, permissions: decodeStored(stored) });
  } catch (err) {
    console.error('update permissions:', err);
    res.status(500).json({ message: 'Saqlashda xatolik' });
  }
});

// PUT /api/permissions/:role/:key — bitta ruxsatni toggle (admin/direktor)
router.put('/:role/:key', auth, authorize('admin', 'director'), async (req, res) => {
  try {
    const { role, key } = req.params;
    if (!ROLES.includes(role)) return res.status(400).json({ message: "Noto'g'ri rol" });
    if (!guardDirectorRole(req, res)) return;
    const validKeys = new Set(PERMISSIONS.map((p) => p.key));
    if (!validKeys.has(key)) return res.status(400).json({ message: "Noto'g'ri ruxsat kaliti" });

    const value = !!req.body.value;
    const ek = encodeKey(key);
    const doc = await RolePermission.findOne({ role });
    if (doc) {
      doc.permissions.set(ek, value);
      await doc.save();
    } else {
      // Yangi hujjatni to'liq default to'plam bilan (kodlangan kalitlar) urug'lantirish
      const defaults = getDefaultPermissions()[role] || {};
      const seeded = new Map(Object.entries(defaults).map(([k, v]) => [encodeKey(k), !!v]));
      seeded.set(ek, value);
      await RolePermission.create({ role, permissions: seeded });
    }
    invalidateCache();
    res.json({ role, key, value });
  } catch (err) {
    console.error('toggle permission:', err);
    res.status(500).json({ message: 'Xatolik' });
  }
});

// POST /api/permissions/reset/:role — defaultga qaytarish
router.post('/reset/:role', auth, authorize('admin', 'director'), async (req, res) => {
  try {
    const { role } = req.params;
    if (!ROLES.includes(role)) return res.status(400).json({ message: "Noto'g'ri rol" });
    if (!guardDirectorRole(req, res)) return;
    const defaults = getDefaultPermissions()[role] || {};
    await RolePermission.findOneAndUpdate(
      { role },
      { $set: { permissions: encodeMap(defaults) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    invalidateCache();
    res.json({ role, permissions: defaults });
  } catch (err) {
    console.error('reset:', err);
    res.status(500).json({ message: 'Xatolik' });
  }
});

// GET /api/permissions/me — joriy foydalanuvchining ruxsatlari (hammaga)
router.get('/me', auth, async (req, res) => {
  try {
    const perms = await getUserPermissions(req.user);
    res.json({ role: req.user.role, permissions: perms });
  } catch (err) {
    console.error('me permissions:', err);
    res.status(500).json({ permissions: {} });
  }
});

module.exports = router;
