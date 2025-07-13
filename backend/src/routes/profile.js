// backend/src/routes/profile.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import controllers
const {
  getCurrentProfile,
  updateProfile,
  deleteProfilePicture
} = require('../controllers/profileController');

// Import middleware
const { 
  authenticateToken
} = require('../middleware/auth');

// Konfigurasi multer untuk upload foto (upload folder di root backend)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles'); // Dari src/routes ke uploads
    // Buat folder jika belum ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Hanya izinkan file gambar
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('File harus berupa gambar'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  }
});

// All routes require authentication
router.use(authenticateToken);

// GET routes
router.get('/', getCurrentProfile);                                    // Get current user profile

// PUT routes  
router.put('/', upload.single('profilePicture'), updateProfile);      // Update profile with optional file upload

// DELETE routes
router.delete('/picture', deleteProfilePicture);                      // Delete profile picture

module.exports = router;