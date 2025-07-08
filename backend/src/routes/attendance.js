// Fixed Routes - Remove duplicate paths yang menyebabkan error 404
// File: routes/attendance.js - FIXED VERSION

const express = require('express');
const router = express.Router();

// Import controllers
const {
  // Attendance
  getAllAttendance,
  upsertAttendance,
  getAttendanceById,
  deleteAttendance,
  // CKP
  getAllCkpScores,
  upsertCkpScore,
  getCkpScoreById,
  deleteCkpScore,
  // Statistics
  getAttendanceCkpStats
} = require('../controllers/attendanceController');

// Import middleware
const { 
  authenticateToken, 
  requireAdmin, 
  requirePimpinan
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// =====================
// ATTENDANCE ROUTES
// =====================

// GET routes
router.get('/attendance', requirePimpinan, getAllAttendance);          // Get all attendance records
router.get('/attendance/:id', requirePimpinan, getAttendanceById);     // Get attendance by ID

// POST/PUT routes  
router.post('/attendance', requireAdmin, upsertAttendance);            // Create/update attendance (admin only)
router.put('/attendance', requireAdmin, upsertAttendance);             // Create/update attendance (admin only)

// DELETE routes
router.delete('/attendance/:id', requireAdmin, deleteAttendance);      // Delete attendance (admin only)

// =====================
// CKP ROUTES
// =====================

// GET routes
router.get('/ckp', requirePimpinan, getAllCkpScores);                  // Get all CKP scores
router.get('/ckp/:id', requirePimpinan, getCkpScoreById);              // Get CKP score by ID

// POST/PUT routes
router.post('/ckp', requireAdmin, upsertCkpScore);                     // Create/update CKP score (admin only)
router.put('/ckp', requireAdmin, upsertCkpScore);                      // Create/update CKP score (admin only)

// DELETE routes
router.delete('/ckp/:id', requireAdmin, deleteCkpScore);               // Delete CKP score (admin only)

// =====================
// STATISTICS ROUTES
// =====================

// GET combined statistics
router.get('/stats', requirePimpinan, getAttendanceCkpStats);          // Get attendance & CKP statistics

module.exports = router;