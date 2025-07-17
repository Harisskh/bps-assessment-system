// controllers/periodController.js - FIXED FOR SCHEMA COMPATIBILITY
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    
    if (search) {
      where.namaPeriode = {
        contains: search,
        mode: 'insensitive'
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

    const [periods, totalCount] = await Promise.all([
      prisma.period.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { tahun: 'desc' },
          { bulan: 'desc' }
        ]
      }),
      prisma.period.count({ where })
    ]);

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


// 🔥 FIXED: CREATE PERIOD - Removed noPeriode field
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
    const existingPeriod = await prisma.period.findFirst({
      where: {
        AND: [
          { tahun: tahunInt },
          { bulan: bulanInt }
        ]
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
      await prisma.period.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    // 🔥 FIXED: Prepare data without noPeriode field
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
    const period = await prisma.period.create({
      data: periodData
    });

    console.log('✅ Period created successfully:', period.id);

    res.status(201).json({
      success: true,
      message: 'Periode berhasil dibuat',
      data: { period }
    });

  } catch (error) {
    console.error('❌ Create period error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
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

// 🔥 FIXED: UPDATE PERIOD - Removed noPeriode field
const updatePeriod = async (req, res) => {
  try {
    console.log('🔄 Updating period...');
    const { id } = req.params;
    const {
      namaPeriode,
      startDate,
      endDate,
      isActive
    } = req.body;

    console.log('📝 Period ID:', id);
    console.log('📥 Update data:', req.body);

    // Check if period exists
    const existingPeriod = await prisma.period.findUnique({
      where: { id }
    });

    if (!existingPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // If setting as active, deactivate other periods
    if (isActive && !existingPeriod.isActive) {
      console.log('🔄 Deactivating other periods...');
      await prisma.period.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false }
      });
    }

    const updateData = {};
    if (namaPeriode !== undefined) updateData.namaPeriode = namaPeriode.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle dates
    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }

    console.log('💾 Updating with data:', updateData);

    const updatedPeriod = await prisma.period.update({
      where: { id },
      data: updateData
    });

    console.log('✅ Period updated successfully');

    res.json({
      success: true,
      message: 'Periode berhasil diperbarui',
      data: { period: updatedPeriod }
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

// DELETE PERIOD
const deletePeriod = async (req, res) => {
  try {
    console.log('🗑️ Deleting period...');
    const { id } = req.params;

    // Check if period exists and has related data
    const existingPeriod = await prisma.period.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            evaluations: true,
            attendances: true,
            ckpScores: true,
            finalEvaluations: true
          }
        }
      }
    });

    if (!existingPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Check if period has related data
    const hasRelatedData = 
      existingPeriod._count.evaluations > 0 ||
      existingPeriod._count.attendances > 0 ||
      existingPeriod._count.ckpScores > 0 ||
      existingPeriod._count.finalEvaluations > 0;

    if (hasRelatedData) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus periode yang sudah memiliki data evaluasi, presensi, atau CKP'
      });
    }

    await prisma.period.delete({
      where: { id }
    });

    console.log('✅ Period deleted successfully');

    res.json({
      success: true,
      message: `Periode ${existingPeriod.namaPeriode} berhasil dihapus`
    });

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
    const existingPeriod = await prisma.period.findUnique({
      where: { id }
    });

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

    // Deactivate all other periods and activate this one
    await prisma.$transaction([
      prisma.period.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      }),
      prisma.period.update({
        where: { id },
        data: { isActive: true }
      })
    ]);

    const activatedPeriod = await prisma.period.findUnique({
      where: { id }
    });

    console.log('✅ Period activated successfully:', activatedPeriod.namaPeriode);

    res.json({
      success: true,
      message: `Periode ${activatedPeriod.namaPeriode} berhasil diaktifkan`,
      data: { period: activatedPeriod }
    });

  } catch (error) {
    console.error('❌ Activate period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET PERIOD BY ID
const getPeriodById = async (req, res) => {
  try {
    console.log('🔍 Getting period by ID...');
    const { id } = req.params;

    const period = await prisma.period.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            evaluations: true,
            attendances: true,
            ckpScores: true,
            finalEvaluations: true
          }
        }
      }
    });

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    console.log('✅ Period found:', period.namaPeriode);

    res.json({
      success: true,
      data: { period }
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
    const period = await prisma.period.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
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

// 🔥 NEW: GET period by year and month
const getPeriodByYearMonth = async (req, res) => {
  try {
    const { tahun, bulan } = req.query;

    if (!tahun || !bulan) {
      return res.status(400).json({
        success: false,
        message: 'Tahun dan bulan harus diisi'
      });
    }

    const period = await prisma.period.findFirst({
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

// 🔥 NEW: GET previous period from active period
const getPreviousPeriod = async (req, res) => {
  try {
    // Get active period first
    const activePeriod = await prisma.period.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
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
    const previousPeriod = await prisma.period.findFirst({
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