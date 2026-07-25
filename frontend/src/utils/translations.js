// Translation utility for converting English terms to Uzbek

export const translations = {
  // Grade types
  gradeTypes: {
    'quiz': 'Test',
    'assignment': 'Topshiriq',
    'midterm': 'Oraliq nazorat',
    'final': 'Yakuniy imtihon',
    'project': 'Loyiha ishi',
    'participation': 'Faollik'
  },

  // Attendance status
  attendanceStatus: {
    'present': 'Keldi',
    'absent': 'Kelmadi',
    'late': 'Kechikdi',
    'excused': 'Sababli'
  },

  // Assignment status
  assignmentStatus: {
    'pending': 'Kutilmoqda',
    'submitted': 'Topshirildi',
    'graded': 'Baholandi',
    'active': 'Faol',
    'closed': 'Yopiq'
  },

  // Announcement target audience
  targetAudience: {
    'all': 'Hammaga',
    'students': 'O\'quvchilarga',
    'teachers': 'O\'qituvchilarga',
    'parents': 'Ota-onalarga',
    'class': 'Sinfga'
  },

  // Priority levels
  priority: {
    'low': 'Past',
    'normal': 'Oddiy',
    'high': 'Yuqori',
    'urgent': 'Shoshilinch'
  },

  // Days of week
  daysOfWeek: {
    'Monday': 'Dushanba',
    'Tuesday': 'Seshanba',
    'Wednesday': 'Chorshanba',
    'Thursday': 'Payshanba',
    'Friday': 'Juma',
    'Saturday': 'Shanba',
    'Sunday': 'Yakshanba'
  },

  // User roles
  roles: {
    'admin': 'Administrator',
    'teacher': 'O\'qituvchi',
    'student': 'O\'quvchi',
    'parent': 'Ota-ona'
  },

  // Months
  months: {
    'January': 'Yanvar',
    'February': 'Fevral',
    'March': 'Mart',
    'April': 'Aprel',
    'May': 'May',
    'June': 'Iyun',
    'July': 'Iyul',
    'August': 'Avgust',
    'September': 'Sentabr',
    'October': 'Oktabr',
    'November': 'Noyabr',
    'December': 'Dekabr'
  },

  // Common terms
  common: {
    'yes': 'Ha',
    'no': 'Yo\'q',
    'save': 'Saqlash',
    'cancel': 'Bekor qilish',
    'delete': 'O\'chirish',
    'edit': 'Tahrirlash',
    'add': 'Qo\'shish',
    'search': 'Qidirish',
    'filter': 'Filtrlash',
    'export': 'Eksport',
    'import': 'Import',
    'loading': 'Yuklanmoqda',
    'error': 'Xato',
    'success': 'Muvaffaqiyatli',
    'confirm': 'Tasdiqlash',
    'back': 'Orqaga',
    'next': 'Keyingi',
    'previous': 'Oldingi',
    'submit': 'Yuborish',
    'close': 'Yopish',
    'view': 'Ko\'rish',
    'download': 'Yuklab olish',
    'upload': 'Yuklash',
    'update': 'Yangilash',
    'create': 'Yaratish',
    'remove': 'Olib tashlash'
  }
};

// Helper functions
export const translate = (category, key) => {
  if (!translations[category]) {
    // Return key as fallback if category not found
    return key;
  }

  return translations[category][key] || key;
};

export const translateGradeType = (type) => translate('gradeTypes', type);
export const translateAttendanceStatus = (status) => translate('attendanceStatus', status);
export const translateAssignmentStatus = (status) => translate('assignmentStatus', status);
export const translateTargetAudience = (audience) => translate('targetAudience', audience);
export const translatePriority = (priority) => translate('priority', priority);
export const translateDayOfWeek = (day) => translate('daysOfWeek', day);
export const translateRole = (role) => translate('roles', role);
export const translateMonth = (month) => translate('months', month);

export default translations;
