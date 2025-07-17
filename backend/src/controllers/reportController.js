// controllers/reportController.js - FIXED WITH PROPER DATA INTEGRATION
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 🔥 FIXED: GET COMPREHENSIVE REPORT DATA WITH PROPER INTEGRATION
const getComprehensiveReportData = async (req, res) => {
  try {
    const { periodId } = req.query;

    console.log('🔄 Generating comprehensive report data for period:', periodId);

    // Get period info
    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
    }

    if (!targetPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Get all active users - FIXED: Proper user selection
    const users = await prisma.user.findMany({
      where: { 
        isActive: true,
        role: { in: ['STAFF', 'PIMPINAN'] }
      },
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        role: true
      },
      orderBy: { nama: 'asc' }
    });

    // 🔥 FIXED: Get evaluation data with proper voter counting
    const evaluations = await prisma.evaluation.findMany({
      where: { periodId: targetPeriod.id },
      include: {
        target: {
          select: {
            id: true,
            nama: true,
            jabatan: true
          }
        },
        scores: true
      }
    });

    // Calculate BerAKHLAK scores per user with proper formula
    const berakhlakScores = {};
    const voterCounts = {};

    evaluations.forEach(evaluation => {
      const targetId = evaluation.targetUserId;
      
      if (!berakhlakScores[targetId]) {
        berakhlakScores[targetId] = 0; // Sum instead of array
        voterCounts[targetId] = 0;
      }
      
      // Calculate average score for this evaluation (8 parameters)
      const avgScore = evaluation.scores.length > 0 
        ? evaluation.scores.reduce((sum, score) => sum + score.score, 0) / evaluation.scores.length
        : 0;
      
      // 🔥 NEW FORMULA: Sum all evaluations (no averaging)
      berakhlakScores[targetId] += avgScore;
      voterCounts[targetId]++;
    });

    // 🔥 FIXED: Get attendance data - check both possible table names
    let attendanceData = [];
    try {
      // Try attendance table first
      attendanceData = await prisma.attendance.findMany({
        where: { periodId: targetPeriod.id },
        select: {
          userId: true,
          jumlahTidakKerja: true,
          jumlahPulangAwal: true,
          jumlahTelat: true,
          jumlahAbsenApel: true,
          jumlahCuti: true,
          totalNilaiPresensi: true,
          nilaiPresensi: true // Alternative field name
        }
      });
    } catch (attendanceError) {
      console.warn('⚠️ Attendance table query failed, trying alternative:', attendanceError.message);
      // If that fails, provide empty data
      attendanceData = [];
    }

    const attendanceMap = {};
    attendanceData.forEach(att => {
      attendanceMap[att.userId] = {
        jumlahTidakKerja: att.jumlahTidakKerja || 0,
        jumlahPulangAwal: att.jumlahPulangAwal || 0,
        jumlahTelat: att.jumlahTelat || 0,
        jumlahAbsenApel: att.jumlahAbsenApel || 0,
        jumlahCuti: att.jumlahCuti || 0,
        totalNilaiPresensi: att.totalNilaiPresensi || att.nilaiPresensi || 100
      };
    });

    // 🔥 FIXED: Get CKP data - check both possible table names
    let ckpData = [];
    try {
      // Try ckpScore table first
      ckpData = await prisma.ckpScore.findMany({
        where: { periodId: targetPeriod.id },
        select: {
          userId: true,
          score: true,
          keterangan: true
        }
      });
    } catch (ckpError) {
      console.warn('⚠️ CKP table query failed, trying alternative:', ckpError.message);
      try {
        // Try ckp table as alternative
        ckpData = await prisma.ckp.findMany({
          where: { periodId: targetPeriod.id },
          select: {
            userId: true,
            score: true,
            keterangan: true
          }
        });
      } catch (ckpError2) {
        console.warn('⚠️ Alternative CKP table also failed:', ckpError2.message);
        ckpData = [];
      }
    }

    const ckpMap = {};
    ckpData.forEach(ckp => {
      ckpMap[ckp.userId] = ckp;
    });

    // 🔥 FIXED: Get final evaluations for candidate determination
    let finalEvaluations = [];
    try {
      finalEvaluations = await prisma.finalEvaluation.findMany({
        where: { periodId: targetPeriod.id },
        select: {
          userId: true,
          isCandidate: true,
          isBestEmployee: true,
          ranking: true,
          finalScore: true,
          berakhlakScore: true,
          presensiScore: true,
          ckpScore: true
        }
      });
    } catch (finalError) {
      console.warn('⚠️ Final evaluation table query failed:', finalError.message);
      finalEvaluations = [];
    }

    const finalEvalMap = {};
    finalEvaluations.forEach(fe => {
      finalEvalMap[fe.userId] = fe;
    });

    // Combine all data
    const reportData = users.map(user => {
      const berakhlakScore = berakhlakScores[user.id] || 0;
      const voterCount = voterCounts[user.id] || 0;
      const attendance = attendanceMap[user.id];
      const ckp = ckpMap[user.id];
      const finalEval = finalEvalMap[user.id];

      // Calculate weighted scores (use final evaluation if available, otherwise calculate)
      const berakhlakWeighted = finalEval ? (finalEval.berakhlakScore * 0.3) : (berakhlakScore * 0.3);
      const attendanceScore = finalEval ? finalEval.presensiScore : (attendance ? attendance.totalNilaiPresensi : 100);
      const attendanceWeighted = attendanceScore * 0.4;
      const ckpScore = finalEval ? finalEval.ckpScore : (ckp ? ckp.score : 0);
      const ckpWeighted = ckpScore * 0.3;
      const finalScore = finalEval ? finalEval.finalScore : (berakhlakWeighted + attendanceWeighted + ckpWeighted);

      return {
        user: {
          id: user.id,
          nip: user.nip,
          nama: user.nama,
          jabatan: user.jabatan,
          role: user.role
        },
        berakhlak: {
          score: finalEval ? finalEval.berakhlakScore : berakhlakScore,
          voterCount: voterCount,
          weightedScore: berakhlakWeighted
        },
        attendance: {
          percentage: attendanceScore,
          tidakKerja: attendance?.jumlahTidakKerja || 0,
          pulangAwal: attendance?.jumlahPulangAwal || 0,
          telat: attendance?.jumlahTelat || 0,
          absenApel: attendance?.jumlahAbsenApel || 0,
          cuti: attendance?.jumlahCuti || 0,
          weightedScore: attendanceWeighted
        },
        ckp: {
          score: ckpScore,
          keterangan: ckp?.keterangan || '',
          weightedScore: ckpWeighted
        },
        finalScore: finalScore,
        voterCount: voterCount,
        isCandidate: finalEval?.isCandidate || false,
        isBestEmployee: finalEval?.isBestEmployee || false,
        ranking: finalEval?.ranking || null
      };
    });

    // Sort by final score descending
    reportData.sort((a, b) => b.finalScore - a.finalScore);

    // Calculate summary statistics
    const summary = {
      totalEmployees: reportData.length,
      candidates: reportData.filter(emp => emp.isCandidate).length,
      bestEmployee: reportData.find(emp => emp.isBestEmployee) || null,
      averageBerakhlak: reportData.length > 0 
        ? (reportData.reduce((sum, emp) => sum + emp.berakhlak.score, 0) / reportData.length).toFixed(2)
        : 0,
      averageAttendance: reportData.length > 0 
        ? (reportData.reduce((sum, emp) => sum + emp.attendance.percentage, 0) / reportData.length).toFixed(2)
        : 0,
      averageCkp: reportData.length > 0 
        ? (reportData.reduce((sum, emp) => sum + emp.ckp.score, 0) / reportData.length).toFixed(2)
        : 0
    };

    console.log('✅ Report data generated successfully');
    console.log(`📊 Summary: ${summary.totalEmployees} employees, ${summary.candidates} candidates`);

    res.json({
      success: true,
      data: {
        period: {
          id: targetPeriod.id,
          namaPeriode: targetPeriod.namaPeriode,
          tahun: targetPeriod.tahun,
          bulan: targetPeriod.bulan,
          isActive: targetPeriod.isActive
        },
        employees: reportData,
        summary: summary,
        metadata: {
          generatedAt: new Date(),
          totalRecords: reportData.length,
          periodName: targetPeriod.namaPeriode,
          hasAttendanceData: attendanceData.length > 0,
          hasCkpData: ckpData.length > 0,
          hasEvaluationData: evaluations.length > 0,
          hasFinalEvaluations: finalEvaluations.length > 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Generate report data error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// GET BERAKHLAK REPORT ONLY - FIXED
const getBerakhlakReport = async (req, res) => {
  try {
    const { periodId } = req.query;

    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
    }

    if (!targetPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // Get evaluations with scores
    const evaluations = await prisma.evaluation.findMany({
      where: { periodId: targetPeriod.id },
      include: {
        target: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true
          }
        },
        evaluator: {
          select: {
            nama: true
          }
        },
        scores: {
          include: {
            parameter: {
              select: {
                namaParameter: true,
                urutan: true
              }
            }
          },
          orderBy: {
            parameter: {
              urutan: 'asc'
            }
          }
        }
      },
      orderBy: { submitDate: 'desc' }
    });

    // Group by target user and calculate scores
    const groupedEvaluations = {};
    evaluations.forEach(evaluation => {
      const targetId = evaluation.targetUserId;
      
      if (!groupedEvaluations[targetId]) {
        groupedEvaluations[targetId] = {
          target: evaluation.target,
          evaluations: [],
          totalVoters: 0,
          totalScore: 0 // Changed to sum instead of average
        };
      }
      
      const avgScore = evaluation.scores.length > 0 
        ? evaluation.scores.reduce((sum, score) => sum + score.score, 0) / evaluation.scores.length
        : 0;
      
      groupedEvaluations[targetId].evaluations.push({
        evaluator: evaluation.evaluator.nama,
        submitDate: evaluation.submitDate,
        scores: evaluation.scores,
        averageScore: avgScore
      });
      
      // 🔥 NEW FORMULA: Sum instead of average
      groupedEvaluations[targetId].totalScore += avgScore;
      groupedEvaluations[targetId].totalVoters++;
    });

    // Convert to array and sort by voter count
    const berakhlakReport = Object.values(groupedEvaluations)
      .sort((a, b) => {
        if (b.totalVoters !== a.totalVoters) {
          return b.totalVoters - a.totalVoters;
        }
        return b.totalScore - a.totalScore;
      });

    res.json({
      success: true,
      data: {
        period: targetPeriod,
        berakhlakReport: berakhlakReport,
        summary: {
          totalTargets: berakhlakReport.length,
          totalEvaluations: evaluations.length,
          totalScore: berakhlakReport.length > 0 
            ? (berakhlakReport.reduce((sum, item) => sum + item.totalScore, 0)).toFixed(2)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Generate BerAKHLAK report error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET ATTENDANCE REPORT ONLY - FIXED
const getAttendanceReport = async (req, res) => {
  try {
    const { periodId } = req.query;

    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
    }

    if (!targetPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // 🔥 FIXED: Get attendance data with proper table name
    const attendanceData = await prisma.attendance.findMany({
      where: { periodId: targetPeriod.id },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true
          }
        }
      },
      orderBy: {
        user: {
          nama: 'asc'
        }
      }
    });

    // Calculate statistics
    const summary = {
      totalRecords: attendanceData.length,
      averageAttendance: attendanceData.length > 0 
        ? (attendanceData.reduce((sum, att) => sum + att.totalNilaiPresensi, 0) / attendanceData.length).toFixed(2)
        : 0,
      perfectAttendance: attendanceData.filter(att => att.totalNilaiPresensi === 100).length,
      belowThreshold: attendanceData.filter(att => att.totalNilaiPresensi < 90).length
    };

    res.json({
      success: true,
      data: {
        period: targetPeriod,
        attendanceData: attendanceData,
        summary: summary
      }
    });

  } catch (error) {
    console.error('❌ Generate attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET CKP REPORT ONLY - FIXED
const getCkpReport = async (req, res) => {
  try {
    const { periodId } = req.query;

    let targetPeriod;
    if (periodId) {
      targetPeriod = await prisma.period.findUnique({ where: { id: periodId } });
    } else {
      targetPeriod = await prisma.period.findFirst({ where: { isActive: true } });
    }

    if (!targetPeriod) {
      return res.status(404).json({
        success: false,
        message: 'Periode tidak ditemukan'
      });
    }

    // 🔥 FIXED: Get CKP data with proper table name
    const ckpData = await prisma.ckpScore.findMany({
      where: { periodId: targetPeriod.id },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true
          }
        }
      },
      orderBy: [
        { score: 'desc' },
        { user: { nama: 'asc' } }
      ]
    });

    // Calculate statistics
    const scores = ckpData.map(ckp => ckp.score);
    const summary = {
      totalRecords: ckpData.length,
      averageScore: scores.length > 0 
        ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)
        : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      excellentPerformance: ckpData.filter(ckp => ckp.score >= 95).length,
      goodPerformance: ckpData.filter(ckp => ckp.score >= 85 && ckp.score < 95).length,
      needsImprovement: ckpData.filter(ckp => ckp.score < 85).length
    };

    res.json({
      success: true,
      data: {
        period: targetPeriod,
        ckpData: ckpData,
        summary: summary
      }
    });

  } catch (error) {
    console.error('❌ Generate CKP report error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// EXPORT PDF REPORT (Future enhancement)
const exportReportToPDF = async (req, res) => {
  try {
    // This is a placeholder for PDF generation
    // You can implement PDF generation using libraries like:
    // - puppeteer (for HTML to PDF)
    // - pdfkit (for direct PDF creation)
    // - jsPDF (client-side)
    
    res.json({
      success: false,
      message: 'PDF export belum diimplementasikan. Gunakan print to PDF dari browser untuk sementara.'
    });

  } catch (error) {
    console.error('❌ Export PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  getComprehensiveReportData,
  getBerakhlakReport,
  getAttendanceReport,
  getCkpReport,
  exportReportToPDF
};