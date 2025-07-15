// controllers/dashboardController.js - FIXED VERSION WITH PROFILE PICTURE
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET DASHBOARD OVERVIEW STATISTICS
const getDashboardStats = async (req, res) => {
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

    const where = { periodId: targetPeriod.id };

    // Get comprehensive statistics
    const [
      totalUsers,
      activeUsers,
      totalEvaluations,
      completedEvaluations,
      attendanceData,
      ckpData,
      finalEvaluationData,
      bestEmployee
    ] = await Promise.all([
      // Total users
      prisma.user.count({ where: { isActive: true, role: { in: ['STAFF', 'PIMPINAN'] } } }),
      
      // Active users (yang sudah pernah submit evaluation)
      prisma.evaluation.findMany({
        where,
        select: { evaluatorId: true },
        distinct: ['evaluatorId']
      }),
      
      // Total evaluations in period
      prisma.evaluation.count({ where }),
      
      // Completed evaluations (users who submitted 3 evaluations)
      prisma.evaluation.groupBy({
        by: ['evaluatorId'],
        where,
        _count: { evaluatorId: true },
        having: { evaluatorId: { _count: { gte: 3 } } }
      }),
      
      // Attendance statistics
      prisma.attendance.aggregate({
        where,
        _avg: { nilaiPresensi: true },
        _count: { id: true }
      }),
      
      // CKP statistics
      prisma.ckpScore.aggregate({
        where,
        _avg: { score: true },
        _count: { id: true }
      }),
      
      // Final evaluation statistics
      prisma.finalEvaluation.aggregate({
        where,
        _avg: { finalScore: true },
        _count: { id: true }
      }),
      
      // 🔥 FIXED: Best employee WITH PROFILE PICTURE
      prisma.finalEvaluation.findFirst({
        where: { ...where, isBestEmployee: true },
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              jabatan: true,
              nip: true,
              profilePicture: true  // 🔥 TAMBAHKAN INI
            }
          }
        }
      })
    ]);

    const stats = {
      period: {
        id: targetPeriod.id,
        name: targetPeriod.namaPeriode,
        isActive: targetPeriod.isActive
      },
      overview: {
        totalUsers,
        activeUsers: activeUsers.length,
        participationRate: totalUsers > 0 ? ((activeUsers.length / totalUsers) * 100).toFixed(1) : 0,
        totalEvaluations,
        completedEvaluations: completedEvaluations.length,
        completionRate: totalUsers > 0 ? ((completedEvaluations.length / totalUsers) * 100).toFixed(1) : 0
      },
      scores: {
        attendance: {
          average: attendanceData._avg.nilaiPresensi || 0,
          count: attendanceData._count.id || 0
        },
        ckp: {
          average: ckpData._avg.score || 0,
          count: ckpData._count.id || 0
        },
        final: {
          average: finalEvaluationData._avg.finalScore || 0,
          count: finalEvaluationData._count.id || 0
        }
      },
      bestEmployee: bestEmployee ? {
        user: bestEmployee.user,
        finalScore: bestEmployee.finalScore,
        berakhlakScore: bestEmployee.berakhlakScore,
        presensiScore: bestEmployee.presensiScore,
        ckpScore: bestEmployee.ckpScore
      } : null
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET EVALUATION PROGRESS (monitoring pengisian)
const getEvaluationProgress = async (req, res) => {
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

    // Get all eligible users (STAFF + PIMPINAN)
    const allUsers = await prisma.user.findMany({
      where: { 
        isActive: true, 
        role: { in: ['STAFF', 'PIMPINAN'] } 
      },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        role: true
      },
      orderBy: { nama: 'asc' }
    });

    // Get evaluation counts per user
    const evaluationCounts = await prisma.evaluation.groupBy({
      by: ['evaluatorId'],
      where: { periodId: targetPeriod.id },
      _count: { evaluatorId: true }
    });

    // Map evaluation status
    const progress = allUsers.map(user => {
      const userEvaluations = evaluationCounts.find(
        e => e.evaluatorId === user.id
      );
      
      const evaluationCount = userEvaluations ? userEvaluations._count.evaluatorId : 0;
      const isComplete = evaluationCount >= 3; // Harus 3 evaluasi (tokoh 1, 2, 3)
      
      return {
        user: {
          id: user.id,
          nama: user.nama,
          jabatan: user.jabatan,
          role: user.role
        },
        evaluationCount,
        isComplete,
        status: isComplete ? 'COMPLETE' : evaluationCount > 0 ? 'PARTIAL' : 'NOT_STARTED'
      };
    });

    // Summary statistics
    const summary = {
      total: allUsers.length,
      completed: progress.filter(p => p.isComplete).length,
      partial: progress.filter(p => p.status === 'PARTIAL').length,
      notStarted: progress.filter(p => p.status === 'NOT_STARTED').length
    };

    res.json({
      success: true,
      data: {
        period: {
          id: targetPeriod.id,
          name: targetPeriod.namaPeriode
        },
        summary,
        progress
      }
    });

  } catch (error) {
    console.error('Get evaluation progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET CHART DATA FOR DASHBOARD
const getChartsData = async (req, res) => {
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

    const where = { periodId: targetPeriod.id };

    // Score distribution data
    const finalEvaluations = await prisma.finalEvaluation.findMany({
      where,
      include: {
        user: {
          select: {
            nama: true,
            jabatan: true
          }
        }
      },
      orderBy: { finalScore: 'desc' },
      take: 10 // Top 10 for chart
    });

    // Evaluation count by tokoh ranking
    const evaluationsByRanking = await prisma.evaluation.groupBy({
      by: ['ranking'],
      where,
      _count: { ranking: true }
    });

    // Score ranges distribution
    const scoreRanges = [
      { range: '90-100', min: 90, max: 100, count: 0 },
      { range: '80-89', min: 80, max: 90, count: 0 },
      { range: '70-79', min: 70, max: 80, count: 0 },
      { range: '60-69', min: 60, max: 70, count: 0 },
      { range: '<60', min: 0, max: 60, count: 0 }
    ];

    finalEvaluations.forEach(fe => {
      const score = fe.finalScore;
      const range = scoreRanges.find(r => score >= r.min && score < r.max);
      if (range) range.count++;
    });

    // Department performance (by jabatan)
    const departmentPerformance = await prisma.finalEvaluation.findMany({
      where,
      include: {
        user: {
          select: {
            jabatan: true
          }
        }
      }
    });

    const jabatanStats = {};
    departmentPerformance.forEach(fe => {
      const jabatan = fe.user.jabatan || 'Tidak Diketahui';
      if (!jabatanStats[jabatan]) {
        jabatanStats[jabatan] = {
          jabatan,
          count: 0,
          totalScore: 0,
          averageScore: 0
        };
      }
      jabatanStats[jabatan].count++;
      jabatanStats[jabatan].totalScore += fe.finalScore;
    });

    Object.values(jabatanStats).forEach(stat => {
      stat.averageScore = stat.count > 0 ? (stat.totalScore / stat.count).toFixed(2) : 0;
    });

    const chartsData = {
      period: {
        id: targetPeriod.id,
        name: targetPeriod.namaPeriode
      },
      topPerformers: finalEvaluations.map(fe => ({
        name: fe.user.nama,
        jabatan: fe.user.jabatan,
        finalScore: parseFloat(fe.finalScore.toFixed(2)),
        berakhlakScore: parseFloat(fe.berakhlakScore.toFixed(2)),
        presensiScore: parseFloat(fe.presensiScore.toFixed(2)),
        ckpScore: parseFloat(fe.ckpScore.toFixed(2))
      })),
      evaluationsByRanking: evaluationsByRanking.map(e => ({
        ranking: `Tokoh ${e.ranking}`,
        count: e._count.ranking
      })),
      scoreDistribution: scoreRanges,
      departmentPerformance: Object.values(jabatanStats)
    };

    res.json({
      success: true,
      data: chartsData
    });

  } catch (error) {
    console.error('Get charts data error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET RECENT ACTIVITIES
const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent evaluations
    const recentEvaluations = await prisma.evaluation.findMany({
      include: {
        evaluator: {
          select: {
            nama: true,
            jabatan: true
          }
        },
        target: {
          select: {
            nama: true
          }
        },
        period: {
          select: {
            namaPeriode: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const activities = recentEvaluations.map(evaluation => ({
      id: evaluation.id,
      type: 'EVALUATION',
      message: `${evaluation.evaluator.nama} menilai ${evaluation.target.nama} sebagai Tokoh BerAKHLAK ${evaluation.ranking}`,
      evaluator: evaluation.evaluator.nama,
      target: evaluation.target.nama,
      ranking: evaluation.ranking,
      period: evaluation.period.namaPeriode,
      timestamp: evaluation.createdAt
    }));

    res.json({
      success: true,
      data: { activities }
    });

  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  getDashboardStats,
  getEvaluationProgress,
  getChartsData,
  getRecentActivities
};