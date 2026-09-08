/**
 * Uzbek language helper utilities
 */

/**
 * Creates a regex pattern that matches Uzbek names with any variation of apostrophes (', `, ’, ‘)
 * or even when the apostrophe is missing in the search term but present in the DB.
 * @param {string} text - The search term
 * @returns {string} - The regex pattern string
 */
const createUzbekSearchRegex = (text) => {
  if (!text || typeof text !== 'string') return text;

  // E'tibor: natija MongoDB $regex (PCRE) da ham ishlaydi — \uXXXX escape ishlatmaymiz,
  // apostrof variantlarini literal harflar (' ` ‘ ’) sifatida yozamiz.
  const APOS_CLASS = "['`‘’]?";
  let pattern = '';
  for (const ch of text) {
    if (ch === "'" || ch === '`' || ch === '‘' || ch === '’') {
      pattern += APOS_CLASS;
    } else if (ch === 'o' || ch === 'O' || ch === 'g' || ch === 'G') {
      // "Polat" ham "Po'lat"ni topsin: o/g dan keyin apostrof ixtiyoriy
      pattern += ch + APOS_CLASS;
    } else if (/[.*+?^${}()|[\]\\]/.test(ch)) {
      pattern += '\\' + ch;
    } else {
      pattern += ch;
    }
  }

  return pattern;
};

/**
 * Normalizes Uzbek text to use standard apostrophe (optional, for data entry)
 */
const normalizeUzbekText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/[\`\u2018\u2019]/g, "'");
};

module.exports = {
  createUzbekSearchRegex,
  normalizeUzbekText
};
