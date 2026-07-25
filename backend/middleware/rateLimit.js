// Simple in-memory rate limiter
// For production, use Redis-based rate limiter (e.g., express-rate-limit with Redis store)

const rateLimitMap = new Map();

const rateLimit = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later.',
    statusCode = 429
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Get or create rate limit record
    let record = rateLimitMap.get(key);

    if (!record) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimitMap.set(key, record);
    }

    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    // Increment count
    record.count++;

    // Check if limit exceeded
    if (record.count > max) {
      return res.status(statusCode).json({
        message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    next();
  };
};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + 300000) { // 5 minutes after reset
      rateLimitMap.delete(key);
    }
  }
}, 300000);

// Predefined rate limiters
const rateLimiters = {
  // General API rate limiter
  general: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000,
    message: 'Juda ko\'p so\'rovlar yuborildi, keyinroq qayta urinib ko\'ring.'
  }),

  // Strict rate limiter for authentication endpoints
  auth: rateLimit({
    windowMs: 900000, // 15 minutes
    max: 5,
    message: 'Juda ko\'p kirish urinishlari, 15 daqiqadan so\'ng qayta urinib ko\'ring.'
  }),

  // Moderate rate limiter for data fetching
  api: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1000,
    message: 'So\'rovlar soni chegaradan oshdi, 10 daqiqa kuting.'
  })
};

module.exports = { rateLimit, rateLimiters };
