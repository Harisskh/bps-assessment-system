// backend/src/app.js - FIXED FOR CPANEL PRODUCTION
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();
// 🔥 FIXED: Use environment PORT for cPanel/Passenger
const PORT = process.env.PORT || 5000;

// 🔥 ADDED: Database initialization with proper error handling
const { PrismaClient } = require('@prisma/client');
let prisma;
let databaseConnected = false;

const initializeDatabase = async () => {
  try {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);
    
    databaseConnected = true;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Troubleshooting:');
    console.error('   1. Check if PostgreSQL is running');
    console.error('   2. Verify DATABASE_URL in environment');
    console.error('   3. Check database credentials');
    
    databaseConnected = false;
    console.log('⚠️  Server will start without database connection');
  }
};

// Initialize database
initializeDatabase().catch(console.error);

// 🔥 CRITICAL: ENSURE UPLOAD DIRECTORIES EXIST FIRST
const uploadDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(__dirname, '../uploads/profiles');
const tempDir = path.join(__dirname, '../uploads/temp');
const templatesDir = path.join(__dirname, '../templates');

console.log('📁 Checking upload directories...');
console.log('📂 Upload dir path:', uploadDir);
console.log('📂 Profiles dir path:', profilesDir);
console.log('📂 Temp dir path:', tempDir);
console.log('📂 Templates dir path:', templatesDir);

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
console.log('📂 Templates dir exists:', fs.existsSync(templatesDir));

// Trust proxy untuk production
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Reduced from 1000 to save memory
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
  // Memory store cleanup
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// Middleware
app.use(limiter);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(compression({
  level: 6, // Balanced compression (not too CPU intensive)
  threshold: 1024 // Only compress responses > 1KB
}));

app.use('/api', limiter)

// 🔥 TRUST PROXY FIRST - CRITICAL FOR cPANEL
app.set('trust proxy', true);

// 🔥 CORS DEBUGGING MIDDLEWARE (BEFORE CORS)
app.use((req, res, next) => {
  const origin = req.get('origin');
  const host = req.get('host');
  const referer = req.get('referer');
  
  // Only log in development or for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('🌐 Incoming Request:', {
      method: req.method,
      path: req.path,
      origin: origin,
      host: host,
      referer: referer,
      userAgent: req.get('user-agent')?.substring(0, 50),
      timestamp: new Date().toISOString()
    });
  }
  
  next();
});

