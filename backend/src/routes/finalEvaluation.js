const express = require('express');
const router = express.Router();

// Import controllers
const {
  calculateFinalEvaluations,
  getFinalEvaluations,
  getBestEmployee,
  getLeaderboard
} = require('../controllers/finalEvaluationController');

// Import middleware
const { 
  authenticateToken, 
  requireAdmin, 
  requirePimpinan
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// POST routes - Admin only
router.post('/calculate', requireAdmin, calculateFinalEvaluations);     // Calculate final scores and determine best employee

// GET routes - Admin/Pimpinan
router.get('/final-evaluations', requirePimpinan, getFinalEvaluations); // Get all final evaluations with ranking
router.get('/best-employee/:periodId', requirePimpinan, getBestEmployee); // Get best employee for specific period
router.get('/leaderboard', requirePimpinan, getLeaderboard);            // Get leaderboard (top performers)

module.exports = router;