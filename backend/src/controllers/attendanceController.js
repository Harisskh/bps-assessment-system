const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// =====================
// ATTENDANCE MANAGEMENT (40% bobot)
// =====================

// GET ALL ATTENDANCE RECORDS
const getAllAttendance = async (req, res) => {
  try {
    const { 
      periodId, 
      userId,
      page = 1, 
      limit = 20 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (periodId) where.periodId = periodId;
    if (userId) where.userId = userId;

    const [attendances, totalCount] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              nip: true,
              jabatan: true
            }
          },
          period: {
            select: {
              id: true,
              namaPeriode: true,
              tahun: true,
              bulan: true
            }
          }
        },
        orderBy: [
          { period: { tahun: 'desc' } },
          { period: { bulan: 'desc' } },
          { user: { nama: 'asc' } }
        ],
        skip,
        take: limitNum
      }),
      prisma.attendance.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        attendances,
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
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// CREATE OR UPDATE ATTENDANCE - FIXED TO SUPPORT JUMLAH FIELDS
const upsertAttendance = async (req, res) => {
  try {
    const {
      userId,
      periodId,
      // OLD boolean fields (keep for backward compatibility)
      adaTidakKerja = false,
      adaPulangAwal = false,
      adaTelat = false,
      adaAbsenApel = false,
      adaCuti = false,
      // NEW number fields (priority if provided)
      jumlahTidakKerja,
      jumlahPulangAwal,
      jumlahTelat,
      jumlahAbsenApel,
      jumlahCuti,
      keterangan
    } = req.body;

    console.log('📥 Received data:', req.body);

    // Validation
    if (!userId || !periodId) {
      return res.status(400).json({
        success: false,
        message: 'User ID dan Period ID wajib diisi'
      });
    }

    // Check if user and period exist
    const [user, period] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.period.findUnique({ where: { id: periodId } })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Period tidak ditemukan'
      });
    }

    // FIXED: Determine values - prioritize jumlah fields if provided
    let finalJumlahTK, finalJumlahPSW, finalJumlahTLT, finalJumlahAPEL, finalJumlahCT;
    let finalAdaTK, finalAdaPSW, finalAdaTLT, finalAdaAPEL, finalAdaCT;

    // Handle jumlahTidakKerja
    if (typeof jumlahTidakKerja === 'number' || jumlahTidakKerja !== undefined) {
      finalJumlahTK = parseInt(jumlahTidakKerja) || 0;
      finalAdaTK = finalJumlahTK > 0;
    } else {
      finalAdaTK = Boolean(adaTidakKerja);
      finalJumlahTK = finalAdaTK ? 1 : 0;
    }

    // Handle jumlahPulangAwal
    if (typeof jumlahPulangAwal === 'number' || jumlahPulangAwal !== undefined) {
      finalJumlahPSW = parseInt(jumlahPulangAwal) || 0;
      finalAdaPSW = finalJumlahPSW > 0;
    } else {
      finalAdaPSW = Boolean(adaPulangAwal);
      finalJumlahPSW = finalAdaPSW ? 1 : 0;
    }

    // Handle jumlahTelat
    if (typeof jumlahTelat === 'number' || jumlahTelat !== undefined) {
      finalJumlahTLT = parseInt(jumlahTelat) || 0;
      finalAdaTLT = finalJumlahTLT > 0;
    } else {
      finalAdaTLT = Boolean(adaTelat);
      finalJumlahTLT = finalAdaTLT ? 1 : 0;
    }

    // Handle jumlahAbsenApel
    if (typeof jumlahAbsenApel === 'number' || jumlahAbsenApel !== undefined) {
      finalJumlahAPEL = parseInt(jumlahAbsenApel) || 0;
      finalAdaAPEL = finalJumlahAPEL > 0;
    } else {
      finalAdaAPEL = Boolean(adaAbsenApel);
      finalJumlahAPEL = finalAdaAPEL ? 1 : 0;
    }

    // Handle jumlahCuti
    if (typeof jumlahCuti === 'number' || jumlahCuti !== undefined) {
      finalJumlahCT = parseInt(jumlahCuti) || 0;
      finalAdaCT = finalJumlahCT > 0;
    } else {
      finalAdaCT = Boolean(adaCuti);
      finalJumlahCT = finalAdaCT ? 1 : 0;
    }

    console.log('🧮 Final values:', {
      finalJumlahTK, finalJumlahPSW, finalJumlahTLT, finalJumlahAPEL, finalJumlahCT,
      finalAdaTK, finalAdaPSW, finalAdaTLT, finalAdaAPEL, finalAdaCT
    });

    // Calculate pengurangan based on violations
    const persentaseTotal = 100.0;
    const penguranganTK = finalAdaTK ? 30.0 : 0.0;
    const penguranganPSW = finalAdaPSW ? 10.0 : 0.0;
    const penguranganTLT = finalAdaTLT ? 10.0 : 0.0;
    const penguranganAPEL = finalAdaAPEL ? 10.0 : 0.0;
    const penguranganCT = finalAdaCT ? 5.0 : 0.0;

    const totalMinus = penguranganTK + penguranganPSW + penguranganTLT + penguranganAPEL + penguranganCT;
    const nilaiPresensi = Math.max(0, persentaseTotal - totalMinus); // Tidak boleh negatif

    // FIXED: Save BOTH boolean AND number values to database
    const attendanceData = {
      userId,
      periodId,
      persentaseTotal,
      // Boolean fields (for existing logic)
      adaTidakKerja: finalAdaTK,
      adaPulangAwal: finalAdaPSW,
      adaTelat: finalAdaTLT,
      adaAbsenApel: finalAdaAPEL,
      adaCuti: finalAdaCT,
      // FIXED: Number fields (new fields for detail)
      jumlahTidakKerja: finalJumlahTK,
      jumlahPulangAwal: finalJumlahPSW,
      jumlahTelat: finalJumlahTLT,
      jumlahAbsenApel: finalJumlahAPEL,
      jumlahCuti: finalJumlahCT,
      // Calculation fields
      penguranganTK,
      penguranganPSW,
      penguranganTLT,
      penguranganAPEL,
      penguranganCT,
      totalMinus,
      nilaiPresensi,
      keterangan,
      inputBy: req.user.id
    };

    console.log('💾 Saving to database:', attendanceData);

    // Upsert attendance record
    const attendance = await prisma.attendance.upsert({
      where: {
        userId_periodId: {
          userId,
          periodId
        }
      },
      update: attendanceData,
      create: attendanceData,
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nip: true,
            jabatan: true
          }
        },
        period: {
          select: {
            id: true,
            namaPeriode: true,
            tahun: true,
            bulan: true
          }
        }
      }
    });

    console.log('✅ Saved successfully:', attendance.id);

    res.json({
      success: true,
      message: 'Data presensi berhasil disimpan',
      data: { attendance }
    });

  } catch (error) {
    console.error('❌ Upsert attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET ATTENDANCE BY ID
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nip: true,
            jabatan: true
          }
        },
        period: {
          select: {
            id: true,
            namaPeriode: true,
            tahun: true,
            bulan: true
          }
        }
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Data presensi tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: { attendance }
    });

  } catch (error) {
    console.error('Get attendance by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// DELETE ATTENDANCE
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        user: { select: { nama: true } }
      }
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Data presensi tidak ditemukan'
      });
    }

    await prisma.attendance.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: `Data presensi ${attendance.user.nama} berhasil dihapus`
    });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// =====================
