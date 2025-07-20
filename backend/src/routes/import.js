// backend/src/routes/import.js - COMPLETELY NEW VERSION
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Import middleware
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Import controllers
const { downloadTemplate, importUsers } = require('../controllers/importController');

// 🔥 NEW: Setup upload directory
const uploadDir = path.join(__dirname, '../../uploads/temp');

// Create upload directory if not exists
if (!fs.existsSync(uploadDir)) {
  console.log('🔧 Creating upload directory:', uploadDir);
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 🔥 NEW: Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `import-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    console.log(`📁 Saving file as: ${uniqueName}`);
    cb(null, uniqueName);
  }
});

// 🔥 NEW: File filter for Excel only
const fileFilter = (req, file, cb) => {
  console.log(`📤 File upload attempt:`, {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // Check file extension
  const allowedExtensions = ['.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    console.log(`❌ Invalid file extension: ${fileExtension}`);
    return cb(new Error('File harus berformat Excel (.xlsx atau .xls)'), false);
  }
  
  // Check MIME type
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream' // Sometimes Excel files
  ];
  
  if (!allowedMimes.includes(file.mimetype)) {
    console.log(`❌ Invalid MIME type: ${file.mimetype}`);
    return cb(new Error('File harus berformat Excel (.xlsx atau .xls)'), false);
  }
  
  console.log(`✅ File accepted: ${file.originalname}`);
  cb(null, true);
};

// 🔥 NEW: Upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1 // Single file only
  }
});

// 🔥 NEW: Error handler for multer
const handleMulterError = (err, req, res, next) => {
  console.error('📤 Upload error:', err);
  
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File terlalu besar. Maksimal 10MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Hanya boleh upload 1 file'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
    }
  }
  
  // Custom validation errors
  if (err.message.includes('Excel')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan saat upload file'
  });
};

// =============================================
// ROUTES
// =============================================

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// 🔥 NEW: GET /template - Download Excel Template
router.get('/template', (req, res, next) => {
  console.log('📥 Template download request from:', req.user?.nama);
  downloadTemplate(req, res).catch(next);
});

// 🔥 NEW: POST /users - Import Users from Excel
router.post('/users', 
  upload.single('file'), 
  handleMulterError, 
  (req, res, next) => {
    console.log('📤 Import request from:', req.user?.nama);
    importUsers(req, res).catch(next);
  }
);

// 🔥 NEW: GET /debug - Debug information
router.get('/debug', (req, res) => {
  try {
    const uploadDirExists = fs.existsSync(uploadDir);
    const tempFiles = uploadDirExists ? fs.readdirSync(uploadDir) : [];
    
    res.json({
      success: true,
      message: 'Import system debug info',
      data: {
        uploadDirectory: uploadDir,
        uploadDirExists: uploadDirExists,
        tempFiles: tempFiles.length,
        fileList: tempFiles.slice(0, 5), // Show first 5 files only
        multerConfig: {
          maxFileSize: '10MB',
          allowedExtensions: ['.xlsx', '.xls'],
          singleFileOnly: true
        },
        routes: {
          template: 'GET /api/import/template',
          import: 'POST /api/import/users',
          debug: 'GET /api/import/debug'
        },
        user: {
          id: req.user?.id,
          nama: req.user?.nama,
          role: req.user?.role
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug endpoint error',
      error: error.message
    });
  }
});

// 🔥 NEW: GET /test - Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Import routes working correctly',
    user: req.user?.nama,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;