// controllers/periodController.js - UPDATED WITH CASCADE DELETE
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

// DELETE PERIOD - UPDATED WITH CASCADE DELETE
const deletePeriod = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if period exists
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

    // Prevent deletion of active period
    if (existingPeriod.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus periode yang sedang aktif. Nonaktifkan terlebih dahulu.'
      });
    }

    // Get data counts for confirmation message
    const dataCounts = existingPeriod._count;
    
    // Delete all related data in transaction (CASCADE DELETE)
    await prisma.$transaction(async (tx) => {
      // 1. Delete evaluation scores first (has foreign key to evaluations)
      if (dataCounts.evaluations > 0) {
        const evaluationIds = await tx.evaluation.findMany({
          where: { periodId: id },
          select: { id: true }
        });
        
        if (evaluationIds.length > 0) {
          await tx.evaluationScore.deleteMany({
            where: {
              evaluationId: { in: evaluationIds.map(e => e.id) }
            }
          });
        }
      }

      // 2. Delete evaluations
      await tx.evaluation.deleteMany({
        where: { periodId: id }
      });

      // 3. Delete final evaluations
      await tx.finalEvaluation.deleteMany({
        where: { periodId: id }
      });

      // 4. Delete attendances
      await tx.attendance.deleteMany({
        where: { periodId: id }
      });

      // 5. Delete CKP scores
      await tx.ckpScore.deleteMany({
        where: { periodId: id }
      });

      // 6. Finally delete the period
      await tx.period.delete({
        where: { id }
      });
    });

    // Create summary message
    let deleteMessage = `Periode ${existingPeriod.namaPeriode} berhasil dihapus`;
    const deletedItems = [];
    
    if (dataCounts.evaluations > 0) deletedItems.push(`${dataCounts.evaluations} evaluasi`);
    if (dataCounts.attendances > 0) deletedItems.push(`${dataCounts.attendances} data presensi`);
    if (dataCounts.ckpScores > 0) deletedItems.push(`${dataCounts.ckpScores} data CKP`);
    if (dataCounts.finalEvaluations > 0) deletedItems.push(`${dataCounts.finalEvaluations} evaluasi final`);

    if (deletedItems.length > 0) {
      deleteMessage += ` beserta ${deletedItems.join(', ')}`;
    }

    res.json({
      success: true,
      message: deleteMessage,
      data: {
        deletedPeriod: {
          id: existingPeriod.id,
          namaPeriode: existingPeriod.namaPeriode,
          deletedData: {
            evaluations: dataCounts.evaluations,
            attendances: dataCounts.attendances,
            ckpScores: dataCounts.ckpScores,
            finalEvaluations: dataCounts.finalEvaluations
          }
        }
      }
    });

  } catch (error) {
    console.error('Delete period error:', error);
    
    // Handle specific database errors
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus periode karena masih memiliki data terkait yang tidak dapat dihapus'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus periode'
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