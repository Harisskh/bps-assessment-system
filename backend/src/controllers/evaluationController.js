// controllers/evaluationController.js - SEQUELIZE VERSION
const { User, Period, EvaluationParameter, Evaluation, EvaluationScore } = require('../../models');
const { Op } = require('sequelize');

// EXCLUDED JOB POSITIONS FROM BEING EVALUATED
const EXCLUDED_POSITIONS = [
  'Statistisi Ahli Madya BPS Kabupaten/Kota',
  'Statistisi Ahli Madya',
  'Statistisi Ahli Madya Badan Pusat Statistik Kabupaten/Kota',
  'Kepala BPS',
  'Kepala Badan Pusat Statistik Kabupaten/Kota',
  'Kepala BPS Kabupaten/Kota',
  'Kasubbag Umum',
  'Kasubbag Umum Badan Pusat Statistik Kabupaten/Kota',
  'Kasubbag Umum BPS Kabupaten/Kota',
  'Kepala Subbagian Umum Badan Pusat Statistik Kabupaten/Kota',
  'Kepala Subbagian Umum BPS Kabupaten/Kota',
  'Kepala Subbagian Umum',
  'kepala',
  'madya',
  'Madya',
  'Kepala',
  'KEPALA',
  'MADYA'
];

// Helper function to check if a position is excluded from being evaluated
const isExcludedFromEvaluation = (jabatan) => {
  if (!jabatan) return false;
  
  return EXCLUDED_POSITIONS.some(excludedPos => {
    if (jabatan.toLowerCase().includes(excludedPos.toLowerCase())) {
      return true;
    }
    
    if (excludedPos.includes('Kepala') && jabatan.toLowerCase().includes('kepala bps')) {
      return true;
    }
    
    if (excludedPos.includes('Kasubbag') && jabatan.toLowerCase().includes('kasubbag')) {
      return true;
    }
    
    if (excludedPos.includes('Kepala Subbagian') && jabatan.toLowerCase().includes('kepala subbagian')) {
      return true;
    }

    if (excludedPos.includes('Madya') && jabatan.toLowerCase().includes('madya')) {
      return true;
    }
    
    return false;
  });
};

