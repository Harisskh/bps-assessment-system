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
  'Kepala Sub Bagian Umum Badan Pusat Statistik Kabupaten/Kota',
  'Kepala Sub Bagian Umum BPS Kabupaten/Kota',  
  'Kepala Sub Bagian Umum'
];

// Helper function to check if a position is excluded
const isExcludedPosition = (jabatan) => {
  if (!jabatan) return false;
  
  return EXCLUDED_POSITIONS.some(excludedPos => {
    // Check exact match
    if (jabatan.toLowerCase().includes(excludedPos.toLowerCase())) {
      return true;
    }
    
    // Check for variations
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

// CALCULATE AND UPDATE FINAL EVALUATIONS
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

    // Calculate BERAKHLAK scores for each user
    const berakhlakScores = {};
    const evaluatorCounts = {};

    // Group evaluations by target user
    for (const evaluation of evaluations) {
      const targetUserId = evaluation.targetUserId;
      const ranking = evaluation.ranking;

      if (!berakhlakScores[targetUserId]) {
        berakhlakScores[targetUserId] = {
          tokoh1Scores: [],
          tokoh2Scores: [],
          tokoh3Scores: [],
          tokoh1Count: 0,
          tokoh2Count: 0,
          tokoh3Count: 0,
          totalEvaluators: 0
        };
      }

      // Calculate average score for this evaluation (8 parameters)
      const totalScore = evaluation.scores.reduce((sum, score) => sum + score.score, 0);
      const averageScore = totalScore / evaluation.scores.length;

      // Add to appropriate ranking
      if (ranking === 1) {
        berakhlakScores[targetUserId].tokoh1Scores.push(averageScore);
        berakhlakScores[targetUserId].tokoh1Count++;
      } else if (ranking === 2) {
        berakhlakScores[targetUserId].tokoh2Scores.push(averageScore);
        berakhlakScores[targetUserId].tokoh2Count++;
      } else if (ranking === 3) {
        berakhlakScores[targetUserId].tokoh3Scores.push(averageScore);
        berakhlakScores[targetUserId].tokoh3Count++;
      }

      berakhlakScores[targetUserId].totalEvaluators++;
    }

    // Calculate final BERAKHLAK score for each user
    for (const userId in berakhlakScores) {
      const userScores = berakhlakScores[userId];
      
      // Calculate average for each tokoh category
      const tokoh1Avg = userScores.tokoh1Scores.length > 0 
        ? userScores.tokoh1Scores.reduce((a, b) => a + b, 0) / userScores.tokoh1Scores.length 
        : 0;
      
      const tokoh2Avg = userScores.tokoh2Scores.length > 0 
        ? userScores.tokoh2Scores.reduce((a, b) => a + b, 0) / userScores.tokoh2Scores.length 
        : 0;
      
      const tokoh3Avg = userScores.tokoh3Scores.length > 0 
        ? userScores.tokoh3Scores.reduce((a, b) => a + b, 0) / userScores.tokoh3Scores.length 
        : 0;

      // Final BERAKHLAK score = average of 3 categories
      const categoryCount = (tokoh1Avg > 0 ? 1 : 0) + (tokoh2Avg > 0 ? 1 : 0) + (tokoh3Avg > 0 ? 1 : 0);
      const finalBerakhlakScore = categoryCount > 0 
        ? (tokoh1Avg + tokoh2Avg + tokoh3Avg) / categoryCount 
        : 0;

      berakhlakScores[userId].finalScore = finalBerakhlakScore;
      berakhlakScores[userId].tokoh1Avg = tokoh1Avg;
      berakhlakScores[userId].tokoh2Avg = tokoh2Avg;
      berakhlakScores[userId].tokoh3Avg = tokoh3Avg;
    }

    // Get all users with their job positions to apply filtering
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

    // Determine candidates based on total evaluators (top 2 ranks) 
    // BUT EXCLUDE users with specific job positions
    const allUserEvaluatorCounts = Object.entries(berakhlakScores)
      .map(([userId, data]) => {
        const user = userMap[userId];
        return {
          userId,
          count: data.totalEvaluators,
          jabatan: user?.jabatan || '',
          isEligible: user ? !isExcludedPosition(user.jabatan) : false
        };
      })
      .sort((a, b) => b.count - a.count);

    // Filter to get only eligible users, then get top 2 unique counts
    const eligibleUserCounts = allUserEvaluatorCounts.filter(u => u.isEligible);
    const uniqueEligibleCounts = [...new Set(eligibleUserCounts.map(u => u.count))].slice(0, 2);
    
    // Get candidate user IDs from eligible users with top 2 counts
    const candidateUserIds = eligibleUserCounts
      .filter(u => uniqueEligibleCounts.includes(u.count))
      .map(u => u.userId);

    console.log('All user evaluator counts:', allUserEvaluatorCounts);
    console.log('Eligible users for candidacy:', eligibleUserCounts);
    console.log('Top 2 unique counts from eligible users:', uniqueEligibleCounts);
    console.log('Final candidates based on eligibility filter:', candidateUserIds);

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
        finalScore: 0,
        totalEvaluators: 0,
        tokoh1Count: 0,
        tokoh2Count: 0,
        tokoh3Count: 0
      };

      const attendanceData = attendances.find(a => a.userId === userId);
      const ckpData = ckpScores.find(c => c.userId === userId);
      const user = userMap[userId];

      // Calculate weighted scores
      const berakhlakScore = berakhlakData.finalScore || 0;
      const presensiScore = attendanceData?.nilaiPresensi || 0;
      const ckpScore = ckpData?.score || 0;

      const berakhlakWeighted = berakhlakScore * 0.30;
      const presensiWeighted = presensiScore * 0.40;
      const ckpWeighted = ckpScore * 0.30;
      const finalScore = berakhlakWeighted + presensiWeighted + ckpWeighted;

      // Check if user is eligible for candidacy (not excluded by job position)
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
        totalEvaluators: berakhlakData.totalEvaluators,
        tokoh1Count: berakhlakData.tokoh1Count,
        tokoh2Count: berakhlakData.tokoh2Count,
        tokoh3Count: berakhlakData.tokoh3Count,
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

    res.json({
      success: true,
      message: 'Final evaluations calculated successfully',
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
          allUserCounts: allUserEvaluatorCounts,
          eligibleUserCounts: eligibleUserCounts,
          excludedUserDetails: excludedUsers.map(u => ({
            nama: u.nama,
            jabatan: u.jabatan,
            nip: u.nip
          }))
        }
      }
    });

  } catch (error) {
    console.error('Calculate final evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// GET FINAL EVALUATIONS (with ranking)
const getFinalEvaluations = async (req, res) => {
  try {
    const { 
      periodId,
      onlyCandidates = false,
      page = 1,
      limit = 20
    } = req.query;

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
              profilePicture: true  // 🔥 TAMBAHKAN PROFILE PICTURE
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

    // Add eligibility information to each evaluation
    const evaluationsWithEligibility = finalEvaluations.map(evaluation => ({
      ...evaluation,
      isEligibleForCandidacy: !isExcludedPosition(evaluation.user.jabatan),
      excludedReason: isExcludedPosition(evaluation.user.jabatan) 
        ? 'Jabatan tidak memenuhi syarat untuk menjadi kandidat best employee'
        : null
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

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
    console.error('Get final evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// 🔥 GET BEST EMPLOYEE WITH PROFILE PICTURE
const getBestEmployee = async (req, res) => {
  try {
    const { periodId } = req.params;

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
            profilePicture: true  // 🔥 TAMBAHKAN PROFILE PICTURE
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
            profilePicture: true  // 🔥 TAMBAHKAN PROFILE PICTURE
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
    console.error('Get best employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

// 🔥 GET LEADERBOARD WITH PROFILE PICTURES
const getLeaderboard = async (req, res) => {
  try {
    const { periodId, limit = 10 } = req.query;

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
            profilePicture: true  // 🔥 TAMBAHKAN PROFILE PICTURE
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

    // 🔥 Format response data untuk leaderboard dengan profile picture
    const formattedLeaderboard = leaderboard.map((evaluation, index) => ({
      id: evaluation.user.id,
      nama: evaluation.user.nama,
      nip: evaluation.user.nip,
      jabatan: evaluation.user.jabatan,
      profilePicture: evaluation.user.profilePicture,  // 🔥 INCLUDE PROFILE PICTURE
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

    res.json({
      success: true,
      data: { 
        leaderboard: formattedLeaderboard,
        excludedPositions: EXCLUDED_POSITIONS,
        period: leaderboard.length > 0 ? leaderboard[0].period : null
      }
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  calculateFinalEvaluations,
  getFinalEvaluations,
  getBestEmployee,
  getLeaderboard
};