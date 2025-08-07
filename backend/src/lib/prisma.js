// backend/src/lib/prisma.js
const { PrismaClient } = require('@prisma/client');

// Singleton pattern untuk Prisma Client
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Connection pool optimization
    __internal: {
      engine: {
        connectTimeout: 60000,    // 60 seconds
        requestTimeout: 60000,    // 60 seconds
        pool: {
          max: 20,               // Maximum connections
          min: 5,                // Minimum connections
          acquireTimeoutMillis: 60000,
          createTimeoutMillis: 60000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
        }
      }
    }
  });
} else {
  // Development
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

// Connection test
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test query
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('🔌 Database disconnected');
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = { prisma, testConnection };

// backend/src/controllers/authController.js - Optimized version
const { prisma } = require('../lib/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const loginController = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username dan password harus diisi'
      });
    }

    console.log(`🔐 Login attempt for: ${username}`);

    // Use select to limit data transfer
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        role: true,
        password: true,
        isActive: true,
        nip: true,
        jabatan: true
      }
    });

    if (!user) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({
        error: 'Username atau password salah'
      });
    }

    if (!user.isActive) {
      console.log(`⛔ Inactive user: ${username}`);
      return res.status(401).json({
        error: 'Akun tidak aktif. Hubungi administrator'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log(`❌ Invalid password for: ${username}`);
      return res.status(401).json({
        error: 'Username atau password salah'
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const duration = Date.now() - startTime;
    console.log(`✅ Login successful for ${username} (${duration}ms)`);

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login berhasil',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Login error for ${req.body.username} (${duration}ms):`, error);
    
    res.status(500).json({
      error: 'Terjadi kesalahan server. Silakan coba lagi.'
    });
  }
};

module.exports = { loginController };