// controllers/dashboardController.js - FIXED FOR NEW SYSTEM (1 EVALUATION)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 🔥 FIXED: GET DASHBOARD OVERVIEW STATISTICS WITH NEW SYSTEM LOGIC
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
      // 🔥 STEP 1: Get REAL-TIME total users count (EXCLUDE ADMIN)
      const totalUsers = await prisma.user.count({ 
        where: { 
          isActive: true,
          role: { not: 'ADMIN' } // 🔥 EXCLUDE ADMIN from count
        } 
      }).catch(e => {
        console.error('Error counting users:', e);
        return 0;
      });

      console.log('👥 Total active users (excluding admin):', totalUsers);

      // 🔥 STEP 2: Get all evaluations for this period with detailed info
      const allEvaluations = await prisma.evaluation.findMany({
        where,
        select: {
          id: true,
          evaluatorId: true,
          targetUserId: true,
          ranking: true,
          evaluator: {
            select: {
              nama: true,
              role: true
            }
          },
          target: {
            select: {
              nama: true
            }
          }
        }
      }).catch(e => {
        console.error('Error getting all evaluations:', e);
        return [];
      });

      console.log('📝 ALL EVALUATIONS FOR PERIOD:', {
        totalEvaluations: allEvaluations.length,
        evaluators: [...new Set(allEvaluations.map(e => e.evaluatorId))].length,
        sampleEvaluations: allEvaluations.slice(0, 3).map(e => ({
          evaluator: e.evaluator?.nama,
          target: e.target?.nama,
          ranking: e.ranking
        }))
      });

      // 🔥 STEP 3: Get detailed evaluation counts per user (EXCLUDE ADMIN)
      const evaluationCounts = await prisma.evaluation.groupBy({
        by: ['evaluatorId'],
        where,
        _count: { evaluatorId: true }
      }).catch(e => {
        console.error('Error grouping evaluations by user:', e);
        return [];
      });

      // 🔥 STEP 4: Filter out ADMIN from evaluation counts
      const nonAdminEvaluationCounts = [];
      for (const userCount of evaluationCounts) {
        const user = await prisma.user.findUnique({
          where: { id: userCount.evaluatorId },
          select: { nama: true, role: true }
        });
        
        if (user && user.role !== 'ADMIN') {
          nonAdminEvaluationCounts.push(userCount);
          console.log(`  - ${user.nama} (${user.role}): ${userCount._count.evaluatorId} evaluations`);
        } else if (user && user.role === 'ADMIN') {
          console.log(`  - ${user.nama} (ADMIN): ${userCount._count.evaluatorId} evaluations [EXCLUDED]`);
        }
      }

      // 🔥 FIXED: NEW SYSTEM - Filter users who have completed 1+ evaluations (not 3+)
      const completedUsers = nonAdminEvaluationCounts.filter(
        userEval => userEval._count.evaluatorId >= 1 // 🔥 CHANGED: 1 evaluation = complete
      );

      console.log('✅ NON-ADMIN Users who completed 1+ evaluations:', completedUsers.length);
      console.log('📊 Completion breakdown:', {
        'totalEligibleUsers': totalUsers,
        'usersWithEvaluations': nonAdminEvaluationCounts.length,
        'completed1Plus': completedUsers.length,
        'withNoEvaluations': totalUsers - nonAdminEvaluationCounts.length
      });

      // 🔥 STEP 5: Total evaluation count
      const totalEvaluations = allEvaluations.length;

      // 🔥 STEP 6: Get score statistics
      const [attendanceData, ckpData, finalEvaluationData] = await Promise.all([
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
        })
      ]);

      // 🔥 STEP 7: Get best employee from PREVIOUS period (not current)
      const bestEmployee = await getBestEmployeeFromPreviousPeriod(targetPeriod).catch(e => {
        console.error('Error getting best employee from previous period:', e);
        return null;
      });

      // 🔥 STEP 8: Calculate completion rates (based on non-admin users)
      const participationRate = totalUsers > 0 ? 
        ((nonAdminEvaluationCounts.length / totalUsers) * 100).toFixed(1) : 0;
      
      const completionRate = totalUsers > 0 ? 
        ((completedUsers.length / totalUsers) * 100).toFixed(1) : 0;

      console.log('📊 FINAL STATS CALCULATION (NEW SYSTEM):', {
        totalUsers: totalUsers, // Should be 32 (excluding admin)
        usersWithEvaluations: nonAdminEvaluationCounts.length,
        completedUsers: completedUsers.length, // 🔥 CHANGED: Users with 1+ evaluations
        participationRate,
        completionRate,
        totalEvaluations,
        systemType: 'NEW_SYSTEM_1_EVALUATION'
      });

      const stats = {
        period: {
          id: targetPeriod.id,
          name: targetPeriod.namaPeriode,
          isActive: targetPeriod.isActive
        },
        overview: {
          totalUsers,                                        // ✅ 32 users (excluding admin)
          activeUsers: nonAdminEvaluationCounts.length,      // Non-admin users who have submitted evaluations
          participationRate,                                 // Percentage of non-admin users who participated
          totalEvaluations,                                  // Total number of evaluations submitted
          completedEvaluations: completedUsers.length,       // ✅ Non-admin users who completed 1+ evaluations
          completionRate,                                    // ✅ Accurate completion percentage
          systemType: 'NEW_SYSTEM_1_EVALUATION'             // 🔥 NEW: System type indicator
        },
        scores: {
          attendance: {
            average: attendanceData._avg?.nilaiPresensi || 100.0,
            count: attendanceData._count?.id || 0
          },
          ckp: {
            average: ckpData._avg?.score || 98.0,
            count: ckpData._count?.id || 0
          },
          final: {
            average: finalEvaluationData._avg?.finalScore || 0,
            count: finalEvaluationData._count?.id || 0
          }
        },
        bestEmployee, // ✅ From PREVIOUS period
        // Debug info for development
        debug: process.env.NODE_ENV === 'development' ? {
          periodId: targetPeriod.id,
          nonAdminEvaluationCounts,
          evaluationsSample: allEvaluations.slice(0, 3),
          systemType: 'NEW_SYSTEM_1_EVALUATION'
        } : undefined
      };

      console.log('✅ Dashboard stats completed successfully (NEW SYSTEM)');

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

