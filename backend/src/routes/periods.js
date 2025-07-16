// routes/periods.js - FINAL FIXED VERSION
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

// =====================
// 🔥 PUBLIC ENDPOINTS (NO AUTH REQUIRED) - MUST BE FIRST
// =====================

// Health check endpoint - NO AUTH REQUIRED
router.get('/health/check', (req, res) => {
  console.log('🏥 Health check endpoint called');
  res.json({
    success: true,
    message: 'Periods routes are working perfectly',
    timestamp: new Date().toISOString(),
    authRequired: false,
    version: '1.0.0',
    endpoints: {
      'GET /api/periods/health/check': 'Health check - NO AUTH',
      'GET /api/periods/active': 'Get active period - AUTH REQUIRED',
      'GET /api/periods': 'Get all periods - ADMIN/PIMPINAN ONLY',
      'POST /api/periods': 'Create period - ADMIN ONLY',
      'PUT /api/periods/:id': 'Update period - ADMIN ONLY',
      'DELETE /api/periods/:id': 'Delete period - ADMIN ONLY'
    },
    middleware: {
      authentication: 'JWT Bearer Token',
      authorization: 'Role-based (ADMIN, PIMPINAN, STAFF)'
    }
  });
});

// Test endpoint - NO AUTH REQUIRED
router.get('/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({
    success: true,
    message: 'Periods test endpoint working',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// =====================
// 🔥 AUTHENTICATED ENDPOINTS - AUTH REQUIRED
// =====================

// Apply authentication to all routes below this line
router.use(authenticateToken);

// Public authenticated endpoints (all roles)
router.get('/active', getActivePeriod);                    // Get active period - ALL AUTHENTICATED USERS

// Staff endpoints  
router.get('/staff/available', async (req, res) => {
  try {
    console.log('👥 Staff available periods endpoint');
    console.log('🔍 User:', req.user?.nama, '| Role:', req.user?.role);
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const periods = await prisma.period.findMany({
      where: { isActive: true },
      select: {
        id: true,
        namaPeriode: true,
        tahun: true,
        bulan: true,
        isActive: true,
        startDate: true,
        endDate: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${periods.length} available periods for staff`);

    res.json({
      success: true,
      data: { periods },
      user: {
        name: req.user?.nama,
        role: req.user?.role
      }
    });
  } catch (error) {
    console.error('❌ Staff available periods error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin/Pimpinan endpoints
router.get('/', requirePimpinan, getAllPeriods);           // Get all periods
router.get('/:id', requirePimpinan, getPeriodById);        // Get period by ID

// Admin only endpoints  
router.post('/', requireAdmin, createPeriod);              // Create period
router.put('/:id', requireAdmin, updatePeriod);            // Update period
router.put('/:id/activate', requireAdmin, activatePeriod); // Activate period
router.delete('/:id', requireAdmin, deletePeriod);         // Delete period

module.exports = router;