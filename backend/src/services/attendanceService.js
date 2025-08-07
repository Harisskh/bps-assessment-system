const { Attendance, User, Period } = require('../models');
const { validateAttendanceScore } = require('../utils/validators');

class AttendanceService {
  /**
   * Get attendance records for period
   */
  static async getAttendanceByPeriod(periodId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const { rows: attendance, count: total } = await Attendance.findAndCountAll({
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
      order: [['User', 'nama', 'ASC']]
    });
    
    return {
      attendance,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Create or update attendance
   */
  static async upsertAttendance(userId, periodId, attendanceData, inputBy) {
    // Validate scores
    if (attendanceData.nilaiPresensi !== undefined && 
        !validateAttendanceScore(attendanceData.nilaiPresensi)) {
      throw new Error('Invalid attendance score');
    }
    
    // Calculate total minus
    const totalMinus = (attendanceData.penguranganTK || 0) +
                      (attendanceData.penguranganPSW || 0) +
                      (attendanceData.penguranganTLT || 0) +
                      (attendanceData.penguranganAPEL || 0) +
                      (attendanceData.penguranganCT || 0);
    
    // Calculate final score
    const nilaiPresensi = Math.max(0, (attendanceData.persentaseTotal || 100) - totalMinus);
    
    const [attendance, created] = await Attendance.findOrCreate({
      where: { userId, periodId },
      defaults: {
        ...attendanceData,
        totalMinus,
        nilaiPresensi,
        inputBy
      }
    });
    
    if (!created) {
      await attendance.update({
        ...attendanceData,
        totalMinus,
        nilaiPresensi,
        inputBy
      });
    }
    
    return attendance;
  }
  
  /**
   * Get attendance by user and period
   */
  static async getAttendanceByUserPeriod(userId, periodId) {
    return await Attendance.findOne({
      where: { userId, periodId },
      include: [
        {
          model: User,
          attributes: ['id', 'nama', 'nip', 'jabatan']
        },
        {
          model: Period,
          attributes: ['id', 'namaPeriode']
        }
      ]
    });
  }
  
  /**
   * Bulk import attendance
   */
  static async bulkImportAttendance(attendanceData, periodId, inputBy) {
    const transaction = await sequelize.transaction();
    
    try {
      const results = [];
      
      for (const record of attendanceData) {
        const user = await User.findOne({
          where: {
            [Op.or]: [
              { nip: record.nip },
              { nama: record.nama }
            ]
          }
        });
        
        if (!user) {
          results.push({
            ...record,
            status: 'error',
            message: 'User not found'
          });
          continue;
        }
        
        try {
          const attendance = await this.upsertAttendance(
            user.id,
            periodId,
            record,
            inputBy
          );
          
          results.push({
            ...record,
            status: 'success',
            attendance
          });
        } catch (error) {
          results.push({
            ...record,
            status: 'error',
            message: error.message
          });
        }
      }
      
      await transaction.commit();
      return results;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Delete attendance record
   */
  static async deleteAttendance(userId, periodId) {
    const attendance = await Attendance.findOne({
      where: { userId, periodId }
    });
    
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    
    await attendance.destroy();
    return { message: 'Attendance record deleted successfully' };
  }
}

module.exports = AttendanceService;