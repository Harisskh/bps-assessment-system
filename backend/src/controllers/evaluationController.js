// controllers/evaluationController.js - FIXED SUBMISSION LOGIC
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
    
    const parameters = await prisma.evaluationParameter.findMany({
      where: { isActive: true },
      orderBy: { urutan: 'asc' }
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

// 🔥 UPDATED: GET SCORE RANGES - Single range 80-100
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
    
    const activePeriod = await prisma.period.findFirst({
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

// GET ELIGIBLE USERS FOR EVALUATION - UPDATED LOGIC
const getEligibleUsers = async (req, res) => {
  try {
    console.log('🔄 Getting eligible users...');
    const currentUserId = req.user.id;

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { not: 'ADMIN' }, // Exclude ADMIN role completely
      },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        role: true
      },
      orderBy: { nama: 'asc' }
    });

    // Filter out users with excluded positions, but include current user
    const eligibleUsers = users.filter(user => {
      // Always include current user (self evaluation allowed)
      if (user.id === currentUserId) {
        return true;
      }
      
      // For other users, check if their position is excluded
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

// 🔥 FIXED: SUBMIT EVALUATION - Single category logic with proper validation
const submitEvaluation = async (req, res) => {
  try {
    console.log('📥 Received evaluation submission:', JSON.stringify(req.body, null, 2));
    
    const evaluatorId = req.user.id;
    const { periodId, targetUserId, scores } = req.body;

    // 🔥 FIXED: Validation for single user evaluation
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
    const period = await prisma.period.findUnique({
      where: { id: periodId }
    });

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

    // 🔥 FIXED: Check if evaluator has already submitted for this period and target
    const existingEvaluation = await prisma.evaluation.findFirst({
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
    const parameters = await prisma.evaluationParameter.findMany({
      where: { isActive: true },
      orderBy: { urutan: 'asc' }
    });

    if (parameters.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'Parameter evaluasi tidak lengkap (harus 8 parameter)'
      });
    }

    // 🔥 FIXED: Validate scores for single category (80-100)
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
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser || !targetUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User target tidak valid atau tidak aktif'
      });
    }

    // Check if target user is ADMIN (not allowed to be evaluated)
    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Admin tidak dapat dinilai'
      });
    }

    // Check if target user has excluded position (except if it's self-evaluation)
    if (targetUserId !== evaluatorId && isExcludedFromEvaluation(targetUser.jabatan)) {
      return res.status(400).json({
        success: false,
        message: `Pegawai dengan jabatan "${targetUser.jabatan}" tidak dapat dinilai`
      });
    }

    // 🔥 FIXED: Create single evaluation record
    const result = await prisma.$transaction(async (tx) => {
      console.log('🔄 Creating evaluation record...');
      
      // Create evaluation record
      const createdEvaluation = await tx.evaluation.create({
        data: {
          evaluatorId,
          periodId,
          targetUserId,
          status: 'SUBMITTED',
          submitDate: new Date()
        }
      });

      console.log('✅ Evaluation record created:', createdEvaluation.id);

      // Create evaluation scores
      const scoreData = scores.map(score => ({
        evaluationId: createdEvaluation.id,
        parameterId: score.parameterId,
        score: score.value
      }));

      console.log('🔄 Creating evaluation scores:', scoreData.length);

      await tx.evaluationScore.createMany({
        data: scoreData
      });

      console.log('✅ Evaluation scores created');

      return createdEvaluation;
    });

    console.log('✅ Evaluation submission completed successfully');

    res.status(201).json({
      success: true,
      message: 'Evaluasi berhasil disimpan',
      data: { evaluation: result }
    });

  } catch (error) {
    console.error('❌ Submit evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔥 UPDATED: GET USER'S EVALUATIONS - Updated for single category
const getMyEvaluations = async (req, res) => {
  try {
    console.log('🔄 Getting my evaluations...');
    const evaluatorId = req.user.id;
    const { periodId } = req.query;

    const where = { evaluatorId };
    if (periodId) {
      where.periodId = periodId;
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        target: {
          select: {
            id: true,
            nama: true,
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
        },
        scores: {
          include: {
            parameter: {
              select: {
                id: true,
                namaParameter: true,
                urutan: true
              }
            }
          },
          orderBy: {
            parameter: {
              urutan: 'asc'
            }
          }
        }
      },
      orderBy: [
        { periodId: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    console.log(`✅ Found ${evaluations.length} evaluations`);

    res.json({
      success: true,
      data: { evaluations }
    });

  } catch (error) {
    console.error('❌ Get my evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// 🔥 UPDATED: GET ALL EVALUATIONS - Updated for single category
const getAllEvaluations = async (req, res) => {
  try {
    console.log('🔄 Getting all evaluations...');
    const { 
      periodId, 
      targetUserId, 
      evaluatorId,
      page = 1, 
      limit = 20 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (periodId) where.periodId = periodId;
    if (targetUserId) where.targetUserId = targetUserId;
    if (evaluatorId) where.evaluatorId = evaluatorId;

    const [evaluations, totalCount] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        include: {
          evaluator: {
            select: {
              id: true,
              nama: true,
              jabatan: true
            }
          },
          target: {
            select: {
              id: true,
              nama: true,
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
          },
          scores: {
            include: {
              parameter: {
                select: {
                  id: true,
                  namaParameter: true,
                  urutan: true
                }
              }
            },
            orderBy: {
              parameter: {
                urutan: 'asc'
              }
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.evaluation.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    console.log(`✅ Found ${evaluations.length} evaluations (total: ${totalCount})`);

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
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// 🔥 UPDATED: GET EVALUATION SUMMARY - Updated for single category
const getEvaluationSummary = async (req, res) => {
  try {
    console.log('🔄 Getting evaluation summary...');
    const { periodId } = req.params;

    // Get evaluation counts by target user
    const evaluationCounts = await prisma.evaluation.groupBy({
      by: ['targetUserId'],
      where: { periodId },
      _count: { targetUserId: true }
    });

    // Get target user details
    const targetUserIds = evaluationCounts.map(e => e.targetUserId);
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        role: true
      }
    });

    // 🔥 UPDATED: Calculate summary statistics for single category
    const summary = targetUsers.map(user => {
      const userEvaluations = evaluationCounts.find(e => e.targetUserId === user.id);
      const totalCount = userEvaluations?._count?.targetUserId || 0;

      return {
        user,
        counts: {
          total: totalCount
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

// DELETE EVALUATION - Updated for single category
const deleteEvaluation = async (req, res) => {
  try {
    console.log('🗑️ Deleting evaluation...');
    const { id } = req.params;

    // Check if evaluation exists
    const existingEvaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        evaluator: {
          select: { nama: true }
        },
        target: {
          select: { nama: true }
        },
        scores: true
      }
    });

    if (!existingEvaluation) {
      return res.status(404).json({
        success: false,
        message: 'Penilaian tidak ditemukan'
      });
    }

    // Delete scores first (foreign key constraint)
    await prisma.evaluationScore.deleteMany({
      where: { evaluationId: id }
    });

    // Delete evaluation
    await prisma.evaluation.delete({
      where: { id }
    });

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
    
    // Handle specific database errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Penilaian tidak ditemukan'
      });
    }

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