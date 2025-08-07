// controllers/attendanceController.js - SEQUELIZE VERSION WITH NEW ATTENDANCE CALCULATION
const { User, Period, Attendance, CkpScore } = require('../../models');
const { Op } = require('sequelize');

// =====================
// 🔥 NEW ATTENDANCE CALCULATION RULES
// =====================

const calculateAttendanceScore = (jumlahTK, jumlahPSW, jumlahTLT, jumlahAPEL, jumlahCT) => {
  let totalPengurangan = 0;
  
  // 🔥 NEW: Cuti (CT) - Progressive calculation
  if (jumlahCT > 0) {
    if (jumlahCT < 3) {
      totalPengurangan += 2.5; // Less than 3 = 2.5%
    } else {
      totalPengurangan += 5.0; // 3 or more = 5% (maximum)
    }
  }
  
  // 🔥 NEW: Tidak Kerja (TK) - Progressive calculation
  if (jumlahTK > 0) {
    if (jumlahTK === 1) {
      totalPengurangan += 20.0; // Exactly 1 = 20%
    } else {
      totalPengurangan += 30.0; // More than 1 = 30% (maximum)
    }
  }
  
  // 🔥 NEW: Pulang Sebelum Waktunya (PSW) - Progressive calculation
  if (jumlahPSW > 0) {
    if (jumlahPSW === 1) {
      totalPengurangan += 5.0; // Exactly 1 = 5%
    } else {
      totalPengurangan += 10.0; // More than 1 = 10% (maximum)
    }
  }
  
  // 🔥 NEW: Telat (TLT) - Progressive calculation
  if (jumlahTLT > 0) {
    if (jumlahTLT === 1) {
      totalPengurangan += 5.0; // Exactly 1 = 5%
    } else {
      totalPengurangan += 10.0; // More than 1 = 10% (maximum)
    }
  }
  
  // 🔥 NEW: Absen APEL - Fixed 10% regardless of quantity
  if (jumlahAPEL > 0) {
    totalPengurangan += 10.0; // Any amount = 10%
  }
  
  // Calculate final score
  const nilaiPresensi = Math.max(0, 100 - totalPengurangan);
  
  return {
    totalPengurangan,
    nilaiPresensi,
    breakdown: {
      penguranganCT: jumlahCT > 0 ? (jumlahCT < 3 ? 2.5 : 5.0) : 0,
      penguranganTK: jumlahTK > 0 ? (jumlahTK === 1 ? 20.0 : 30.0) : 0,
      penguranganPSW: jumlahPSW > 0 ? (jumlahPSW === 1 ? 5.0 : 10.0) : 0,
      penguranganTLT: jumlahTLT > 0 ? (jumlahTLT === 1 ? 5.0 : 10.0) : 0,
      penguranganAPEL: jumlahAPEL > 0 ? 10.0 : 0
    }
  };
};

