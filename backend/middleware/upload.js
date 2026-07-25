const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories for each role if they don't exist
const uploadsBaseDir = path.join(__dirname, '../uploads/profiles');
const studentDir = path.join(uploadsBaseDir, 'students');
const teacherDir = path.join(uploadsBaseDir, 'teachers');
const adminDir = path.join(uploadsBaseDir, 'admins');

// Create all directories
[uploadsBaseDir, studentDir, teacherDir, adminDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on user role
    let destDir = uploadsBaseDir;

    // Check role from custom property (set by middleware), request body, or authenticated user
    const role = req.userRole || req.body.role || (req.user && req.user.role);

    if (role === 'student') {
      destDir = studentDir;
    } else if (role === 'teacher') {
      destDir = teacherDir;
    } else if (role === 'admin') {
      destDir = adminDir;
    }

    cb(null, destDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: role-timestamp-random.ext
    const role = req.userRole || req.body.role || (req.user && req.user.role) || 'user';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${role}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// Helper function to get role subdirectory
const getRoleSubdir = (role) => {
  if (role === 'student') return 'students';
  if (role === 'teacher') return 'teachers';
  if (role === 'admin') return 'admins';
  return '';
};

// File filter - only images with enhanced MIME type check
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Faqat rasm fayllarini yuklash mumkin (JPEG, PNG, GIF, WebP)'));
  }
};

// Simple pass-through middleware (no compression due to CPU limitations)
const compressImage = async (req, res, next) => {
  // Skip compression - VPS CPU doesn't support sharp
  next();
};

// Multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: fileFilter
});

// ── Uy vazifa biriktirmalari (rasm yoki PDF) ──
const homeworkDir = path.join(__dirname, '../uploads/homework');
if (!fs.existsSync(homeworkDir)) {
  fs.mkdirSync(homeworkDir, { recursive: true });
}

const homeworkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, homeworkDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `hw-${uniqueSuffix}${ext}`);
  }
});

const homeworkFileFilter = (req, file, cb) => {
  const allowedExt = /jpeg|jpg|png|gif|webp|pdf/;
  const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  const extOk = allowedExt.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedMime.includes(file.mimetype.toLowerCase());
  if (extOk && mimeOk) {
    return cb(null, true);
  }
  cb(new Error('Faqat rasm (JPEG, PNG, GIF, WebP) yoki PDF fayl biriktirish mumkin'));
};

const homeworkUpload = multer({
  storage: homeworkStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: homeworkFileFilter
});

module.exports = upload;
module.exports.compressImage = compressImage;
module.exports.getRoleSubdir = getRoleSubdir;
module.exports.homeworkUpload = homeworkUpload;

