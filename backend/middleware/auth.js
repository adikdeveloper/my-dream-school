const jwt = require('jsonwebtoken');
const User = require('../models/users/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
    } catch {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (!decoded.userId) return res.status(401).json({ message: 'Invalid token.' });
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not active.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'CastError') return res.status(401).json({ message: 'Invalid token.' });
    console.error('Authentication user lookup failed:', error.name);
    return res.status(503).json({ message: "Server vaqtincha band. Qayta urinib ko'ring." });
  }
};

/**
 * Director roli admin bilan teng huquqli.
 * authorize('admin') chaqiruvida director ham o'ta oladi.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Please log in.' });
    }

    // director → admin bilan teng huquqli
    const effectiveRole = req.user.role === 'director' ? 'admin' : req.user.role;

    if (!roles.includes(effectiveRole) && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

module.exports = { auth, authorize };