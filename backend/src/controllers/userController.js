// controllers/userController.js - SEQUELIZE VERSION
const bcrypt = require('bcryptjs');
const { User, Evaluation, Attendance, CkpScore, FinalEvaluation, Certificate } = require('../../models');
const { Op } = require('sequelize');

// GET ALL USERS (with pagination and search)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let where = {};

    if (search) {
      where[Op.or] = [
        { nama: { [Op.iLike]: `%${search}%` } },
        { nip: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const { rows: users, count: totalUsers } = await User.findAndCountAll({
      where,
      offset,
      limit: limitNum,
      order: [['nama', 'ASC']],
      attributes: { exclude: ['password'] }
    });

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

// CREATE USER - FIXED AND COMPLETE
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

    // Validasi input wajib - Email TIDAK wajib
    if (!nip || !nama || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'NIP, nama, username, dan password wajib diisi'
      });
    }

    // Validasi email format HANYA jika email diisi
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

    // Cek duplikasi
    const duplicateChecks = await Promise.all([
      User.findOne({ where: { nip: nip.toString() } }),
      User.findOne({ where: { username: username.trim() } }),
      (email && email.trim() !== '') 
        ? User.findOne({ where: { email: email.toLowerCase().trim() } })
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

    const newUser = await User.create(userData);

    // Remove password from response
    const { password: _, ...userResponse } = newUser.toJSON();

    console.log('✅ User created successfully:', {
      id: userResponse.id,
      nama: userResponse.nama,
      username: userResponse.username,
      email: userResponse.email || 'No email'
    });

    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('❌ Error in createUser:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'data';
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

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
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

// CHECK USER DATA - For delete confirmation
const checkUserData = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: ['id', 'nama', 'username', 'role']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Check for related data
    const dataCounts = await Promise.all([
      Evaluation.count({ where: { evaluatorId: id } }),
      Evaluation.count({ where: { targetUserId: id } }),
      Attendance.count({ where: { userId: id } }),
      CkpScore.count({ where: { userId: id } }),
      FinalEvaluation.count({ where: { userId: id } }),
      Certificate.count({ where: { user_id: id } })
    ]);

    const [
      evaluationsGiven,
      evaluationsReceived,
      attendanceRecords,
      ckpScores,
      finalEvaluations,
      certificates
    ] = dataCounts;

    const hasData = evaluationsGiven > 0 || evaluationsReceived > 0 || 
                   attendanceRecords > 0 || ckpScores > 0 || finalEvaluations > 0 || certificates > 0;

    res.json({
      success: true,
      data: {
        user,
        hasData,
        dataCounts: {
          evaluationsGiven,
          evaluationsReceived,
          attendanceRecords,
          ckpScores,
          finalEvaluations,
          certificates,
          total: evaluationsGiven + evaluationsReceived + attendanceRecords + ckpScores + finalEvaluations + certificates
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

    const existingUser = await User.findByPk(id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'ADMIN';
    const isSelfUpdate = req.user.id === id;

    if (!isAdmin && !isSelfUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengubah user ini'
      });
    }

    // Prevent role change for admin users
    if (existingUser.role === 'ADMIN' && role && role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Role Admin tidak dapat diubah'
      });
    }

    const updateData = {};
    
    if (isAdmin) {
      if (nip && nip !== existingUser.nip) {
        const nipExists = await User.findOne({
          where: { nip, id: { [Op.ne]: id } }
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
        const usernameExists = await User.findOne({
          where: { username, id: { [Op.ne]: id } }
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
      const emailExists = await User.findOne({
        where: {
          email: updateData.email,
          id: { [Op.ne]: id }
        }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email sudah digunakan oleh user lain'
        });
      }
    }

    await existingUser.update(updateData);

    const { password: _, ...userResponse } = existingUser.toJSON();

    res.json({
      success: true,
      message: 'User berhasil diperbarui',
      data: { user: userResponse }
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

    const existingUser = await User.findByPk(id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    if (existingUser.role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Admin user tidak dapat dihapus'
      });
    }

    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun sendiri'
      });
    }

    await existingUser.update({ isActive: false });

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

// PERMANENT DELETE USER
const permanentDeleteUser = async (req, res) => {
  try {
    const { sequelize } = require('../../models');
    const { id } = req.params;

    const existingUser = await User.findByPk(id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    if (existingUser.role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Admin user tidak dapat dihapus permanen'
      });
    }

    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun sendiri'
      });
    }

    // Check for related data
    const dataCounts = await Promise.all([
      Evaluation.count({ where: { evaluatorId: id } }),
      Evaluation.count({ where: { targetUserId: id } }),
      Attendance.count({ where: { userId: id } }),
      CkpScore.count({ where: { userId: id } }),
      FinalEvaluation.count({ where: { userId: id } }),
      Certificate.count({ where: { user_id: id } })
    ]);

    const [evaluationsGiven, evaluationsReceived, attendanceRecords, ckpScores, finalEvaluations, certificates] = dataCounts;
    const totalRelatedData = evaluationsGiven + evaluationsReceived + attendanceRecords + ckpScores + finalEvaluations + certificates;

    console.log(`🗑️ Attempting to delete user ${existingUser.nama} with ${totalRelatedData} related records`);

    // Permanent delete using transaction
    const transaction = await sequelize.transaction();

    try {
      // Delete in correct order
      if (finalEvaluations > 0) {
        await FinalEvaluation.destroy({
          where: { userId: id },
          transaction
        });
      }
      
      if (evaluationsGiven > 0) {
        await Evaluation.destroy({
          where: { evaluatorId: id },
          transaction
        });
      }
      
      if (evaluationsReceived > 0) {
        await Evaluation.destroy({
          where: { targetUserId: id },
          transaction
        });
      }
      
      if (attendanceRecords > 0) {
        await Attendance.destroy({
          where: { userId: id },
          transaction
        });
      }
      
      if (ckpScores > 0) {
        await CkpScore.destroy({
          where: { userId: id },
          transaction
        });
      }

      if (certificates > 0) {
        await Certificate.destroy({
          where: { user_id: id },
          transaction
        });
      }
      
      await existingUser.destroy({ transaction });
      
      await transaction.commit();

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
            certificates,
            total: totalRelatedData
          }
        }
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('Permanent delete user error:', error);
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
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

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    await user.update({ isActive: true });

    res.json({
      success: true,
      message: `User ${user.nama} berhasil diaktifkan`,
      data: { user: { id: user.id, nama: user.nama, isActive: user.isActive } }
    });

  } catch (error) {
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

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({ password: hashedPassword });

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
    const { sequelize } = require('../../models');
    
    const [roleStats, statusStats, activeStats, recentCount] = await Promise.all([
      // Total users by role
      User.findAll({
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('role')), 'count']
        ],
        where: { isActive: true },
        group: ['role'],
        raw: true
      }),
      // Total users by status
      User.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('status')), 'count']
        ],
        where: { isActive: true },
        group: ['status'],
        raw: true
      }),
      // Total active/inactive users
      User.findAll({
        attributes: [
          'isActive',
          [sequelize.fn('COUNT', sequelize.col('isActive')), 'count']
        ],
        group: ['isActive'],
        raw: true
      }),
      // Recent registrations (last 30 days)
      User.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        byRole: roleStats,
        byStatus: statusStats,
        byActive: activeStats,
        recentRegistrations: recentCount,
        summary: {
          totalActive: activeStats.find(s => s.isActive)?.count || 0,
          totalInactive: activeStats.find(s => !s.isActive)?.count || 0,
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

module.exports = {
  getAllUsers,
  getUserById,
  checkUserData,
  createUser,
  updateUser,
  deleteUser,
  permanentDeleteUser,
  activateUser,
  resetUserPassword,
  getUserStats
};