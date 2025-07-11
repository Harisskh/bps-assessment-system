// =====================
// BACKEND FIX - Allow STAFF to get Active Period
// File: backend/routes/periods.js
// =====================

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
router.get('/active', getActivePeriod);                    // 🔥 FIXED: Get active period (ALL USERS)
router.get('/:id', requirePimpinan, getPeriodById);        // Get period by ID

// POST routes
router.post('/', requireAdmin, createPeriod);              // Create new period (Admin only)

// PUT routes
router.put('/:id', requireAdmin, updatePeriod);            // Update period (Admin only)
router.put('/:id/activate', requireAdmin, activatePeriod); // Activate period (Admin only)

// DELETE routes
router.delete('/:id', requireAdmin, deletePeriod);         // Delete period (Admin only)

module.exports = router;

// =====================
// ALTERNATIVE: Add new route for STAFF to get limited periods
// =====================

// 🔥 NEW: Add route for STAFF to get basic period info
router.get('/staff/available', async (req, res) => {
  try {
    const periods = await prisma.period.findMany({
      where: { isActive: true },
      select: {
        id: true,
        namaPeriode: true,
        tahun: true,
        bulan: true,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: { periods }
    });
  } catch (error) {
    console.error('Get available periods for staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});