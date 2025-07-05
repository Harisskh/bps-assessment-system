const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// CALCULATE AND UPDATE FINAL EVALUATIONS
const calculateFinalEvaluations = async (req, res) => {
  try {
    const { periodId } = req.body;

    if (!periodId) {
      return res.status(400).json({
        success: false,
        message: 'Period ID wajib diisi'
      });
    }

    // Check if period exists
    const period = await prisma.period.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Period tidak ditemukan'
      });
    }

    // Get all evaluations for this period
    const evaluations = await prisma.evaluation.findMany({
      where: { periodId },
      include: {
        scores: {
          include: {
            parameter: true
          }
        }
      }
    });

    // Get attendance data for this period
    const attendances = await prisma.attendance.findMany({
      where: { periodId },
      include: {
        user: {
          select: { id: true, nama: true }
        }
      }
    });

    // Get CKP scores for this period
    const ckpScores = await prisma.ckpScore.findMany({
      where: { periodId },
      include: {
        user: {
          select: { id: true, nama: true }
        }
      }
    });

    // Calculate BERAKHLAK scores for each user
    const berakhlakScores = {};
    const evaluatorCounts = {};

    // Group evaluations by target user
    for (const evaluation of evaluations) {
      const targetUserId = evaluation.targetUserId;
      const ranking = evaluation.ranking;

      if (!berakhlakScores[targetUserId]) {
        berakhlakScores[targetUserId] = {
          tokoh1Scores: [],
          tokoh2Scores: [],
          tokoh3Scores: [],
          tokoh1Count: 0,
          tokoh2Count: 0,
          tokoh3Count: 0,
          totalEvaluators: 0
        };
      }

      // Calculate average score for this evaluation (8 parameters)
      const totalScore = evaluation.scores.reduce((sum, score) => sum + score.score, 0);
      const averageScore = totalScore / evaluation.scores.length;

      // Add to appropriate ranking
      if (ranking === 1) {
        berakhlakScores[targetUserId].tokoh1Scores.push(averageScore);
        berakhlakScores[targetUserId].tokoh1Count++;
      } else if (ranking === 2) {
        berakhlakScores[targetUserId].tokoh2Scores.push(averageScore);
        berakhlakScores[targetUserId].tokoh2Count++;
      } else if (ranking === 3) {
        berakhlakScores[targetUserId].tokoh3Scores.push(averageScore);
        berakhlakScores[targetUserId].tokoh3Count++;
      }

      berakhlakScores[targetUserId].totalEvaluators++;
    }

    // Calculate final BERAKHLAK score for each user
    for (const userId in berakhlakScores) {
      const userScores = berakhlakScores[userId];
      
      // Calculate average for each tokoh category
      const tokoh1Avg = userScores.tokoh1Scores.length > 0 
        ? userScores.tokoh1Scores.reduce((a, b) => a + b, 0) / userScores.tokoh1Scores.length 
        : 0;
      
      const tokoh2Avg = userScores.tokoh2Scores.length > 0 
        ? userScores.tokoh2Scores.reduce((a, b) => a + b, 0) / userScores.tokoh2Scores.length 
        : 0;
      
      const tokoh3Avg = userScores.tokoh3Scores.length > 0 
        ? userScores.tokoh3Scores.reduce((a, b) => a + b, 0) / userScores.tokoh3Scores.length 
        : 0;

      // Final BERAKHLAK score = average of 3 categories
      const categoryCount = (tokoh1Avg > 0 ? 1 : 0) + (tokoh2Avg > 0 ? 1 : 0) + (tokoh3Avg > 0 ? 1 : 0);
      const finalBerakhlakScore = categoryCount > 0 
        ? (tokoh1Avg + tokoh2Avg + tokoh3Avg) / categoryCount 
        : 0;

      berakhlakScores[userId].finalScore = finalBerakhlakScore;
      berakhlakScores[userId].tokoh1Avg = tokoh1Avg;
      berakhlakScores[userId].tokoh2Avg = tokoh2Avg;
      berakhlakScores[userId].tokoh3Avg = tokoh3Avg;
    }

    // Determine candidates based on total evaluators (top 2 ranks)
    const userEvaluatorCounts = Object.entries(berakhlakScores)
      .map(([userId, data]) => ({ userId, count: data.totalEvaluators }))
      .sort((a, b) => b.count - a.count);

    // Get top 2 unique counts
    const uniqueCounts = [...new Set(userEvaluatorCounts.map(u => u.count))].slice(0, 2);
    const candidateUserIds = userEvaluatorCounts
      .filter(u => uniqueCounts.includes(u.count))
      .map(u => u.userId);

    console.log('Candidates based on evaluator count:', candidateUserIds);

    // Create or update final evaluations
    const finalEvaluations = [];

    // Get all users who have any score data
    const allUserIds = new Set([
      ...Object.keys(berakhlakScores),
      ...attendances.map(a => a.userId),
      ...ckpScores.map(c => c.userId)
    ]);

    for (const userId of allUserIds) {
      const berakhlakData = berakhlakScores[userId] || {
        finalScore: 0,
        totalEvaluators: 0,
        tokoh1Count: 0,
        tokoh2Count: 0,
        tokoh3Count: 0
      };

      const attendanceData = attendances.find(a => a.userId === userId);
      const ckpData = ckpScores.find(c => c.userId === userId);

      // Calculate weighted scores
      const berakhlakScore = berakhlakData.finalScore || 0;
      const presensiScore = attendanceData?.nilaiPresensi || 0;
      const ckpScore = ckpData?.score || 0;

      const berakhlakWeighted = berakhlakScore * 0.30;
      const presensiWeighted = presensiScore * 0.40;
      const ckpWeighted = ckpScore * 0.30;
      const finalScore = berakhlakWeighted + presensiWeighted + ckpWeighted;

      const isCandidate = candidateUserIds.includes(userId);

      const finalEvaluationData = {
        userId,
        periodId,
        berakhlakScore,
        presensiScore,
        ckpScore,
        berakhlakWeighted,
        presensiWeighted,
        ckpWeighted,
        finalScore,
        totalEvaluators: berakhlakData.totalEvaluators,
        tokoh1Count: berakhlakData.tokoh1Count,
        tokoh2Count: berakhlakData.tokoh2Count,
        tokoh3Count: berakhlakData.tokoh3Count,
        isCandidate,
        isBestEmployee: false, // Will be updated after ranking
        ranking: null
      };

      const finalEvaluation = await prisma.finalEvaluation.upsert({
        where: {
          userId_periodId: {
            userId,
            periodId
          }
        },
        update: finalEvaluationData,
        create: finalEvaluationData,
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              jabatan: true,
              nip: true
            }
          }
        }
      });

      finalEvaluations.push(finalEvaluation);
    }

    // Rank candidates by final score
    const rankedCandidates = finalEvaluations
      .filter(fe => fe.isCandidate)
      .sort((a, b) => b.finalScore - a.finalScore);

    // Update rankings and determine best employee
    for (let i = 0; i < rankedCandidates.length; i++) {
      const candidate = rankedCandidates[i];
      const ranking = i + 1;
      const isBestEmployee = ranking === 1;

      await prisma.finalEvaluation.update({
        where: { id: candidate.id },
        data: {
          ranking,
          isBestEmployee
        }
      });

      candidate.ranking = ranking;
      candidate.isBestEmployee = isBestEmployee;
    }

    res.json({
      success: true,
      message: 'Final evaluations calculated successfully',
      data: {
        period: period.namaPeriode,
        totalUsers: finalEvaluations.length,
        candidates: rankedCandidates.length,
        bestEmployee: rankedCandidates[0] || null,
        summary: {
          candidateUserIds,
          uniqueEvaluatorCounts: uniqueCounts
        }
      }
    });

  } catch (error) {
    console.error('Calculate final evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET FINAL EVALUATIONS (with ranking)
const getFinalEvaluations = async (req, res) => {
  try {
    const { 
      periodId,
      onlyCandidates = false,
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (periodId) where.periodId = periodId;
    if (onlyCandidates === 'true') where.isCandidate = true;

    const [finalEvaluations, totalCount] = await Promise.all([
      prisma.finalEvaluation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              jabatan: true,
              nip: true,
              role: true
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
          { isCandidate: 'desc' },
          { finalScore: 'desc' },
          { totalEvaluators: 'desc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.finalEvaluation.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        finalEvaluations,
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
    console.error('Get final evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET BEST EMPLOYEE
const getBestEmployee = async (req, res) => {
  try {
    const { periodId } = req.params;

    const bestEmployee = await prisma.finalEvaluation.findFirst({
      where: {
        periodId,
        isBestEmployee: true
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true,
            role: true
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

    if (!bestEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Best employee belum ditentukan untuk periode ini'
      });
    }

    // Get all candidates for comparison
    const allCandidates = await prisma.finalEvaluation.findMany({
      where: {
        periodId,
        isCandidate: true
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true
          }
        }
      },
      orderBy: { ranking: 'asc' }
    });

    res.json({
      success: true,
      data: {
        bestEmployee,
        allCandidates,
        period: bestEmployee.period
      }
    });

  } catch (error) {
    console.error('Get best employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET LEADERBOARD
const getLeaderboard = async (req, res) => {
  try {
    const { periodId, limit = 10 } = req.query;

    const where = {};
    if (periodId) where.periodId = periodId;

    const leaderboard = await prisma.finalEvaluation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true,
            role: true
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
        { finalScore: 'desc' },
        { totalEvaluators: 'desc' },
        { berakhlakScore: 'desc' }
      ],
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: { leaderboard }
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  calculateFinalEvaluations,
  getFinalEvaluations,
  getBestEmployee,
  getLeaderboard
};