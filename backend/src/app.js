// app.js - FIXED VERSION - Correct middleware order
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer'); // ADD THIS
const morgan = require('morgan');
require('dotenv').config();
const path = require('path'); // ADD THIS IMPORT

const app = express();
const PORT = process.env.PORT || 5000;

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files middleware - SERVE UPLOADED FILES
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// =============================================
// PUBLIC ENDPOINTS (NO AUTH REQUIRED) - MUST BE FIRST!
// =============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BPS Assessment API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled'
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

// Basic route - API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BPS Assessment System API',
    docs: '/api/health',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        changePassword: 'PUT /api/auth/change-password',
        register: 'POST /api/auth/register (Admin only)'
      },
      users: {
        getAll: 'GET /api/users (Admin/Pimpinan)',
        getById: 'GET /api/users/:id',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id (Admin only)',
        activate: 'PUT /api/users/:id/activate (Admin only)',
        resetPassword: 'PUT /api/users/:id/reset-password (Admin only)',
        stats: 'GET /api/users/stats (Admin only)'
      },
      evaluations: {
        parameters: 'GET /api/evaluations/parameters',
        scoreRanges: 'GET /api/evaluations/score-ranges',
        activePeriod: 'GET /api/evaluations/active-period',
        eligibleUsers: 'GET /api/evaluations/eligible-users',
        submit: 'POST /api/evaluations/submit',
        myEvaluations: 'GET /api/evaluations/my-evaluations',
        all: 'GET /api/evaluations/all (Admin/Pimpinan)',
        summary: 'GET /api/evaluations/summary/:periodId (Admin/Pimpinan)'
      },
      periods: {
        getAll: 'GET /api/periods (Admin/Pimpinan)',
        getActive: 'GET /api/periods/active',
        getById: 'GET /api/periods/:id (Admin/Pimpinan)',
        create: 'POST /api/periods (Admin only)',
        update: 'PUT /api/periods/:id (Admin only)',
        activate: 'PUT /api/periods/:id/activate (Admin only)',
        delete: 'DELETE /api/periods/:id (Admin only)'
      },
      dashboard: {
        stats: 'GET /api/dashboard/stats (Admin/Pimpinan)',
        evaluationProgress: 'GET /api/dashboard/evaluation-progress (Admin/Pimpinan)',
        charts: 'GET /api/dashboard/charts (Admin/Pimpinan)',
        activities: 'GET /api/dashboard/activities (Admin/Pimpinan)'
      },
      monitoring: {
        evaluationStatus: 'GET /api/monitoring/evaluation-status (Admin/Pimpinan)',
        incompleteUsers: 'GET /api/monitoring/incomplete-users (Admin/Pimpinan)',
        userDetail: 'GET /api/monitoring/user/:userId/detail (Admin/Pimpinan)'
      },
      attendance: {
        getAll: 'GET /api/attendance (Admin/Pimpinan)',
        getById: 'GET /api/attendance/:id (Admin/Pimpinan)',
        createUpdate: 'POST/PUT /api/attendance (Admin only)',
        delete: 'DELETE /api/attendance/:id (Admin only)',
        stats: 'GET /api/stats (Admin/Pimpinan)'
      },
      ckp: {
        getAll: 'GET /api/ckp (Admin/Pimpinan)',
        getById: 'GET /api/ckp/:id (Admin/Pimpinan)',
        createUpdate: 'POST/PUT /api/ckp (Admin only)',
        delete: 'DELETE /api/ckp/:id (Admin only)'
      },
      finalEvaluation: {
        calculate: 'POST /api/calculate (Admin only)',
        getFinal: 'GET /api/final-evaluations (Admin/Pimpinan)',
        bestEmployee: 'GET /api/best-employee/:periodId (Admin/Pimpinan)',
        leaderboard: 'GET /api/leaderboard (Admin/Pimpinan)'
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
const profileRoutes = require('./routes/profile'); // NEW ROUTE
const evaluationRoutes = require('./routes/evaluations');
const attendanceRoutes = require('./routes/attendance');
const finalEvaluationRoutes = require('./routes/finalEvaluation');
const periodRoutes = require('./routes/periods');
const dashboardRoutes = require('./routes/dashboard');
const monitoringRoutes = require('./routes/monitoring');

// Authenticated routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes); // NEW ROUTE
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api', attendanceRoutes);              // attendance & ckp
app.use('/api/final-evaluation', finalEvaluationRoutes);
app.use('/api/periods', periodRoutes);          // period management
app.use('/api/dashboard', dashboardRoutes);     // dashboard statistics
app.use('/api/monitoring', monitoringRoutes);   // evaluation monitoring

// =============================================
// ERROR HANDLERS
// =============================================

// Enhanced 404 handler
app.use('/api/*', (req, res) => {
  console.log(`404 - API endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/login',
      'GET /api/evaluations/parameters',
      'GET /api/evaluations/active-period'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Handle Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File terlalu besar. Maksimal 5MB' });
  }
  
  if (error.message === 'File harus berupa gambar') {
    return res.status(400).json({ error: 'File harus berupa gambar' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
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

// Start server with better logging
app.listen(PORT, () => {
  console.log(`
🚀 BPS Assessment System Backend Started!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Health check: http://localhost:${PORT}/api/health
🔗 Test endpoint: http://localhost:${PORT}/api/test
🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
⏰ Started at: ${new Date().toISOString()}
`);
});

module.exports = app;