// 🔥 FIXED: Helper function to get best employee from PREVIOUS period (not current)
const getBestEmployeeFromPreviousPeriod = async (currentPeriod) => {
  try {
    console.log('🏆 Getting best employee from PREVIOUS period. Current:', currentPeriod.namaPeriode);

    // Calculate previous period
    let previousYear = currentPeriod.tahun;
    let previousMonth = currentPeriod.bulan - 1;
    
    if (previousMonth < 1) {
      previousMonth = 12;
      previousYear = currentPeriod.tahun - 1;
    }
    
    console.log('📅 Looking for PREVIOUS period:', previousYear, previousMonth);

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

    console.log('📅 Found PREVIOUS period:', previousPeriod.namaPeriode);

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
            profilePicture: true
          }
        }
      }
    });

    if (!bestEmployee) {
      console.log('⚠️ No best employee found for PREVIOUS period');
      return null;
    }

    console.log('🏆 Found best employee from PREVIOUS period:', bestEmployee.user.nama);

    return {
      user: bestEmployee.user,
      finalScore: bestEmployee.finalScore,
      berakhlakScore: bestEmployee.berakhlakScore,
      presensiScore: bestEmployee.presensiScore,
      ckpScore: bestEmployee.ckpScore,
      period: previousPeriod  // ✅ Include PREVIOUS period info
    };

  } catch (error) {
    console.error('Get best employee from previous period error:', error);
    return null;
  }
};

