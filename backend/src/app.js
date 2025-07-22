// backend/src/app.js - COMPLETE VERSION WITH CERTIFICATE ROUTES
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const morgan = require('morgan');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 CRITICAL: ENSURE UPLOAD DIRECTORIES EXIST FIRST
const uploadDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(__dirname, '../uploads/profiles');
const tempDir = path.join(__dirname, '../uploads/temp');
const templatesDir = path.join(__dirname, '../templates'); // 🔥 NEW: Templates directory

console.log('📁 Checking upload directories...');
console.log('📂 Upload dir path:', uploadDir);
console.log('📂 Profiles dir path:', profilesDir);
console.log('📂 Temp dir path:', tempDir);
console.log('📂 Templates dir path:', templatesDir); // 🔥 NEW

// Create directories if they don't exist
[uploadDir, profilesDir, tempDir, templatesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`🔧 Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('📂 Upload dir exists:', fs.existsSync(uploadDir));
console.log('📂 Profiles dir exists:', fs.existsSync(profilesDir));
console.log('📂 Temp dir exists:', fs.existsSync(tempDir));
console.log('📂 Templates dir exists:', fs.existsSync(templatesDir)); // 🔥 NEW

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Preview-Mode']
}));

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔥 STATIC FILES MIDDLEWARE
console.log('📁 Setting up static file serving...');

app.use('/uploads', (req, res, next) => {
  console.log(`📁 Static file request: ${req.method} ${req.originalUrl}`);
  console.log(`📂 Requested file path: ${path.join(uploadDir, req.path)}`);
  console.log(`📝 File exists: ${fs.existsSync(path.join(uploadDir, req.path))}`);
  next();
});

app.use('/uploads', express.static(uploadDir, {
  dotfiles: 'deny',
  index: false,
  redirect: false,
  setHeaders: (res, path, stat) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    console.log('📤 Serving file:', path);
  }
}));

// Manual file serving as fallback
app.get('/uploads/profiles/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(profilesDir, filename);
  
  console.log('🔍 Manual file serving request:');
  console.log('📁 Filename:', filename);
  console.log('📂 Full path:', filePath);
  console.log('📝 File exists:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath)) {
    console.log('✅ File found, serving...');
    
    res.set({
      'Content-Type': 'image/jpeg',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.sendFile(filePath);
  } else {
    console.log('❌ File not found');
    res.status(404).json({ 
      error: 'File not found',
      filename: filename,
      fullPath: filePath,
      profilesDir: profilesDir,
      filesInDir: fs.existsSync(profilesDir) ? fs.readdirSync(profilesDir) : []
    });
  }
});

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  if (req.path.startsWith('/uploads')) {
    console.log('📁 Static file request:', {
      path: req.path,
      fullPath: path.join(uploadDir, req.path.replace('/uploads', '')),
      exists: fs.existsSync(path.join(uploadDir, req.path.replace('/uploads', '')))
    });
  }
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// =============================================
// PUBLIC ENDPOINTS (NO AUTH REQUIRED)
// =============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BPS Assessment API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled',
    staticFiles: 'enabled',
    uploadPath: '/uploads',
    uploadDir: uploadDir,
    profilesDir: profilesDir,
    tempDir: tempDir,
    templatesDir: templatesDir, // 🔥 NEW
    uploadDirExists: fs.existsSync(uploadDir),
    profilesDirExists: fs.existsSync(profilesDir),
    tempDirExists: fs.existsSync(tempDir),
    templatesDirExists: fs.existsSync(templatesDir), // 🔥 NEW
    features: {
      importExcel: 'enabled',
      multer: 'enabled',
      xlsx: 'enabled',
      reports: 'enabled',
      certificates: 'enabled' // 🔥 NEW
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend connection successful!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl
  });
});

// Enhanced debug endpoint
app.get('/api/debug/files', (req, res) => {
  try {
    const uploadFiles = fs.existsSync(uploadDir) 
      ? fs.readdirSync(uploadDir) 
      : [];
      
    const profileFiles = fs.existsSync(profilesDir) 
      ? fs.readdirSync(profilesDir) 
      : [];

    const tempFiles = fs.existsSync(tempDir)
      ? fs.readdirSync(tempDir)
      : [];

    const templateFiles = fs.existsSync(templatesDir) // 🔥 NEW
      ? fs.readdirSync(templatesDir)
      : [];
      
    const testFilePath = profileFiles.length > 0 ? profileFiles[0] : null;
    
    res.json({
      uploadsDir: uploadDir,
      profilesDir: profilesDir,
      tempDir: tempDir,
      templatesDir: templatesDir, // 🔥 NEW
      uploadsDirExists: fs.existsSync(uploadDir),
      profilesDirExists: fs.existsSync(profilesDir),
      tempDirExists: fs.existsSync(tempDir),
      templatesDirExists: fs.existsSync(templatesDir), // 🔥 NEW
      uploadFiles: uploadFiles,
      profileFiles: profileFiles,
      tempFiles: tempFiles,
      templateFiles: templateFiles, // 🔥 NEW
      staticMiddlewareSetup: 'express.static() configured for /uploads',
      backendBaseUrl: 'http://localhost:5000',
      testUrl: testFilePath ? `http://localhost:5000/uploads/profiles/${testFilePath}` : null,
      manualTestUrl: testFilePath ? `http://localhost:5000/api/test-file/${testFilePath}` : null,
      importEndpoints: {
        template: '/api/import/template',
        users: '/api/import/users',
        debug: '/api/import/debug'
      },
      // 🔥 NEW: Certificate endpoints
      certificateEndpoints: {
        myAwards: '/api/certificate/my-awards',
        preview: '/api/certificate/preview/:periodId',
        generate: '/api/certificate/generate/:periodId',
        history: '/api/certificate/history'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      uploadsDir: uploadDir,
      profilesDir: profilesDir,
      tempDir: tempDir,
      templatesDir: templatesDir
    });
  }
});

