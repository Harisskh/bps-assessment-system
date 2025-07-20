// controllers/userController.js - ENHANCED WITH DATA CHECK AND IMPROVED DELETE LOGIC
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET ALL USERS (with pagination and search)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let where = {};

    if (search) {
      // Search di nama, nip, atau username
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        nama: 'asc',
      },
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        jenisKelamin: true,
        tanggalLahir: true,
        alamat: true,
        mobilePhone: true,
        pendidikanTerakhir: true,
        jabatan: true,
        golongan: true,
        status: true,
        username: true,
        role: true,
        isActive: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    const totalUsers = await prisma.user.count({ where });

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          totalCount: totalUsers,
          totalPages: Math.ceil(totalUsers / limitNum),
          currentPage: pageNum,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan daftar user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 🔥 CREATE USER - FIXED AND COMPLETE
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

    // 🔥 FIXED: Validasi input wajib - Email TIDAK wajib
    if (!nip || !nama || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'NIP, nama, username, dan password wajib diisi'
      });
    }

    // 🔥 FIXED: Validasi email format HANYA jika email diisi
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Format email tidak valid'
        });
      }
    }

    // Validasi format NIP (18 digit)
    if (!/^\d{18}$/.test(nip.toString())) {
      return res.status(400).json({
        success: false,
        message: 'NIP harus 18 digit angka'
      });
    }

    // Cek duplikasi - FIXED: Handling email yang bisa null
     const duplicateChecks = await Promise.all([
      // Check NIP
      prisma.user.findFirst({ where: { nip: nip.toString() } }),
      // Check Username  
      prisma.user.findFirst({ where: { username: username.trim() } }),
      // Check Email HANYA jika email diisi dan tidak kosong
      (email && email.trim() !== '') 
        ? prisma.user.findFirst({ where: { email: email.toLowerCase().trim() } })
        : Promise.resolve(null)
    ]);

    const [existingNip, existingUsername, existingEmail] = duplicateChecks;

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

    const userData = {
      nip: nip.toString().trim(),
      nama: nama.trim(),
      // 🔥 SOLUTION: Email handling - null jika kosong, lowercase jika ada
      email: (email && email.trim() !== '') ? email.toLowerCase().trim() : null,
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
    };

    // Create user - FIXED: Handle email yang bisa null
    const newUser = await prisma.user.create({
      data: userData,
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
      username: newUser.username,
      email: newUser.email || 'No email'
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

// 🔥 NEW: CHECK USER DATA - For delete confirmation
const checkUserData = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nama: true,
        username: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Check for related data
    const dataCounts = await Promise.all([
      // Count evaluations given by this user
      prisma.evaluation.count({
        where: { evaluatorId: id }
      }),
      // Count evaluations received by this user
      prisma.evaluation.count({
        where: { targetUserId: id }
      }),
      // Count attendance records
      prisma.attendance.count({
        where: { userId: id }
      }),
      // Count CKP scores
      prisma.ckpScore.count({
        where: { userId: id }
      }),
      // Count final evaluations
      prisma.finalEvaluation.count({
        where: { userId: id }
      })
    ]);

    const [
      evaluationsGiven,
      evaluationsReceived,
      attendanceRecords,
      ckpScores,
      finalEvaluations
    ] = dataCounts;

    const hasData = evaluationsGiven > 0 || evaluationsReceived > 0 || 
                   attendanceRecords > 0 || ckpScores > 0 || finalEvaluations > 0;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          nama: user.nama,
          username: user.username,
          role: user.role
        },
        hasData,
        dataCounts: {
          evaluationsGiven,
          evaluationsReceived,
          attendanceRecords,
          ckpScores,
          finalEvaluations,
          total: evaluationsGiven + evaluationsReceived + attendanceRecords + ckpScores + finalEvaluations
        }
      }
    });

  } catch (error) {
    console.error('Check user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// UPDATE USER
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nip,
      nama,
      email,
      jenisKelamin,
      tanggalLahir,
      alamat,
      mobilePhone,
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
      select: { id: true, role: true, nip: true, username: true, email: true }
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

    // 🔥 PREVENT ROLE CHANGE FOR ADMIN USERS
    if (existingUser.role === 'ADMIN' && role && role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Role Admin tidak dapat diubah'
      });
    }

    // Build update data based on permissions
    const updateData = {};
    
    if (isAdmin) {
      // Admin can update all fields (except admin role protection above)
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
      if (email !== undefined) updateData.email = email && email.trim() !== '' ? email : null;
      if (jenisKelamin) updateData.jenisKelamin = jenisKelamin;
      if (tanggalLahir) updateData.tanggalLahir = new Date(tanggalLahir);
      if (alamat !== undefined) updateData.alamat = alamat;
      if (mobilePhone !== undefined) updateData.mobilePhone = mobilePhone;
      if (pendidikanTerakhir !== undefined) updateData.pendidikanTerakhir = pendidikanTerakhir;
      if (jabatan !== undefined) updateData.jabatan = jabatan;
      if (golongan !== undefined) updateData.golongan = golongan;
      if (status) updateData.status = status;
      
      // Only allow role change if not changing admin role
      if (role && existingUser.role !== 'ADMIN') {
        updateData.role = role;
      }
      
      if (isActive !== undefined) updateData.isActive = isActive;
    } else {
      // Users can only update limited fields
      if (nama) updateData.nama = nama;
      if (email !== undefined) updateData.email = email && email.trim() !== '' ? email : null;
      if (alamat !== undefined) updateData.alamat = alamat;
      if (mobilePhone !== undefined) updateData.mobilePhone = mobilePhone;
    }

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== existingUser.email) {
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
        alamat: true,
        mobilePhone: true,
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

// 🔥 ENHANCED PERMANENT DELETE USER WITH BETTER DATA HANDLING
const permanentDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and get related data counts
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        role: true, 
        nama: true,
        username: true
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

    // Check for related data
    const dataCounts = await Promise.all([
      prisma.evaluation.count({ where: { evaluatorId: id } }),
      prisma.evaluation.count({ where: { targetUserId: id } }),
      prisma.attendance.count({ where: { userId: id } }),
      prisma.ckpScore.count({ where: { userId: id } }),
      prisma.finalEvaluation.count({ where: { userId: id } })
    ]);

    const [evaluationsGiven, evaluationsReceived, attendanceRecords, ckpScores, finalEvaluations] = dataCounts;
    const totalRelatedData = evaluationsGiven + evaluationsReceived + attendanceRecords + ckpScores + finalEvaluations;

    console.log(`🗑️ Attempting to delete user ${existingUser.nama} with ${totalRelatedData} related records`);

    // Permanent delete using transaction - Handle related data properly
    await prisma.$transaction(async (tx) => {
      // Delete in correct order to handle foreign key constraints
      
      // 1. Delete final evaluations first (depends on other tables)
      if (finalEvaluations > 0) {
        await tx.finalEvaluation.deleteMany({
          where: { userId: id }
        });
        console.log(`Deleted ${finalEvaluations} final evaluation records`);
      }
      
      // 2. Delete evaluations (both given and received)
      if (evaluationsGiven > 0) {
        await tx.evaluation.deleteMany({
          where: { evaluatorId: id }
        });
        console.log(`Deleted ${evaluationsGiven} evaluations given by user`);
      }
      
      if (evaluationsReceived > 0) {
        await tx.evaluation.deleteMany({
          where: { targetUserId: id }
        });
        console.log(`Deleted ${evaluationsReceived} evaluations received by user`);
      }
      
      // 3. Delete attendance records
      if (attendanceRecords > 0) {
        await tx.attendance.deleteMany({
          where: { userId: id }
        });
        console.log(`Deleted ${attendanceRecords} attendance records`);
      }
      
      // 4. Delete CKP scores
      if (ckpScores > 0) {
        await tx.ckpScore.deleteMany({
          where: { userId: id }
        });
        console.log(`Deleted ${ckpScores} CKP score records`);
      }
      
      // 5. Finally delete the user
      await tx.user.delete({
        where: { id }
      });
      console.log(`Deleted user ${existingUser.nama}`);
    });

    res.json({
      success: true,
      message: `User ${existingUser.nama} berhasil dihapus permanen beserta ${totalRelatedData} data terkait`,
      data: {
        deletedUser: {
          nama: existingUser.nama,
          username: existingUser.username
        },
        deletedDataCounts: {
          evaluationsGiven,
          evaluationsReceived,
          attendanceRecords,
          ckpScores,
          finalEvaluations,
          total: totalRelatedData
        }
      }
    });

  } catch (error) {
    console.error('Permanent delete user error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus user karena masih memiliki data terkait yang tidak dapat dihapus'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat menghapus user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// EXPORT MODULE
module.exports = {
  getAllUsers,
  getUserById,
  checkUserData,      // 🔥 NEW: Export the check user data function
  createUser,
  updateUser,
  deleteUser,
  permanentDeleteUser,
  activateUser,
  resetUserPassword,
  getUserStats
};