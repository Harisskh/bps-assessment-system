const express = require('express');
const router = express.Router();

// Import controllers
const {
  login,
  register,
  getCurrentUser,
  changePassword,
  logout
} = require('../controllers/authController');

// Import middleware
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);
router.put('/change-password', authenticateToken, changePassword);

// Admin only routes
router.post('/register', authenticateToken, requireAdmin, register);

module.exports = router;