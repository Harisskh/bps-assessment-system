const express = require('express');
const router = express.Router();

// Import controllers
const {
  getEvaluationParameters,
  getScoreRanges,
  getActivePeriod,
  getEligibleUsers,
  submitEvaluation,
  getMyEvaluations,
  getAllEvaluations,
  getEvaluationSummary
} = require('../controllers/evaluationController');

// Import middleware
const { 
  authenticateToken, 
  requireAdmin, 
  requirePimpinan,
  requireStaffOrAbove 
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET routes - Master data for evaluation form
router.get('/parameters', requireStaffOrAbove, getEvaluationParameters);  // Get 8 BerAKHLAK parameters
router.get('/score-ranges', requireStaffOrAbove, getScoreRanges);         // Get score ranges (96-100, 86-95, 80-85)
router.get('/active-period', requireStaffOrAbove, getActivePeriod);       // Get current active period
router.get('/eligible-users', requireStaffOrAbove, getEligibleUsers);     // Get users that can be evaluated

// POST routes - Submit evaluations
router.post('/submit', requireStaffOrAbove, submitEvaluation);            // Submit tokoh berakhlak evaluation

// GET routes - View evaluations
router.get('/my-evaluations', requireStaffOrAbove, getMyEvaluations);     // Get evaluations submitted by current user
router.get('/all', requirePimpinan, getAllEvaluations);                   // Get all evaluations (Admin/Pimpinan only)
router.get('/summary/:periodId', requirePimpinan, getEvaluationSummary);  // Get evaluation summary for period

module.exports = router;