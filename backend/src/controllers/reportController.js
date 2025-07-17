// controllers/reportController.js - COMPREHENSIVE REPORT CONTROLLER
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// GET COMPREHENSIVE REPORT DATA
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

    // Get all active users
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

    // Get evaluation data (BerAKHLAK)
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

    // Calculate BerAKHLAK scores per user
    const berakhlakScores = {};
    const voterCounts = {};

    evaluations.forEach(evaluation => {
      const targetId = evaluation.targetUserId;
      
      if (!berakhlakScores[targetId]) {
        berakhlakScores[targetId] = [];
        voterCounts[targetId] = 0;
      }
      
      // Calculate average score for this evaluation
      const avgScore = evaluation.scores.length > 0 
        ? evaluation.scores.reduce((sum, score) => sum + score.score, 0) / evaluation.scores.length
        : 0;
      
      berakhlakScores[targetId].push(avgScore);
      voterCounts[targetId]++;
    });

    // Calculate final BerAKHLAK scores
    const finalBerakhlakScores = {};
    Object.keys(berakhlakScores).forEach(userId => {
      const scores = berakhlakScores[userId];
      finalBerakhlakScores[userId] = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;
    });

    // Get attendance data
    const attendanceData = await prisma.attendance.findMany({
      where: { periodId: targetPeriod.id },
      select: {
        userId: true,
        jumlahTidakKerja: true,
        jumlahPulangAwal: true,
        jumlahTelat: true,
        jumlahAbsenApel: true,
        jumlahCuti: true,
        totalNilaiPresensi: true
      }
    });

    const attendanceMap = {};
    attendanceData.forEach(att => {
      attendanceMap[att.userId] = att;
    });

    // Get CKP data
    const ckpData = await prisma.ckp.findMany({
      where: { periodId: targetPeriod.id },
      select: {
        userId: true,
        score: true,
        keterangan: true
      }
    });

    const ckpMap = {};
    ckpData.forEach(ckp => {
      ckpMap[ckp.userId] = ckp;
    });

    // Combine all data
    const reportData = users.map(user => {
      const berakhlakScore = finalBerakhlakScores[user.id] || 0;
      const voterCount = voterCounts[user.id] || 0;
      const attendance = attendanceMap[user.id];
      const ckp = ckpMap[user.id];

      // Calculate weighted scores
      const berakhlakWeighted = berakhlakScore * 0.3;
      const attendanceWeighted = attendance ? (attendance.totalNilaiPresensi * 0.4) : 0;
      const ckpWeighted = ckp ? (ckp.score * 0.3) : 0;
      const finalScore = berakhlakWeighted + attendanceWeighted + ckpWeighted;

      return {
        user: {
          id: user.id,
          nip: user.nip,
          nama: user.nama,
          jabatan: user.jabatan,
          role: user.role
        },
        berakhlak: {
          score: berakhlakScore,
          voterCount: voterCount,
          weightedScore: berakhlakWeighted
        },
        attendance: {
          percentage: attendance ? attendance.totalNilaiPresensi : 100,
          tidakKerja: attendance?.jumlahTidakKerja || 0,
          pulangAwal: attendance?.jumlahPulangAwal || 0,
          telat: attendance?.jumlahTelat || 0,
          absenApel: attendance?.jumlahAbsenApel || 0,
          cuti: attendance?.jumlahCuti || 0,
          weightedScore: attendanceWeighted
        },
        ckp: {
          score: ckp?.score || 0,
          keterangan: ckp?.keterangan || '',
          weightedScore: ckpWeighted
        },
        finalScore: finalScore,
        voterCount: voterCount
      };
    });

    // Sort by voter count for candidate determination
    const sortedByVoters = [...reportData].sort((a, b) => b.voterCount - a.voterCount);
    
    // Determine candidates (top 2 voter counts)
    const topVoterCounts = [...new Set(sortedByVoters.map(emp => emp.voterCount))]
      .sort((a, b) => b - a)
      .slice(0, 2);
    
    const candidates = reportData.filter(emp => 
      emp.voterCount > 0 && topVoterCounts.includes(emp.voterCount)
    );

    // Mark candidates and determine best employee
    const candidatesWithFinalScore = candidates.sort((a, b) => b.finalScore - a.finalScore);
    const bestEmployee = candidatesWithFinalScore[0] || null;

    // Mark candidates and best employee
    reportData.forEach(emp => {
      emp.isCandidate = candidates.some(candidate => candidate.user.id === emp.user.id);
      emp.isBestEmployee = bestEmployee && emp.user.id === bestEmployee.user.id;
    });

    // Sort final data by final score
    reportData.sort((a, b) => b.finalScore - a.finalScore);

    // Calculate summary statistics
    const summary = {
      totalEmployees: reportData.length,
      candidates: candidates.length,
      bestEmployee: bestEmployee,
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
        candidates: candidatesWithFinalScore,
        metadata: {
          generatedAt: new Date(),
          totalRecords: reportData.length,
          periodName: targetPeriod.namaPeriode
        }
      }
    });

  } catch (error) {
    console.error('❌ Generate report data error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET BERAKHLAK REPORT ONLY
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
          averageScore: 0
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
      
      groupedEvaluations[targetId].totalVoters++;
    });

    // Calculate final average scores
    Object.keys(groupedEvaluations).forEach(targetId => {
      const group = groupedEvaluations[targetId];
      const totalScore = group.evaluations.reduce((sum, eval) => sum + eval.averageScore, 0);
      group.averageScore = group.totalVoters > 0 ? totalScore / group.totalVoters : 0;
    });

    // Convert to array and sort by voter count
    const berakhlakReport = Object.values(groupedEvaluations)
      .sort((a, b) => {
        if (b.totalVoters !== a.totalVoters) {
          return b.totalVoters - a.totalVoters;
        }
        return b.averageScore - a.averageScore;
      });

    res.json({
      success: true,
      data: {
        period: targetPeriod,
        berakhlakReport: berakhlakReport,
        summary: {
          totalTargets: berakhlakReport.length,
          totalEvaluations: evaluations.length,
          averageScore: berakhlakReport.length > 0 
            ? (berakhlakReport.reduce((sum, item) => sum + item.averageScore, 0) / berakhlakReport.length).toFixed(2)
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

// GET ATTENDANCE REPORT ONLY
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

    // Get attendance data with user info
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

// GET CKP REPORT ONLY
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

    // Get CKP data with user info
    const ckpData = await prisma.ckp.findMany({
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