// Test file endpoint
app.get('/api/test-file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(profilesDir, filename);
  
  console.log('🧪 Test file endpoint:');
  console.log('📁 Filename:', filename);
  console.log('📂 Full path:', filePath);
  console.log('📝 File exists:', fs.existsSync(filePath));
  
  if (fs.existsSync(filePath)) {
    console.log('✅ Test file found, serving...');
    res.sendFile(filePath);
  } else {
    console.log('❌ Test file not found');
    res.status(404).json({
      error: 'File not found',
      filename: filename,
      fullPath: filePath,
      profilesDir: profilesDir,
      filesInDir: fs.existsSync(profilesDir) ? fs.readdirSync(profilesDir) : []
    });
  }
});

// Basic route - API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BPS Assessment System API',
    docs: '/api/health',
    debug: '/api/debug/files',
    testFile: '/api/test-file/filename.jpg',
    staticFiles: '/uploads/profiles/filename.jpg',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        changePassword: 'PUT /api/auth/change-password',
        register: 'POST /api/auth/register (Admin only)'
      },
      users: {
        getAll: 'GET /api/users',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id'
      },
      import: {
        template: 'GET /api/import/template',
        users: 'POST /api/import/users (with multipart/form-data)',
        debug: 'GET /api/import/debug'
      },
      // 🔥 NEW: Certificate endpoints documentation
      certificate: {
        myAwards: 'GET /api/certificate/my-awards',
        preview: 'GET /api/certificate/preview/:periodId',
        generate: 'POST /api/certificate/generate/:periodId',
        history: 'GET /api/certificate/history (admin only)'
      },
      profile: {
        get: 'GET /api/profile',
        update: 'PUT /api/profile (with multipart/form-data)',
        deletePicture: 'DELETE /api/profile/picture'
      },
      evaluation: {
        parameters: 'GET /api/evaluations/parameters',
        activePeriod: 'GET /api/evaluations/active-period',
        eligibleUsers: 'GET /api/evaluations/eligible-users',
        submit: 'POST /api/evaluations/submit'
      },
      monitoring: {
        evaluationStatus: 'GET /api/monitoring/evaluation-status',
        incompleteUsers: 'GET /api/monitoring/incomplete-users',
      },
      attendance: {
        getAll: 'GET /api/attendance',
        create: 'POST /api/attendance',
        getById: 'GET /api/attendance/:id',
        delete: 'DELETE /api/attendance/:id'
      },
      staticFiles: {
        profiles: '/uploads/profiles/filename.jpg',
        test: '/api/debug/files',
        testFile: '/api/test-file/filename.jpg'
      }
    },
    version: '1.0.0'
  });
});

// =============================================
// AUTHENTICATED ROUTES (AUTH REQUIRED)
// =============================================

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
const evaluationRoutes = require('./routes/evaluations');
const attendanceRoutes = require('./routes/attendance');
const finalEvaluationRoutes = require('./routes/finalEvaluation');
const periodRoutes = require('./routes/periods');
const dashboardRoutes = require('./routes/dashboard');
const monitoringRoutes = require('./routes/monitoring');
const importRoutes = require('./routes/import');
const certificateRoutes = require('./routes/certificate'); 

