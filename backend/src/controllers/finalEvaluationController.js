// controllers/finalEvaluationController.js - UPDATED WITH NEW BERAKHLAK FORMULA
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// EXCLUDED JOB POSITIONS FROM BEST EMPLOYEE CANDIDACY
const EXCLUDED_POSITIONS = [
  'Statistisi Ahli Madya BPS Kabupaten/Kota',
  'Statistisi Ahli Madya',
  'Statistisi Ahli Madya Badan Pusat Statistik Kabupaten/Kota',
  'Kepala BPS',
  'Kepala Badan Pusat Statistik Kabupaten/Kota',
  'Kepala BPS Kabupaten/Kota',
  'Kasubbag Umum',
  'Kasubbag Umum Badan Pusat Statistik Kabupaten/Kota',
  'Kasubbag Umum BPS Kabupaten/Kota',
  'Kepala Subbagian Umum Badan Pusat Statistik Kabupaten/Kota',
  'Kepala Subbagian Umum BPS Kabupaten/Kota',
  'Kepala Subbagian Umum',
  'kepala',
  'madya',
  'Madya',
  'Kepala',
  'KEPALA',
  'MADYA'
];

// Helper function to check if a position is excluded
const isExcludedPosition = (jabatan) => {
  if (!jabatan) return false;
  
  return EXCLUDED_POSITIONS.some(excludedPos => {
    if (jabatan.toLowerCase().includes(excludedPos.toLowerCase())) {
      return true;
    }
    
    if (excludedPos.includes('Kepala BPS') && jabatan.toLowerCase().includes('kepala bps')) {
      return true;
    }
    
    if (excludedPos.includes('Kasubbag') && jabatan.toLowerCase().includes('kasubbag')) {
      return true;
    }
    
    if (excludedPos.includes('Kepala Sub Bagian') && jabatan.toLowerCase().includes('kepala sub bagian')) {
      return true;
    }
    
    return false;
  });
};

