// controllers/monitoringController.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET EVALUATION STATUS (siapa sudah/belum isi)
const getEvaluationStatus = async (req, res) => {
  try {
    const { periodId } = req.query;

    // Get active period if not specified
    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
    }

    if (!targetPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Get all eligible users
    const allUsers = await prisma.user.findMany({
      where: { 
        isActive: true, 
        role: { in: ['STAFF', 'PIMPINAN'] } 
      },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        role: true,
        mobilePhone: true,
        email: true
      },
      orderBy: { nama: 'asc' }
    });

    // Get evaluations for this period
    const evaluations = await prisma.evaluation.findMany({
      where: { periodId: targetPeriod.id },
      select: {
        evaluatorId: true,
        ranking: true,
        submitDate: true,
        target: {
          select: {
            nama: true
          }
        }
      }
    });

    // Group evaluations by evaluator
    const evaluationsByUser = {};
    evaluations.forEach(evaluation => {
      if (!evaluationsByUser[evaluation.evaluatorId]) {
        evaluationsByUser[evaluation.evaluatorId] = [];
      }
      evaluationsByUser[evaluation.evaluatorId].push(evaluation);
    });

    // Map status for each user
    const userStatuses = allUsers.map(user => {
      const userEvaluations = evaluationsByUser[user.id] || [];
      const completedRankings = userEvaluations.map(e => e.ranking).sort();
      const isComplete = completedRankings.length === 3 && 
                        completedRankings.includes(1) && 
                        completedRankings.includes(2) && 
                        completedRankings.includes(3);

      let status = 'NOT_STARTED';
      if (isComplete) {
        status = 'COMPLETE';
      } else if (userEvaluations.length > 0) {
        status = 'PARTIAL';
      }

      const lastSubmission = userEvaluations.length > 0 
        ? Math.max(...userEvaluations.map(e => new Date(e.submitDate).getTime()))
        : null;

      return {
        user: {
          id: user.id,
          nama: user.nama,
          jabatan: user.jabatan,
          role: user.role,
          mobilePhone: user.mobilePhone,
          email: user.email
        },
        status,
        completedCount: userEvaluations.length,
        completedRankings,
        missingRankings: [1, 2, 3].filter(rank => !completedRankings.includes(rank)),
        lastSubmission: lastSubmission ? new Date(lastSubmission) : null,
        evaluations: userEvaluations.map(e => ({
          ranking: e.ranking,
          targetName: e.target.nama,
          submitDate: e.submitDate
        }))
      };
    });

    // Summary statistics
    const summary = {
      total: allUsers.length,
      completed: userStatuses.filter(u => u.status === 'COMPLETE').length,
      partial: userStatuses.filter(u => u.status === 'PARTIAL').length,
      notStarted: userStatuses.filter(u => u.status === 'NOT_STARTED').length,
      completionRate: allUsers.length > 0 
        ? ((userStatuses.filter(u => u.status === 'COMPLETE').length / allUsers.length) * 100).toFixed(1)
        : 0
    };

    res.json({
      success: true,
      data: {
        period: {
          id: targetPeriod.id,
          name: targetPeriod.namaPeriode,
          isActive: targetPeriod.isActive
        },
        summary,
        userStatuses
      }
    });

  } catch (error) {
    console.error('Get evaluation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET INCOMPLETE USERS (yang belum lengkap)
const getIncompleteUsers = async (req, res) => {
  try {
    const { periodId } = req.query;

    // Get active period if not specified
    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
    }

    if (!targetPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Get users who haven't completed all 3 evaluations
    const allUsers = await prisma.user.findMany({
      where: { 
        isActive: true, 
        role: { in: ['STAFF', 'PIMPINAN'] } 
      },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        role: true,
        mobilePhone: true,
        email: true
      }
    });

    // Get evaluation counts per user
    const evaluationCounts = await prisma.evaluation.groupBy({
      by: ['evaluatorId'],
      where: { periodId: targetPeriod.id },
      _count: { evaluatorId: true }
    });

    // Filter incomplete users
    const incompleteUsers = allUsers.filter(user => {
      const userEvaluations = evaluationCounts.find(e => e.evaluatorId === user.id);
      const count = userEvaluations ? userEvaluations._count.evaluatorId : 0;
      return count < 3;
    });

    // Get detailed status for incomplete users
    const detailedStatuses = await Promise.all(
      incompleteUsers.map(async (user) => {
        const userEvaluations = await prisma.evaluation.findMany({
          where: {
            evaluatorId: user.id,
            periodId: targetPeriod.id
          },
          select: {
            ranking: true,
            submitDate: true
          }
        });

        const completedRankings = userEvaluations.map(e => e.ranking);
        const missingRankings = [1, 2, 3].filter(rank => !completedRankings.includes(rank));

        return {
          user,
          completedCount: userEvaluations.length,
          missingCount: 3 - userEvaluations.length,
          completedRankings,
          missingRankings,
          lastActivity: userEvaluations.length > 0 
            ? Math.max(...userEvaluations.map(e => new Date(e.submitDate).getTime()))
            : null
        };
      })
    );

    // Sort by priority (those who started but didn't finish first)
    detailedStatuses.sort((a, b) => {
      if (a.completedCount > 0 && b.completedCount === 0) return -1;
      if (a.completedCount === 0 && b.completedCount > 0) return 1;
      return b.completedCount - a.completedCount;
    });

    res.json({
      success: true,
      data: {
        period: {
          id: targetPeriod.id,
          name: targetPeriod.namaPeriode
        },
        summary: {
          totalIncomplete: incompleteUsers.length,
          notStarted: detailedStatuses.filter(u => u.completedCount === 0).length,
          partial: detailedStatuses.filter(u => u.completedCount > 0 && u.completedCount < 3).length
        },
        incompleteUsers: detailedStatuses
      }
    });

  } catch (error) {
    console.error('Get incomplete users error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET DETAILED USER EVALUATION STATUS
const getUserEvaluationDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { periodId } = req.query;

    // Get active period if not specified
    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
    }

    if (!targetPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        role: true,
        mobilePhone: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Get user's evaluations for this period
    const evaluations = await prisma.evaluation.findMany({
      where: {
        evaluatorId: userId,
        periodId: targetPeriod.id
      },
      include: {
        target: {
          select: {
            nama: true,
            jabatan: true
          }
        },
        scores: {
          include: {
            parameter: {
              select: {
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
      orderBy: { ranking: 'asc' }
    });

    const completedRankings = evaluations.map(e => e.ranking);
    const missingRankings = [1, 2, 3].filter(rank => !completedRankings.includes(rank));

    const detailData = {
      user,
      period: {
        id: targetPeriod.id,
        name: targetPeriod.namaPeriode
      },
      summary: {
        completedCount: evaluations.length,
        missingCount: 3 - evaluations.length,
        completedRankings,
        missingRankings,
        isComplete: evaluations.length === 3
      },
      evaluations: evaluations.map(evaluation => ({
        id: evaluation.id,
        ranking: evaluation.ranking,
        target: evaluation.target,
        submitDate: evaluation.submitDate,
        scores: evaluation.scores.map(score => ({
          parameter: score.parameter.namaParameter,
          value: score.score,
          urutan: score.parameter.urutan
        })),
        averageScore: evaluation.scores.length > 0 
          ? (evaluation.scores.reduce((sum, s) => sum + s.score, 0) / evaluation.scores.length).toFixed(1)
          : 0
      }))
    };

    res.json({
      success: true,
      data: detailData
    });

  } catch (error) {
    console.error('Get user evaluation detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  getEvaluationStatus,
  getIncompleteUsers,
  getUserEvaluationDetail
};