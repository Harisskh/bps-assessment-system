// controllers/monitoringController.js - SEQUELIZE VERSION FIXED FOR NEW SYSTEM (1 EVALUATION)
const { User, Period, Evaluation, EvaluationScore, EvaluationParameter } = require('../../models');
const { Op, fn, col } = require('sequelize');

// GET EVALUATION STATUS (updated for new system - 1 evaluation only)
const getEvaluationStatus = async (req, res) => {
  try {
    const { periodId } = req.query;

    console.log('🔄 Getting evaluation status for period:', periodId);

    // Get active period if not specified
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

    console.log('📅 Target period:', targetPeriod.namaPeriode);

    // Get all eligible users (STAFF and PIMPINAN only)
    const allUsers = await User.findAll({
      where: { 
        isActive: true, 
        role: { [Op.in]: ['STAFF', 'PIMPINAN'] } 
      },
      attributes: ['id', 'nip', 'nama', 'jabatan', 'role', 'mobilePhone', 'email'],
      order: [['nama', 'ASC']]
    });

    console.log('👥 Found users:', allUsers.length);

    // 🔥 FIXED: Get evaluations for this period (NEW SYSTEM - no ranking needed)
    const evaluations = await Evaluation.findAll({
      where: { periodId: targetPeriod.id },
      attributes: ['id', 'evaluatorId', 'targetUserId', 'submitDate'],
      include: [
        {
          model: User,
          as: 'target',
          attributes: ['id', 'nama', 'jabatan']
        }
      ],
      order: [['submitDate', 'DESC']]
    });

    console.log('📝 Found evaluations:', evaluations.length);

    // 🔥 FIXED: Group evaluations by evaluator (new system)
    const evaluationsByUser = {};
    evaluations.forEach(evaluation => {
      if (!evaluationsByUser[evaluation.evaluatorId]) {
        evaluationsByUser[evaluation.evaluatorId] = [];
      }
      evaluationsByUser[evaluation.evaluatorId].push(evaluation);
    });

    // 🔥 FIXED: Map status for each user (NEW SYSTEM - only need 1 evaluation)
    const userStatuses = allUsers.map(user => {
      const userEvaluations = evaluationsByUser[user.id] || [];
      
      // 🔥 NEW SYSTEM: Complete if user has at least 1 evaluation
      const isComplete = userEvaluations.length >= 1;
      const completedCount = userEvaluations.length;

      let status = 'NOT_STARTED';
      if (isComplete) {
        status = 'COMPLETE';
      }

      const lastSubmission = userEvaluations.length > 0 
        ? Math.max(...userEvaluations.map(e => new Date(e.submitDate).getTime()))
        : null;

      return {
        user: {
          id: user.id,
          nip: user.nip,
          nama: user.nama,
          jabatan: user.jabatan,
          role: user.role,
          mobilePhone: user.mobilePhone,
          email: user.email
        },
        status,
        completedCount,
        requiredCount: 1, // NEW SYSTEM: only need 1 evaluation
        missingCount: Math.max(0, 1 - completedCount),
        lastSubmission: lastSubmission ? new Date(lastSubmission) : null,
        evaluations: userEvaluations.map(e => ({
          id: e.id,
          targetId: e.targetUserId,
          targetName: e.target.nama,
          targetJabatan: e.target.jabatan,
          submitDate: e.submitDate
        }))
      };
    });

    // 🔥 FIXED: Summary statistics (new system)
    const summary = {
      total: allUsers.length,
      completed: userStatuses.filter(u => u.status === 'COMPLETE').length,
      notStarted: userStatuses.filter(u => u.status === 'NOT_STARTED').length,
      completionRate: allUsers.length > 0 
        ? Math.round((userStatuses.filter(u => u.status === 'COMPLETE').length / allUsers.length) * 100)
        : 0
    };

    console.log('📊 Summary:', summary);

    res.json({
      success: true,
      data: {
        period: {
          id: targetPeriod.id,
          name: targetPeriod.namaPeriode,
          isActive: targetPeriod.isActive
        },
        summary,
        userStatuses,
        systemInfo: {
          type: 'NEW_SYSTEM',
          requiredEvaluations: 1,
          description: 'Sistem baru: hanya perlu 1 evaluasi untuk dianggap selesai'
        }
      }
    });

  } catch (error) {
    console.error('❌ Get evaluation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET INCOMPLETE USERS (updated for new system)
const getIncompleteUsers = async (req, res) => {
  try {
    const { periodId } = req.query;

    console.log('🔄 Getting incomplete users for period:', periodId);

    // Get active period if not specified
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

    // Get all eligible users
    const allUsers = await User.findAll({
      where: { 
        isActive: true, 
        role: { [Op.in]: ['STAFF', 'PIMPINAN'] } 
      },
      attributes: ['id', 'nip', 'nama', 'jabatan', 'role', 'mobilePhone', 'email']
    });

    // 🔥 FIXED: Get evaluation counts per user (new system)
    const evaluationCounts = await Evaluation.findAll({
      where: { periodId: targetPeriod.id },
      attributes: [
        'evaluatorId',
        [fn('COUNT', col('evaluatorId')), 'count']
      ],
      group: ['evaluatorId'],
      raw: true
    });

    // Convert to map for easier lookup
    const evaluationCountMap = {};
    evaluationCounts.forEach(item => {
      evaluationCountMap[item.evaluatorId] = parseInt(item.count);
    });

    // 🔥 FIXED: Filter incomplete users (new system - need at least 1 evaluation)
    const incompleteUsers = allUsers.filter(user => {
      const count = evaluationCountMap[user.id] || 0;
      return count < 1; // NEW SYSTEM: incomplete if less than 1 evaluation
    });

    // Get detailed status for incomplete users
    const detailedStatuses = await Promise.all(
      incompleteUsers.map(async (user) => {
        const userEvaluations = await Evaluation.findAll({
          where: {
            evaluatorId: user.id,
            periodId: targetPeriod.id
          },
          attributes: ['id', 'targetUserId', 'submitDate'],
          include: [
            {
              model: User,
              as: 'target',
              attributes: ['nama', 'jabatan']
            }
          ]
        });

        const completedCount = userEvaluations.length;
        const requiredCount = 1; // NEW SYSTEM
        const missingCount = Math.max(0, requiredCount - completedCount);

        return {
          user: user.toJSON(),
          completedCount,
          requiredCount,
          missingCount,
          lastActivity: userEvaluations.length > 0 
            ? Math.max(...userEvaluations.map(e => new Date(e.submitDate).getTime()))
            : null,
          evaluations: userEvaluations.map(e => e.toJSON())
        };
      })
    );

    // Sort by priority (those who started but didn't finish first)
    detailedStatuses.sort((a, b) => {
      if (a.completedCount > 0 && b.completedCount === 0) return -1;
      if (a.completedCount === 0 && b.completedCount > 0) return 1;
      return b.completedCount - a.completedCount;
    });

    console.log('❌ Incomplete users:', detailedStatuses.length);

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
          systemType: 'NEW_SYSTEM',
          requiredEvaluations: 1
        },
        incompleteUsers: detailedStatuses
      }
    });

  } catch (error) {
    console.error('❌ Get incomplete users error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET DETAILED USER EVALUATION STATUS (updated for new system)
const getUserEvaluationDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { periodId } = req.query;

    console.log('👤 Getting user detail:', userId, 'for period:', periodId);

    // Get active period if not specified
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

    // Get user info
    const user = await User.findByPk(userId, {
      attributes: ['id', 'nip', 'nama', 'jabatan', 'role', 'mobilePhone', 'email']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // 🔥 FIXED: Get user's evaluations for this period (new system)
    const evaluations = await Evaluation.findAll({
      where: {
        evaluatorId: userId,
        periodId: targetPeriod.id
      },
      include: [
        {
          model: User,
          as: 'target',
          attributes: ['id', 'nama', 'jabatan']
        },
        {
          model: EvaluationScore,
          as: 'scores',
          include: [
            {
              model: EvaluationParameter,
              as: 'parameter',
              attributes: ['namaParameter', 'urutan']
            }
          ],
          order: [
            [{ model: EvaluationParameter, as: 'parameter' }, 'urutan', 'ASC']
          ]
        }
      ],
      order: [['submitDate', 'DESC']]
    });

    const completedCount = evaluations.length;
    const requiredCount = 1; // NEW SYSTEM
    const missingCount = Math.max(0, requiredCount - completedCount);
    const isComplete = completedCount >= requiredCount;

    const detailData = {
      user: user.toJSON(),
      period: {
        id: targetPeriod.id,
        name: targetPeriod.namaPeriode
      },
      summary: {
        completedCount,
        requiredCount,
        missingCount,
        isComplete,
        systemType: 'NEW_SYSTEM'
      },
      evaluations: evaluations.map(evaluation => ({
        id: evaluation.id,
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

    console.log('✅ User detail prepared for:', user.nama);

    res.json({
      success: true,
      data: detailData
    });

  } catch (error) {
    console.error('❌ Get user evaluation detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getEvaluationStatus,
  getIncompleteUsers,
  getUserEvaluationDetail
};