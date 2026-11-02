export function getQuarterErrorMessage(error, fallback) {
  if (error?.response?.status === 404) {
    return "Serverda chorak API topilmadi (404). Render'dagi backendni qayta deploy qilish kerak.";
  }

  return error?.response?.data?.message || fallback;
}

export function getDefaultQuarterNumber(currentQuarter) {
  const quarter = Number(currentQuarter?.quarter);
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) return 1;

  // Choraklar orasidagi tanaffusda hali boshlanmagan chorakni emas,
  // yakunlangan oxirgi chorakni ko'rsatamiz.
  if (currentQuarter?.status === 'upcoming' && quarter > 1) {
    return quarter - 1;
  }

  return quarter;
}