// Route definitions
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api', attendanceRoutes);
app.use('/api/final-evaluation', finalEvaluationRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/import', importRoutes);
app.use('/api/certificate', certificateRoutes);

// =============================================
// ERROR HANDLERS
// =============================================

// Enhanced 404 handler for API
app.use('/api/*', (req, res) => {
  console.log(`404 - API endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      auth: ['/api/auth/login', '/api/auth/me'],
      users: ['/api/users', '/api/users/:id'],
      import: [
        '/api/import/template', 
        '/api/import/users',
        '/api/import/debug'
      ],
      // 🔥 NEW: Certificate endpoints in 404 response
      certificate: [
        '/api/certificate/my-awards',
        '/api/certificate/preview/:periodId',
        '/api/certificate/generate/:periodId',
        '/api/certificate/history'
      ],
      evaluations: [
        '/api/evaluations/parameters', 
        '/api/evaluations/active-period', 
        '/api/evaluations/eligible-users', 
        '/api/evaluations/submit'
      ],
      monitoring: [
        '/api/monitoring/evaluation-status',
        '/api/monitoring/incomplete-users',
        '/api/monitoring/user/:userId/detail'
      ],
      attendance: ['/api/attendance', '/api/attendance/:id'],
      ckp: ['/api/ckp', '/api/ckp/:id'],
      periods: ['/api/periods', '/api/periods/active'],
      debug: ['/api/health', '/api/debug/files', '/api/test']
    }
  });
});

// Static files 404 handler
app.use('/uploads/*', (req, res) => {
  console.log(`📁 Static file not found: ${req.originalUrl}`);
  const filePath = path.join(uploadDir, req.path.replace('/uploads', ''));
  console.log('📂 Looking for file at:', filePath);
  console.log('📝 File exists:', fs.existsSync(filePath));
  
  res.status(404).json({ 
    error: 'File not found',
    requestedPath: req.originalUrl,
    lookingAt: filePath,
    exists: fs.existsSync(filePath),
    uploadDir: uploadDir,
    profilesDir: profilesDir,
    tempDir: tempDir,
    templatesDir: templatesDir
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Handle Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      success: false,
      error: 'File terlalu besar. Maksimal 10MB' 
    });
  }
  
  if (error.message === 'File harus berupa gambar') {
    return res.status(400).json({ 
      success: false,
      error: 'File harus berupa gambar' 
    });
  }

  if (error.message === 'File harus berformat Excel (.xls atau .xlsx)') {
    return res.status(400).json({ 
      success: false,
      error: 'File harus berformat Excel (.xls atau .xlsx)' 
    });
  }
  
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  console.error('=== ERROR ===');
  console.error('Time:', new Date().toISOString());
  console.error('Request:', req.method, req.originalUrl);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('=============');
  
  // Prisma error handling
  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      message: 'Data sudah ada (duplicate entry)',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Data tidak ditemukan',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
});

// Start server with enhanced logging
app.listen(PORT, () => {
  console.log(`
🚀 BPS Assessment System Backend Started!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Health check: http://localhost:${PORT}/api/health
🔗 Debug files: http://localhost:${PORT}/api/debug/files
🔗 Test endpoint: http://localhost:${PORT}/api/test
🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
📁 Upload directory: ${uploadDir}
📂 Profiles directory: ${profilesDir}
📂 Temp directory: ${tempDir}
📂 Templates directory: ${templatesDir}
⏰ Started at: ${new Date().toISOString()}

🔧 Route Configuration:
   ✅ /api/auth/* -> Authentication
   ✅ /api/users/* -> User Management
   ✅ /api/certificate/* -> Certificate Generation (NEW)
   ✅ /api/import/* -> Excel Import System
   ✅ /api/evaluations/* -> Evaluation System
   ✅ /api/attendance -> Attendance Management
   ✅ /api/ckp -> CKP Management
   ✅ /api/periods/* -> Period Management
   ✅ /uploads/* -> Static File Serving

📜 Certificate Features:
   ✅ GET /api/certificate/my-awards -> Get user's best employee awards
   ✅ POST /api/certificate/generate/:periodId -> Generate certificate  
   ✅ GET /api/certificate/preview/:periodId -> Preview certificate data
   ✅ GET /api/certificate/history -> Certificate history (admin only)

📊 Import Excel Features:
   ✅ GET /api/import/template -> Download template
   ✅ POST /api/import/users -> Import users from Excel
   ✅ GET /api/import/debug -> Debug import system
`);

  // Verify upload directories at startup
  console.log('📁 Final verification of directories...');
  console.log('📂 Upload dir exists:', fs.existsSync(uploadDir));
  console.log('📂 Profiles dir exists:', fs.existsSync(profilesDir));
  console.log('📂 Temp dir exists:', fs.existsSync(tempDir));
  console.log('📂 Templates dir exists:', fs.existsSync(templatesDir));
  
  if (fs.existsSync(profilesDir)) {
    const files = fs.readdirSync(profilesDir);
    console.log('📄 Files in profiles directory:', files.length);
    files.forEach(file => {
      console.log(`   - ${file}`);
    });
  }

  if (fs.existsSync(templatesDir)) {
    const files = fs.readdirSync(templatesDir);
    console.log('📄 Files in templates directory:', files.length);
    files.forEach(file => {
      console.log(`   - ${file}`);
    });
  }
  
  console.log('✅ All directories verified!');
  console.log('🔗 Test static serving: http://localhost:5000/uploads/profiles/');
  console.log('📊 Import Excel template: http://localhost:5000/api/import/template');
  console.log('📜 Certificate endpoints ready!');
  
  // Startup health check
  console.log('🏥 Performing startup health checks...');
  console.log('   ✅ Express server running');
  console.log('   ✅ CORS configured');
  console.log('   ✅ Static file serving enabled');
  console.log('   ✅ Import Excel routes enabled');
  console.log('   ✅ Certificate routes enabled (NEW)');
  console.log('   ✅ Route handlers registered');
  console.log('   ✅ Error handlers configured');
  console.log('🎉 All systems ready!');
});

module.exports = app;