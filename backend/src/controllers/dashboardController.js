// controllers/dashboardController.js - COMPLETE FIXED VERSION
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET DASHBOARD OVERVIEW STATISTICS
const getDashboardStats = async (req, res) => {
  try {
    const { periodId } = req.query;

    console.log('📊 Dashboard stats request - periodId:', periodId);

    // Get active period if not specified
    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
      console.log('📅 Found specific period:', targetPeriod?.namaPeriode);
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
      console.log('📅 Found active period:', targetPeriod?.namaPeriode);
    }

    if (!targetPeriod) {
      console.log('❌ No period found');
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    const where = { periodId: targetPeriod.id };
    console.log('🔍 Query where clause:', where);

    try {
      // Get comprehensive statistics with better error handling
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
        // Total users eligible for evaluation
        prisma.user.count({ 
          where: { 
            isActive: true, 
            role: { in: ['STAFF', 'PIMPINAN'] } 
          } 
        }).catch(e => {
          console.error('Error counting users:', e);
          return 0;
        }),
        
        // Active users (yang sudah pernah submit evaluation)
        prisma.evaluation.findMany({
          where,
          select: { evaluatorId: true },
          distinct: ['evaluatorId']
        }).catch(e => {
          console.error('Error finding active users:', e);
          return [];
        }),
        
        // Total evaluations in period
        prisma.evaluation.count({ where }).catch(e => {
          console.error('Error counting evaluations:', e);
          return 0;
        }),
        
        // Completed evaluations (users who submitted 3 evaluations)
        prisma.evaluation.groupBy({
          by: ['evaluatorId'],
          where,
          _count: { evaluatorId: true },
          having: { evaluatorId: { _count: { gte: 3 } } }
        }).catch(e => {
          console.error('Error grouping completed evaluations:', e);
          return [];
        }),
        
        // Attendance statistics
        prisma.attendance.aggregate({
          where,
          _avg: { nilaiPresensi: true },
          _count: { id: true }
        }).catch(e => {
          console.error('Error aggregating attendance:', e);
          return { _avg: { nilaiPresensi: null }, _count: { id: 0 } };
        }),
        
        // CKP statistics
        prisma.ckpScore.aggregate({
          where,
          _avg: { score: true },
          _count: { id: true }
        }).catch(e => {
          console.error('Error aggregating CKP:', e);
          return { _avg: { score: null }, _count: { id: 0 } };
        }),
        
        // Final evaluation statistics
        prisma.finalEvaluation.aggregate({
          where,
          _avg: { finalScore: true },
          _count: { id: true }
        }).catch(e => {
          console.error('Error aggregating final evaluations:', e);
          return { _avg: { finalScore: null }, _count: { id: 0 } };
        }),
        
        // 🔥 FIXED: Best employee WITH PROFILE PICTURE from PREVIOUS period
        getBestEmployeeForPrevious(targetPeriod).catch(e => {
          console.error('Error getting best employee:', e);
          return null;
        })
      ]);

      console.log('📊 Stats collected:', {
        totalUsers,
        activeUsersCount: activeUsers.length,
        totalEvaluations,
        completedEvaluationsCount: completedEvaluations.length
      });

      const stats = {
        period: {
          id: targetPeriod.id,
          name: targetPeriod.namaPeriode,
          isActive: targetPeriod.isActive
        },
        overview: {
          totalUsers,
          activeUsers: activeUsers.length,
          participationRate: totalUsers > 0 ? 
            ((activeUsers.length / totalUsers) * 100).toFixed(1) : 0,
          totalEvaluations,
          completedEvaluations: completedEvaluations.length,
          completionRate: totalUsers > 0 ? 
            ((completedEvaluations.length / totalUsers) * 100).toFixed(1) : 0
        },
        scores: {
          attendance: {
            average: attendanceData._avg?.nilaiPresensi || 0,
            count: attendanceData._count?.id || 0
          },
          ckp: {
            average: ckpData._avg?.score || 0,
            count: ckpData._count?.id || 0
          },
          final: {
            average: finalEvaluationData._avg?.finalScore || 0,
            count: finalEvaluationData._count?.id || 0
          }
        },
        bestEmployee
      };

      console.log('✅ Dashboard stats completed successfully');

      res.json({
        success: true,
        data: stats
      });

    } catch (innerError) {
      console.error('Inner dashboard stats error:', innerError);
      throw innerError;
    }

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔥 FIXED: Helper function to get best employee from previous period
const getBestEmployeeForPrevious = async (currentPeriod) => {
  try {
    console.log('🏆 Getting best employee for previous period from:', currentPeriod.namaPeriode);

    // Calculate previous period
    let previousYear = currentPeriod.tahun;
    let previousMonth = currentPeriod.bulan - 1;
    
    if (previousMonth < 1) {
      previousMonth = 12;
      previousYear = currentPeriod.tahun - 1;
    }
    
    console.log('📅 Looking for previous period:', previousYear, previousMonth);

    // Find previous period in database
    const previousPeriod = await prisma.period.findFirst({
      where: {
        tahun: previousYear,
        bulan: previousMonth
      }
    });

    if (!previousPeriod) {
      console.log('⚠️ Previous period not found in database');
      return null;
    }

    console.log('📅 Found previous period:', previousPeriod.namaPeriode);

    // Get best employee from previous period
    const bestEmployee = await prisma.finalEvaluation.findFirst({
      where: { 
        periodId: previousPeriod.id,
        isBestEmployee: true
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true,
            profilePicture: true  // Include profile picture
          }
        }
      }
    });

    if (!bestEmployee) {
      console.log('⚠️ No best employee found for previous period');
      return null;
    }

    console.log('🏆 Found best employee:', bestEmployee.user.nama);

    return {
      user: bestEmployee.user,
      finalScore: bestEmployee.finalScore,
      berakhlakScore: bestEmployee.berakhlakScore,
      presensiScore: bestEmployee.presensiScore,
      ckpScore: bestEmployee.ckpScore,
      period: previousPeriod  // Include period info
    };

  } catch (error) {
    console.error('Get best employee for previous period error:', error);
    return null;
  }
};

