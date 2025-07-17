// routes/dashboard.js - ENHANCED WITH DEBUG ENDPOINT
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getDashboardStats,
  getEvaluationProgress,
  getChartsData,
  getRecentActivities
} = require('../controllers/dashboardController');

// Import middleware
const { 
  authenticateToken, 
  requirePimpinan,
  requireStaffOrAbove
} = require('../middleware/auth');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

// 🔥 NEW: Debug endpoint untuk memeriksa data evaluasi
router.get('/debug-data', requireStaffOrAbove, async (req, res) => {
  try {
    const { periodId } = req.query;
    
    // Get active period
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

    // Get comprehensive debug data
    const [
      totalUsers,
      totalEvaluations,
      evaluationDetails,
      evaluationCounts,
      periods,
      sampleUsers
    ] = await Promise.all([
      // Total users
      prisma.user.count({ where: { isActive: true } }),
      
      // Total evaluations for period
      prisma.evaluation.count({ where: { periodId: targetPeriod.id } }),
      
      // Evaluation details
      prisma.evaluation.findMany({
        where: { periodId: targetPeriod.id },
        include: {
          evaluator: { select: { nama: true, role: true } },
          target: { select: { nama: true } }
        },
        take: 10,
        orderBy: { submitDate: 'desc' }
      }),
      
      // Evaluation counts by user
      prisma.evaluation.groupBy({
        by: ['evaluatorId'],
        where: { periodId: targetPeriod.id },
        _count: { evaluatorId: true }
      }),
      
      // All periods
      prisma.period.findMany({
        orderBy: [{ isActive: 'desc' }, { tahun: 'desc' }, { bulan: 'desc' }],
        take: 5
      }),
      
      // Sample users
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, nama: true, role: true },
        take: 10
      })
    ]);

    // Calculate completed evaluations
    const completedEvaluations = evaluationCounts.filter(e => e._count.evaluatorId >= 3);
    
    // Enhanced user evaluation status
    const userEvaluationStatus = await Promise.all(
      sampleUsers.map(async (user) => {
        const userEvalCount = evaluationCounts.find(e => e.evaluatorId === user.id);
        const count = userEvalCount ? userEvalCount._count.evaluatorId : 0;
        
        return {
          userId: user.id,
          nama: user.nama,
          role: user.role,
          evaluationCount: count,
          isComplete: count >= 3,
          status: count >= 3 ? 'COMPLETE' : count > 0 ? 'PARTIAL' : 'NOT_STARTED'
        };
      })
    );

    const debugData = {
      period: {
        id: targetPeriod.id,
        name: targetPeriod.namaPeriode,
        isActive: targetPeriod.isActive
      },
      counts: {
        totalUsers,
        totalEvaluations,
        uniqueEvaluators: evaluationCounts.length,
        completedEvaluations: completedEvaluations.length,
        completionRate: totalUsers > 0 ? Math.round((completedEvaluations.length / totalUsers) * 100) : 0
      },
      evaluationCounts: evaluationCounts.map(e => ({
        evaluatorId: e.evaluatorId,
        count: e._count.evaluatorId
      })),
      recentEvaluations: evaluationDetails.map(e => ({
        id: e.id,
        evaluator: e.evaluator.nama,
        evaluatorRole: e.evaluator.role,
        target: e.target.nama,
        ranking: e.ranking,
        submitDate: e.submitDate
      })),
      userStatus: userEvaluationStatus,
      periods: periods.map(p => ({
        id: p.id,
        name: p.namaPeriode,
        isActive: p.isActive,
        tahun: p.tahun,
        bulan: p.bulan
      })),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: debugData
    });

  } catch (error) {
    console.error('Debug data error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
});

// 🔥 ENHANCED: Stats endpoint with forced refresh
router.get('/stats-force', requireStaffOrAbove, async (req, res) => {
  try {
    const { periodId } = req.query;
    
    // Get active period
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

    // Force recalculate everything
    const where = { periodId: targetPeriod.id };
    
    // Get fresh data with detailed logging
    console.log('🔄 FORCE REFRESH - Period:', targetPeriod.namaPeriode);
    
    const totalUsers = await prisma.user.count({ 
      where: { isActive: true } 
    });
    
    const allEvaluations = await prisma.evaluation.findMany({
      where,
      include: {
        evaluator: { select: { nama: true, role: true } },
        target: { select: { nama: true } }
      }
    });
    
    console.log('📊 FORCE REFRESH DATA:', {
      totalUsers,
      totalEvaluations: allEvaluations.length,
      uniqueEvaluators: [...new Set(allEvaluations.map(e => e.evaluatorId))].length
    });
    
    // Group by evaluator
    const evaluatorStats = {};
    allEvaluations.forEach(eval => {
      if (!evaluatorStats[eval.evaluatorId]) {
        evaluatorStats[eval.evaluatorId] = {
          nama: eval.evaluator.nama,
          role: eval.evaluator.role,
          count: 0
        };
      }
      evaluatorStats[eval.evaluatorId].count++;
    });
    
    // Calculate completed users
    const completedUsers = Object.values(evaluatorStats).filter(user => user.count >= 3);
    
    console.log('📊 EVALUATOR STATS:', evaluatorStats);
    console.log('✅ COMPLETED USERS:', completedUsers.length);
    
    const stats = {
      period: {
        id: targetPeriod.id,
        name: targetPeriod.namaPeriode,
        isActive: targetPeriod.isActive
      },
      overview: {
        totalUsers,
        activeUsers: Object.keys(evaluatorStats).length,
        participationRate: totalUsers > 0 ? 
          ((Object.keys(evaluatorStats).length / totalUsers) * 100).toFixed(1) : 0,
        totalEvaluations: allEvaluations.length,
        completedEvaluations: completedUsers.length,
        completionRate: totalUsers > 0 ? 
          ((completedUsers.length / totalUsers) * 100).toFixed(1) : 0
      },
      scores: {
        attendance: { average: 100.0, count: 0 },
        ckp: { average: 98.0, count: 0 },
        final: { average: 0, count: 0 }
      },
      evaluatorStats,
      completedUsers,
      forceRefresh: true,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Force stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
});

// Original endpoints with different permission levels
router.get('/stats', requireStaffOrAbove, getDashboardStats);           
router.get('/evaluation-progress', requirePimpinan, getEvaluationProgress); 
router.get('/charts', requirePimpinan, getChartsData);                  
router.get('/activities', requirePimpinan, getRecentActivities);        

module.exports = router;