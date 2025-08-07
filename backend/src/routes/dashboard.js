// routes/dashboard.js - SEQUELIZE VERSION ENHANCED WITH DEBUG ENDPOINT
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

// Import Sequelize models
const { User, Period, Evaluation, Attendance, CkpScore, FinalEvaluation } = require('../../models');
const { Op, fn, col } = require('sequelize');

// All routes require authentication
router.use(authenticateToken);

// 🔥 NEW: Debug endpoint untuk memeriksa data evaluasi
router.get('/debug-data', requireStaffOrAbove, async (req, res) => {
  try {
    const { periodId } = req.query;
    
    // Get active period
    let targetPeriod;
    if (periodId) {
      targetPeriod = await Period.findByPk(periodId);
    } else {
      targetPeriod = await Period.findOne({ where: { isActive: true } });
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
      User.count({ where: { isActive: true } }),
      
      // Total evaluations for period
      Evaluation.count({ where: { periodId: targetPeriod.id } }),
      
      // Evaluation details
      Evaluation.findAll({
        where: { periodId: targetPeriod.id },
        include: [
          {
            model: User,
            as: 'evaluator',
            attributes: ['nama', 'role']
          },
          {
            model: User,
            as: 'target',
            attributes: ['nama']
          }
        ],
        limit: 10,
        order: [['submitDate', 'DESC']]
      }),
      
      // Evaluation counts by user
      Evaluation.findAll({
        where: { periodId: targetPeriod.id },
        attributes: [
          'evaluatorId',
          [fn('COUNT', col('evaluatorId')), 'count']
        ],
        group: ['evaluatorId'],
        raw: true
      }),
      
      // All periods
      Period.findAll({
        order: [
          ['isActive', 'DESC'],
          ['tahun', 'DESC'],
          ['bulan', 'DESC']
        ],
        limit: 5
      }),
      
      // Sample users
      User.findAll({
        where: { isActive: true },
        attributes: ['id', 'nama', 'role'],
        limit: 10
      })
    ]);

    // Calculate completed evaluations
    const completedEvaluations = evaluationCounts.filter(e => e.count >= 3);
    
    // Enhanced user evaluation status
    const userEvaluationStatus = await Promise.all(
      sampleUsers.map(async (user) => {
        const userEvalCount = evaluationCounts.find(e => e.evaluatorId === user.id);
        const count = userEvalCount ? userEvalCount.count : 0;
        
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
        count: e.count
      })),
      recentEvaluations: evaluationDetails.map(e => ({
        id: e.id,
        evaluator: e.evaluator.nama,
        evaluatorRole: e.evaluator.role,
        target: e.target.nama,
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
      targetPeriod = await Period.findByPk(periodId);
    } else {
      targetPeriod = await Period.findOne({ where: { isActive: true } });
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
    
    const totalUsers = await User.count({ 
      where: { isActive: true } 
    });
    
    const allEvaluations = await Evaluation.findAll({
      where,
      include: [
        {
          model: User,
          as: 'evaluator',
          attributes: ['nama', 'role']
        },
        {
          model: User,
          as: 'target',
          attributes: ['nama']
        }
      ]
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