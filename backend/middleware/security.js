// Comprehensive security middleware for production
// Includes Helmet-like security headers, XSS protection, and more

const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header (don't reveal Express)
  res.removeHeader('X-Powered-By');

  // Strict-Transport-Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options (prevent clickjacking)
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content-Security-Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );

  next();
};

// XSS Sanitization middleware
const xssProtection = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Sanitize object recursively
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

// Sanitize string from XSS attacks
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/eval\(/gi, '') // Remove eval(
    .trim();
};

// CSRF Token generation and validation
const csrfTokens = new Map();

// Generate CSRF token
const generateCsrfToken = (req, res, next) => {
  const token = require('crypto').randomBytes(32).toString('hex');
  const sessionId = req.sessionID || req.ip;

  csrfTokens.set(sessionId, token);
  res.locals.csrfToken = token;

  // Clean up old tokens (older than 1 hour)
  setTimeout(() => {
    csrfTokens.delete(sessionId);
  }, 3600000);

  next();
};

// Validate CSRF token
const validateCsrfToken = (req, res, next) => {
  // Skip CSRF validation for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
  const sessionId = req.sessionID || req.ip;
  const storedToken = csrfTokens.get(sessionId);

  if (!token || !storedToken || token !== storedToken) {
    return res.status(403).json({
      message: 'Invalid CSRF token',
      code: 'CSRF_VALIDATION_FAILED'
    });
  }

  next();
};

// SQL Injection protection (for NoSQL/MongoDB)
const noSqlInjectionProtection = (req, res, next) => {
  const checkForInjection = (obj) => {
    if (typeof obj === 'string') {
      // Check for MongoDB operators
      if (obj.match(/^\$/) || obj.includes('$where')) {
        return false;
      }
    }

    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$') || key === '__proto__' || key === 'constructor') {
          return false;
        }
        if (!checkForInjection(obj[key])) {
          return false;
        }
      }
    }

    return true;
  };

  // Check body, query, and params
  if (!checkForInjection(req.body) ||
      !checkForInjection(req.query) ||
      !checkForInjection(req.params)) {
    return res.status(400).json({
      message: 'Invalid request data detected',
      code: 'INJECTION_ATTEMPT'
    });
  }

  next();
};

// Input size limiting
const inputSizeLimiter = (maxSize = 10000) => {
  return (req, res, next) => {
    const checkSize = (obj) => {
      const str = JSON.stringify(obj);
      return str.length <= maxSize;
    };

    if (req.body && !checkSize(req.body)) {
      return res.status(413).json({
        message: 'Request body too large',
        code: 'PAYLOAD_TOO_LARGE'
      });
    }

    next();
  };
};

// HPP (HTTP Parameter Pollution) protection
const hppProtection = (req, res, next) => {
  // Convert arrays to single values (take first)
  const sanitizeParams = (params) => {
    const sanitized = {};
    for (const key in params) {
      if (Array.isArray(params[key])) {
        sanitized[key] = params[key][0];
      } else {
        sanitized[key] = params[key];
      }
    }
    return sanitized;
  };

  if (req.query) {
    req.query = sanitizeParams(req.query);
  }

  next();
};

// Combine all security middleware
const securityMiddleware = [
  securityHeaders,
  xssProtection,
  noSqlInjectionProtection,
  inputSizeLimiter(10000),
  hppProtection
];

module.exports = {
  securityHeaders,
  xssProtection,
  generateCsrfToken,
  validateCsrfToken,
  noSqlInjectionProtection,
  inputSizeLimiter,
  hppProtection,
  securityMiddleware,
  sanitizeString
};
