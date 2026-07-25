/**
 * AI SANDBOX MODULE - Controller
 * ================================
 * Har bir rol uchun AI qoidalarini (system prompt) boshqarish.
 *
 * ENDPOINT'LAR:
 * GET    /api/ai/sandbox          → Barcha rollar sandboxi
 * GET    /api/ai/sandbox/:role    → Bitta rol sandbox
 * PUT    /api/ai/sandbox/:role    → Rol sandboxini yangilash (yaratadi yoki tahrirlaydi)
 * DELETE /api/ai/sandbox/:role    → Rol sandboxini o'chirish (reset)
 */

const AiSandbox = require('../../models/ai/AiSandbox');

// Default qoidalar har bir rol uchun
const DEFAULT_SANDBOX = {
  admin: {
    name: "Admin AI",
    description: "Maktab administratori uchun AI yordamchi",
    systemPrompt:
      "Sen My Dream School maktab boshqaruv tizimining Admin AI yordamchisisan.\n" +
      "Admin bilan O'zbek tilida muloqot qil.\n" +
      "Tizim ma'lumotlarini aniq raqamlar bilan taqdim et.\n" +
      "Markdown formatlash ishlatma.\n" +
      "Barcha amallarni bajarishga tayyorsan: o'quvchilar, o'qituvchilar, moliya, davomat va boshqalar."
  },
  teacher: {
    name: "O'qituvchi AI",
    description: "O'qituvchilar uchun AI yordamchi",
    systemPrompt:
      "Sen My Dream School tizimining O'qituvchi AI yordamchisisan.\n" +
      "Faqat ta'lim va o'qituvchiga tegishli mavzularda yordam ber.\n" +
      "O'zbek tilida muloqot qil.\n" +
      "Markdown formatlash ishlatma.\n" +
      "Dars rejasi, baho qo'yish, davomat kabi masalalar bo'yicha ko'mak ber."
  },
  student: {
    name: "O'quvchi AI",
    description: "O'quvchilar uchun AI yordamchi",
    systemPrompt:
      "Sen My Dream School tizimining O'quvchi AI yordamchisisan.\n" +
      "Faqat o'quvchiga tegishli ma'lumotlar bering: jadval, baholar, vazifalar.\n" +
      "O'zbek tilida muloqot qil.\n" +
      "Markdown formatlash ishlatma.\n" +
      "Moliya va admin ma'lumotlarini ko'rsatma."
  },
  accountant: {
    name: "Hisobchi AI",
    description: "Hisobchilar uchun AI yordamchi",
    systemPrompt:
      "Sen My Dream School tizimining Hisobchi AI yordamchisisan.\n" +
      "Faqat moliya, to'lovlar va hisobot mavzularida yordam ber.\n" +
      "O'zbek tilida muloqot qil.\n" +
      "Markdown formatlash ishlatma."
  },
  hr: {
    name: "HR AI",
    description: "HR xodimlari uchun AI yordamchi",
    systemPrompt:
      "Sen My Dream School tizimining HR AI yordamchisisan.\n" +
      "Xodimlar boshqaruvi, ish haqilari va HR masalalarida yordam ber.\n" +
      "O'zbek tilida muloqot qil.\n" +
      "Markdown formatlash ishlatma."
  },
  reception: {
    name: "Reception AI",
    description: "Reception xodimlari uchun AI yordamchi",
    systemPrompt:
      "Sen My Dream School tizimining Reception AI yordamchisisan.\n" +
      "Mehmonlarni kutib olish, ma'lumot berish va yo'naltirish masalalarida yordam ber.\n" +
      "O'zbek tilida muloqot qil.\n" +
      "Markdown formatlash ishlatma."
  },
  'call-center': {
    name: "Call Markaz AI",
    description: "Call markaz xodimlari uchun AI yordamchi",
    systemPrompt:
      "Sen My Dream School tizimining Call Markaz AI yordamchisisan.\n" +
      "Qo'ng'iroqlarga javob berish, ma'lumot taqdim etish va muammolarni hal qilishda yordam ber.\n" +
      "O'zbek tilida muloqot qil.\n" +
      "Markdown formatlash ishlatma."
  }
};

const ROLES = ['admin', 'teacher', 'student', 'accountant', 'hr', 'reception', 'call-center'];

// ─── GET /api/ai/sandbox ──────────────────────────────────────────────────────
exports.getAllSandboxes = async (req, res) => {
  try {
    const sandboxes = await AiSandbox.find()
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ role: 1 })
      .lean();

    // Barcha rollarni qaytarish — DB da yo'qlarini default bilan to'ldirish
    const result = ROLES.map(role => {
      const existing = sandboxes.find(s => s.role === role);
      if (existing) return existing;
      // Default (hali saqlanmagan)
      return {
        role,
        ...DEFAULT_SANDBOX[role],
        isActive: true,
        isDefault: true,
        createdAt: null,
        updatedAt: null
      };
    });

    res.json({ sandboxes: result });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── GET /api/ai/sandbox/:role ────────────────────────────────────────────────
exports.getSandboxByRole = async (req, res) => {
  try {
    const { role } = req.params;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Noto'g'ri rol" });
    }

    let sandbox = await AiSandbox.findOne({ role })
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .lean();

    if (!sandbox) {
      // Default qaytarish
      sandbox = {
        role,
        ...DEFAULT_SANDBOX[role],
        isActive: true,
        isDefault: true
      };
    }

    res.json(sandbox);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── PUT /api/ai/sandbox/:role ────────────────────────────────────────────────
exports.upsertSandbox = async (req, res) => {
  try {
    const { role } = req.params;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Noto'g'ri rol" });
    }

    const { name, systemPrompt, isActive, description } = req.body;

    if (!systemPrompt || !systemPrompt.trim()) {
      return res.status(400).json({ message: 'System prompt majburiy' });
    }

    const updateData = {
      role,
      name: name || DEFAULT_SANDBOX[role]?.name || role,
      systemPrompt: systemPrompt.trim(),
      isActive: isActive !== undefined ? isActive : true,
      description: description || '',
      updatedBy: req.user._id
    };

    let sandbox = await AiSandbox.findOne({ role });
    if (sandbox) {
      Object.assign(sandbox, updateData);
      await sandbox.save();
    } else {
      sandbox = new AiSandbox({ ...updateData, createdBy: req.user._id });
      await sandbox.save();
    }

    res.json({
      message: `${role} uchun sandbox yangilandi`,
      sandbox
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── DELETE /api/ai/sandbox/:role ─────────────────────────────────────────────
// Bu sandboxni o'chirib default ga qaytaradi
exports.resetSandbox = async (req, res) => {
  try {
    const { role } = req.params;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Noto'g'ri rol" });
    }

    await AiSandbox.findOneAndDelete({ role });
    res.json({ message: `${role} uchun sandbox default ga qaytarildi` });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── GET /api/ai/sandbox/:role/prompt ─────────────────────────────────────────
// Chat controller uchun — faqat system prompt qaytaradi
exports.getSystemPromptForRole = async (role) => {
  try {
    const sandbox = await AiSandbox.findOne({ role, isActive: true }).lean();
    if (sandbox) return sandbox.systemPrompt;
    return DEFAULT_SANDBOX[role]?.systemPrompt || '';
  } catch {
    return DEFAULT_SANDBOX[role]?.systemPrompt || '';
  }
};
