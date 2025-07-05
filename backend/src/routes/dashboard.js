// routes/dashboard.js
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getDashboardStats,
  getEvaluationProgress,
  getChartsData,
  getRecentActivities
} = require('../controllers/dashboardController');

// Import middleware
const { 
  authenticateToken, 
  requirePimpinan
} = require('../middleware/auth');

// All routes require authentication (Admin/Pimpinan level)
router.use(authenticateToken);
router.use(requirePimpinan);

// GET routes - Dashboard statistics and monitoring
router.get('/stats', getDashboardStats);                   // Overview statistics
router.get('/evaluation-progress', getEvaluationProgress); // Monitoring pengisian evaluasi
router.get('/charts', getChartsData);                      // Data untuk grafik
router.get('/activities', getRecentActivities);            // Recent activities

module.exports = router;