// 🔥 PRODUCTION-READY CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 CORS Origin Check:', origin);
    }
    
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ No origin - allowing (same-origin or mobile app)');
      }
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'https://siapik1810.web.bps.go.id',
      'http://siapik1810.web.bps.go.id', 
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Allowed origins:', allowedOrigins);
    }
    
    if (allowedOrigins.includes(origin)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Origin allowed:', origin);
      }
      callback(null, true);
    } else {
      // 🔥 PRODUCTION SECURITY: Block unauthorized origins
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
    'X-Preview-Mode'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// JSON parsing with smaller limits untuk save memory
app.use(express.json({ 
  limit: '2mb', // Reduced from 10mb
  extended: false 
}));

app.use(express.urlencoded({ 
  limit: '2mb', // Reduced from 10mb
  extended: false 
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Only log in development or for errors
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development' || res.statusCode >= 400) {
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
    
    // Warn about slow requests
    if (duration > 10000) {
      console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});

// Handle preflight requests
app.options('*', cors());

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Trust proxy for cPanel/shared hosting
app.set('trust proxy', 1);

// Logging - ENHANCED for production debugging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
} else {
  // Production: Only log errors and slow requests
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// Body parsing (duplicate removed)
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔥 STATIC FILES MIDDLEWARE
console.log('📁 Setting up static file serving...');

app.use('/uploads', (req, res, next) => {
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📁 Static file request: ${req.method} ${req.originalUrl}`);
    console.log(`📂 Requested file path: ${path.join(uploadDir, req.path)}`);
    console.log(`📝 File exists: ${fs.existsSync(path.join(uploadDir, req.path))}`);
  }
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
      'Cache-Control': 'public, max-age=3600',
      'Pragma': 'public'
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Serving file:', path);
    }
  }
}));

// Manual file serving as fallback
app.get('/uploads/profiles/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(profilesDir, filename);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Manual file serving request:');
    console.log('📁 Filename:', filename);
    console.log('📂 Full path:', filePath);
    console.log('📝 File exists:', fs.existsSync(filePath));
  }
  
  if (fs.existsSync(filePath)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ File found, serving...');
    }
    
    res.set({
      'Content-Type': 'image/jpeg',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=3600',
      'Pragma': 'public'
    });
    
    res.sendFile(filePath);
  } else {
    console.log('❌ File not found:', filename);
    res.status(404).json({ 
      error: 'File not found',
      filename: filename,
      fullPath: filePath,
      profilesDir: profilesDir,
      filesInDir: fs.existsSync(profilesDir) ? fs.readdirSync(profilesDir) : []
    });
  }
});

// 🔥 REQUEST LOGGING MIDDLEWARE (PRODUCTION OPTIMIZED)
app.use((req, res, next) => {
  // Only log API requests and errors in production
  if (process.env.NODE_ENV === 'development' || req.path.startsWith('/api')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  
  if (req.path.startsWith('/uploads') && process.env.NODE_ENV === 'development') {
    console.log('📁 Static file request:', {
      path: req.path,
      fullPath: path.join(uploadDir, req.path.replace('/uploads', '')),
      exists: fs.existsSync(path.join(uploadDir, req.path.replace('/uploads', '')))
    });
  }
  
  if (req.body && Object.keys(req.body).length > 0 && process.env.NODE_ENV === 'development') {
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
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
    templatesDir: templatesDir,
    uploadDirExists: fs.existsSync(uploadDir),
    profilesDirExists: fs.existsSync(profilesDir),
    tempDirExists: fs.existsSync(tempDir),
    templatesDirExists: fs.existsSync(templatesDir),
    // 🔥 NEW: Environment info for debugging
    envInfo: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: PORT,
      FRONTEND_URL: process.env.FRONTEND_URL,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      BACKEND_URL: process.env.BACKEND_URL,
      DATABASE_CONNECTED: !!process.env.DATABASE_URL
    },
    features: {
      importExcel: 'enabled',
      multer: 'enabled',
      xlsx: 'enabled',
      reports: 'enabled',
      certificates: 'enabled'
    }
  });
});

app.get('/api/test', (req, res) => {
  const origin = req.get('origin');
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Test endpoint accessed by origin:', origin);
  }
  
  res.json({
    success: true,
    message: 'Backend connection successful! (SEQUELIZE VERSION)',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    origin: origin,
    userAgent: req.get('User-Agent'),
    cors: {
      allowedOrigins: [
        'https://siapik1810.web.bps.go.id',
        'http://siapik1810.web.bps.go.id',
        'http://localhost:3000',
        process.env.FRONTEND_URL,
        process.env.CORS_ORIGIN
      ].filter(Boolean)
    }
  });
});

// 🔥 DEBUG ENDPOINTS (CONDITIONAL - DEVELOPMENT ONLY)
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG_ENDPOINTS === 'true') {
  app.get('/api/debug/files', async (req, res) => {
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

    const templateFiles = fs.existsSync(templatesDir)
      ? fs.readdirSync(templatesDir)
      : [];
      
    const testFilePath = profileFiles.length > 0 ? profileFiles[0] : null;
    
    res.json({
      uploadsDir: uploadDir,
      profilesDir: profilesDir,
      tempDir: tempDir,
      templatesDir: templatesDir,
      uploadsDirExists: fs.existsSync(uploadDir),
      profilesDirExists: fs.existsSync(profilesDir),
      tempDirExists: fs.existsSync(tempDir),
      templatesDirExists: fs.existsSync(templatesDir),
      uploadFiles: uploadFiles,
      profileFiles: profileFiles,
      tempFiles: tempFiles,
      templateFiles: templateFiles,
      staticMiddlewareSetup: 'express.static() configured for /uploads',
      // 🔥 FIXED: Use environment-based URLs
      backendBaseUrl: process.env.BACKEND_URL?.replace('/api', '') || `http://localhost:${PORT}`,
      testUrl: testFilePath ? `${process.env.BACKEND_URL?.replace('/api', '') || `http://localhost:${PORT}`}/uploads/profiles/${testFilePath}` : null,
      manualTestUrl: testFilePath ? `${process.env.BACKEND_URL || `http://localhost:${PORT}/api`}/test-file/${testFilePath}` : null,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: PORT,
        FRONTEND_URL: process.env.FRONTEND_URL,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        BACKEND_URL: process.env.BACKEND_URL
      },
      importEndpoints: {
        template: '/api/import/template',
        users: '/api/import/users',
        debug: '/api/import/debug'
      },
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
} else {
  // Production: Block debug endpoints
  app.get('/api/debug/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Debug endpoints not available in production'
    });
  });
  
  app.get('/api/test-file/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Test endpoints not available in production'
    });
  });
}

// Basic route - API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BPS Assessment System API (SEQUELIZE VERSION - PRODUCTION READY)',
    docs: '/api/health',
    ...(process.env.NODE_ENV === 'development' && {
      debug: '/api/debug/files',
      corsTest: '/api/cors-test',
      testFile: '/api/test-file/filename.jpg'
    }),
    staticFiles: '/uploads/profiles/filename.jpg',
    environment: process.env.NODE_ENV || 'development',
    // 🔥 FIXED: Environment-based URLs
    baseUrl: process.env.BACKEND_URL?.replace('/api', '') || `http://localhost:${PORT}`,
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
    version: '1.0.0-sequelize-production'
  });
});

