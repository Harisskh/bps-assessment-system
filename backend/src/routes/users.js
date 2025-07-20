// routes/users.js - COMPLETE VERSION WITH CREATE USER
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllUsers,
  getUserById,
  checkUserData,     // 🔥 NEW: Import the check user data function
  createUser,        // 🔥 NEW: Import create user function
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
router.get('/:id/check-data', requireAdmin, checkUserData); // 🔥 NEW: Check user data route

// POST routes
router.post('/', requireAdmin, createUser);             // 🔥 NEW: Create user route

// PUT routes  
router.put('/:id', requireStaffOrAbove, updateUser);    
router.put('/:id/activate', requireAdmin, activateUser); 
router.put('/:id/reset-password', requireAdmin, resetUserPassword); 

// DELETE routes
router.delete('/:id', requireAdmin, deleteUser);        
router.delete('/:id/permanent', requireAdmin, permanentDeleteUser); 

module.exports = router;