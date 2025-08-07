const { sequelize, FinalEvaluation, User, Period, Evaluation, EvaluationScore, Attendance, CkpScore } = require('../models');

class FinalEvaluationService {
  /**
   * Calculate final evaluations for a period
   */
  static async calculateFinalEvaluations(periodId) {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🔄 Calculating final evaluations for period ${periodId}...`);
      
      // Get all active users
      const users = await User.findAll({
        where: { isActive: true },
        attributes: ['id', 'nama', 'nip']
      });
      
      const results = [];
      
      for (const user of users) {
        // Calculate BerAKHLAK score
        const berakhlakScore = await this.calculateBerakhlakScore(user.id, periodId);
        
        // Get attendance score
        const attendance = await Attendance.findOne({
          where: { userId: user.id, periodId }
        });
        const presensiScore = attendance ? attendance.nilaiPresensi : 0;
        
        // Get CKP score
        const ckp = await CkpScore.findOne({
          where: { userId: user.id, periodId }
        });
        const ckpScore = ckp ? ckp.score : 0;
        
        // Get total evaluators count
        const totalEvaluators = await Evaluation.count({
          where: {
            targetUserId: user.id,
            periodId,
            status: 'SUBMITTED'
          }
        });
        
        // Calculate weighted scores
        const berakhlakWeighted = berakhlakScore * 0.30;
        const presensiWeighted = presensiScore * 0.40;
        const ckpWeighted = ckpScore * 0.30;
        const finalScore = berakhlakWeighted + presensiWeighted + ckpWeighted;
        
        // Upsert final evaluation
        const [finalEvaluation, created] = await FinalEvaluation.findOrCreate({
          where: { userId: user.id, periodId },
          defaults: {
            berakhlakScore,
            presensiScore,
            ckpScore,
            berakhlakWeighted,
            presensiWeighted,
            ckpWeighted,
            finalScore,
            totalEvaluators,
            isCandidate: false,
            isBestEmployee: false
          },
          transaction
        });
        
        if (!created) {
          await finalEvaluation.update({
            berakhlakScore,
            presensiScore,
            ckpScore,
            berakhlakWeighted,
            presensiWeighted,
            ckpWeighted,
            finalScore,
            totalEvaluators
          }, { transaction });
        }
        
        results.push(finalEvaluation);
      }
      
      // Determine candidates and best employee
      await this.determineCandidatesAndBestEmployee(periodId, transaction);
      
      await transaction.commit();
      
      console.log(`✅ Final evaluations calculated for ${results.length} users`);
      return results;
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Final evaluation calculation failed:', error);
      throw error;
    }
  }
  
  /**
   * Calculate BerAKHLAK score for a user
   */
  static async calculateBerakhlakScore(userId, periodId) {
    // Get all evaluations for this user
    const evaluations = await Evaluation.findAll({
      where: {
        targetUserId: userId,
        periodId,
        status: 'SUBMITTED'
      },
      include: [
        {
          model: EvaluationScore,
          include: [
            {
              model: EvaluationParameter,
              attributes: ['id', 'urutan']
            }
          ]
        }
      ]
    });
    
    if (evaluations.length === 0) {
      return 0;
    }
    
    // Group scores by parameter
    const parameterScores = {};
    
    evaluations.forEach(evaluation => {
      evaluation.EvaluationScores.forEach(score => {
        const parameterId = score.parameterId;
        if (!parameterScores[parameterId]) {
          parameterScores[parameterId] = [];
        }
        parameterScores[parameterId].push(score.score);
      });
    });
    
    // Calculate average for each parameter
    const parameterAverages = [];
    Object.keys(parameterScores).forEach(parameterId => {
      const scores = parameterScores[parameterId];
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      parameterAverages.push(average);
    });
    
    // Calculate final BerAKHLAK score
    if (parameterAverages.length === 0) {
      return 0;
    }
    
    const totalScore = parameterAverages.reduce((sum, avg) => sum + avg, 0);
    return totalScore / parameterAverages.length;
  }
  
  /**
   * Determine candidates and best employee
   */
  static async determineCandidatesAndBestEmployee(periodId, transaction) {
    // Get all final evaluations ordered by total evaluators and final score
    const finalEvaluations = await FinalEvaluation.findAll({
      where: { periodId },
      order: [
        ['totalEvaluators', 'DESC'],
        ['finalScore', 'DESC']
      ],
      transaction
    });
    
    if (finalEvaluations.length === 0) {
      return;
    }
    
    // Reset all candidates and best employee flags
    await FinalEvaluation.update(
      { 
        isCandidate: false, 
        isBestEmployee: false, 
        ranking: null 
      },
      { 
        where: { periodId }, 
        transaction 
      }
    );
    
    // Find top 2 evaluator counts
    const evaluatorCounts = [...new Set(finalEvaluations.map(fe => fe.totalEvaluators))]
      .sort((a, b) => b - a)
      .slice(0, 2);
    
    // Mark candidates (top 2 evaluator count groups)
    const candidates = finalEvaluations.filter(fe => 
      evaluatorCounts.includes(fe.totalEvaluators)
    );
    
    for (let i = 0; i < candidates.length; i++) {
      await candidates[i].update({
        isCandidate: true,
        ranking: i + 1
      }, { transaction });
    }
    
    // Mark best employee (highest score among candidates)
    if (candidates.length > 0) {
      const bestEmployee = candidates.reduce((best, current) => 
        current.finalScore > best.finalScore ? current : best
      );
      
      await bestEmployee.update({
        isBestEmployee: true
      }, { transaction });
    }
  }
  
  /**
   * Get final evaluation results
   */
  static async getFinalEvaluationResults(periodId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { rows: results, count: total } = await FinalEvaluation.findAndCountAll({
      where: { periodId },
      include: [
        {
          model: User,
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          attributes: ['id', 'namaPeriode']
        }
      ],
      limit,
      offset,
      order: [
        ['isBestEmployee', 'DESC'],
        ['isCandidate', 'DESC'],
        ['finalScore', 'DESC']
      ]
    });
    
    return {
      results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get best employee for period
   */
  static async getBestEmployee(periodId) {
    return await FinalEvaluation.findOne({
      where: { periodId, isBestEmployee: true },
      include: [
        {
          model: User,
          attributes: ['id', 'nama', 'nip', 'jabatan', 'profilePicture']
        },
        {
          model: Period,
          attributes: ['id', 'namaPeriode']
        }
      ]
    });
  }
  
  /**
   * Get candidates for period
   */
  static async getCandidates(periodId) {
    return await FinalEvaluation.findAll({
      where: { periodId, isCandidate: true },
      include: [
        {
          model: User,
          attributes: ['id', 'nama', 'nip', 'jabatan', 'profilePicture']
        }
      ],
      order: [['finalScore', 'DESC']]
    });
  }
}

module.exports = FinalEvaluationService;