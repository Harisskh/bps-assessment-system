// routes/finalEvaluation.js - UPDATED WITH PROPER PERMISSIONS
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
  requireStaffOrAbove
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// POST routes - Admin only (untuk perhitungan)
router.post('/calculate', requireAdmin, calculateFinalEvaluations);

// GET routes with proper permissions
router.get('/final-evaluations', requirePimpinan, getFinalEvaluations); // Admin & Pimpinan only
router.get('/best-employee/:periodId', requireStaffOrAbove, getBestEmployee); // All roles can see
router.get('/leaderboard', requireStaffOrAbove, getLeaderboard); // All roles can see

module.exports = router;