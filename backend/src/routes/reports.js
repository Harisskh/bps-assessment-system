// routes/reports.js - REPORT ROUTES
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getComprehensiveReportData,
  getBerakhlakReport,
  getAttendanceReport,
  getCkpReport,
  exportReportToPDF
} = require('../controllers/reportController');

// Import middleware
const { 
  authenticateToken, 
  requirePimpinan
} = require('../middleware/auth');

// All routes require authentication (Admin/Pimpinan level)
router.use(authenticateToken);
router.use(requirePimpinan);

// =====================
// REPORT DATA ENDPOINTS
// =====================

// GET comprehensive report data (all-in-one)
router.get('/comprehensive', getComprehensiveReportData);

// GET BerAKHLAK report only
router.get('/berakhlak', getBerakhlakReport);

// GET attendance report only
router.get('/attendance', getAttendanceReport);

// GET CKP report only
router.get('/ckp', getCkpReport);

// =====================
// EXPORT ENDPOINTS
// =====================

// POST export report to PDF
router.post('/export/pdf', exportReportToPDF);

module.exports = router;