// 🔥 UPDATED: CALCULATE FINAL EVALUATIONS WITH NEW BERAKHLAK FORMULA
const calculateFinalEvaluations = async (req, res) => {
  try {
    const { periodId } = req.body;

    if (!periodId) {
      return res.status(400).json({
        success: false,
        message: 'Period ID wajib diisi'
      });
    }

    // Check if period exists
    const period = await prisma.period.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Period tidak ditemukan'
      });
    }

    console.log('🔄 Starting calculation for period:', period.namaPeriode);

    // Get all evaluations for this period
    const evaluations = await prisma.evaluation.findMany({
      where: { periodId },
      include: {
        scores: {
          include: {
            parameter: true
          }
        }
      }
    });

    console.log('📊 Found evaluations:', evaluations.length);

    // Get attendance data for this period
    const attendances = await prisma.attendance.findMany({
      where: { periodId },
      include: {
        user: {
          select: { id: true, nama: true, jabatan: true }
        }
      }
    });

    // Get CKP scores for this period
    const ckpScores = await prisma.ckpScore.findMany({
      where: { periodId },
      include: {
        user: {
          select: { id: true, nama: true, jabatan: true }
        }
      }
    });

    // 🔥 NEW FORMULA: Calculate BERAKHLAK scores with SUMMATION instead of AVERAGING
    const berakhlakScores = {};

    // Group evaluations by target user
    for (const evaluation of evaluations) {
      const targetUserId = evaluation.targetUserId;

      if (!berakhlakScores[targetUserId]) {
      berakhlakScores[targetUserId] = {
        totalScore: 0, // Sum of normalized scores
        evaluatorCount: 0,
        evaluations: []
      };
      }

      // Hitung rata-rata dari 8 parameter untuk evaluator ini
      const avgScore = evaluation.scores.length > 0
      ? evaluation.scores.reduce((sum, score) => sum + score.score, 0) / 8
      : 0;

      // Tambahkan ke totalScore (sum of averages dari semua evaluator)
      berakhlakScores[targetUserId].totalScore += avgScore;
      berakhlakScores[targetUserId].evaluatorCount++;
      berakhlakScores[targetUserId].evaluations.push({
      evaluatorId: evaluation.evaluatorId,
      avgScore: avgScore,
      submitDate: evaluation.submitDate
      });
    }

    // Get all users with their job positions
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        jabatan: true,
        nip: true
      }
    });

    // Create a map for quick user lookup
    const userMap = {};
    allUsers.forEach(user => {
      userMap[user.id] = user;
    });

    // 🔥 NEW: Determine candidates based on evaluator count (top 2 ranks)
    // BUT EXCLUDE users with specific job positions
    const allUserEvaluatorCounts = Object.entries(berakhlakScores)
      .map(([userId, data]) => {
        const user = userMap[userId];
        return {
          userId,
          count: data.evaluatorCount,
          totalScore: data.totalScore,
          jabatan: user?.jabatan || '',
          isEligible: user ? !isExcludedPosition(user.jabatan) : false
        };
      })
      .sort((a, b) => b.count - a.count); // Sort by evaluator count

    console.log('📋 All user evaluator counts:', allUserEvaluatorCounts);

    // Filter to get only eligible users, then get top 2 unique counts
    const eligibleUserCounts = allUserEvaluatorCounts.filter(u => u.isEligible);
    const uniqueEligibleCounts = [...new Set(eligibleUserCounts.map(u => u.count))].slice(0, 2);
    
    // Get candidate user IDs from eligible users with top 2 counts
    const candidateUserIds = eligibleUserCounts
      .filter(u => uniqueEligibleCounts.includes(u.count))
      .map(u => u.userId);

    console.log('✅ Eligible candidates:', candidateUserIds);

    // Create or update final evaluations
    const finalEvaluations = [];

    // Get all users who have any score data
    const allUserIds = new Set([
      ...Object.keys(berakhlakScores),
      ...attendances.map(a => a.userId),
      ...ckpScores.map(c => c.userId)
    ]);

    for (const userId of allUserIds) {
      const berakhlakData = berakhlakScores[userId] || {
        totalScore: 0,
        evaluatorCount: 0
      };

      const attendanceData = attendances.find(a => a.userId === userId);
      const ckpData = ckpScores.find(c => c.userId === userId);
      const user = userMap[userId];

      // 🔥 NEW FORMULA: Calculate weighted scores with new BerAKHLAK formula
      const berakhlakScore = berakhlakData.totalScore || 0; // Direct sum, no averaging
      const presensiScore = attendanceData?.nilaiPresensi || 0;
      const ckpScore = ckpData?.score || 0;

      // Calculate weighted scores for final calculation
      const berakhlakWeighted = berakhlakScore * 0.30;
      const presensiWeighted = presensiScore * 0.40;
      const ckpWeighted = ckpScore * 0.30;
      const finalScore = berakhlakWeighted + presensiWeighted + ckpWeighted;

      // Check if user is eligible for candidacy
      const isEligibleForCandidacy = user ? !isExcludedPosition(user.jabatan) : false;
      const isCandidate = isEligibleForCandidacy && candidateUserIds.includes(userId);

      const finalEvaluationData = {
        userId,
        periodId,
        berakhlakScore,
        presensiScore,
        ckpScore,
        berakhlakWeighted,
        presensiWeighted,
        ckpWeighted,
        finalScore,
        totalEvaluators: berakhlakData.evaluatorCount,
        isCandidate,
        isBestEmployee: false, // Will be updated after ranking
        ranking: null
      };

      const finalEvaluation = await prisma.finalEvaluation.upsert({
        where: {
          userId_periodId: {
            userId,
            periodId
          }
        },
        update: finalEvaluationData,
        create: finalEvaluationData,
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              jabatan: true,
              nip: true
            }
          }
        }
      });

      finalEvaluations.push(finalEvaluation);
    }

    // Rank candidates by final score (only eligible candidates)
    const rankedCandidates = finalEvaluations
      .filter(fe => fe.isCandidate)
      .sort((a, b) => b.finalScore - a.finalScore);

    console.log('🏆 Ranked candidates:', rankedCandidates.map(c => ({
      nama: c.user.nama,
      finalScore: c.finalScore,
      berakhlakScore: c.berakhlakScore,
      evaluators: c.totalEvaluators
    })));

    // Update rankings and determine best employee
    for (let i = 0; i < rankedCandidates.length; i++) {
      const candidate = rankedCandidates[i];
      const ranking = i + 1;
      const isBestEmployee = ranking === 1;

      await prisma.finalEvaluation.update({
        where: { id: candidate.id },
        data: {
          ranking,
          isBestEmployee
        }
      });

      candidate.ranking = ranking;
      candidate.isBestEmployee = isBestEmployee;
    }

    // Count excluded users for reporting
    const excludedUsers = allUsers.filter(user => isExcludedPosition(user.jabatan));
    const excludedCount = excludedUsers.length;

    console.log('✅ Calculation completed successfully');

    res.json({
      success: true,
      message: 'Final evaluations calculated successfully with new BerAKHLAK formula',
      data: {
        period: period.namaPeriode,
        totalUsers: finalEvaluations.length,
        candidates: rankedCandidates.length,
        excludedUsers: excludedCount,
        bestEmployee: rankedCandidates[0] || null,
        summary: {
          candidateUserIds,
          uniqueEvaluatorCounts: uniqueEligibleCounts,
          excludedPositions: EXCLUDED_POSITIONS,
          newFormula: 'BerAKHLAK = Sum of all evaluations (no averaging)',
          excludedUserDetails: excludedUsers.map(u => ({
            nama: u.nama,
            jabatan: u.jabatan,
            nip: u.nip
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ Calculate final evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// GET FINAL EVALUATIONS (with ranking) - UPDATED
const getFinalEvaluations = async (req, res) => {
  try {
    const { 
      periodId,
      onlyCandidates = false,
      page = 1,
      limit = 100  // Increase default limit
    } = req.query;

    console.log('📊 Getting final evaluations:', { periodId, onlyCandidates, page, limit });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (periodId) where.periodId = periodId;
    if (onlyCandidates === 'true') where.isCandidate = true;

    const [finalEvaluations, totalCount] = await Promise.all([
      prisma.finalEvaluation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              jabatan: true,
              nip: true,
              role: true,
              profilePicture: true
            }
          },
          period: {
            select: {
              id: true,
              namaPeriode: true,
              tahun: true,
              bulan: true
            }
          }
        },
        orderBy: [
          { isCandidate: 'desc' },
          { finalScore: 'desc' },
          { totalEvaluators: 'desc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.finalEvaluation.count({ where })
    ]);

    // Add eligibility information
    const evaluationsWithEligibility = finalEvaluations.map(evaluation => ({
      ...evaluation,
      isEligibleForCandidacy: !isExcludedPosition(evaluation.user.jabatan),
      excludedReason: isExcludedPosition(evaluation.user.jabatan) 
        ? 'Jabatan tidak memenuhi syarat untuk menjadi kandidat best employee'
        : null
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    console.log('✅ Final evaluations retrieved:', evaluationsWithEligibility.length);

    res.json({
      success: true,
      data: {
        finalEvaluations: evaluationsWithEligibility,
        excludedPositions: EXCLUDED_POSITIONS,
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
    console.error('❌ Get final evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// GET BEST EMPLOYEE WITH PROFILE PICTURE - UPDATED
const getBestEmployee = async (req, res) => {
  try {
    const { periodId } = req.params;

    console.log('👑 Getting best employee for period:', periodId);

    const bestEmployee = await prisma.finalEvaluation.findFirst({
      where: {
        periodId,
        isBestEmployee: true
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true,
            role: true,
            profilePicture: true
          }
        },
        period: {
          select: {
            id: true,
            namaPeriode: true,
            tahun: true,
            bulan: true
          }
        }
      }
    });

    if (!bestEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Best employee belum ditentukan untuk periode ini'
      });
    }

    // Get all candidates for comparison
    const allCandidates = await prisma.finalEvaluation.findMany({
      where: {
        periodId,
        isCandidate: true
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true,
            profilePicture: true
          }
        }
      },
      orderBy: { ranking: 'asc' }
    });

    // Add eligibility information
    const candidatesWithEligibility = allCandidates.map(candidate => ({
      ...candidate,
      isEligibleForCandidacy: !isExcludedPosition(candidate.user.jabatan)
    }));

    console.log('✅ Best employee retrieved:', bestEmployee.user.nama);

    res.json({
      success: true,
      data: {
        bestEmployee: {
          ...bestEmployee,
          isEligibleForCandidacy: !isExcludedPosition(bestEmployee.user.jabatan)
        },
        allCandidates: candidatesWithEligibility,
        period: bestEmployee.period,
        excludedPositions: EXCLUDED_POSITIONS
      }
    });

  } catch (error) {
    console.error('❌ Get best employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// GET LEADERBOARD WITH PROFILE PICTURES - UPDATED
const getLeaderboard = async (req, res) => {
  try {
    const { periodId, limit = 10 } = req.query;

    console.log('📊 Getting leaderboard:', { periodId, limit });

    const where = {};
    if (periodId) where.periodId = periodId;

    const leaderboard = await prisma.finalEvaluation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true,
            role: true,
            profilePicture: true
          }
        },
        period: {
          select: {
            id: true,
            namaPeriode: true,
            tahun: true,
            bulan: true
          }
        }
      },
      orderBy: [
        { finalScore: 'desc' },
        { totalEvaluators: 'desc' },
        { berakhlakScore: 'desc' }
      ],
      take: parseInt(limit)
    });

    // Format response data untuk leaderboard
    const formattedLeaderboard = leaderboard.map((evaluation, index) => ({
      id: evaluation.user.id,
      nama: evaluation.user.nama,
      nip: evaluation.user.nip,
      jabatan: evaluation.user.jabatan,
      profilePicture: evaluation.user.profilePicture,
      nilaiAkhir: evaluation.finalScore,
      nilaiBerakhlak: evaluation.berakhlakScore,
      nilaiPresensi: evaluation.presensiScore,
      nilaiCkp: evaluation.ckpScore,
      rank: index + 1,
      isBestEmployee: evaluation.isBestEmployee,
      isCandidate: evaluation.isCandidate,
      totalEvaluators: evaluation.totalEvaluators,
      ranking: evaluation.ranking,
      isEligibleForCandidacy: !isExcludedPosition(evaluation.user.jabatan),
      excludedReason: isExcludedPosition(evaluation.user.jabatan) 
        ? 'Jabatan tidak memenuhi syarat untuk menjadi kandidat best employee'
        : null,
      status: evaluation.isBestEmployee ? 'Best Employee' : evaluation.isCandidate ? 'Candidate' : 'Regular'
    }));

    console.log('✅ Leaderboard retrieved:', formattedLeaderboard.length);

    res.json({
      success: true,
      data: { 
        leaderboard: formattedLeaderboard,
        excludedPositions: EXCLUDED_POSITIONS,
        period: leaderboard.length > 0 ? leaderboard[0].period : null
      }
    });

  } catch (error) {
    console.error('❌ Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

module.exports = {
  calculateFinalEvaluations,
  getFinalEvaluations,
  getBestEmployee,
  getLeaderboard
};