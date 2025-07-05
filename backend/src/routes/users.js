const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  activateUser,
  resetUserPassword,
  getUserStats
} = require('../controllers/userController');

// Import middleware
const { 
  authenticateToken, 
  requireAdmin, 
  requirePimpinan,
  requireStaffOrAbove 
} = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET routes
router.get('/', requirePimpinan, getAllUsers);           // Admin & Pimpinan can see all users
router.get('/stats', requireAdmin, getUserStats);       // Admin only - user statistics
router.get('/:id', requireStaffOrAbove, getUserById);   // All authenticated users

// PUT routes  
router.put('/:id', requireStaffOrAbove, updateUser);    // Users can update self, Admin can update all
router.put('/:id/activate', requireAdmin, activateUser); // Admin only
router.put('/:id/reset-password', requireAdmin, resetUserPassword); // Admin only

// DELETE routes
router.delete('/:id', requireAdmin, deleteUser);        // Admin only (soft delete)

module.exports = router;