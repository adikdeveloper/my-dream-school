// O'zbek tilidagi qisqa oy nomlari.
// Brauzerlarning `uz-UZ` locale'ida `month: 'short'` ba'zan "M10" kabi
// noto'g'ri qiymat qaytaradi, shuning uchun nomlarni o'zimiz saqlaymiz.
export const UZ_SHORT_MONTHS = [
  'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun',
  'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'
];

export const UZ_LONG_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * "28 Okt" yoki "28 Okt 2026" ko'rinishidagi sana.
 */
export const formatUzShortDate = (value, { year = false } = {}) => {
  const date = toDate(value);
  if (!date) return '';
  const base = `${date.getDate()} ${UZ_SHORT_MONTHS[date.getMonth()]}`;
  return year ? `${base} ${date.getFullYear()}` : base;
};

/**
 * "28 Oktabr" yoki "28 Oktabr 2026" ko'rinishidagi sana.
 */
export const formatUzLongDate = (value, { year = false } = {}) => {
  const date = toDate(value);
  if (!date) return '';
  const base = `${date.getDate()} ${UZ_LONG_MONTHS[date.getMonth()]}`;
  return year ? `${base} ${date.getFullYear()}` : base;
};

/**
 * Hafta kuni bilan: "Chorshanba, 28 Oktabr".
 */
export const formatUzWeekdayDate = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const weekdays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  return `${weekdays[date.getDay()]}, ${formatUzLongDate(date)}`;
};

const uzDate = {
  UZ_SHORT_MONTHS,
  UZ_LONG_MONTHS,
  formatUzShortDate,
  formatUzLongDate,
  formatUzWeekdayDate
};

export default uzDate;