// =====================
// ATTENDANCE MANAGEMENT
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

    console.log('🔍 Getting attendance records:', { periodId, userId, page, limit });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (periodId) where.periodId = periodId;
    if (userId) where.userId = userId;

    const { rows: attendances, count: totalCount } = await Attendance.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          as: 'period',
          attributes: ['id', 'namaPeriode', 'tahun', 'bulan']
        }
      ],
      order: [
        [{ model: Period, as: 'period' }, 'tahun', 'DESC'],
        [{ model: Period, as: 'period' }, 'bulan', 'DESC'],
        [{ model: User, as: 'user' }, 'nama', 'ASC']
      ],
      offset,
      limit: limitNum
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    console.log('✅ Attendance records retrieved:', attendances.length);

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
    console.error('❌ Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// 🔥 UPDATED: CREATE OR UPDATE ATTENDANCE WITH NEW CALCULATION
const upsertAttendance = async (req, res) => {
  try {
    const {
      userId,
      periodId,
      // NEW number fields (priority)
      jumlahTidakKerja,
      jumlahPulangAwal,
      jumlahTelat,
      jumlahAbsenApel,
      jumlahCuti,
      keterangan
    } = req.body;

    console.log('📥 Received attendance data:', {
      userId,
      periodId,
      jumlahTidakKerja,
      jumlahPulangAwal,
      jumlahTelat,
      jumlahAbsenApel,
      jumlahCuti
    });

    // Validation
    if (!userId || !periodId) {
      return res.status(400).json({
        success: false,
        message: 'User ID dan Period ID wajib diisi'
      });
    }

    // Check if user and period exist
    const [user, period] = await Promise.all([
      User.findByPk(userId),
      Period.findByPk(periodId)
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

    // Parse and validate input values
    const finalJumlahTK = Math.max(0, parseInt(jumlahTidakKerja) || 0);
    const finalJumlahPSW = Math.max(0, parseInt(jumlahPulangAwal) || 0);
    const finalJumlahTLT = Math.max(0, parseInt(jumlahTelat) || 0);
    const finalJumlahAPEL = Math.max(0, parseInt(jumlahAbsenApel) || 0);
    const finalJumlahCT = Math.max(0, parseInt(jumlahCuti) || 0);

    console.log('🧮 Processed values:', {
      finalJumlahTK,
      finalJumlahPSW,
      finalJumlahTLT,
      finalJumlahAPEL,
      finalJumlahCT
    });

    // 🔥 NEW: Calculate attendance score with new rules
    const calculationResult = calculateAttendanceScore(
      finalJumlahTK,
      finalJumlahPSW,
      finalJumlahTLT,
      finalJumlahAPEL,
      finalJumlahCT
    );

    console.log('📊 Calculation result:', calculationResult);

    // Determine boolean flags
    const finalAdaTK = finalJumlahTK > 0;
    const finalAdaPSW = finalJumlahPSW > 0;
    const finalAdaTLT = finalJumlahTLT > 0;
    const finalAdaAPEL = finalJumlahAPEL > 0;
    const finalAdaCT = finalJumlahCT > 0;

    // 🔥 NEW: Save attendance data with new calculation
    const attendanceData = {
      userId,
      periodId,
      persentaseTotal: 100.0,
      // Boolean fields (for existing logic compatibility)
      adaTidakKerja: finalAdaTK,
      adaPulangAwal: finalAdaPSW,
      adaTelat: finalAdaTLT,
      adaAbsenApel: finalAdaAPEL,
      adaCuti: finalAdaCT,
      // Number fields (detailed counts)
      jumlahTidakKerja: finalJumlahTK,
      jumlahPulangAwal: finalJumlahPSW,
      jumlahTelat: finalJumlahTLT,
      jumlahAbsenApel: finalJumlahAPEL,
      jumlahCuti: finalJumlahCT,
      // 🔥 NEW: Calculation fields with new breakdown
      penguranganTK: calculationResult.breakdown.penguranganTK,
      penguranganPSW: calculationResult.breakdown.penguranganPSW,
      penguranganTLT: calculationResult.breakdown.penguranganTLT,
      penguranganAPEL: calculationResult.breakdown.penguranganAPEL,
      penguranganCT: calculationResult.breakdown.penguranganCT,
      totalMinus: calculationResult.totalPengurangan,
      nilaiPresensi: calculationResult.nilaiPresensi,
      keterangan,
      inputBy: req.user.id
    };

    console.log('💾 Saving attendance data:', attendanceData);

    // Upsert attendance record
    const [attendance, created] = await Attendance.upsert(attendanceData, {
      returning: true
    });

    // Get full record with associations
    const fullAttendance = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          as: 'period',
          attributes: ['id', 'namaPeriode', 'tahun', 'bulan']
        }
      ]
    });

    console.log('✅ Attendance saved successfully:', attendance.id);

    res.json({
      success: true,
      message: 'Data presensi berhasil disimpan',
      data: { 
        attendance: fullAttendance,
        calculationDetails: {
          inputValues: {
            jumlahTidakKerja: finalJumlahTK,
            jumlahPulangAwal: finalJumlahPSW,
            jumlahTelat: finalJumlahTLT,
            jumlahAbsenApel: finalJumlahAPEL,
            jumlahCuti: finalJumlahCT
          },
          breakdown: calculationResult.breakdown,
          totalPengurangan: calculationResult.totalPengurangan,
          nilaiAkhir: calculationResult.nilaiPresensi,
          rulesApplied: {
            cuti: finalJumlahCT > 0 ? (finalJumlahCT < 3 ? '< 3 hari: -2.5%' : '≥ 3 hari: -5%') : 'Tidak ada',
            tidakKerja: finalJumlahTK > 0 ? (finalJumlahTK === 1 ? '1 kali: -20%' : '> 1 kali: -30%') : 'Tidak ada',
            pulangAwal: finalJumlahPSW > 0 ? (finalJumlahPSW === 1 ? '1 kali: -5%' : '> 1 kali: -10%') : 'Tidak ada',
            telat: finalJumlahTLT > 0 ? (finalJumlahTLT === 1 ? '1 kali: -5%' : '> 1 kali: -10%') : 'Tidak ada',
            absenApel: finalJumlahAPEL > 0 ? 'Berapa pun: -10%' : 'Tidak ada'
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Upsert attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// GET ATTENDANCE BY ID
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Getting attendance by ID:', id);

    const attendance = await Attendance.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          as: 'period',
          attributes: ['id', 'namaPeriode', 'tahun', 'bulan']
        }
      ]
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Data presensi tidak ditemukan'
      });
    }

    console.log('✅ Attendance retrieved:', attendance.user.nama);

    res.json({
      success: true,
      data: { attendance }
    });

  } catch (error) {
    console.error('❌ Get attendance by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// DELETE ATTENDANCE
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting attendance:', id);

    const attendance = await Attendance.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['nama']
        }
      ]
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Data presensi tidak ditemukan'
      });
    }

    await attendance.destroy();

    console.log('✅ Attendance deleted:', attendance.user.nama);

    res.json({
      success: true,
      message: `Data presensi ${attendance.user.nama} berhasil dihapus`
    });

  } catch (error) {
    console.error('❌ Delete attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// =====================
// CKP MANAGEMENT
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

    console.log('🔍 Getting CKP scores:', { periodId, userId, page, limit });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (periodId) where.periodId = periodId;
    if (userId) where.userId = userId;

    const { rows: ckpScores, count: totalCount } = await CkpScore.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          as: 'period',
          attributes: ['id', 'namaPeriode', 'tahun', 'bulan']
        }
      ],
      order: [
        [{ model: Period, as: 'period' }, 'tahun', 'DESC'],
        [{ model: Period, as: 'period' }, 'bulan', 'DESC'],
        ['score', 'DESC']
      ],
      offset,
      limit: limitNum
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    console.log('✅ CKP scores retrieved:', ckpScores.length);

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
    console.error('❌ Get all CKP scores error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
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

    console.log('📥 Received CKP data:', { userId, periodId, score });

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
      User.findByPk(userId),
      Period.findByPk(periodId)
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
    const [ckpScore, created] = await CkpScore.upsert(ckpData, {
      returning: true
    });

    // Get full record with associations
    const fullCkpScore = await CkpScore.findByPk(ckpScore.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          as: 'period',
          attributes: ['id', 'namaPeriode', 'tahun', 'bulan']
        }
      ]
    });

    console.log('✅ CKP score saved:', ckpScore.user?.nama || 'Unknown');

    res.json({
      success: true,
      message: 'Data CKP berhasil disimpan',
      data: { ckpScore: fullCkpScore }
    });

  } catch (error) {
    console.error('❌ Upsert CKP score error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// GET CKP SCORE BY ID
const getCkpScoreById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Getting CKP score by ID:', id);

    const ckpScore = await CkpScore.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          as: 'period',
          attributes: ['id', 'namaPeriode', 'tahun', 'bulan']
        }
      ]
    });

    if (!ckpScore) {
      return res.status(404).json({
        success: false,
        message: 'Data CKP tidak ditemukan'
      });
    }

    console.log('✅ CKP score retrieved:', ckpScore.user.nama);

    res.json({
      success: true,
      data: { ckpScore }
    });

  } catch (error) {
    console.error('❌ Get CKP score by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// DELETE CKP SCORE
const deleteCkpScore = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting CKP score:', id);

    const ckpScore = await CkpScore.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['nama']
        }
      ]
    });

    if (!ckpScore) {
      return res.status(404).json({
        success: false,
        message: 'Data CKP tidak ditemukan'
      });
    }

    await ckpScore.destroy();

    console.log('✅ CKP score deleted:', ckpScore.user.nama);

    res.json({
      success: true,
      message: `Data CKP ${ckpScore.user.nama} berhasil dihapus`
    });

  } catch (error) {
    console.error('❌ Delete CKP score error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// =====================
// COMBINED STATISTICS
// =====================

// GET ATTENDANCE & CKP STATISTICS
const getAttendanceCkpStats = async (req, res) => {
  try {
    const { periodId } = req.query;

    console.log('📊 Getting attendance & CKP stats:', { periodId });

    const where = periodId ? { periodId } : {};

    const [attendanceStats, ckpStats, combinedData] = await Promise.all([
      // Attendance statistics
      Attendance.findAll({
        where,
        attributes: [
          [sequelize.fn('AVG', sequelize.col('nilaiPresensi')), 'avgNilaiPresensi'],
          [sequelize.fn('MIN', sequelize.col('nilaiPresensi')), 'minNilaiPresensi'],
          [sequelize.fn('MAX', sequelize.col('nilaiPresensi')), 'maxNilaiPresensi'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        raw: true
      }),
      // CKP statistics  
      CkpScore.findAll({
        where,
        attributes: [
          [sequelize.fn('AVG', sequelize.col('score')), 'avgScore'],
          [sequelize.fn('MIN', sequelize.col('score')), 'minScore'],
          [sequelize.fn('MAX', sequelize.col('score')), 'maxScore'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        raw: true
      }),
      // Combined data by user
      User.findAll({
        where: { isActive: true },
        attributes: ['id', 'nama', 'jabatan'],
        include: [
          {
            model: Attendance,
            as: 'attendances',
            where,
            required: false,
            attributes: ['nilaiPresensi', 'totalMinus']
          },
          {
            model: CkpScore,
            as: 'ckpScores',
            where,
            required: false,
            attributes: ['score']
          }
        ]
      })
    ]);

    console.log('✅ Stats retrieved successfully');

    const attendanceStatsData = attendanceStats[0] || {};
    const ckpStatsData = ckpStats[0] || {};

    res.json({
      success: true,
      data: {
        attendanceStats: {
          average: parseFloat(attendanceStatsData.avgNilaiPresensi) || 0,
          minimum: parseFloat(attendanceStatsData.minNilaiPresensi) || 0,
          maximum: parseFloat(attendanceStatsData.maxNilaiPresensi) || 0,
          count: parseInt(attendanceStatsData.count) || 0
        },
        ckpStats: {
          average: parseFloat(ckpStatsData.avgScore) || 0,
          minimum: parseFloat(ckpStatsData.minScore) || 0,
          maximum: parseFloat(ckpStatsData.maxScore) || 0,
          count: parseInt(ckpStatsData.count) || 0
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
    console.error('❌ Get attendance CKP stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// 🔥 Export function untuk menghitung skor presensi dari luar
const calculateAttendanceScoreHelper = calculateAttendanceScore;

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
  getAttendanceCkpStats,
  // Helper
  calculateAttendanceScoreHelper
};