// controllers/periodController.js - SEQUELIZE VERSION WITH READ-ONLY FIELDS PROTECTION
const { Period, Evaluation, Attendance, CkpScore, FinalEvaluation, Certificate } = require('../../models');
const { Op } = require('sequelize');

// GET ALL PERIODS
const getAllPeriods = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      tahun = '', 
      bulan = '',
      isActive = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    
    if (search) {
      where.namaPeriode = {
        [Op.iLike]: `%${search}%`
      };
    }
    
    if (tahun) {
      where.tahun = parseInt(tahun);
    }
    
    if (bulan) {
      where.bulan = parseInt(bulan);
    }
    
    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const { rows: periods, count: totalCount } = await Period.findAndCountAll({
      where,
      offset,
      limit: limitNum,
      order: [
        ['tahun', 'DESC'],
        ['bulan', 'DESC']
      ]
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        periods,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all periods error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// CREATE PERIOD
const createPeriod = async (req, res) => {
  try {
    console.log('📝 Creating new period...');
    console.log('📥 Request body:', req.body);
    
    const {
      tahun,
      bulan,
      namaPeriode,
      startDate,
      endDate,
      isActive = false
    } = req.body;

    // Enhanced validation
    if (!tahun || !bulan || !namaPeriode) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Tahun, bulan, dan nama periode wajib diisi'
      });
    }

    const tahunInt = parseInt(tahun);
    const bulanInt = parseInt(bulan);

    if (isNaN(tahunInt) || isNaN(bulanInt)) {
      return res.status(400).json({
        success: false,
        message: 'Tahun dan bulan harus berupa angka'
      });
    }

    if (bulanInt < 1 || bulanInt > 12) {
      return res.status(400).json({
        success: false,
        message: 'Bulan harus antara 1-12'
      });
    }

    if (tahunInt < 2020 || tahunInt > 2030) {
      return res.status(400).json({
        success: false,
        message: 'Tahun harus antara 2020-2030'
      });
    }

    console.log('🔍 Checking existing period:', { tahun: tahunInt, bulan: bulanInt });

    // Check if period already exists
    const existingPeriod = await Period.findOne({
      where: {
        tahun: tahunInt,
        bulan: bulanInt
      }
    });

    if (existingPeriod) {
      console.log('❌ Period already exists:', existingPeriod.namaPeriode);
      return res.status(400).json({
        success: false,
        message: `Periode ${existingPeriod.namaPeriode} sudah ada`
      });
    }

    // If setting as active, deactivate other periods
    if (isActive) {
      console.log('🔄 Deactivating other periods...');
      await Period.update(
        { isActive: false },
        { where: { isActive: true } }
      );
    }

    // Prepare data
    const periodData = {
      tahun: tahunInt,
      bulan: bulanInt,
      namaPeriode: namaPeriode.trim(),
      isActive
    };

    // Handle dates properly
    if (startDate && startDate !== '') {
      try {
        periodData.startDate = new Date(startDate);
        console.log('📅 Start date:', periodData.startDate);
      } catch (dateError) {
        console.log('❌ Invalid start date:', startDate);
        return res.status(400).json({
          success: false,
          message: 'Format tanggal mulai tidak valid'
        });
      }
    }

    if (endDate && endDate !== '') {
      try {
        periodData.endDate = new Date(endDate);
        console.log('📅 End date:', periodData.endDate);
      } catch (dateError) {
        console.log('❌ Invalid end date:', endDate);
        return res.status(400).json({
          success: false,
          message: 'Format tanggal selesai tidak valid'
        });
      }
    }

    console.log('💾 Creating period with data:', periodData);

    // Create period
    const period = await Period.create(periodData);

    console.log('✅ Period created successfully:', period.id);

    res.status(201).json({
      success: true,
      message: 'Periode berhasil dibuat',
      data: { period }
    });

  } catch (error) {
    console.error('❌ Create period error:', error);
    
    // Handle specific Sequelize errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Periode untuk bulan dan tahun tersebut sudah ada'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔒 UPDATED UPDATE PERIOD - PROTECT READ-ONLY FIELDS
const updatePeriod = async (req, res) => {
  try {
    console.log('🔄 Updating period...');
    const { id } = req.params;
    const requestBody = req.body;

    console.log('📝 Period ID:', id);
    console.log('📥 Update request body:', requestBody);

    // Check if period exists
    const existingPeriod = await Period.findByPk(id);

    if (!existingPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // 🔒 PROTECTION: Filter out read-only fields
    const readOnlyFields = ['tahun', 'bulan', 'namaPeriode'];
    const filteredData = {};
    
    // Log if any read-only fields were attempted to be changed
    readOnlyFields.forEach(field => {
      if (requestBody.hasOwnProperty(field)) {
        console.log(`🔒 Blocked attempt to update read-only field: ${field}`);
        console.log(`   Current value: ${existingPeriod[field]}`);
        console.log(`   Attempted value: ${requestBody[field]}`);
      }
    });

    // Only allow editable fields
    const editableFields = ['startDate', 'endDate', 'isActive'];
    editableFields.forEach(field => {
      if (requestBody.hasOwnProperty(field)) {
        filteredData[field] = requestBody[field];
      }
    });

    console.log('✅ Filtered data for update (read-only fields removed):', filteredData);

    // If setting as active, deactivate other periods
    if (filteredData.isActive && !existingPeriod.isActive) {
      console.log('🔄 Deactivating other periods...');
      await Period.update(
        { isActive: false },
        { 
          where: { 
            isActive: true,
            id: { [Op.ne]: id }
          }
        }
      );
    }

    // Handle dates properly
    if (filteredData.startDate !== undefined) {
      if (filteredData.startDate && filteredData.startDate !== '') {
        try {
          filteredData.startDate = new Date(filteredData.startDate);
          console.log('📅 Updated start date:', filteredData.startDate);
        } catch (dateError) {
          console.log('❌ Invalid start date:', filteredData.startDate);
          return res.status(400).json({
            success: false,
            message: 'Format tanggal mulai tidak valid'
          });
        }
      } else {
        filteredData.startDate = null;
      }
    }

    if (filteredData.endDate !== undefined) {
      if (filteredData.endDate && filteredData.endDate !== '') {
        try {
          filteredData.endDate = new Date(filteredData.endDate);
          console.log('📅 Updated end date:', filteredData.endDate);
        } catch (dateError) {
          console.log('❌ Invalid end date:', filteredData.endDate);
          return res.status(400).json({
            success: false,
            message: 'Format tanggal selesai tidak valid'
          });
        }
      } else {
        filteredData.endDate = null;
      }
    }

    console.log('💾 Final update data:', filteredData);

    // Perform update with filtered data only
    await existingPeriod.update(filteredData);

    console.log('✅ Period updated successfully');
    console.log('🔒 Protected fields that remained unchanged:', {
      tahun: existingPeriod.tahun,
      bulan: existingPeriod.bulan,
      namaPeriode: existingPeriod.namaPeriode
    });

    res.json({
      success: true,
      message: 'Periode berhasil diperbarui (tahun, bulan, dan nama periode tidak dapat diubah)',
      data: { period: existingPeriod },
      protectedFields: {
        tahun: existingPeriod.tahun,
        bulan: existingPeriod.bulan,
        namaPeriode: existingPeriod.namaPeriode,
        note: 'Field ini tidak dapat diubah setelah periode dibuat'
      }
    });

  } catch (error) {
    console.error('❌ Update period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ENHANCED DELETE PERIOD - Now supports force delete
const deletePeriod = async (req, res) => {
  try {
    console.log('🗑️ Deleting period...');
    const { id } = req.params;

    // Check if period exists and get related data count
    const existingPeriod = await Period.findByPk(id);

    if (!existingPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Check if period is active
    if (existingPeriod.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus periode yang sedang aktif'
      });
    }

    // Get related data counts
    const [evaluationCount, attendanceCount, ckpCount, finalEvalCount, certificateCount] = await Promise.all([
      Evaluation.count({ where: { periodId: id } }),
      Attendance.count({ where: { periodId: id } }),
      CkpScore.count({ where: { periodId: id } }),
      FinalEvaluation.count({ where: { periodId: id } }),
      Certificate.count({ where: { period_id: id } })
    ]);

    const hasRelatedData = evaluationCount > 0 || attendanceCount > 0 || ckpCount > 0 || finalEvalCount > 0 || certificateCount > 0;

    console.log('📊 Period has related data:', hasRelatedData);
    console.log('📈 Data counts:', {
      evaluations: evaluationCount,
      attendances: attendanceCount,
      ckpScores: ckpCount,
      finalEvaluations: finalEvalCount,
      certificates: certificateCount
    });

    if (hasRelatedData) {
      // Force delete all related data using transaction
      console.log('🔄 Force deleting period with all related data...');
      
      const { sequelize } = require('../../models');
      const transaction = await sequelize.transaction();

      try {
        // Delete in correct order to avoid foreign key constraints
        
        // 1. Delete final evaluations first
        if (finalEvalCount > 0) {
          await FinalEvaluation.destroy({
            where: { periodId: id },
            transaction
          });
        }
        
        // 2. Delete evaluations
        if (evaluationCount > 0) {
          await Evaluation.destroy({
            where: { periodId: id },
            transaction
          });
        }
        
        // 3. Delete attendances
        if (attendanceCount > 0) {
          await Attendance.destroy({
            where: { periodId: id },
            transaction
          });
        }
        
        // 4. Delete CKP scores
        if (ckpCount > 0) {
          await CkpScore.destroy({
            where: { periodId: id },
            transaction
          });
        }

        // 5. Delete certificates if exists
        if (certificateCount > 0) {
          await Certificate.destroy({
            where: { period_id: id },
            transaction
          });
        }

        // 6. Finally delete the period
        await existingPeriod.destroy({ transaction });

        await transaction.commit();

        console.log('✅ Period and all related data deleted successfully');
        
        res.json({
          success: true,
          message: `Periode ${existingPeriod.namaPeriode} beserta semua data terkait berhasil dihapus`,
          deletedData: {
            evaluations: evaluationCount,
            attendances: attendanceCount,
            ckpScores: ckpCount,
            finalEvaluations: finalEvalCount,
            certificates: certificateCount
          }
        });

      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }
    } else {
      // No related data, simple delete
      console.log('🗑️ Deleting period without related data...');
      
      await existingPeriod.destroy();

      console.log('✅ Period deleted successfully');

      res.json({
        success: true,
        message: `Periode ${existingPeriod.namaPeriode} berhasil dihapus`
      });
    }

  } catch (error) {
    console.error('❌ Delete period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ACTIVATE PERIOD
const activatePeriod = async (req, res) => {
  try {
    console.log('🔄 Activating period...');
    const { id } = req.params;

    // Check if period exists
    const existingPeriod = await Period.findByPk(id);

    if (!existingPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    if (existingPeriod.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Periode sudah aktif'
      });
    }
          
    const { sequelize } = require('../../models');
    const transaction = await sequelize.transaction();

    try {
      // Deactivate all other periods and activate this one
      await Period.update(
        { isActive: false },
        { 
          where: { isActive: true },
          transaction
        }
      );

      await existingPeriod.update(
        { isActive: true },
        { transaction }
      );

      await transaction.commit();

      console.log('✅ Period activated successfully:', existingPeriod.namaPeriode);

      res.json({
        success: true,
        message: `Periode ${existingPeriod.namaPeriode} berhasil diaktifkan`,
        data: { period: existingPeriod }
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Activate period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ENHANCED GET PERIOD BY ID - Now includes data counts
const getPeriodById = async (req, res) => {
  try {
    console.log('🔍 Getting period by ID...');
    const { id } = req.params;

    const period = await Period.findByPk(id);

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Get related data counts
    const [evaluationCount, attendanceCount, ckpCount, finalEvalCount, certificateCount] = await Promise.all([
      Evaluation.count({ where: { periodId: id } }),
      Attendance.count({ where: { periodId: id } }),
      CkpScore.count({ where: { periodId: id } }),
      FinalEvaluation.count({ where: { periodId: id } }),
      Certificate.count({ where: { period_id: id } })
    ]);

    const periodWithCounts = {
      ...period.toJSON(),
      _count: {
        evaluations: evaluationCount,
        attendances: attendanceCount,
        ckpScores: ckpCount,
        finalEvaluations: finalEvalCount,
        certificates: certificateCount
      }
    };

    console.log('✅ Period found:', period.namaPeriode);
    console.log('📊 Data counts:', periodWithCounts._count);

    res.json({
      success: true,
      data: { period: periodWithCounts }
    });

  } catch (error) {
    console.error('❌ Get period by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET ACTIVE PERIOD
const getActivePeriod = async (req, res) => {
  try {
    const period = await Period.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada periode aktif'
      });
    }

    res.json({
      success: true,
      data: { period }
    });

  } catch (error) {
    console.error('Get active period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET period by year and month
const getPeriodByYearMonth = async (req, res) => {
  try {
    const { tahun, bulan } = req.query;

    if (!tahun || !bulan) {
      return res.status(400).json({
        success: false,
        message: 'Tahun dan bulan harus diisi'
      });
    }

    const period = await Period.findOne({
      where: {
        tahun: parseInt(tahun),
        bulan: parseInt(bulan)
      }
    });

    if (!period) {
      return res.status(404).json({
        success: false,
        message: `Periode ${bulan}/${tahun} tidak ditemukan`
      });
    }

    res.json({
      success: true,
      data: { period }
    });

  } catch (error) {
    console.error('Get period by year month error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET previous period from active period
const getPreviousPeriod = async (req, res) => {
  try {
    // Get active period first
    const activePeriod = await Period.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });

    if (!activePeriod) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada periode aktif'
      });
    }

    // Calculate previous month
    let previousYear = activePeriod.tahun;
    let previousMonth = activePeriod.bulan - 1;

    if (previousMonth < 1) {
      previousMonth = 12;
      previousYear = activePeriod.tahun - 1;
    }

    // Find previous period in database
    const previousPeriod = await Period.findOne({
      where: {
        tahun: previousYear,
        bulan: previousMonth
      }
    });

    if (!previousPeriod) {
      return res.status(404).json({
        success: false,
        message: `Periode sebelumnya (${previousMonth}/${previousYear}) tidak ditemukan`
      });
    }

    res.json({
      success: true,
      data: { 
        activePeriod,
        previousPeriod
      }
    });

  } catch (error) {
    console.error('Get previous period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  getAllPeriods,
  createPeriod,
  updatePeriod,
  deletePeriod,
  activatePeriod,
  getPeriodById,
  getPreviousPeriod,
  getPeriodByYearMonth,
  getActivePeriod
};