// 🔥 COMPLETELY FIXED: GET EVALUATION PROGRESS 
const getEvaluationProgress = async (req, res) => {
  try {
    const { periodId } = req.query;

    console.log('📈 Getting evaluation progress - periodId:', periodId);

    // Get active period if not specified
    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
    }

    if (!targetPeriod) {
      console.log('❌ No target period found');
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    console.log('📅 Target period:', targetPeriod.namaPeriode);

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

    console.log('👥 Found eligible users:', allUsers.length);

    // 🔥 FIXED: Get evaluations for this period correctly
    const evaluations = await prisma.evaluation.findMany({
      where: { periodId: targetPeriod.id },
      select: {
        evaluatorId: true,
        targetUserId: true,
        ranking: true
      }
    });

    console.log('📝 Found evaluations:', evaluations.length);

    // 🔥 FIXED: Process evaluations to count per user
    const evaluationsByUser = {};
    evaluations.forEach(evaluation => {
      if (!evaluationsByUser[evaluation.evaluatorId]) {
        evaluationsByUser[evaluation.evaluatorId] = 0;
      }
      evaluationsByUser[evaluation.evaluatorId]++;
    });

    console.log('📊 Evaluations by user:', Object.keys(evaluationsByUser).length, 'users have evaluations');

    // Map evaluation status for each user
    const progress = allUsers.map(user => {
      const evaluationCount = evaluationsByUser[user.id] || 0;
      const isComplete = evaluationCount >= 3; // User needs to evaluate at least 3 people
      
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

    console.log('📊 Progress summary:', summary);

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
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      stat.averageScore = stat.count > 0 ? 
        (stat.totalScore / stat.count).toFixed(2) : 0;
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