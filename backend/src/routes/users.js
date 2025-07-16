const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllUsers,
  getUserById,
  createUser,        // 🔥 ADD THIS IMPORT
  updateUser,
  deleteUser,
  permanentDeleteUser,
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
router.get('/', requirePimpinan, getAllUsers);           
router.get('/stats', requireAdmin, getUserStats);       
router.get('/:id', requireStaffOrAbove, getUserById);   

// POST routes - 🔥 ADD THIS LINE
router.post('/', requireAdmin, createUser);             // 🔥 NEW: Create user route

// PUT routes  
router.put('/:id', requireStaffOrAbove, updateUser);    
router.put('/:id/activate', requireAdmin, activateUser); 
router.put('/:id/reset-password', requireAdmin, resetUserPassword); 

// DELETE routes
router.delete('/:id', requireAdmin, deleteUser);        
router.delete('/:id/permanent', requireAdmin, permanentDeleteUser); 

module.exports = router;