// backend/src/controllers/authController.js - ULTRA FIXED VERSION
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET current user - /auth/me
const getCurrentUser = async (req, res) => {
  try {
    console.log('🔍 getCurrentUser called for user ID:', req.user.id);
    
    const user = await prisma.user.findUnique({
      where: { 
        id: req.user.id,
        isActive: true
      },
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
        status: true,
        instansi: true,
        kantor: true,
        jabatan: true,
        golongan: true,
        username: true,
        profilePicture: true, // 🔥 CRITICAL: Make sure this is included
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found or inactive:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan atau tidak aktif'
      });
    }

    console.log('✅ User found:', {
      id: user.id,
      nama: user.nama,
      profilePicture: user.profilePicture
    });

    // 🔥 CRITICAL: Return consistent format
    res.json({
      success: true,
      data: {
        user: user
      }
    });

  } catch (error) {
    console.error('❌ Error in getCurrentUser:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// LOGIN user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 Login attempt for username:', username);

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi'
      });
    }

    // Cari user berdasarkan username
    const user = await prisma.user.findFirst({
      where: {
        username: username,
        isActive: true
      }
    });

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', username);
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // User data untuk response (tanpa password)
    const userData = {
      id: user.id,
      nip: user.nip,
      nama: user.nama,
      email: user.email,
      role: user.role,
      jenisKelamin: user.jenisKelamin,
      tanggalLahir: user.tanggalLahir,
      alamat: user.alamat,
      mobilePhone: user.mobilePhone,
      pendidikanTerakhir: user.pendidikanTerakhir,
      status: user.status,
      instansi: user.instansi,
      kantor: user.kantor,
      jabatan: user.jabatan,
      golongan: user.golongan,
      username: user.username,
      profilePicture: user.profilePicture, // 🔥 INCLUDE PROFILE PICTURE
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log('✅ Login successful for user:', {
      id: userData.id,
      nama: userData.nama,
      role: userData.role,
      profilePicture: userData.profilePicture
    });

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: userData,
        token: token
      }
    });

  } catch (error) {
    console.error('❌ Error in login:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// REGISTER user (Admin only)
const register = async (req, res) => {
  try {
    const {
      nip,
      nama,
      email,
      jenisKelamin,
      tanggalLahir,
      alamat,
      mobilePhone,
      pendidikanTerakhir,
      status,
      instansi,
      kantor,
      jabatan,
      golongan,
      username,
      password,
      role
    } = req.body;

    console.log('📝 Register attempt for username:', username);

    // Validasi input wajib
    if (!nip || !nama || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'NIP, nama, email, username, dan password wajib diisi'
      });
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid'
      });
    }

    // Cek duplikasi NIP
    const existingNip = await prisma.user.findFirst({
      where: { nip: nip }
    });
    if (existingNip) {
      return res.status(400).json({
        success: false,
        message: 'NIP sudah terdaftar'
      });
    }

    // Cek duplikasi username
    const existingUsername = await prisma.user.findFirst({
      where: { username: username }
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username sudah digunakan'
      });
    }

    // Cek duplikasi email
    const existingEmail = await prisma.user.findFirst({
      where: { email: email }
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        nip,
        nama,
        email,
        jenisKelamin: jenisKelamin || null,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        alamat: alamat || null,
        mobilePhone: mobilePhone || null,
        pendidikanTerakhir: pendidikanTerakhir || null,
        status: status || 'PNS',
        instansi: instansi || 'BPS Kabupaten Pringsewu',
        kantor: kantor || null,
        jabatan: jabatan || null,
        golongan: golongan || null,
        username,
        password: hashedPassword,
        role: role || 'STAFF',
        profilePicture: null, // 🔥 EXPLICITLY SET NULL
        isActive: true
      },
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
        status: true,
        instansi: true,
        kantor: true,
        jabatan: true,
        golongan: true,
        username: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('✅ User registered successfully:', {
      id: newUser.id,
      nama: newUser.nama,
      username: newUser.username
    });

    res.status(201).json({
      success: true,
      message: 'User berhasil didaftarkan',
      data: {
        user: newUser
      }
    });

  } catch (error) {
    console.error('❌ Error in register:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Data sudah terdaftar (NIP, username, atau email duplikat)'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mendaftarkan user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    console.log('🔑 Change password request for user:', userId);

    // Validasi input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Semua field password wajib diisi'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password baru dan konfirmasi tidak cocok'
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
      select: { id: true, password: true, nama: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini salah'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    console.log('✅ Password changed successfully for user:', user.nama);

    res.json({
      success: true,
      message: 'Password berhasil diubah'
    });

  } catch (error) {
    console.error('❌ Error in changePassword:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengubah password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// LOGOUT (optional - mostly handled client-side)
const logout = async (req, res) => {
  try {
    console.log('👋 Logout request for user:', req.user.id);
    
    // In a more complex system, you might want to blacklist the token
    // For now, we'll just return success and let client handle token removal
    
    res.json({
      success: true,
      message: 'Logout berhasil'
    });

  } catch (error) {
    console.error('❌ Error in logout:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCurrentUser,
  login,
  register,
  changePassword,
  logout
};