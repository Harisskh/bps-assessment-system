// =====================
// ATTENDANCE ROUTES - FIXED VERSION
// File: backend/routes/attendance.js
// =====================

const express = require('express');
const router = express.Router();

// Import controllers - FIXED with proper destructuring
const {
  // Attendance functions
  upsertAttendance,
  getAttendanceById,
  getAllAttendance,
  deleteAttendance,
  
  // CKP functions
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
// 🔥 FIXED: ATTENDANCE ROUTES (direct path, no /attendance prefix)
// =====================

// GET routes - Frontend calls /api/attendance
router.get('/attendance', requirePimpinan, getAllAttendance);          // GET /api/attendance
router.get('/attendance/stats', requirePimpinan, getAttendanceCkpStats); // GET /api/attendance/stats
router.get('/attendance/:id', requirePimpinan, getAttendanceById);     // GET /api/attendance/:id

// POST/PUT routes - Frontend calls /api/attendance  
router.post('/attendance', requireAdmin, upsertAttendance);            // POST /api/attendance
router.put('/attendance/:id', requireAdmin, upsertAttendance);         // PUT /api/attendance/:id

// DELETE routes - Frontend calls /api/attendance/:id
router.delete('/attendance/:id', requireAdmin, deleteAttendance);      // DELETE /api/attendance/:id

// =====================
// 🔥 FIXED: CKP ROUTES (direct path, no /ckp prefix)
// =====================

// GET routes - Frontend calls /api/ckp
router.get('/ckp', requirePimpinan, getAllCkpScores);                  // GET /api/ckp
router.get('/ckp/stats', requirePimpinan, getAttendanceCkpStats);      // GET /api/ckp/stats  
router.get('/ckp/:id', requirePimpinan, getCkpScoreById);              // GET /api/ckp/:id

// POST/PUT routes - Frontend calls /api/ckp
router.post('/ckp', requireAdmin, upsertCkpScore);                     // POST /api/ckp
router.put('/ckp/:id', requireAdmin, upsertCkpScore);                  // PUT /api/ckp/:id

// DELETE routes - Frontend calls /api/ckp/:id
router.delete('/ckp/:id', requireAdmin, deleteCkpScore);               // DELETE /api/ckp/:id

// =====================
// 🔥 ADDITIONAL: HEALTH CHECK & DEBUG ROUTES
// =====================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Attendance & CKP routes are working',
    timestamp: new Date().toISOString(),
    endpoints: {
      attendance: {
        get: 'GET /api/attendance',
        create: 'POST /api/attendance', 
        update: 'PUT /api/attendance/:id',
        delete: 'DELETE /api/attendance/:id',
        getById: 'GET /api/attendance/:id',
        stats: 'GET /api/attendance/stats'
      },
      ckp: {
        get: 'GET /api/ckp',
        create: 'POST /api/ckp',
        update: 'PUT /api/ckp/:id', 
        delete: 'DELETE /api/ckp/:id',
        getById: 'GET /api/ckp/:id',
        stats: 'GET /api/ckp/stats'
      }
    }
  });
});

module.exports = router;