// 🔥 FIXED: GET EVALUATION PROGRESS WITH NEW SYSTEM LOGIC (1 EVALUATION)
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

    // 🔥 FIXED: Get ALL users EXCEPT ADMIN
    const allUsers = await prisma.user.findMany({
      where: { 
        isActive: true,
        role: { not: 'ADMIN' } // ✅ EXCLUDE ADMIN
      },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        role: true
      },
      orderBy: { nama: 'asc' }
    });

    console.log('👥 Found eligible users (excluding admin):', allUsers.length);

    // 🔥 ENHANCED: Get evaluations for this period with detailed logging
    const evaluations = await prisma.evaluation.findMany({
      where: { periodId: targetPeriod.id },
      select: {
        evaluatorId: true,
        targetUserId: true,
        ranking: true,
        evaluator: {
          select: {
            nama: true,
            role: true
          }
        }
      }
    });

    console.log('📝 Found evaluations:', evaluations.length);
    console.log('📝 Unique evaluators:', [...new Set(evaluations.map(e => e.evaluatorId))].length);

    // 🔥 ENHANCED: Process evaluations to count per user (exclude admin evaluations)
    const evaluationsByUser = {};
    evaluations.forEach(evaluation => {
      // Only count if evaluator is not admin
      if (evaluation.evaluator.role !== 'ADMIN') {
        if (!evaluationsByUser[evaluation.evaluatorId]) {
          evaluationsByUser[evaluation.evaluatorId] = 0;
        }
        evaluationsByUser[evaluation.evaluatorId]++;
      }
    });

    console.log('📊 NON-ADMIN Evaluations by user:');
    Object.entries(evaluationsByUser).forEach(([userId, count]) => {
      const user = allUsers.find(u => u.id === userId);
      console.log(`  - ${user?.nama || 'Unknown'}: ${count} evaluations`);
    });

    // 🔥 FIXED: Map evaluation status for each user (NEW SYSTEM - 1 evaluation = complete)
    const progress = allUsers.map(user => {
      const evaluationCount = evaluationsByUser[user.id] || 0;
      const isComplete = evaluationCount >= 1; // 🔥 CHANGED: Only need 1 evaluation to complete
      
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

    // 🔥 ENHANCED: Summary statistics with correct calculations (NEW SYSTEM)
    const summary = {
      total: allUsers.length,                                     // ✅ Should be 32 (excluding admin)
      completed: progress.filter(p => p.isComplete).length,      // Users who completed 1+ evaluations
      partial: progress.filter(p => p.status === 'PARTIAL').length, // This should be 0 in new system
      notStarted: progress.filter(p => p.status === 'NOT_STARTED').length,
      systemType: 'NEW_SYSTEM_1_EVALUATION'
    };

    console.log('📊 PROGRESS SUMMARY (NEW SYSTEM - EXCLUDING ADMIN):', summary);
    console.log('📊 Completed users:', progress.filter(p => p.isComplete).map(p => p.user.nama));

    res.json({
      success: true,
      data: {
        period: {
          id: targetPeriod.id,
          name: targetPeriod.namaPeriode
        },
        summary,
        progress,
        // Debug info for development
        debug: process.env.NODE_ENV === 'development' ? {
          totalEvaluations: evaluations.length,
          nonAdminEvaluators: Object.keys(evaluationsByUser).length,
          evaluationsByUser,
          systemType: 'NEW_SYSTEM_1_EVALUATION'
        } : undefined
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

// Keep other functions the same...
const getChartsData = async (req, res) => {
  try {
    const { periodId } = req.query;

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
      take: 10
    });

    const evaluationsByRanking = await prisma.evaluation.groupBy({
      by: ['ranking'],
      where,
      _count: { ranking: true }
    });

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

const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

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
      message: `${evaluation.evaluator.nama} menilai ${evaluation.target.nama} sebagai Tokoh BerAKHLAK`,
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