// routes/periods.js
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllPeriods,
  createPeriod,
  updatePeriod,
  deletePeriod,
  activatePeriod,
  getPeriodById,
  getActivePeriod
} = require('../controllers/periodController');

// Import middleware
const { 
  authenticateToken, 
  requireAdmin, 
  requirePimpinan
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET routes
router.get('/', requirePimpinan, getAllPeriods);           // Get all periods (Admin/Pimpinan)
router.get('/active', getActivePeriod);                    // Get active period (Public)
router.get('/:id', requirePimpinan, getPeriodById);        // Get period by ID

// POST routes
router.post('/', requireAdmin, createPeriod);              // Create new period (Admin only)

// PUT routes
router.put('/:id', requireAdmin, updatePeriod);            // Update period (Admin only)
router.put('/:id/activate', requireAdmin, activatePeriod); // Activate period (Admin only)

// DELETE routes
router.delete('/:id', requireAdmin, deletePeriod);         // Delete period (Admin only)

module.exports = router;