const { Op } = require('sequelize');
const { sequelize } = require('../models');

/**
 * Get active period
 */
async function getActivePeriod() {
  const { Period } = require('../models');
  return await Period.findOne({
    where: { isActive: true }
  });
}

/**
 * Get user by username or NIP
 */
async function getUserByUsernameOrNip(identifier) {
  const { User } = require('../models');
  return await User.findOne({
    where: {
      [Op.or]: [
        { username: identifier },
        { nip: identifier }
      ]
    }
  });
}

/**
 * Get evaluation parameters in order
 */
async function getEvaluationParameters() {
  const { EvaluationParameter } = require('../models');
  return await EvaluationParameter.findAll({
    where: { isActive: true },
    order: [['urutan', 'ASC']]
  });
}

/**
 * Check if user has submitted evaluation for period
 */
async function hasUserSubmittedEvaluation(evaluatorId, targetUserId, periodId) {
  const { Evaluation } = require('../models');
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
 * Get system setting value
 */
async function getSystemSetting(key, defaultValue = null) {
  const { SystemSetting } = require('../models');
  const setting = await SystemSetting.findOne({
    where: { key }
  });
  return setting ? setting.value : defaultValue;
}

/**
 * Set system setting value
 */
async function setSystemSetting(key, value, description = null) {
  const { SystemSetting } = require('../models');
  const [setting, created] = await SystemSetting.findOrCreate({
    where: { key },
    defaults: { key, value, description }
  });
  
  if (!created) {
    setting.value = value;
    if (description) setting.description = description;
    await setting.save();
  }
  
  return setting;
}

/**
 * Execute raw SQL query
 */
async function executeRawQuery(query, replacements = {}) {
  try {
    const [results, metadata] = await sequelize.query(query, {
      replacements
    });
    return results;
  } catch (error) {
    console.error('Raw query error:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  const { User, Period, Evaluation, Attendance, CkpScore } = require('../models');
  
  const stats = {
    totalUsers: await User.count(),
    activeUsers: await User.count({ where: { isActive: true } }),
    totalPeriods: await Period.count(),
    activePeriods: await Period.count({ where: { isActive: true } }),
    totalEvaluations: await Evaluation.count(),
    submittedEvaluations: await Evaluation.count({ where: { status: 'SUBMITTED' } }),
    totalAttendance: await Attendance.count(),
    totalCkpScores: await CkpScore.count(),
  };
  
  return stats;
}

module.exports = {
  getActivePeriod,
  getUserByUsernameOrNip,
  getEvaluationParameters,
  hasUserSubmittedEvaluation,
  getSystemSetting,
  setSystemSetting,
  executeRawQuery,
  getDatabaseStats
};