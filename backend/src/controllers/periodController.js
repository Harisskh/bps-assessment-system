// controllers/periodController.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET ALL PERIODS
const getAllPeriods = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      isActive,
      tahun
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (tahun) where.tahun = parseInt(tahun);

    const [periods, totalCount] = await Promise.all([
      prisma.period.findMany({
        where,
        orderBy: [
          { tahun: 'desc' },
          { bulan: 'desc' }
        ],
        skip,
        take: limitNum
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

// CREATE PERIOD
const createPeriod = async (req, res) => {
  try {
    const {
      tahun,
      bulan,
      namaPeriode,
      noPeriode,
      startDate,
      endDate,
      isActive = false
    } = req.body;

    // Validation
    if (!tahun || !bulan || !namaPeriode) {
      return res.status(400).json({
        success: false,
        message: 'Tahun, bulan, dan nama periode wajib diisi'
      });
    }

    if (bulan < 1 || bulan > 12) {
      return res.status(400).json({
        success: false,
        message: 'Bulan harus antara 1-12'
      });
    }

    // Check if period already exists
    const existingPeriod = await prisma.period.findUnique({
      where: {
        tahun_bulan: {
          tahun: parseInt(tahun),
          bulan: parseInt(bulan)
        }
      }
    });

    if (existingPeriod) {
      return res.status(400).json({
        success: false,
        message: `Periode ${namaPeriode} sudah ada`
      });
    }

    // If setting as active, deactivate other periods
    if (isActive) {
      await prisma.period.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    const periodData = {
      tahun: parseInt(tahun),
      bulan: parseInt(bulan),
      namaPeriode,
      noPeriode: noPeriode ? parseInt(noPeriode) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive
    };

    const period = await prisma.period.create({
      data: periodData
    });

    res.status(201).json({
      success: true,
      message: 'Periode berhasil dibuat',
      data: { period }
    });

  } catch (error) {
    console.error('Create period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// UPDATE PERIOD
const updatePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      namaPeriode,
      noPeriode,
      startDate,
      endDate,
      isActive
    } = req.body;

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
      await prisma.period.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false }
      });
    }

    const updateData = {};
    if (namaPeriode) updateData.namaPeriode = namaPeriode;
    if (noPeriode !== undefined) updateData.noPeriode = noPeriode ? parseInt(noPeriode) : null;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedPeriod = await prisma.period.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Periode berhasil diperbarui',
      data: { period: updatedPeriod }
    });

  } catch (error) {
    console.error('Update period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// DELETE PERIOD
const deletePeriod = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if period exists
    const existingPeriod = await prisma.period.findUnique({
      where: { id },
      include: {
        evaluations: { take: 1 },
        attendances: { take: 1 },
        ckpScores: { take: 1 },
        finalEvaluations: { take: 1 }
      }
    });

    if (!existingPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Check if period has data
    const hasData = existingPeriod.evaluations.length > 0 ||
                   existingPeriod.attendances.length > 0 ||
                   existingPeriod.ckpScores.length > 0 ||
                   existingPeriod.finalEvaluations.length > 0;

    if (hasData) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus periode yang sudah memiliki data'
      });
    }

    await prisma.period.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: `Periode ${existingPeriod.namaPeriode} berhasil dihapus`
    });

  } catch (error) {
    console.error('Delete period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// ACTIVATE PERIOD
const activatePeriod = async (req, res) => {
  try {
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

    res.json({
      success: true,
      message: `Periode ${activatedPeriod.namaPeriode} berhasil diaktifkan`,
      data: { period: activatedPeriod }
    });

  } catch (error) {
    console.error('Activate period error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET PERIOD BY ID
const getPeriodById = async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: { period }
    });

  } catch (error) {
    console.error('Get period by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET ACTIVE PERIOD (public endpoint - already exists in evaluationController)
const getActivePeriod = async (req, res) => {
  try {
    const activePeriod = await prisma.period.findFirst({
      where: { isActive: true }
    });

    if (!activePeriod) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada periode aktif. Hubungi administrator.'
      });
    }

    res.json({
      success: true,
      data: { period: activePeriod }
    });

  } catch (error) {
    console.error('Get active period error:', error);
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
  getActivePeriod
};