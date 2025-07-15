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
  'Kepala Subbagian Umum'
];

// Helper function to check if a position is excluded from being evaluated
const isExcludedFromEvaluation = (jabatan) => {
  if (!jabatan) return false;
  
  return EXCLUDED_POSITIONS.some(excludedPos => {
    // Check exact match
    if (jabatan.toLowerCase().includes(excludedPos.toLowerCase())) {
      return true;
    }
    
    // Check for variations
    if (excludedPos.includes('Kepala BPS') && jabatan.toLowerCase().includes('kepala bps')) {
      return true;
    }
    
    if (excludedPos.includes('Kasubbag') && jabatan.toLowerCase().includes('kasubbag')) {
      return true;
    }
    
    if (excludedPos.includes('Kepala Sub Bagian') && jabatan.toLowerCase().includes('kepala sub bagian')) {
      return true;
    }
    
    return false;
  });
};

// GET EVALUATION PARAMETERS (8 parameter BerAKHLAK)
const getEvaluationParameters = async (req, res) => {
  try {
    const parameters = await prisma.evaluationParameter.findMany({
      where: { isActive: true },
      orderBy: { urutan: 'asc' }
    });

    res.json({
      success: true,
      data: { parameters }
    });

  } catch (error) {
    console.error('Get evaluation parameters error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET RENTANG NILAI (score ranges for each ranking)
const getScoreRanges = async (req, res) => {
  try {
    const ranges = await prisma.rentangNilai.findMany({
      orderBy: { ranking: 'asc' }
    });

    res.json({
      success: true,
      data: { ranges }
    });

  } catch (error) {
    console.error('Get score ranges error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET ACTIVE PERIOD
const getActivePeriod = async (req, res) => {
  try {
    const activePeriod = await prisma.period.findFirst({
      where: { isActive: true }
    });

    if (!activePeriod) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada periode aktif. Hubungi administrator.'
      });
    }

    res.json({
      success: true,
      data: { period: activePeriod }
    });

  } catch (error) {
    console.error('Get active period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET ELIGIBLE USERS FOR EVALUATION - UPDATED LOGIC
const getEligibleUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { not: 'ADMIN' }, // Exclude ADMIN role completely
        // Note: Don't exclude current user here - allow self evaluation
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

    res.json({
      success: true,
      data: { 
        users: eligibleUsers,
        excludedPositions: EXCLUDED_POSITIONS,
        canEvaluateSelf: true // Indicate that self evaluation is allowed
      }
    });

  } catch (error) {
    console.error('Get eligible users error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// SUBMIT EVALUATION (Main function for tokoh berakhlak evaluation)
const submitEvaluation = async (req, res) => {
  try {
    const evaluatorId = req.user.id;
    const { periodId, evaluations } = req.body;

    // Validation
    if (!periodId || !evaluations || !Array.isArray(evaluations)) {
      return res.status(400).json({
        success: false,
        message: 'Period ID dan data evaluasi wajib diisi'
      });
    }

    if (evaluations.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Harus menilai 3 pegawai (tokoh berakhlak 1, 2, dan 3)'
      });
    }

    // Check if period is active
    const period = await prisma.period.findUnique({
      where: { id: periodId }
    });

    if (!period || !period.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Periode penilaian tidak aktif atau tidak valid.'
      });
    }

    // ==========================================================
    // LOGIKA BARU: Validasi Tanggal Penilaian
    // ==========================================================
    const now = new Date();
    // Set jam ke 00:00:00 untuk perbandingan tanggal yang akurat
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

    // Check if evaluator has already submitted for this period
    const existingEvaluation = await prisma.evaluation.findFirst({
      where: {
        evaluatorId,
        periodId
      }
    });

    if (existingEvaluation) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah mengisi penilaian untuk periode ini'
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

    // Get score ranges
    const ranges = await prisma.rentangNilai.findMany({
      orderBy: { ranking: 'asc' }
    });

    // Validate evaluations data
    for (let i = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i];
      const ranking = i + 1; // 1, 2, 3
      const range = ranges.find(r => r.ranking === ranking);

      if (!range) {
        return res.status(400).json({
          success: false,
          message: `Rentang nilai untuk tokoh ke-${ranking} tidak ditemukan`
        });
      }

      // Check required fields
      if (!evaluation.targetUserId || !evaluation.scores || !Array.isArray(evaluation.scores)) {
        return res.status(400).json({
          success: false,
          message: `Data evaluasi tokoh ke-${ranking} tidak lengkap`
        });
      }

      if (evaluation.scores.length !== 8) {
        return res.status(400).json({
          success: false,
          message: `Tokoh ke-${ranking} harus dinilai untuk 8 parameter`
        });
      }

      // Validate score ranges
      for (const score of evaluation.scores) {
        if (!score.parameterId || typeof score.value !== 'number') {
          return res.status(400).json({
            success: false,
            message: `Format skor tidak valid untuk tokoh ke-${ranking}`
          });
        }

        if (score.value < range.nilaiMin || score.value > range.nilaiMax) {
          return res.status(400).json({
            success: false,
            message: `Skor untuk tokoh ke-${ranking} harus antara ${range.nilaiMin}-${range.nilaiMax}`
          });
        }
      }

      // Check if target user exists and is eligible
      const targetUser = await prisma.user.findUnique({
        where: { id: evaluation.targetUserId }
      });

      if (!targetUser || !targetUser.isActive) {
        return res.status(400).json({
          success: false,
          message: `User target untuk tokoh ke-${ranking} tidak valid atau tidak aktif`
        });
      }

      // Check if target user is ADMIN (not allowed to be evaluated)
      if (targetUser.role === 'ADMIN') {
        return res.status(400).json({
          success: false,
          message: `Admin tidak dapat dinilai sebagai tokoh ke-${ranking}`
        });
      }

      // Check if target user has excluded position (except if it's self-evaluation)
      if (evaluation.targetUserId !== evaluatorId && isExcludedFromEvaluation(targetUser.jabatan)) {
        return res.status(400).json({
          success: false,
          message: `Pegawai dengan jabatan "${targetUser.jabatan}" tidak dapat dinilai sebagai tokoh ke-${ranking}`
        });
      }
    }

    // Check for duplicate target users
    const targetUserIds = evaluations.map(e => e.targetUserId);
    const uniqueTargetUserIds = [...new Set(targetUserIds)];
    if (uniqueTargetUserIds.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat memilih user yang sama untuk tokoh berbeda'
      });
    }

    // Start transaction to create evaluations
    const result = await prisma.$transaction(async (tx) => {
      const createdEvaluations = [];

      for (let i = 0; i < evaluations.length; i++) {
        const evaluation = evaluations[i];
        const ranking = i + 1;

        // Create evaluation record
        const createdEvaluation = await tx.evaluation.create({
          data: {
            evaluatorId,
            periodId,
            targetUserId: evaluation.targetUserId,
            ranking,
            status: 'SUBMITTED',
            submitDate: new Date()
          }
        });

        // Create evaluation scores
        const scoreData = evaluation.scores.map(score => ({
          evaluationId: createdEvaluation.id,
          parameterId: score.parameterId,
          score: score.value
        }));

        await tx.evaluationScore.createMany({
          data: scoreData
        });

        createdEvaluations.push(createdEvaluation);
      }

      return createdEvaluations;
    });

    res.status(201).json({
      success: true,
      message: 'Evaluasi berhasil disimpan',
      data: { evaluations: result }
    });

  } catch (error) {
    console.error('Submit evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET USER'S EVALUATIONS (evaluations submitted by current user)
const getMyEvaluations = async (req, res) => {
  try {
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
        { ranking: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: { evaluations }
    });

  } catch (error) {
    console.error('Get my evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET ALL EVALUATIONS (Admin/Pimpinan only)
const getAllEvaluations = async (req, res) => {
  try {
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
    console.error('Get all evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET EVALUATION SUMMARY (for specific period)
const getEvaluationSummary = async (req, res) => {
  try {
    const { periodId } = req.params;

    // Get evaluation counts by target user
    const evaluationCounts = await prisma.evaluation.groupBy({
      by: ['targetUserId', 'ranking'],
      where: { periodId },
      _count: { targetUserId: true }
    });

    // Get target user details
    const targetUserIds = [...new Set(evaluationCounts.map(e => e.targetUserId))];
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        role: true
      }
    });

    // Calculate summary statistics
    const summary = targetUsers.map(user => {
      const userEvaluations = evaluationCounts.filter(e => e.targetUserId === user.id);
      
      const tokoh1Count = userEvaluations.find(e => e.ranking === 1)?._count?.targetUserId || 0;
      const tokoh2Count = userEvaluations.find(e => e.ranking === 2)?._count?.targetUserId || 0;
      const tokoh3Count = userEvaluations.find(e => e.ranking === 3)?._count?.targetUserId || 0;
      const totalCount = tokoh1Count + tokoh2Count + tokoh3Count;

      return {
        user,
        counts: {
          tokoh1: tokoh1Count,
          tokoh2: tokoh2Count,
          tokoh3: tokoh3Count,
          total: totalCount
        }
      };
    });

    // Sort by total count (descending)
    summary.sort((a, b) => b.counts.total - a.counts.total);

    res.json({
      success: true,
      data: { summary }
    });

  } catch (error) {
    console.error('Get evaluation summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// DELETE EVALUATION - ADD DELETE METHOD
const deleteEvaluation = async (req, res) => {
  try {
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

    res.json({
      success: true,
      message: `Penilaian dari ${existingEvaluation.evaluator.nama} untuk ${existingEvaluation.target.nama} berhasil dihapus`,
      data: {
        deletedEvaluation: {
          id: existingEvaluation.id,
          evaluatorName: existingEvaluation.evaluator.nama,
          targetName: existingEvaluation.target.nama,
          ranking: existingEvaluation.ranking,
          scoresCount: existingEvaluation.scores.length
        }
      }
    });

  } catch (error) {
    console.error('Delete evaluation error:', error);
    
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
  deleteEvaluation // ADD DELETE METHOD
};