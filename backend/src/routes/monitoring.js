// routes/monitoring.js
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getEvaluationStatus,
  getIncompleteUsers,
  getUserEvaluationDetail
} = require('../controllers/monitoringController');

// Import middleware
const { 
  authenticateToken, 
  requirePimpinan
} = require('../middleware/auth');

// All routes require authentication (Admin/Pimpinan level)
router.use(authenticateToken);
router.use(requirePimpinan);

// GET routes - Monitoring evaluation completion
router.get('/evaluation-status', getEvaluationStatus);        // Status lengkap semua user
router.get('/incomplete-users', getIncompleteUsers);          // List user yang belum lengkap
router.get('/user/:userId/detail', getUserEvaluationDetail);  // Detail evaluasi per user

module.exports = router;