const { Period } = require('../models');
const { validatePeriod } = require('../utils/validators');

class PeriodService {
  /**
   * Get all periods
   */
  static async getAllPeriods(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { rows: periods, count: total } = await Period.findAndCountAll({
      limit,
      offset,
      order: [['tahun', 'DESC'], ['bulan', 'DESC']]
    });
    
    return {
      periods,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get active period
   */
  static async getActivePeriod() {
    return await Period.findOne({
      where: { isActive: true }
    });
  }
  
  /**
   * Create new period
   */
  static async createPeriod(tahun, bulan, namaPeriode, startDate, endDate) {
    if (!validatePeriod(tahun, bulan)) {
      throw new Error('Invalid period data');
    }
    
    // Check if period already exists
    const existingPeriod = await Period.findOne({
      where: { tahun, bulan }
    });
    
    if (existingPeriod) {
      throw new Error('Period already exists');
    }
    
    return await Period.create({
      tahun,
      bulan,
      namaPeriode,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: false
    });
  }
  
  /**
   * Update period
   */
  static async updatePeriod(id, updateData) {
    const period = await Period.findByPk(id);
    if (!period) {
      throw new Error('Period not found');
    }
    
    if (updateData.tahun && updateData.bulan) {
      if (!validatePeriod(updateData.tahun, updateData.bulan)) {
        throw new Error('Invalid period data');
      }
      
      // Check uniqueness
      const existingPeriod = await Period.findOne({
        where: {
          tahun: updateData.tahun,
          bulan: updateData.bulan,
          id: { [Op.ne]: id }
        }
      });
      
      if (existingPeriod) {
        throw new Error('Period already exists');
      }
    }
    
    await period.update(updateData);
    return period;
  }
  
  /**
   * Set active period
   */
  static async setActivePeriod(id) {
    const transaction = await sequelize.transaction();
    
    try {
      // Deactivate all periods
      await Period.update(
        { isActive: false },
        { where: {}, transaction }
      );
      
      // Activate selected period
      const period = await Period.findByPk(id);
      if (!period) {
        throw new Error('Period not found');
      }
      
      await period.update({ isActive: true }, { transaction });
      
      await transaction.commit();
      return period;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Delete period
   */
  static async deletePeriod(id) {
    const period = await Period.findByPk(id);
    if (!period) {
      throw new Error('Period not found');
    }
    
    if (period.isActive) {
      throw new Error('Cannot delete active period');
    }
    
    await period.destroy();
    return { message: 'Period deleted successfully' };
  }
}

module.exports = PeriodService;