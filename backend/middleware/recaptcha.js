const https = require('https');

const VERIFY_HOST = 'www.google.com';
const VERIFY_PATH = '/recaptcha/api/siteverify';

const getBooleanEnv = (name, defaultValue = false) => {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const getRecaptchaToken = (req) => {
  return (
    req.headers['x-recaptcha-token'] ||
    req.body?.recaptchaToken ||
    req.body?.recaptcha_token ||
    req.body?.['g-recaptcha-response'] ||
    req.query?.recaptchaToken
  );
};

const getRemoteIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress;
};

const verifyWithGoogle = ({ secret, token, remoteIp }) => {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      secret,
      response: token
    });

    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const body = params.toString();
    const request = https.request(
      {
        hostname: VERIFY_HOST,
        path: VERIFY_PATH,
        method: 'POST',
        timeout: Number(process.env.RECAPTCHA_TIMEOUT_MS || 5000),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (response) => {
        let rawBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          rawBody += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(rawBody));
          } catch (error) {
            reject(new Error('Invalid reCAPTCHA verification response'));
          }
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('reCAPTCHA verification timed out'));
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
};

const verifyRecaptcha = (options = {}) => {
  const { action } = options;

  return async (req, res, next) => {
    const enabled = getBooleanEnv('RECAPTCHA_ENABLED');
    const required = options.required ?? getBooleanEnv('RECAPTCHA_REQUIRED', enabled);
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const token = getRecaptchaToken(req);

    if (!enabled && !required && !token) {
      return next();
    }

    if (!secret) {
      return res.status(500).json({
        message: 'reCAPTCHA sozlanmagan',
        code: 'RECAPTCHA_NOT_CONFIGURED'
      });
    }

    if (!token) {
      return res.status(400).json({
        message: 'reCAPTCHA token topilmadi',
        code: 'RECAPTCHA_TOKEN_REQUIRED'
      });
    }

    try {
      const result = await verifyWithGoogle({
        secret,
        token,
        remoteIp: getRemoteIp(req)
      });

      if (!result.success) {
        return res.status(403).json({
          message: 'reCAPTCHA tekshiruvidan o\'tmadi',
          code: 'RECAPTCHA_FAILED',
          errors: result['error-codes'] || []
        });
      }

      if (action && result.action && result.action !== action) {
        return res.status(403).json({
          message: 'reCAPTCHA amal turi mos kelmadi',
          code: 'RECAPTCHA_ACTION_MISMATCH'
        });
      }

      const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0);
      if (typeof result.score === 'number' && result.score < minScore) {
        return res.status(403).json({
          message: 'reCAPTCHA xavf balli past',
          code: 'RECAPTCHA_SCORE_TOO_LOW'
        });
      }

      req.recaptcha = {
        success: true,
        score: result.score,
        action: result.action,
        hostname: result.hostname,
        challengeTs: result.challenge_ts
      };

      next();
    } catch (error) {
      return res.status(502).json({
        message: 'reCAPTCHA servisida xatolik',
        code: 'RECAPTCHA_SERVICE_ERROR'
      });
    }
  };
};

module.exports = {
  verifyRecaptcha,
  verifyWithGoogle,
  getRecaptchaToken
};
