// controllers/userController.js - FIXED DENGAN PERMANENT DELETE
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET ALL USERS (with pagination and search)
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role = '', 
      status = '',
      isActive 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      AND: [
        // Search by name, nip, or username
        search ? {
          OR: [
            { nama: { contains: search } },
            { nip: { contains: search } },
            { username: { contains: search } }
          ]
        } : {},
        // Filter by role
        role ? { role } : {},
        // Filter by status (PNS/PPPK)
        status ? { status } : {},
        // Filter by active status
        isActive !== undefined ? { isActive: isActive === 'true' } : {}
      ]
    };

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
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
          mobilePhone: true, // FIXED: Include mobilePhone
          alamat: true, // FIXED: Include alamat
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { role: 'asc' },
          { nama: 'asc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

const createUser = async (req, res) => {
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

    console.log('📝 Create user attempt:', { nip, nama, email, username, role });

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

    // Cek duplikasi
    const [existingNip, existingUsername, existingEmail] = await Promise.all([
      prisma.user.findFirst({ where: { nip: nip } }),
      prisma.user.findFirst({ where: { username: username } }),
      prisma.user.findFirst({ where: { email: email } })
    ]);

    if (existingNip) {
      return res.status(400).json({
        success: false,
        message: 'NIP sudah terdaftar'
      });
    }

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username sudah digunakan'
      });
    }

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Parse tanggal lahir
    let parsedDate = null;
    if (tanggalLahir) {
      try {
        parsedDate = new Date(tanggalLahir);
        if (isNaN(parsedDate.getTime())) {
          parsedDate = null;
        }
      } catch (e) {
        console.warn('Invalid date format:', tanggalLahir);
        parsedDate = null;
      }
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        nip: nip.toString(),
        nama: nama.trim(),
        email: email.toLowerCase().trim(),
        jenisKelamin: jenisKelamin || 'LK',
        tanggalLahir: parsedDate,
        alamat: alamat?.trim() || null,
        mobilePhone: mobilePhone?.trim() || null,
        pendidikanTerakhir: pendidikanTerakhir?.trim() || null,
        status: status || 'PNS',
        instansi: instansi?.trim() || 'BPS Kabupaten Pringsewu',
        kantor: kantor?.trim() || 'BPS Kabupaten Pringsewu',
        jabatan: jabatan?.trim() || null,
        golongan: golongan?.trim() || null,
        username: username.trim(),
        password: hashedPassword,
        role: role || 'STAFF',
        profilePicture: null,
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

    console.log('✅ User created successfully:', {
      id: newUser.id,
      nama: newUser.nama,
      username: newUser.username
    });

    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: { user: newUser }
    });

  } catch (error) {
    console.error('❌ Error in createUser:', error);
    
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'data';
      return res.status(400).json({
        success: false,
        message: `${field} sudah terdaftar dalam sistem`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET USER BY ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
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
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// FIXED: UPDATE USER - Include alamat & mobilePhone
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nip,
      nama,
      email,
      jenisKelamin,
      tanggalLahir,
      alamat, // FIXED: Include alamat
      mobilePhone, // FIXED: Include mobilePhone
      pendidikanTerakhir,
      jabatan,
      golongan,
      status,
      username,
      role,
      isActive
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, nip: true, username: true }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Only admin can update other users, or users can update themselves (limited fields)
    const isAdmin = req.user.role === 'ADMIN';
    const isSelfUpdate = req.user.id === id;

    if (!isAdmin && !isSelfUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengubah user ini'
      });
    }

    // Build update data based on permissions
    const updateData = {};
    
    if (isAdmin) {
      // Admin can update all fields
      if (nip && nip !== existingUser.nip) {
        // Check NIP uniqueness
        const nipExists = await prisma.user.findFirst({
          where: { nip, id: { not: id } }
        });
        if (nipExists) {
          return res.status(400).json({
            success: false,
            message: 'NIP sudah digunakan oleh user lain'
          });
        }
        updateData.nip = nip;
      }
      
      if (username && username !== existingUser.username) {
        // Check username uniqueness
        const usernameExists = await prisma.user.findFirst({
          where: { username, id: { not: id } }
        });
        if (usernameExists) {
          return res.status(400).json({
            success: false,
            message: 'Username sudah digunakan oleh user lain'
          });
        }
        updateData.username = username;
      }
      
      if (nama) updateData.nama = nama;
      if (email) updateData.email = email;
      if (jenisKelamin) updateData.jenisKelamin = jenisKelamin;
      if (tanggalLahir) updateData.tanggalLahir = new Date(tanggalLahir);
      if (alamat !== undefined) updateData.alamat = alamat; // FIXED: Include alamat
      if (mobilePhone !== undefined) updateData.mobilePhone = mobilePhone; // FIXED: Include mobilePhone
      if (pendidikanTerakhir !== undefined) updateData.pendidikanTerakhir = pendidikanTerakhir;
      if (jabatan !== undefined) updateData.jabatan = jabatan;
      if (golongan !== undefined) updateData.golongan = golongan;
      if (status) updateData.status = status;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    } else {
      // Users can only update limited fields
      if (nama) updateData.nama = nama;
      if (email) updateData.email = email;
      if (alamat !== undefined) updateData.alamat = alamat; // FIXED: Allow self-update alamat
      if (mobilePhone !== undefined) updateData.mobilePhone = mobilePhone; // FIXED: Allow self-update mobilePhone
    }

    // Check email uniqueness if email is being updated
    if (updateData.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          id: { not: id }
        }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email sudah digunakan oleh user lain'
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        role: true,
        jenisKelamin: true,
        tanggalLahir: true,
        alamat: true, // FIXED: Return alamat
        mobilePhone: true, // FIXED: Return mobilePhone
        pendidikanTerakhir: true,
        jabatan: true,
        golongan: true,
        status: true,
        username: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'User berhasil diperbarui',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// DELETE USER (Soft delete - set isActive to false)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, nama: true }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Don't allow deleting admin users
    if (existingUser.role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Admin user tidak dapat dihapus'
      });
    }

    // Don't allow users to delete themselves
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun sendiri'
      });
    }

    // Soft delete (deactivate)
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: `User ${existingUser.nama} berhasil dinonaktifkan`
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// FIXED: PERMANENT DELETE USER
const permanentDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        role: true, 
        nama: true,
        evaluationsGiven: { take: 1 },
        evaluationsReceived: { take: 1 }
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Don't allow deleting admin users
    if (existingUser.role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Admin user tidak dapat dihapus permanen'
      });
    }

    // Don't allow users to delete themselves
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun sendiri'
      });
    }

    // Check if user has evaluation data
    if (existingUser.evaluationsGiven.length > 0 || existingUser.evaluationsReceived.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User yang memiliki data evaluasi tidak dapat dihapus permanen. Gunakan nonaktifkan sebagai gantinya.'
      });
    }

    // Permanent delete using transaction
    await prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.attendance.deleteMany({
        where: { userId: id }
      });
      
      await tx.ckpScore.deleteMany({
        where: { userId: id }
      });
      
      await tx.finalEvaluation.deleteMany({
        where: { userId: id }
      });
      
      // Finally delete the user
      await tx.user.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: `User ${existingUser.nama} berhasil dihapus permanen`
    });

  } catch (error) {
    console.error('Permanent delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// ACTIVATE USER
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        nama: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: `User ${user.nama} berhasil diaktifkan`,
      data: { user }
    });

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// RESET PASSWORD (Admin only)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword = 'bps1810' } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, nama: true, username: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: `Password user ${user.nama} berhasil direset`,
      data: {
        username: user.username,
        newPassword: newPassword
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET USER STATISTICS
const getUserStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      // Total users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
        where: { isActive: true }
      }),
      // Total users by status
      prisma.user.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { isActive: true }
      }),
      // Total active/inactive users
      prisma.user.groupBy({
        by: ['isActive'],
        _count: { isActive: true }
      }),
      // Recent registrations (last 30 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const [roleStats, statusStats, activeStats, recentCount] = stats;

    res.json({
      success: true,
      data: {
        byRole: roleStats,
        byStatus: statusStats,
        byActive: activeStats,
        recentRegistrations: recentCount,
        summary: {
          totalActive: activeStats.find(s => s.isActive)?._count?.isActive || 0,
          totalInactive: activeStats.find(s => !s.isActive)?._count?.isActive || 0,
          recentRegistrations: recentCount
        }
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};


// UPDATE exports di bagian akhir file userController.js:
module.exports = {
  getAllUsers,
  getUserById,
  createUser,        // 🔥 ADD THIS LINE
  updateUser,
  deleteUser,
  permanentDeleteUser,
  activateUser,
  resetUserPassword,
  getUserStats
}