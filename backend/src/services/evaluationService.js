const { sequelize, Evaluation, EvaluationScore, EvaluationParameter, User, Period } = require('../models');
const { validateBerakhlakScore } = require('../utils/validators');

class EvaluationService {
  /**
   * Get evaluation parameters
   */
  static async getEvaluationParameters() {
    return await EvaluationParameter.findAll({
      where: { isActive: true },
      order: [['urutan', 'ASC']]
    });
  }
  
  /**
   * Get users eligible for evaluation
   */
  static async getEligibleUsers(evaluatorId) {
    return await User.findAll({
      where: {
        isActive: true,
        id: { [Op.ne]: evaluatorId }
      },
      attributes: ['id', 'nama', 'nip', 'jabatan'],
      order: [['nama', 'ASC']]
    });
  }
  
  /**
   * Submit evaluation
   */
  static async submitEvaluation(evaluatorId, periodId, targetUserId, scores) {
    const transaction = await sequelize.transaction();
    
    try {
      // Validate all scores
      for (const score of scores) {
        if (!validateBerakhlakScore(score.score)) {
          throw new Error(`Invalid score: ${score.score}. Must be between 80-100`);
        }
      }
      
      // Check if evaluation already exists
      const existingEvaluation = await Evaluation.findOne({
        where: { evaluatorId, periodId, targetUserId }
      });
      
      let evaluation;
      if (existingEvaluation) {
        // Update existing evaluation
        evaluation = existingEvaluation;
        await evaluation.update({
          status: 'SUBMITTED',
          submitDate: new Date()
        }, { transaction });
        
        // Delete existing scores
        await EvaluationScore.destroy({
          where: { evaluationId: evaluation.id },
          transaction
        });
      } else {
        // Create new evaluation
        evaluation = await Evaluation.create({
          evaluatorId,
          periodId,
          targetUserId,
          status: 'SUBMITTED',
          submitDate: new Date()
        }, { transaction });
      }
      
      // Create evaluation scores
      const evaluationScores = scores.map(score => ({
        evaluationId: evaluation.id,
        parameterId: score.parameterId,
        score: score.score
      }));
      
      await EvaluationScore.bulkCreate(evaluationScores, { transaction });
      
      await transaction.commit();
      
      return evaluation;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Get user's evaluations
   */
  static async getUserEvaluations(evaluatorId, periodId) {
    return await Evaluation.findAll({
      where: { evaluatorId, periodId },
      include: [
        {
          model: User,
          as: 'target',
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: EvaluationScore,
          include: [
            {
              model: EvaluationParameter,
              attributes: ['id', 'namaParameter']
            }
          ]
        }
      ]
    });
  }
  
  /**
   * Get evaluation by ID with details
   */
  static async getEvaluationById(id) {
    return await Evaluation.findByPk(id, {
      include: [
        {
          model: User,
          as: 'evaluator',
          attributes: ['id', 'nama', 'username']
        },
        {
          model: User,
          as: 'target',
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          attributes: ['id', 'namaPeriode']
        },
        {
          model: EvaluationScore,
          include: [
            {
              model: EvaluationParameter,
              attributes: ['id', 'namaParameter', 'urutan']
            }
          ],
          order: [['parameter', 'urutan', 'ASC']]
        }
      ]
    });
  }
  
  /**
   * Check if user has submitted evaluation
   */
  static async hasUserSubmittedEvaluation(evaluatorId, targetUserId, periodId) {
    const evaluation = await Evaluation.findOne({
      where: {
        evaluatorId,
        targetUserId,
        periodId,
        status: 'SUBMITTED'
      }
    });
    
    return !!evaluation;
  }
  
  /**
   * Get evaluation statistics for period
   */
  static async getEvaluationStats(periodId) {
    const totalUsers = await User.count({ where: { isActive: true } });
    const totalEvaluations = await Evaluation.count({ where: { periodId } });
    const submittedEvaluations = await Evaluation.count({ 
      where: { periodId, status: 'SUBMITTED' } 
    });
    
    return {
      totalUsers,
      totalEvaluations,
      submittedEvaluations,
      completionRate: totalUsers > 0 ? (submittedEvaluations / totalUsers) * 100 : 0
    };
  }
}

module.exports = EvaluationService;