// GET EVALUATION PARAMETERS (8 parameter BerAKHLAK)
const getEvaluationParameters = async (req, res) => {
  try {
    console.log('🔄 Getting evaluation parameters...');
    
    const parameters = await EvaluationParameter.findAll({
      where: { isActive: true },
      order: [['urutan', 'ASC']]
    });

    console.log(`✅ Found ${parameters.length} evaluation parameters`);

    res.json({
      success: true,
      data: { parameters }
    });

  } catch (error) {
    console.error('❌ Get evaluation parameters error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET SCORE RANGES - Single range 80-100
const getScoreRanges = async (req, res) => {
  try {
    console.log('🔄 Getting score ranges...');
    
    // Return single range for BerAKHLAK
    const ranges = [{
      id: 'berakhlak',
      kategori: 'berakhlak',
      ranking: 1,
      nilaiMin: 80,
      nilaiMax: 100,
      deskripsi: 'Tokoh BerAKHLAK'
    }];

    console.log('✅ Score ranges retrieved');

    res.json({
      success: true,
      data: { ranges }
    });

  } catch (error) {
    console.error('❌ Get score ranges error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET ACTIVE PERIOD
const getActivePeriod = async (req, res) => {
  try {
    console.log('🔄 Getting active period...');
    
    const activePeriod = await Period.findOne({
      where: { isActive: true }
    });

    if (!activePeriod) {
      console.log('❌ No active period found');
      return res.status(404).json({
        success: false,
        message: 'Tidak ada periode aktif. Hubungi administrator.'
      });
    }

    console.log(`✅ Active period found: ${activePeriod.namaPeriode}`);

    res.json({
      success: true,
      data: { period: activePeriod }
    });

  } catch (error) {
    console.error('❌ Get active period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET ELIGIBLE USERS FOR EVALUATION
const getEligibleUsers = async (req, res) => {
  try {
    console.log('🔄 Getting eligible users...');
    const currentUserId = req.user.id;

    const users = await User.findAll({
      where: {
        isActive: true,
        role: { [Op.ne]: 'ADMIN' }
      },
      attributes: ['id', 'nip', 'nama', 'jabatan', 'role'],
      order: [['nama', 'ASC']]
    });

    // Filter out users with excluded positions, but include current user
    const eligibleUsers = users.filter(user => {
      if (user.id === currentUserId) {
        return true;
      }
      
      return !isExcludedFromEvaluation(user.jabatan);
    });

    console.log(`✅ Found ${eligibleUsers.length} eligible users`);

    res.json({
      success: true,
      data: { 
        users: eligibleUsers,
        excludedPositions: EXCLUDED_POSITIONS,
        canEvaluateSelf: true
      }
    });

  } catch (error) {
    console.error('❌ Get eligible users error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// SUBMIT EVALUATION - Single category logic
const submitEvaluation = async (req, res) => {
  try {
    console.log('📥 Received evaluation submission:', JSON.stringify(req.body, null, 2));
    
    const evaluatorId = req.user.id;
    const { periodId, targetUserId, scores } = req.body;

    // Validation
    if (!periodId) {
      return res.status(400).json({
        success: false,
        message: 'Period ID wajib diisi'
      });
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user wajib dipilih'
      });
    }

    if (!scores || !Array.isArray(scores)) {
      return res.status(400).json({
        success: false,
        message: 'Data skor wajib diisi dan harus berupa array'
      });
    }

    // Check if period is active
    const period = await Period.findByPk(periodId);

    if (!period) {
      return res.status(400).json({
        success: false,
        message: 'Periode penilaian tidak ditemukan.'
      });
    }

    if (!period.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Periode penilaian tidak aktif.'
      });
    }

    // Date validation
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (period.startDate) {
      const startDate = new Date(period.startDate);
      startDate.setHours(0, 0, 0, 0);
      if (now < startDate) {
        return res.status(400).json({
          success: false,
          message: `Penilaian untuk periode ${period.namaPeriode} baru akan dibuka pada tanggal ${startDate.toLocaleDateString('id-ID')}.`
        });
      }
    }

    if (period.endDate) {
      const endDate = new Date(period.endDate);
      endDate.setHours(0, 0, 0, 0);
      if (now > endDate) {
        return res.status(400).json({
          success: false,
          message: `Waktu penilaian untuk periode ${period.namaPeriode} telah berakhir pada tanggal ${endDate.toLocaleDateString('id-ID')}.`
        });
      }
    }

    // Check if evaluator has already submitted for this period and target
    const existingEvaluation = await Evaluation.findOne({
      where: {
        evaluatorId,
        periodId,
        targetUserId
      }
    });

    if (existingEvaluation) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah menilai pegawai ini untuk periode ini'
      });
    }

    // Get evaluation parameters
    const parameters = await EvaluationParameter.findAll({
      where: { isActive: true },
      order: [['urutan', 'ASC']]
    });

    if (parameters.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'Parameter evaluasi tidak lengkap (harus 8 parameter)'
      });
    }

    // Validate scores for single category (80-100)
    if (scores.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'Harus menilai 8 parameter BerAKHLAK'
      });
    }

    // Validate score ranges and parameter IDs
    const parameterIds = parameters.map(p => p.id);
    for (const score of scores) {
      if (!score.parameterId || typeof score.value !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Format skor tidak valid'
        });
      }

      if (!parameterIds.includes(score.parameterId)) {
        return res.status(400).json({
          success: false,
          message: 'Parameter ID tidak valid'
        });
      }

      if (score.value < 80 || score.value > 100) {
        return res.status(400).json({
          success: false,
          message: 'Skor harus antara 80-100'
        });
      }
    }

    // Check if target user exists and is eligible
    const targetUser = await User.findByPk(targetUserId);

    if (!targetUser || !targetUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User target tidak valid atau tidak aktif'
      });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Admin tidak dapat dinilai'
      });
    }

    if (targetUserId !== evaluatorId && isExcludedFromEvaluation(targetUser.jabatan)) {
      return res.status(400).json({
        success: false,
        message: `Pegawai dengan jabatan "${targetUser.jabatan}" tidak dapat dinilai`
      });
    }

    // Create evaluation with transaction
    const { sequelize } = require('../../models');
    const transaction = await sequelize.transaction();

    try {
      console.log('🔄 Creating evaluation record...');
      
      const createdEvaluation = await Evaluation.create({
        evaluatorId,
        periodId,
        targetUserId,
        status: 'SUBMITTED',
        submitDate: new Date()
      }, { transaction });

      console.log('✅ Evaluation record created:', createdEvaluation.id);

      // Create evaluation scores
      const scoreData = scores.map(score => ({
        evaluationId: createdEvaluation.id,
        parameterId: score.parameterId,
        score: score.value
      }));

      console.log('🔄 Creating evaluation scores:', scoreData.length);

      await EvaluationScore.bulkCreate(scoreData, { transaction });

      console.log('✅ Evaluation scores created');

      await transaction.commit();

      console.log('✅ Evaluation submission completed successfully');

      res.status(201).json({
        success: true,
        message: 'Evaluasi berhasil disimpan',
        data: { evaluation: createdEvaluation }
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Submit evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET USER'S EVALUATIONS
const getMyEvaluations = async (req, res) => {
  try {
    console.log('🔄 Getting my evaluations for user:', req.user.nama);
    const evaluatorId = req.user.id;
    const { periodId, limit = 50 } = req.query;

    const where = { evaluatorId };
    if (periodId) {
      where.periodId = periodId;
    }

    // 🔥 FIXED: Add proper includes with aliases
    const evaluations = await Evaluation.findAll({
      where,
      include: [
        {
          model: User,
          as: 'target', // 🔥 FIXED: Use alias yang benar
          attributes: ['id', 'nama', 'jabatan', 'nip']
        },
        {
          model: User,
          as: 'evaluator', // 🔥 FIXED: Use alias yang benar
          attributes: ['id', 'nama', 'jabatan', 'nip']
        },
        {
          model: Period,
          as: 'period', // 🔥 FIXED: Use alias yang benar
          attributes: ['id', 'namaPeriode', 'tahun', 'bulan', 'isActive']
        },
        {
          model: EvaluationScore,
          as: 'scores', // 🔥 FIXED: Use alias yang benar
          include: [
            {
              model: EvaluationParameter,
              as: 'parameter', // 🔥 FIXED: Use alias yang benar
              attributes: ['id', 'namaParameter', 'urutan']
            }
          ],
          order: [['parameter', 'urutan', 'ASC']]
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        // 🔥 FIXED: Proper nested ordering untuk scores
        [{ model: EvaluationScore, as: 'scores' }, { model: EvaluationParameter, as: 'parameter' }, 'urutan', 'ASC']
      ],
      limit: parseInt(limit)
    });

    console.log(`✅ Found ${evaluations.length} evaluations with complete data`);

    // 🔥 DEBUGGING: Log sample data untuk memastikan struktur benar
    if (evaluations.length > 0) {
      console.log('📋 Sample evaluation structure:');
      console.log('- ID:', evaluations[0].id);
      console.log('- Target:', evaluations[0].target?.nama);
      console.log('- Period:', evaluations[0].period?.namaPeriode);
      console.log('- Scores count:', evaluations[0].scores?.length);
    }

    res.json({
      success: true,
      data: { 
        evaluations,
        total: evaluations.length
      }
    });

  } catch (error) {
    console.error('❌ Get my evaluations error:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// GET ALL EVALUATIONS
const getAllEvaluations = async (req, res) => {
  try {
    console.log('🔄 Getting all evaluations for Admin/Pimpinan...');
    console.log('👤 User role:', req.user.role);
    console.log('📝 Query params:', req.query);

    const { 
      periodId, 
      targetUserId, 
      evaluatorId,
      page = 1, 
      limit = 20 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    if (periodId) where.periodId = periodId;
    if (targetUserId) where.targetUserId = targetUserId;
    if (evaluatorId) where.evaluatorId = evaluatorId;

    console.log('🔍 Where clause:', where);

    // 🔥 FIXED: Proper includes with correct aliases from model associations
    const { rows: evaluations, count: totalCount } = await Evaluation.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'evaluator', // ✅ Sesuai dengan alias di model associations
          attributes: ['id', 'nama', 'jabatan', 'nip'],
          required: true // Ensure evaluator exists
        },
        {
          model: User,
          as: 'target', // ✅ Sesuai dengan alias di model associations
          attributes: ['id', 'nama', 'jabatan', 'nip'],
          required: true // Ensure target exists
        },
        {
          model: Period,
          as: 'period', // ✅ Sesuai dengan alias di model associations
          attributes: ['id', 'namaPeriode', 'tahun', 'bulan', 'isActive'],
          required: true // Ensure period exists
        },
        {
          model: EvaluationScore,
          as: 'scores', // ✅ Sesuai dengan alias di model associations
          include: [
            {
              model: EvaluationParameter,
              as: 'parameter', // ✅ Sesuai dengan alias di model associations
              attributes: ['id', 'namaParameter', 'urutan'],
              required: true
            }
          ],
          required: false // Scores might be empty
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        // 🔥 FIXED: Proper nested ordering syntax
        [{ model: EvaluationScore, as: 'scores' }, { model: EvaluationParameter, as: 'parameter' }, 'urutan', 'ASC']
      ],
      offset,
      limit: limitNum,
      distinct: true // Important for accurate count with includes
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    console.log(`✅ Found ${evaluations.length} evaluations (total: ${totalCount})`);

    // 🔥 DEBUGGING: Log sample structure
    if (evaluations.length > 0) {
      console.log('📋 Sample evaluation structure:');
      console.log('- ID:', evaluations[0].id);
      console.log('- Evaluator:', evaluations[0].evaluator?.nama || 'Missing');
      console.log('- Target:', evaluations[0].target?.nama || 'Missing');
      console.log('- Period:', evaluations[0].period?.namaPeriode || 'Missing');
      console.log('- Scores count:', evaluations[0].scores?.length || 0);
    }

    res.json({
      success: true,
      data: {
        evaluations,
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
    console.error('❌ Get all evaluations error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // More specific error handling
    if (error.name === 'SequelizeEagerLoadingError') {
      console.error('❌ Eager loading error - check model associations');
      return res.status(500).json({
        success: false,
        message: 'Error dalam memuat relasi data. Periksa konfigurasi model.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (error.name === 'SequelizeDatabaseError') {
      console.error('❌ Database error - check table structure');
      return res.status(500).json({
        success: false,
        message: 'Error database. Periksa struktur tabel.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengambil data evaluasi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET EVALUATION SUMMARY
const getEvaluationSummary = async (req, res) => {
  try {
    console.log('🔄 Getting evaluation summary...');
    const { periodId } = req.params;

    const { sequelize } = require('../../models');

    // Get evaluation counts by target user
    const evaluationCounts = await Evaluation.findAll({
      attributes: [
        'targetUserId',
        [sequelize.fn('COUNT', sequelize.col('targetUserId')), 'count']
      ],
      where: { periodId },
      group: ['targetUserId'],
      raw: true
    });

    // Get target user details
    const targetUserIds = evaluationCounts.map(e => e.targetUserId);
    const targetUsers = await User.findAll({
      where: { id: { [Op.in]: targetUserIds } },
      attributes: ['id', 'nama', 'jabatan', 'role']
    });

    const summary = targetUsers.map(user => {
      const userEvaluations = evaluationCounts.find(e => e.targetUserId === user.id);
      const totalCount = userEvaluations?.count || 0;

      return {
        user,
        counts: {
          total: parseInt(totalCount)
        }
      };
    });

    // Sort by total count (descending)
    summary.sort((a, b) => b.counts.total - a.counts.total);

    console.log(`✅ Summary generated for ${summary.length} users`);

    res.json({
      success: true,
      data: { summary }
    });

  } catch (error) {
    console.error('❌ Get evaluation summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// DELETE EVALUATION
const deleteEvaluation = async (req, res) => {
  try {
    console.log('🗑️ Deleting evaluation...');
    const { id } = req.params;

    const existingEvaluation = await Evaluation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'evaluator',
          attributes: ['nama']
        },
        {
          model: User,
          as: 'target',
          attributes: ['nama']
        },
        {
          model: EvaluationScore,
          as: 'scores'
        }
      ]
    });

    if (!existingEvaluation) {
      return res.status(404).json({
        success: false,
        message: 'Penilaian tidak ditemukan'
      });
    }

    // Delete evaluation (cascade will handle scores)
    await existingEvaluation.destroy();

    console.log('✅ Evaluation deleted successfully');

    res.json({
      success: true,
      message: `Penilaian dari ${existingEvaluation.evaluator.nama} untuk ${existingEvaluation.target.nama} berhasil dihapus`,
      data: {
        deletedEvaluation: {
          id: existingEvaluation.id,
          evaluatorName: existingEvaluation.evaluator.nama,
          targetName: existingEvaluation.target.nama,
          scoresCount: existingEvaluation.scores.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Delete evaluation error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus penilaian'
    });
  }
};

module.exports = {
  getEvaluationParameters,
  getScoreRanges,
  getActivePeriod,
  getEligibleUsers,
  submitEvaluation,
  getMyEvaluations,
  getAllEvaluations,
  getEvaluationSummary,
  deleteEvaluation
};