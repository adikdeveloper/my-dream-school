// XSS Protection - Input Sanitization Utilities

/**
 * Sanitize text input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized safe text
 */
export const sanitizeText = (input) => {
  if (!input || typeof input !== 'string') return '';

  // Convert to string and trim
  let sanitized = String(input).trim();

  // Remove potentially dangerous characters
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/&lt;/g, '')
    .replace(/&gt;/g, '');

  return sanitized;
};

/**
 * Sanitize and validate URL
 * @param {string} url - URL to validate
 * @param {string} baseURL - Base URL to prepend (optional)
 * @returns {string|null} - Safe URL or null if invalid
 */
export const sanitizeURL = (url, baseURL = '') => {
  if (!url || typeof url !== 'string') return null;

  // Remove whitespace
  const cleanURL = url.trim();

  // Check for dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(cleanURL)) {
    // Blocked dangerous URL - return null
    return null;
  }

  // If it's a relative URL, prepend baseURL
  if (cleanURL.startsWith('/') && baseURL) {
    return `${baseURL}${cleanURL}`;
  }

  // Only allow http, https, and relative URLs
  if (!/^(https?:)?\/\//i.test(cleanURL) && !cleanURL.startsWith('/')) {
    return null;
  }

  return cleanURL;
};

/**
 * Sanitize HTML content
 * @param {string} html - Raw HTML
 * @returns {string} - Escaped HTML safe for display
 */
export const escapeHTML = (html) => {
  if (!html || typeof html !== 'string') return '';

  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Validate and sanitize email
 * @param {string} email - Email address
 * @returns {string|null} - Valid email or null
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(cleanEmail)) {
    return null;
  }

  return cleanEmail;
};

/**
 * Sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string} - Sanitized phone number
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';

  // Remove all non-numeric characters except +
  return phone.replace(/[^\d+]/g, '');
};

/**
 * Create safe image URL with fallback
 * @param {string} imagePath - Image path from server
 * @param {string} serverURL - Server base URL
 * @param {string} fallback - Fallback avatar text
 * @returns {object} - Object with imageURL and shouldUseImage flag
 */
export const createSafeImageURL = (imagePath, serverURL, fallback = '') => {
  // Check if imagePath is valid
  if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
    return {
      imageURL: null,
      shouldUseImage: false,
      fallback
    };
  }

  // Validate and sanitize the image path
  const safeURL = sanitizeURL(imagePath, serverURL);

  if (!safeURL) {
    return {
      imageURL: null,
      shouldUseImage: false,
      fallback
    };
  }

  // Additional check: ensure it's an image extension
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
  if (!imageExtensions.test(safeURL)) {
    // Invalid image extension - return fallback
    return {
      imageURL: null,
      shouldUseImage: false,
      fallback
    };
  }

  // Ensure URL is properly formed
  try {
    new URL(safeURL);
  } catch {
    // If URL is relative, prepend serverURL
    const fullURL = safeURL.startsWith('/') ? `${serverURL}${safeURL}` : safeURL;
    return {
      imageURL: fullURL,
      shouldUseImage: true,
      fallback
    };
  }

  return {
    imageURL: safeURL,
    shouldUseImage: true,
    fallback
  };
};

/**
 * Rate limit function calls
 * @param {Function} func - Function to rate limit
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Rate limited function with cancel method
 */
export const debounce = (func, delay = 300) => {
  let timeoutId;

  const debounced = function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };

  // Add cancel method for cleanup
  debounced.cancel = function () {
    clearTimeout(timeoutId);
  };

  return debounced;
};