// CKP MANAGEMENT (30% bobot) - UNCHANGED
// =====================

// GET ALL CKP SCORES
const getAllCkpScores = async (req, res) => {
  try {
    const { 
      periodId, 
      userId,
      page = 1, 
      limit = 20 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (periodId) where.periodId = periodId;
    if (userId) where.userId = userId;

    const [ckpScores, totalCount] = await Promise.all([
      prisma.ckpScore.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              nip: true,
              jabatan: true
            }
          },
          period: {
            select: {
              id: true,
              namaPeriode: true,
              tahun: true,
              bulan: true
            }
          }
        },
        orderBy: [
          { period: { tahun: 'desc' } },
          { period: { bulan: 'desc' } },
          { score: 'desc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.ckpScore.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        ckpScores,
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
    console.error('Get all CKP scores error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// CREATE OR UPDATE CKP SCORE
const upsertCkpScore = async (req, res) => {
  try {
    const {
      userId,
      periodId,
      score,
      keterangan
    } = req.body;

    // Validation
    if (!userId || !periodId || typeof score !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'User ID, Period ID, dan score wajib diisi'
      });
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: 'Score CKP harus antara 0-100'
      });
    }

    // Check if user and period exist
    const [user, period] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.period.findUnique({ where: { id: periodId } })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Period tidak ditemukan'
      });
    }

    const ckpData = {
      userId,
      periodId,
      score,
      keterangan,
      inputBy: req.user.id
    };

    // Upsert CKP score
    const ckpScore = await prisma.ckpScore.upsert({
      where: {
        userId_periodId: {
          userId,
          periodId
        }
      },
      update: ckpData,
      create: ckpData,
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nip: true,
            jabatan: true
          }
        },
        period: {
          select: {
            id: true,
            namaPeriode: true,
            tahun: true,
            bulan: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Data CKP berhasil disimpan',
      data: { ckpScore }
    });

  } catch (error) {
    console.error('Upsert CKP score error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET CKP SCORE BY ID
const getCkpScoreById = async (req, res) => {
  try {
    const { id } = req.params;

    const ckpScore = await prisma.ckpScore.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nip: true,
            jabatan: true
          }
        },
        period: {
          select: {
            id: true,
            namaPeriode: true,
            tahun: true,
            bulan: true
          }
        }
      }
    });

    if (!ckpScore) {
      return res.status(404).json({
        success: false,
        message: 'Data CKP tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: { ckpScore }
    });

  } catch (error) {
    console.error('Get CKP score by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// DELETE CKP SCORE
const deleteCkpScore = async (req, res) => {
  try {
    const { id } = req.params;

    const ckpScore = await prisma.ckpScore.findUnique({
      where: { id },
      include: {
        user: { select: { nama: true } }
      }
    });

    if (!ckpScore) {
      return res.status(404).json({
        success: false,
        message: 'Data CKP tidak ditemukan'
      });
    }

    await prisma.ckpScore.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: `Data CKP ${ckpScore.user.nama} berhasil dihapus`
    });

  } catch (error) {
    console.error('Delete CKP score error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// =====================
// COMBINED STATISTICS - UNCHANGED
// =====================

// GET ATTENDANCE & CKP STATISTICS
const getAttendanceCkpStats = async (req, res) => {
  try {
    const { periodId } = req.query;

    const where = periodId ? { periodId } : {};

    const [attendanceStats, ckpStats, combinedData] = await Promise.all([
      // Attendance statistics
      prisma.attendance.aggregate({
        where,
        _avg: { nilaiPresensi: true },
        _min: { nilaiPresensi: true },
        _max: { nilaiPresensi: true },
        _count: { id: true }
      }),
      // CKP statistics  
      prisma.ckpScore.aggregate({
        where,
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
        _count: { id: true }
      }),
      // Combined data by user
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          nama: true,
          jabatan: true,
          attendances: {
            where,
            select: {
              nilaiPresensi: true,
              totalMinus: true
            }
          },
          ckpScores: {
            where,
            select: {
              score: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        attendanceStats: {
          average: attendanceStats._avg.nilaiPresensi || 0,
          minimum: attendanceStats._min.nilaiPresensi || 0,
          maximum: attendanceStats._max.nilaiPresensi || 0,
          count: attendanceStats._count.id || 0
        },
        ckpStats: {
          average: ckpStats._avg.score || 0,
          minimum: ckpStats._min.score || 0,
          maximum: ckpStats._max.score || 0,
          count: ckpStats._count.id || 0
        },
        usersSummary: combinedData.map(user => ({
          user: {
            id: user.id,
            nama: user.nama,
            jabatan: user.jabatan
          },
          attendance: user.attendances[0] || null,
          ckp: user.ckpScores[0] || null
        }))
      }
    });

  } catch (error) {
    console.error('Get attendance CKP stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  // Attendance
  getAllAttendance,
  upsertAttendance,
  getAttendanceById,
  deleteAttendance,
  // CKP
  getAllCkpScores,
  upsertCkpScore,
  getCkpScoreById,
  deleteCkpScore,
  // Statistics
  getAttendanceCkpStats
};