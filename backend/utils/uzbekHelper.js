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
  
  // Escape regex special characters
  let pattern = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // 1. First, replace any existing apostrophe variations in the search term with an OPTIONAL class
  // This handles cases like "Po'lat" -> "Po['`...]?lat"
  pattern = pattern.replace(/[\'\`\u2018\u2019]/g, "[\'\\`\\u2018\\u2019]?");

  // 2. Then, make sure that 'o' and 'g' are followed by an OPTIONAL apostrophe class
  // This handles cases like "Polat" -> "Po['`...]?lat"
  pattern = pattern
    .replace(/([oO])(?!\[\'\\`\\u2018\\u2019\]\?)/g, "$1[\'\\`\\u2018\\u2019]?")
    .replace(/([gG])(?!\[\'\\`\\u2018\\u2019\]\?)/g, "$1[\'\\`\\u2018\\u2019]?");
    
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
