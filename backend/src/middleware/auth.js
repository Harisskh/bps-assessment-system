// backend/src/middleware/auth.js - ENHANCED AUTH MIDDLEWARE FOR IMPORT SYSTEM
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 🔥 ENHANCED AUTHENTICATION MIDDLEWARE
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token diperlukan',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau sudah expired',
        code: 'TOKEN_INVALID'
      });
    }

    // Get user from database dengan additional checks
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak aktif',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Add user info to request object
    req.user = user;
    
    // Log authentication success (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Auth success:', {
        userId: user.id,
        nama: user.nama,
        role: user.role,
        path: req.path,
        method: req.method
      });
    }

    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat verifikasi autentikasi',
      code: 'AUTH_ERROR'
    });
  }
};

// 🔥 ADMIN ROLE REQUIREMENT MIDDLEWARE
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya admin yang dapat mengakses fitur ini.',
      code: 'ADMIN_REQUIRED',
      userRole: req.user.role
    });
  }

  console.log('✅ Admin access granted:', {
    userId: req.user.id,
    nama: req.user.nama,
    path: req.path,
    method: req.method
  });

  next();
};

// 🔥 PIMPINAN OR ADMIN ROLE REQUIREMENT
const requirePimpinan = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const allowedRoles = ['ADMIN', 'PIMPINAN'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya admin atau pimpinan yang dapat mengakses fitur ini.',
      code: 'PIMPINAN_REQUIRED',
      userRole: req.user.role,
      allowedRoles: allowedRoles
    });
  }

  console.log('✅ Pimpinan access granted:', {
    userId: req.user.id,
    nama: req.user.nama,
    role: req.user.role,
    path: req.path,
    method: req.method
  });

  next();
};

// 🔥 STAFF OR ABOVE ROLE REQUIREMENT
const requireStaffOrAbove = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const allowedRoles = ['ADMIN', 'PIMPINAN', 'STAFF'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Role tidak diizinkan.',
      code: 'INSUFFICIENT_ROLE',
      userRole: req.user.role,
      allowedRoles: allowedRoles
    });
  }

  next();
};

// 🔥 OPTIONAL AUTHENTICATION (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          nip: true,
          nama: true,
          email: true,
          username: true,
          role: true,
          isActive: true
        }
      });

      if (user && user.isActive) {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (jwtError) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

// 🔥 RATE LIMITING MIDDLEWARE (for import endpoints)
const createRateLimit = (windowMs, maxRequests, message) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    const userRequests = requests.get(key) || [];
    const validRequests = userRequests.filter(time => time > windowStart);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: message || 'Terlalu banyak request. Silakan coba lagi nanti.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    validRequests.push(now);
    requests.set(key, validRequests);

    next();
  };
};

// 🔥 SPECIFIC RATE LIMITS FOR IMPORT OPERATIONS
const importRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes window
  10, // max 10 import attempts per 15 minutes
  'Terlalu banyak percobaan import. Maksimal 10 import per 15 menit.'
);

const templateDownloadRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes window
  20, // max 20 downloads per 5 minutes
  'Terlalu banyak download template. Maksimal 20 download per 5 menit.'
);

// 🔥 FILE SIZE VALIDATION MIDDLEWARE
const validateFileSize = (maxSize = 10 * 1024 * 1024) => { // Default 10MB
  return (req, res, next) => {
    if (req.file && req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File terlalu besar. Maksimal ${Math.round(maxSize / 1024 / 1024)}MB`,
        code: 'FILE_TOO_LARGE',
        fileSize: req.file.size,
        maxSize: maxSize
      });
    }
    next();
  };
};

// 🔥 REQUEST LOGGING MIDDLEWARE
const logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  console.log(`📝 ${req.method} ${req.path}`, {
    user: req.user?.nama || 'Anonymous',
    role: req.user?.role || 'None',
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100),
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    console.log(`📤 Response ${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      duration: duration + 'ms',
      success: data?.success,
      user: req.user?.nama || 'Anonymous'
    });
    
    return originalJson.call(this, data);
  };

  next();
};

// 🔥 ERROR HANDLING MIDDLEWARE
const handleAuthError = (error, req, res, next) => {
  console.error('🔒 Auth error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    user: req.user?.nama
  });

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid',
      code: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token sudah expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan',
      code: 'USER_NOT_FOUND'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan autentikasi',
    code: 'AUTH_ERROR'
  });
};

// 🔥 PERMISSION CHECKER UTILITY
const hasPermission = (userRole, requiredPermissions) => {
  const rolePermissions = {
    ADMIN: ['read', 'write', 'delete', 'import', 'export', 'manage_users'],
    PIMPINAN: ['read', 'export', 'view_reports'],
    STAFF: ['read', 'evaluate']
  };

  const userPermissions = rolePermissions[userRole] || [];
  
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }
  
  return userPermissions.includes(requiredPermissions);
};

// 🔥 PERMISSION-BASED MIDDLEWARE
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengakses fitur ini',
        code: 'PERMISSION_DENIED',
        required: permission,
        userRole: req.user.role
      });
    }

    next();
  };
};

// 🔥 SELF OR ADMIN ACCESS MIDDLEWARE
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const targetUserId = req.params.id || req.params.userId;
  const isAdmin = req.user.role === 'ADMIN';
  const isSelf = req.user.id === targetUserId;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({
      success: false,
      message: 'Anda hanya dapat mengakses data sendiri atau sebagai admin',
      code: 'ACCESS_DENIED'
    });
  }

  next();
};

// 🔥 VALIDATE USER STATUS MIDDLEWARE
const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Akun Anda tidak aktif. Hubungi administrator.',
      code: 'ACCOUNT_INACTIVE'
    });
  }

  next();
};

// 🔥 DEVELOPMENT-ONLY MIDDLEWARE
const requireDevelopment = (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint hanya tersedia dalam mode development',
      code: 'DEV_ONLY'
    });
  }
  next();
};

// 🔥 EXPORT ALL MIDDLEWARE
module.exports = {
  // Core authentication
  authenticateToken,
  optionalAuth,
  
  // Role-based access
  requireAdmin,
  requirePimpinan,
  requireStaffOrAbove,
  
  // Permission-based access
  requirePermission,
  hasPermission,
  
  // Conditional access
  requireSelfOrAdmin,
  requireActiveUser,
  
  // Rate limiting
  importRateLimit,
  templateDownloadRateLimit,
  createRateLimit,
  
  // File validation
  validateFileSize,
  
  // Logging and error handling
  logRequest,
  handleAuthError,
  
  // Development utilities
  requireDevelopment
};