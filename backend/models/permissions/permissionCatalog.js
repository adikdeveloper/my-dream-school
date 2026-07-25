// Markaziy ruxsatlar katalogi: ruxsat kalitlari, tasnifi, default qiymatlari
// Format: { key, label, description, category, defaults: { role: boolean } }
// Admin va Director uchun deyarli barcha ruxsatlar default true.

const ROLES = ['admin', 'director', 'teacher', 'student', 'supervisor', 'accountant', 'hr', 'reception', 'callcenter'];

const PERMISSIONS = [
  // ========== O'QUVCHI: SINFDOSH MA'LUMOTLARINI KO'RISH ==========
  {
    key: 'student.view_classmate_phone',
    label: "Sinfdoshning telefon raqamini ko'rish",
    description: "O'quvchilar bir-birining telefon raqamini ko'ra olsin",
    category: "O'quvchi - Sinfdosh ma'lumotlari",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: true, hr: true, reception: true, callcenter: true }
  },
  {
    key: 'student.view_classmate_birthdate',
    label: "Sinfdoshning tug'ilgan kunini ko'rish",
    description: "O'quvchilar bir-birining tug'ilgan sanasini ko'ra olsin",
    category: "O'quvchi - Sinfdosh ma'lumotlari",
    defaults: { admin: true, director: true, teacher: true, student: true, supervisor: true, accountant: true, hr: true, reception: true, callcenter: true }
  },
  {
    key: 'student.view_classmate_address',
    label: "Sinfdoshning manzilini ko'rish",
    description: "O'quvchilar sinfdoshining yashash manzilini ko'rsin",
    category: "O'quvchi - Sinfdosh ma'lumotlari",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: true, reception: false, callcenter: false }
  },
  {
    key: 'student.view_classmate_parent',
    label: "Sinfdoshning ota-ona ma'lumotlarini ko'rish",
    description: "Ota-ona ismi, telefoni, JSHSHIRi",
    category: "O'quvchi - Sinfdosh ma'lumotlari",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: true, hr: true, reception: true, callcenter: false }
  },
  {
    key: 'student.view_classmate_email',
    label: "Sinfdoshning email manzilini ko'rish",
    description: "Email aloqasi",
    category: "O'quvchi - Sinfdosh ma'lumotlari",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: true, hr: true, reception: true, callcenter: false }
  },
  {
    key: 'student.view_classmate_grades',
    label: "Sinfdoshning baholarini ko'rish",
    description: "Boshqa o'quvchilar baholarini ko'rsin",
    category: "O'quvchi - Akademik",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'student.view_classmate_attendance',
    label: "Sinfdoshning davomatini ko'rish",
    description: "Boshqa o'quvchilarning davomati",
    category: "O'quvchi - Akademik",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== O'QITUVCHI: O'QUVCHI BOSHQARUVI ==========
  {
    key: 'teacher.edit_student_info',
    label: "O'quvchi ma'lumotlarini tahrirlash",
    description: "Ism, telefon, manzil va boshqa ma'lumotlarni o'zgartirish",
    category: "O'qituvchi - O'quvchi boshqaruvi",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: true, hr: true, reception: true, callcenter: false }
  },
  {
    key: 'teacher.view_student_payments',
    label: "O'quvchi to'lov tarixini ko'rish",
    description: "O'quvchining moliyaviy holatini ko'rish",
    category: "O'qituvchi - O'quvchi boshqaruvi",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: true, hr: false, reception: true, callcenter: false }
  },
  {
    key: 'teacher.create_student',
    label: "Yangi o'quvchi qo'shish",
    description: "Sistemaga o'quvchi qo'shish ruxsati",
    category: "O'qituvchi - O'quvchi boshqaruvi",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: true, hr: false, reception: true, callcenter: true }
  },
  {
    key: 'teacher.delete_student',
    label: "O'quvchini o'chirish",
    description: "O'quvchini sistemadan o'chirish",
    category: "O'qituvchi - O'quvchi boshqaruvi",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== BAHOLAR ==========
  {
    key: 'grade.create',
    label: "Baho qo'yish",
    description: "Yangi baho yaratish",
    category: "Baholar",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'grade.edit_own',
    label: "O'z bahoini tahrirlash",
    description: "O'qituvchi o'zi qo'ygan bahoni tahrirlash",
    category: "Baholar",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'grade.edit_other',
    label: "Boshqa o'qituvchi qo'ygan bahoni tahrirlash",
    description: "Faqat administrativ rollar uchun",
    category: "Baholar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'grade.delete',
    label: "Bahoni o'chirish",
    description: "Qo'yilgan bahoni o'chirish",
    category: "Baholar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== DAVOMAT ==========
  {
    key: 'attendance.create',
    label: "Davomat belgilash",
    description: "Yangi davomat yozuvi yaratish",
    category: "Davomat",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'attendance.edit',
    label: "Davomatni tahrirlash",
    description: "Mavjud davomat yozuvini o'zgartirish",
    category: "Davomat",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'attendance.delete',
    label: "Davomatni o'chirish",
    description: "Davomat yozuvini o'chirish",
    category: "Davomat",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== TO'LOVLAR ==========
  {
    key: 'payment.view_all',
    label: "Barcha to'lovlarni ko'rish",
    description: "To'lovlar ro'yxati va statistika",
    category: "To'lovlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: true, hr: false, reception: true, callcenter: false }
  },
  {
    key: 'payment.create',
    label: "To'lov qabul qilish",
    description: "Yangi to'lov qo'shish",
    category: "To'lovlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: true, hr: false, reception: true, callcenter: false }
  },
  {
    key: 'payment.edit',
    label: "To'lovni tahrirlash",
    description: "Mavjud to'lovni o'zgartirish",
    category: "To'lovlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: true, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'payment.delete',
    label: "To'lovni o'chirish",
    description: "To'lov yozuvini o'chirish",
    category: "To'lovlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: true, hr: false, reception: false, callcenter: false }
  },

  // ========== TEST/IMTIHON ==========
  {
    key: 'test.create',
    label: "Test/Imtihon yaratish",
    description: "Yangi test qo'shish",
    category: "Testlar",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'test.edit',
    label: "Testni tahrirlash",
    description: "Mavjud testni o'zgartirish",
    category: "Testlar",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'test.delete',
    label: "Testni o'chirish",
    description: "Testni o'chirish",
    category: "Testlar",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== VAZIFA ==========
  {
    key: 'assignment.create',
    label: "Vazifa berish",
    description: "Uy vazifa va topshiriqlar yaratish",
    category: "Vazifalar",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'assignment.grade',
    label: "Vazifani baholash",
    description: "O'quvchi topshirgan vazifani baholash",
    category: "Vazifalar",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== DARS JADVALI ==========
  {
    key: 'schedule.edit',
    label: "Dars jadvalini tahrirlash",
    description: "Sinflar uchun jadval o'zgartirish",
    category: "Dars jadvali",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'schedule.edit_topic',
    label: "Dars mavzusini yozish",
    description: "O'qituvchi o'z darsiga mavzu yozsin",
    category: "Dars jadvali",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== CHAT ==========
  {
    key: 'chat.create_private',
    label: "Shaxsiy chat boshlash",
    description: "Boshqa foydalanuvchi bilan DM",
    category: "Chat",
    defaults: { admin: true, director: true, teacher: true, student: true, supervisor: true, accountant: true, hr: true, reception: true, callcenter: true }
  },
  {
    key: 'chat.create_group',
    label: "Guruh chat yaratish",
    description: "Maxsus chat guruh ochish",
    category: "Chat",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'chat.delete_for_everyone',
    label: "Xabarni hammasi uchun o'chirish",
    description: "Faqat o'z xabarini, lekin bu ruxsatsiz - faqat o'zi uchun",
    category: "Chat",
    defaults: { admin: true, director: true, teacher: true, student: true, supervisor: true, accountant: true, hr: true, reception: true, callcenter: true }
  },

  // ========== BILDIRISHNOMA ==========
  {
    key: 'notification.send',
    label: "Bildirishnoma yuborish",
    description: "Foydalanuvchilarga push bildirishnoma yuborish",
    category: "Bildirishnomalar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: true, reception: false, callcenter: true }
  },
  {
    key: 'notification.broadcast_all',
    label: "Hammaga bildirishnoma yuborish",
    description: "Barcha foydalanuvchilarga jo'natish",
    category: "Bildirishnomalar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== HISOBOTLAR ==========
  {
    key: 'report.view_school',
    label: "Maktab hisobotlarini ko'rish",
    description: "Umumiy statistika va hisobotlar",
    category: "Hisobotlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: true, hr: true, reception: false, callcenter: false }
  },
  {
    key: 'report.view_financial',
    label: "Moliyaviy hisobotlarni ko'rish",
    description: "To'lovlar, qarzdorliklar, balanslar",
    category: "Hisobotlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: true, hr: false, reception: false, callcenter: false }
  },

  // ========== E'LONLAR ==========
  {
    key: 'announcement.create',
    label: "E'lon yaratish",
    description: "Maktab e'lonlari (sahifa)",
    category: "E'lonlar",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: false, hr: true, reception: false, callcenter: false }
  },
  {
    key: 'announcement.delete',
    label: "E'lonni o'chirish",
    description: "E'lonni saytdan olib tashlash",
    category: "E'lonlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== SINF/FAN ==========
  {
    key: 'class.create',
    label: "Sinf yaratish",
    description: "Yangi sinf ochish",
    category: "Sinflar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: true, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'class.edit',
    label: "Sinfni tahrirlash",
    description: "Sinf sozlamalari, o'quvchilar",
    category: "Sinflar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: true, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'class.delete',
    label: "Sinfni o'chirish",
    description: "Sinfni butunlay o'chirish",
    category: "Sinflar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: false, hr: false, reception: false, callcenter: false }
  },
  {
    key: 'subject.manage',
    label: "Fanlarni boshqarish",
    description: "Fan qo'shish, tahrirlash, o'chirish",
    category: "Fanlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: false, reception: false, callcenter: false }
  },

  // ========== O'QITUVCHI MAOSHI ==========
  {
    key: 'salary.view_own',
    label: "O'z maoshini ko'rish",
    description: "Faqat o'z maoshini ko'rish (o'qituvchi)",
    category: "Maosh",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: true, hr: true, reception: false, callcenter: false }
  },
  {
    key: 'salary.view_all',
    label: "Barcha xodimlar maoshini ko'rish",
    description: "Hamma maoshlar",
    category: "Maosh",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: true, hr: true, reception: false, callcenter: false }
  },
  {
    key: 'salary.edit',
    label: "Maosh stavkasini o'zgartirish",
    description: "Dars uchun stavka",
    category: "Maosh",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: true, hr: true, reception: false, callcenter: false }
  },

  // ========== KIRISH MA'LUMOTLARI ==========
  {
    key: 'user.view_phone',
    label: "Boshqa foydalanuvchi telefonini ko'rish",
    description: "Foydalanuvchi profilida telefon",
    category: "Foydalanuvchi ma'lumotlari",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: true, hr: true, reception: true, callcenter: true }
  },
  {
    key: 'user.view_email',
    label: "Email manzilini ko'rish",
    description: "Email aloqa",
    category: "Foydalanuvchi ma'lumotlari",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: true, hr: true, reception: true, callcenter: false }
  },
  {
    key: 'user.view_passport',
    label: "Pasport ma'lumotlarini ko'rish",
    description: "Pasport, JSHSHIR",
    category: "Foydalanuvchi ma'lumotlari",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: false, accountant: true, hr: true, reception: false, callcenter: false }
  },

  // ========== LIDLAR ==========
  {
    key: 'lead.manage',
    label: "Lidlarni boshqarish",
    description: "Yangi lid qo'shish, tahrirlash, o'chirish",
    category: "Lidlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: false, reception: true, callcenter: true }
  },
  {
    key: 'lead.view',
    label: "Lidlarni ko'rish",
    description: "Lidlar ro'yxati",
    category: "Lidlar",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: false, reception: true, callcenter: true }
  },

  // ========== JIHOZLAR (INVENTAR) ==========
  {
    key: 'inventory.view',
    label: "Jihozlarni ko'rish",
    description: "Xonalar va jihozlar ro'yxatini ko'rish",
    category: "Jihozlar (Inventar)",
    defaults: { admin: true, director: true, teacher: true, student: false, supervisor: true, accountant: true, hr: true, reception: true, callcenter: false }
  },
  {
    key: 'inventory.manage',
    label: "Jihozlarni boshqarish",
    description: "Xona qo'shish, tahrirlash, o'chirish va jihozlarni yangilash",
    category: "Jihozlar (Inventar)",
    defaults: { admin: true, director: true, teacher: false, student: false, supervisor: true, accountant: false, hr: true, reception: false, callcenter: false }
  }
];

// Default permissions to'plamini olish
function getDefaultPermissions() {
  const result = {};
  ROLES.forEach((role) => { result[role] = {}; });
  PERMISSIONS.forEach((p) => {
    ROLES.forEach((role) => {
      result[role][p.key] = !!p.defaults[role];
    });
  });
  return result;
}

// Kategoriyalar bo'yicha guruhlash
function getGroupedCatalog() {
  const groups = {};
  PERMISSIONS.forEach((p) => {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push({ key: p.key, label: p.label, description: p.description });
  });
  return groups;
}

module.exports = { ROLES, PERMISSIONS, getDefaultPermissions, getGroupedCatalog };
