const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { 
      userId, 
      role,
      timestamp: Date.now()
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// LOGIN
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi'
      });
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        password: true,
        role: true,
        jenisKelamin: true,
        jabatan: true,
        golongan: true,
        status: true,
        username: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Akun Anda tidak aktif. Hubungi administrator.'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: userWithoutPassword,
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// REGISTER (Only Admin can create new users)
const register = async (req, res) => {
  try {
    const {
      nip,
      nama,
      email,
      password,
      role = 'STAFF',
      jenisKelamin,
      tanggalLahir,
      alamat,
      mobilePhone,
      pendidikanTerakhir,
      jabatan,
      golongan,
      status = 'PNS',
      username
    } = req.body;

    // Validation
    if (!nip || !nama || !password || !username || !jenisKelamin) {
      return res.status(400).json({
        success: false,
        message: 'NIP, nama, password, username, dan jenis kelamin wajib diisi'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { nip },
          { username },
          ...(email ? [{ email }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'NIP, username, atau email sudah terdaftar'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        nip,
        nama,
        email,
        password: hashedPassword,
        role,
        jenisKelamin,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        alamat,
        mobilePhone,
        pendidikanTerakhir,
        jabatan,
        golongan,
        status,
        username,
        isActive: true
      },
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        role: true,
        jenisKelamin: true,
        jabatan: true,
        golongan: true,
        status: true,
        username: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: { user: newUser }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET CURRENT USER (from token)
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        role: true,
        jenisKelamin: true,
        tanggalLahir: true,
        alamat: true,
        mobilePhone: true,
        pendidikanTerakhir: true,
        jabatan: true,
        golongan: true,
        status: true,
        instansi: true,
        kantor: true,
        username: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password lama, password baru, dan konfirmasi password wajib diisi'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password baru dan konfirmasi password tidak sama'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 6 karakter'
      });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Check current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password lama tidak benar'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({
      success: true,
      message: 'Password berhasil diubah'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// LOGOUT (client-side only, just remove token)
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logout berhasil'
  });
};

module.exports = {
  login,
  register,
  getCurrentUser,
  changePassword,
  logout
};