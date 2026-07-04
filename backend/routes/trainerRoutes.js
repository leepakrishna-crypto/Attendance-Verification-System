const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const trainerController = require('../controllers/trainerController');
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Set up storage engine for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to allow only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, jpg, png, webp) are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const allowedUploadFields = new Set(['entryPhoto', 'proof1Photo', 'proof2Photo', 'exitPhoto']);
const uploadAny = upload.any();

const normalizeUploadedFiles = (files = []) => {
  const normalizedFiles = {};

  for (const file of files) {
    if (!allowedUploadFields.has(file.fieldname)) {
      throw new Error(`Upload error: Unsupported file field "${file.fieldname}".`);
    }

    if (normalizedFiles[file.fieldname]) {
      throw new Error(`Upload error: Multiple files were provided for "${file.fieldname}".`);
    }

    normalizedFiles[file.fieldname] = [file];
  }

  return normalizedFiles;
};

const handleUploadErrors = (req, res, next) => {
  uploadAny(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      const fieldDetail = err.field ? ` (field: ${err.field})` : '';
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}${fieldDetail}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    try {
      req.files = normalizeUploadedFiles(req.files);
    } catch (normalizeError) {
      return res.status(400).json({ success: false, message: normalizeError.message });
    }
    next();
  });
};

// ==========================================
// Authentication Routes (Public / Protected)
// ==========================================
router.post('/auth/register', authController.registerTrainer); // Public registration
router.post('/auth/send-otp', authController.sendOtp);
router.post('/auth/verify-otp', authController.verifyOtp);
router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/me', protect, authController.getMe);
router.get('/trainers', protect, authorize('manager'), authController.getTrainers);
router.delete('/trainers/:id', protect, authorize('manager'), authController.deleteTrainer);
router.put('/trainers/:id/approve', protect, authorize('manager'), authController.approveTrainer);

// ==========================================
// Attendance Records Routes
// ==========================================

// Trainers: Submit records
router.post(
  '/records',
  protect,
  authorize('trainer'),
  handleUploadErrors,
  trainerController.submitRecord
);

// Managers & Trainers: Fetch attendance history logs (scoped internally inside controller)
router.get(
  '/records',
  protect,
  authorize('trainer', 'manager'),
  trainerController.getRecords
);

router.put(
  '/records/:id',
  protect,
  authorize('manager'),
  handleUploadErrors,
  trainerController.updateRecord
);



router.delete(
  '/records/:id',
  protect,
  authorize('manager'),
  trainerController.deleteRecord
);

router.get(
  '/stats',
  protect,
  authorize('manager'),
  trainerController.getStats
);

router.post(
  '/records/:id/comments',
  protect,
  authorize('trainer', 'manager'),
  trainerController.addComment
);

// Geocoding Proxy Route (Protected for authenticated users to bypass mobile CORS/User-Agent restrictions)
router.get('/geocode/reverse', protect, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required.' });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'TrainerAttendanceSystem/2.0 (server-proxy)',
          'Accept-Language': 'en'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim geocoder returned status ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Reverse Geocode Proxy Error:', error);
    res.status(500).json({ success: false, message: 'Geocoding query failed.', error: error.message });
  }
});

module.exports = router;
