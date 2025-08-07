// backend/src/controllers/authController.js - SEQUELIZE VERSION
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');

// GET current user - /auth/me
const getCurrentUser = async (req, res) => {
  try {
    console.log('🔍 getCurrentUser called for user ID:', req.user.id);
    
    const user = await User.findOne({
      where: { 
        id: req.user.id,
        isActive: true
      },
      attributes: {
        exclude: ['password']
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
    const user = await User.findOne({
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
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // User data untuk response (tanpa password)
    const { password: _, ...userData } = user.toJSON();

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
    const existingNip = await User.findOne({
      where: { nip: nip }
    });
    if (existingNip) {
      return res.status(400).json({
        success: false,
        message: 'NIP sudah terdaftar'
      });
    }

    // Cek duplikasi username
    const existingUsername = await User.findOne({
      where: { username: username }
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username sudah digunakan'
      });
    }

    // Cek duplikasi email
    const existingEmail = await User.findOne({
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
    const newUser = await User.create({
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
      profilePicture: null,
      isActive: true
    });

    // Remove password from response
    const { password: _, ...userResponse } = newUser.toJSON();

    console.log('✅ User registered successfully:', {
      id: userResponse.id,
      nama: userResponse.nama,
      username: userResponse.username
    });

    res.status(201).json({
      success: true,
      message: 'User berhasil didaftarkan',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('❌ Error in register:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
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
    const user = await User.findByPk(userId);

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
    await user.update({
      password: hashedNewPassword
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