// =============================================
// 🔥 AUTHENTICATED ROUTES (AUTH REQUIRED) - KEPT AS WORKING
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

// 🔥 CORS ERROR HANDLER (BEFORE 404)
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    const origin = req.get('origin');
    console.error('❌ CORS Error for origin:', origin);
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation - Origin not allowed',
      origin: origin,
      allowedOrigins: [
        'https://siapik1810.web.bps.go.id',
        'http://siapik1810.web.bps.go.id',
        process.env.FRONTEND_URL,
        process.env.CORS_ORIGIN
      ].filter(Boolean)
    });
  }
  next(err);
});

// Force API routes to be handled first
app.use('/api/*', (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 API Route accessed: ${req.method} ${req.originalUrl}`);
    console.log(`📍 Path: ${req.path}`);
  }
  next();
});

// Enhanced 404 handler for API
app.use('/api/*', (req, res) => {
  console.log(`❌ 404 - API endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      auth: ['/api/auth/login', '/api/auth/me'],
      users: ['/api/users', '/api/users/:id'],
      import: [
        '/api/import/template', 
        '/api/import/users',
        ...(process.env.NODE_ENV === 'development' ? ['/api/import/debug'] : [])
      ],
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
      ...(process.env.NODE_ENV === 'development' && {
        debug: ['/api/health', '/api/debug/files', '/api/test', '/api/cors-test']
      })
    }
  });
});

// Static files 404 handler
app.use('/uploads/*', (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📁 Static file not found: ${req.originalUrl}`);
    const filePath = path.join(uploadDir, req.path.replace('/uploads', ''));
    console.log('📂 Looking for file at:', filePath);
    console.log('📝 File exists:', fs.existsSync(filePath));
  }
  
  res.status(404).json({ 
    error: 'File not found',
    requestedPath: req.originalUrl,
    ...(process.env.NODE_ENV === 'development' && {
      lookingAt: path.join(uploadDir, req.path.replace('/uploads', '')),
      exists: fs.existsSync(path.join(uploadDir, req.path.replace('/uploads', ''))),
      uploadDir: uploadDir,
      profilesDir: profilesDir,
      tempDir: tempDir,
      templatesDir: templatesDir
    })
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
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }
  console.error('=============');
  
  // 🔥 SEQUELIZE: Error handling (instead of Prisma)
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.errors.map(error => ({
        field: error.path,
        message: error.message
      })),
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Data sudah ada (duplicate entry)',
      field: err.errors[0]?.path,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      message: 'Database error',
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

// 🔥 SEQUELIZE: Initialize database connection on startup
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database connection...');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Database connected successfully');
      
      // Sync database in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Syncing database schema...');
        // await sequelize.sync({ alter: true });
        console.log('✅ Database schema synchronized');
      }
    } else {
      console.log('⚠️ Database connection failed, but server will continue');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.log('⚠️ Server will continue without database');
  }
}

// 🔥 FIXED: Export app for cPanel/Passenger (NO app.listen in production)
if (require.main === module) {
  // Only start server if run directly (development)
  app.listen(PORT, () => {
    console.log(`
🚀 BPS Assessment System Backend Started!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🗄️ Database: PostgreSQL + Sequelize
🔗 Health check: http://localhost:${PORT}/api/health
${process.env.NODE_ENV === 'development' ? `🔗 CORS Test: http://localhost:${PORT}/api/cors-test` : ''}
${process.env.NODE_ENV === 'development' ? `🔗 Debug files: http://localhost:${PORT}/api/debug/files` : ''}
🔗 Test endpoint: http://localhost:${PORT}/api/test
🔗 Auth login: http://localhost:${PORT}/api/auth/login
🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
🗄️  Database: ${databaseConnected ? '✅ Connected' : '❌ Disconnected'}
📁 Upload directory: ${uploadDir}
📂 Profiles directory: ${profilesDir}
📂 Temp directory: ${tempDir}
📂 Templates directory: ${templatesDir}
⏰ Started at: ${new Date().toISOString()}
`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    if (prisma) await prisma.$disconnect();
    server.close(() => {
      console.log('✅ Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    if (prisma) await prisma.$disconnect();
    server.close(() => {
      console.log('✅ Process terminated');
      process.exit(0);
    });
  });

} else {
  console.log('📦 App exported for cPanel/Passenger deployment (SEQUELIZE VERSION - PRODUCTION READY)');
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔗 CORS Origins:', [
    'https://siapik1810.web.bps.go.id',
    'http://siapik1810.web.bps.go.id',
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
  ].filter(Boolean));
  
  // Initialize database for production
  initializeDatabase();
}

module.exports = app;