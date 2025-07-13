// routes/finalEvaluation.js - FIXED PERMISSIONS
const express = require('express');
const router = express.Router();

const {
  calculateFinalEvaluations,
  getFinalEvaluations,
  getBestEmployee,
  getLeaderboard
} = require('../controllers/finalEvaluationController');

const { 
  authenticateToken, 
  requireAdmin, 
  requirePimpinan,
  requireStaffOrAbove  // Add this for staff access
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// POST routes - Admin only
router.post('/calculate', requireAdmin, calculateFinalEvaluations);

// GET routes - Admin/Pimpinan for most, Staff can see leaderboard
router.get('/final-evaluations', requirePimpinan, getFinalEvaluations);
router.get('/best-employee/:periodId', requireStaffOrAbove, getBestEmployee);
router.get('/leaderboard', requireStaffOrAbove, getLeaderboard); // ✅ Allow staff access

module.exports = router;