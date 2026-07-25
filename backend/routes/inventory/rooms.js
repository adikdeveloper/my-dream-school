/**
 * INVENTORY (JIHOZLAR) - Routes
 * =============================
 * Maktab jihozlari xonalar bo'yicha boshqariladi.
 *
 * ENDPOINT'LAR:
 *   GET    /api/inventory/rooms        → barcha xonalar (filterlar: floor, type, search)
 *   POST   /api/inventory/rooms        → yangi xona qo'shish
 *   PUT    /api/inventory/rooms/:id    → xonani tahrirlash (jihozlar bilan birga)
 *   DELETE /api/inventory/rooms/:id    → xonani o'chirish
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Room = require('../../models/inventory/Room');
const { auth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');

const ROOM_TYPES = ['classroom', 'lab', 'office', 'library', 'gym', 'cafeteria', 'storage', 'restroom', 'hall', 'other'];
const CONDITIONS = ['good', 'needs_repair', 'broken'];

// Kiruvchi jihozlar ro'yxatini tozalash/normallashtirish
const sanitizeItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .filter((it) => it && typeof it.name === 'string' && it.name.trim())
    .map((it) => ({
      name: String(it.name).trim().slice(0, 100),
      quantity: Math.max(0, parseInt(it.quantity, 10) || 0),
      condition: CONDITIONS.includes(it.condition) ? it.condition : 'good',
      note: typeof it.note === 'string' ? it.note.trim().slice(0, 300) : ''
    }));
};

// ─── GET /api/inventory/rooms ────────────────────────────────────────────────
router.get('/rooms', auth, requirePermission('inventory.view'), async (req, res) => {
  try {
    const { floor, type, search } = req.query;
    const filter = { isActive: true };

    if (floor !== undefined && floor !== '') filter.floor = parseInt(floor, 10);
    if (type && ROOM_TYPES.includes(type)) filter.type = type;

    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { roomNumber: rx },
        { name: rx },
        { responsible: rx },
        { 'items.name': rx }
      ];
    }

    const rooms = await Room.find(filter)
      .populate('createdBy', 'firstName lastName role')
      .sort({ floor: 1, roomNumber: 1 });

    res.json({ rooms, count: rooms.length });
  } catch (error) {
    res.status(500).json({ message: 'Xonalarni yuklashda xatolik', error: error.message });
  }
});

// ─── POST /api/inventory/rooms ───────────────────────────────────────────────
router.post(
  '/rooms',
  auth,
  requirePermission('inventory.manage'),
  [
    body('floor').notEmpty().withMessage('Qavat kiritilishi shart').isInt({ min: 0, max: 200 }).withMessage('Qavat butun son bo\'lishi kerak'),
    body('roomNumber').notEmpty().trim().withMessage('Xona raqami kiritilishi shart'),
    body('type').optional().isIn(ROOM_TYPES).withMessage('Xona turi noto\'g\'ri'),
    body('capacity').optional({ nullable: true }).isInt({ min: 0, max: 100000 }),
    body('items').optional().isArray().withMessage('Jihozlar ro\'yxati massiv bo\'lishi kerak')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
      }

      const payload = {
        floor: parseInt(req.body.floor, 10),
        roomNumber: String(req.body.roomNumber).trim(),
        name: req.body.name ? String(req.body.name).trim() : '',
        type: ROOM_TYPES.includes(req.body.type) ? req.body.type : 'classroom',
        capacity: req.body.capacity !== undefined && req.body.capacity !== null && req.body.capacity !== ''
          ? parseInt(req.body.capacity, 10)
          : null,
        responsible: req.body.responsible ? String(req.body.responsible).trim() : '',
        items: sanitizeItems(req.body.items),
        note: req.body.note ? String(req.body.note).trim() : '',
        createdBy: req.user._id
      };

      const created = await Room.create(payload);
      const populated = await Room.findById(created._id).populate('createdBy', 'firstName lastName role');
      res.status(201).json(populated);
    } catch (error) {
      res.status(500).json({ message: 'Xona qo\'shishda xatolik', error: error.message });
    }
  }
);

// ─── PUT /api/inventory/rooms/:id ────────────────────────────────────────────
router.put('/rooms/:id', auth, requirePermission('inventory.manage'), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room || !room.isActive) return res.status(404).json({ message: 'Xona topilmadi' });

    if (req.body.floor !== undefined && req.body.floor !== '') {
      const f = parseInt(req.body.floor, 10);
      if (!Number.isNaN(f) && f >= 0) room.floor = f;
    }
    if (req.body.roomNumber !== undefined && String(req.body.roomNumber).trim()) {
      room.roomNumber = String(req.body.roomNumber).trim();
    }
    if (req.body.name !== undefined) room.name = String(req.body.name).trim();
    if (req.body.type !== undefined && ROOM_TYPES.includes(req.body.type)) room.type = req.body.type;
    if (req.body.capacity !== undefined) {
      room.capacity = req.body.capacity === null || req.body.capacity === ''
        ? null
        : parseInt(req.body.capacity, 10);
    }
    if (req.body.responsible !== undefined) room.responsible = String(req.body.responsible).trim();
    if (req.body.note !== undefined) room.note = String(req.body.note).trim();
    if (req.body.items !== undefined) room.items = sanitizeItems(req.body.items);

    await room.save();
    const populated = await Room.findById(room._id).populate('createdBy', 'firstName lastName role');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Xonani yangilashda xatolik', error: error.message });
  }
});

// ─── DELETE /api/inventory/rooms/:id ─────────────────────────────────────────
router.delete('/rooms/:id', auth, requirePermission('inventory.manage'), async (req, res) => {
  try {
    const removed = await Room.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Xona topilmadi' });
    res.json({ message: 'Xona o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Xonani o\'chirishda xatolik', error: error.message });
  }
});

module.exports = router;
