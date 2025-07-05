// app.js - UPDATED with new routes
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const evaluationRoutes = require('./routes/evaluations');
const attendanceRoutes = require('./routes/attendance');
const finalEvaluationRoutes = require('./routes/finalEvaluation');

// ✅ NEW ROUTES - ADDED
const periodRoutes = require('./routes/periods');
const dashboardRoutes = require('./routes/dashboard');
const monitoringRoutes = require('./routes/monitoring');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api', attendanceRoutes);              // attendance & ckp
app.use('/api', finalEvaluationRoutes);         // final evaluation

// ✅ NEW ROUTES - REGISTERED
app.use('/api/periods', periodRoutes);          // period management
app.use('/api/dashboard', dashboardRoutes);     // dashboard statistics
app.use('/api/monitoring', monitoringRoutes);   // evaluation monitoring

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BPS Assessment API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic route - UPDATED with new endpoints
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
      // ✅ NEW: Period Management
      periods: {
        getAll: 'GET /api/periods (Admin/Pimpinan)',
        getActive: 'GET /api/periods/active',
        getById: 'GET /api/periods/:id (Admin/Pimpinan)',
        create: 'POST /api/periods (Admin only)',
        update: 'PUT /api/periods/:id (Admin only)',
        activate: 'PUT /api/periods/:id/activate (Admin only)',
        delete: 'DELETE /api/periods/:id (Admin only)'
      },
      // ✅ NEW: Dashboard & Statistics
      dashboard: {
        stats: 'GET /api/dashboard/stats (Admin/Pimpinan)',
        evaluationProgress: 'GET /api/dashboard/evaluation-progress (Admin/Pimpinan)',
        charts: 'GET /api/dashboard/charts (Admin/Pimpinan)',
        activities: 'GET /api/dashboard/activities (Admin/Pimpinan)'
      },
      // ✅ NEW: Monitoring
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

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;