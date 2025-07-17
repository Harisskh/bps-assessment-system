// src/pages/ComprehensiveReportPage.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { periodAPI, reportsAPI, finalEvaluationAPI, attendanceAPI, ckpAPI, userAPI, evaluationAPI } from '../services/api';

const ComprehensiveReportPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const response = await periodAPI.getAllSmart({ limit: 50 });
      setPeriods(response.data.data.periods);

      // Set default to active period
      const activePeriod = response.data.data.periods.find(p => p.isActive);
      if (activePeriod) {
        setSelectedPeriod(activePeriod.id);
      }
    } catch (error) {
      console.error('Load periods error:', error);
      setError('Gagal memuat data periode');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 NEW: Helper function to get Kepala BPS name
  const getKepalaBpsName = (usersData) => {
    // Cari berdasarkan jabatan terlebih dahulu
    let kepalaBps = usersData.find(user => 
      user.jabatan && user.jabatan.toLowerCase().includes('kepala bps kabupaten')
    );
    
    // Jika tidak ada, cari berdasarkan role
    if (!kepalaBps) {
      kepalaBps = usersData.find(user => 
        user.role && user.role.toLowerCase() === 'pimpinan'
      );
    }
    
    return kepalaBps ? kepalaBps.nama : 'Kepala BPS Kabupaten Pringsewu';
  };

  const generateReport = async () => {
    if (!selectedPeriod) {
      setError('Pilih periode terlebih dahulu');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log('🔄 Generating comprehensive report for period:', selectedPeriod);

      // 🔥 FALLBACK: Use multiple API calls if reports endpoint not available
      let reportResult;
      
      try {
        // Try the comprehensive report API first
        const response = await reportsAPI.getComprehensive({ 
          periodId: selectedPeriod 
        });
        
        if (response.data.success && response.data.data) {
          reportResult = response.data.data;
        } else {
          throw new Error('Report API returned invalid data');
        }
      } catch (reportError) {
        console.warn('⚠️ Reports API not available, using fallback method:', reportError);
        
        console.log('🔄 Making API calls with existing services...');
        
        const [finalEvaluationResponse, attendanceResponse, ckpResponse, usersResponse, evaluationsResponse] = await Promise.all([
          finalEvaluationAPI.getFinal({ periodId: selectedPeriod, limit: 1000 }),
          // 🔥 FIXED: Use existing attendanceAPI.getAll with detailed logging
          (async () => {
            try {
              console.log('📡 Calling attendanceAPI.getAll...');
              const response = await attendanceAPI.getAll({ periodId: selectedPeriod, limit: 1000 });
              console.log('✅ AttendanceAPI response:', response);
              return response;
            } catch (error) {
              console.error('❌ AttendanceAPI failed:', error);
              // Fallback: try direct API call
              try {
                console.log('📡 Trying direct attendance API call...');
                const directResponse = await fetch(`/api/attendance?periodId=${selectedPeriod}&limit=1000`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                  }
                });
                const directData = await directResponse.json();
                console.log('✅ Direct attendance API response:', directData);
                return { data: directData };
              } catch (directError) {
                console.error('❌ Direct attendance API also failed:', directError);
                return { data: { success: false, data: { attendances: [] } } };
              }
            }
          })(),
          // 🔥 FIXED: Use existing ckpAPI.getAll with detailed logging
          (async () => {
            try {
              console.log('📡 Calling ckpAPI.getAll...');
              const response = await ckpAPI.getAll({ periodId: selectedPeriod, limit: 1000 });
              console.log('✅ CkpAPI response:', response);
              return response;
            } catch (error) {
              console.error('❌ CkpAPI failed:', error);
              // Fallback: try direct API call
              try {
                console.log('📡 Trying direct CKP API call...');
                const directResponse = await fetch(`/api/ckp?periodId=${selectedPeriod}&limit=1000`, {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                  }
                });
                const directData = await directResponse.json();
                console.log('✅ Direct CKP API response:', directData);
                return { data: directData };
              } catch (directError) {
                console.error('❌ Direct CKP API also failed:', directError);
                return { data: { success: false, data: { ckpScores: [] } } };
              }
            }
          })(),
          userAPI.getAll({ isActive: true, limit: 1000 }),
          evaluationAPI.getAll({ periodId: selectedPeriod, limit: 1000 })
        ]);

        console.log('📡 All API Responses received:');
        console.log('- Final evaluation response:', finalEvaluationResponse);
        console.log('- Attendance response:', attendanceResponse);
        console.log('- CKP response:', ckpResponse);

        const finalEvaluations = finalEvaluationResponse.data?.data?.finalEvaluations || [];
        
        // 🔥 FIXED: Extract attendance data with detailed debugging
        let attendanceData = [];
        console.log('🔍 Extracting attendance data...');
        console.log('- attendanceResponse structure:', Object.keys(attendanceResponse));
        console.log('- attendanceResponse.data structure:', Object.keys(attendanceResponse.data || {}));
        
        if (attendanceResponse.data?.success && attendanceResponse.data?.data) {
          attendanceData = attendanceResponse.data.data.attendances || attendanceResponse.data.data.attendance || [];
          console.log('✅ Extracted attendance data from data.data.attendances:', attendanceData.length);
        } else if (attendanceResponse.data?.attendances) {
          attendanceData = attendanceResponse.data.attendances;
          console.log('✅ Extracted attendance data from data.attendances:', attendanceData.length);
        } else if (attendanceResponse.data?.data?.attendances) {
          attendanceData = attendanceResponse.data.data.attendances;
          console.log('✅ Extracted attendance data from data.data.attendances:', attendanceData.length);
        }
        
        // 🔥 FIXED: Extract CKP data with detailed debugging
        let ckpData = [];
        console.log('🔍 Extracting CKP data...');
        console.log('- ckpResponse structure:', Object.keys(ckpResponse));
        console.log('- ckpResponse.data structure:', Object.keys(ckpResponse.data || {}));
        
        if (ckpResponse.data?.success && ckpResponse.data?.data) {
          ckpData = ckpResponse.data.data.ckpScores || ckpResponse.data.data.ckp || [];
          console.log('✅ Extracted CKP data from data.data.ckpScores:', ckpData.length);
        } else if (ckpResponse.data?.ckpScores) {
          ckpData = ckpResponse.data.ckpScores;
          console.log('✅ Extracted CKP data from data.ckpScores:', ckpData.length);
        } else if (ckpResponse.data?.data?.ckpScores) {
          ckpData = ckpResponse.data.data.ckpScores;
          console.log('✅ Extracted CKP data from data.data.ckpScores:', ckpData.length);
        }
        
        const usersData = usersResponse.data.data?.users || [];
        const evaluationsData = evaluationsResponse.data.data?.evaluations || [];

        console.log('🔍 Debug data received:');
        console.log('- Final evaluations:', finalEvaluations.length);
        console.log('- Attendance data:', attendanceData.length);
        console.log('- CKP data:', ckpData.length);
        console.log('- Users data:', usersData.length);
        console.log('- Evaluations data:', evaluationsData.length);

        // 🔥 FIXED: Debug attendance structure with more detail
        if (attendanceData.length > 0) {
          console.log('🔍 Sample attendance record:', attendanceData[0]);
          console.log('🔍 Attendance fields available:', Object.keys(attendanceData[0]));
          // Check if the number fields exist
          console.log('🔍 Number fields check:', {
            jumlahTidakKerja: attendanceData[0].jumlahTidakKerja,
            jumlahPulangAwal: attendanceData[0].jumlahPulangAwal,
            jumlahTelat: attendanceData[0].jumlahTelat,
            jumlahAbsenApel: attendanceData[0].jumlahAbsenApel,
            jumlahCuti: attendanceData[0].jumlahCuti,
            nilaiPresensi: attendanceData[0].nilaiPresensi
          });
        }

        // Process BerAKHLAK data to get voter counts
        const berakhlakVoters = {};
        evaluationsData.forEach(evaluation => {
          const targetId = evaluation.targetUserId;
          if (!berakhlakVoters[targetId]) {
            berakhlakVoters[targetId] = 0;
          }
          berakhlakVoters[targetId]++;
        });

        // Process and combine data
        const combinedData = usersData.map(user => {
          const finalEval = finalEvaluations.find(fe => fe.userId === user.id);
          const attendance = attendanceData.find(att => att.userId === user.id);
          const ckp = ckpData.find(c => c.userId === user.id);
          const voterCount = berakhlakVoters[user.id] || 0;

          // 🔥 FIXED: Attendance data extraction with correct field mapping
          const attendanceInfo = {
            // Try multiple possible field names for percentage
            percentage: attendance ? (attendance.nilaiPresensi || attendance.totalNilaiPresensi || 100) : 100,
            // 🔥 FIXED: Extract individual violation counts from new structure
            tidakKerja: attendance?.jumlahTidakKerja || 0,
            pulangAwal: attendance?.jumlahPulangAwal || 0,
            telat: attendance?.jumlahTelat || 0,
            absenApel: attendance?.jumlahAbsenApel || 0,
            cuti: attendance?.jumlahCuti || 0,
            // Calculate weighted score
            weightedScore: attendance ? ((attendance.nilaiPresensi || attendance.totalNilaiPresensi || 100) * 0.4) : 40
          };

          return {
            user: {
              id: user.id,
              nama: user.nama,
              nip: user.nip,
              jabatan: user.jabatan,
              role: user.role
            },
            berakhlak: {
              score: finalEval?.berakhlakScore || 0,
              voterCount: voterCount,
              isCandidate: finalEval?.isCandidate || false,
              weightedScore: finalEval ? (finalEval.berakhlakScore * 0.3) : 0
            },
            attendance: attendanceInfo,
            ckp: {
              score: ckp?.score || 0,
              keterangan: ckp?.keterangan || '',
              weightedScore: ckp ? (ckp.score * 0.3) : 0
            },
            finalScore: finalEval?.finalScore || 0,
            ranking: finalEval?.ranking || null,
            isBestEmployee: finalEval?.isBestEmployee || false,
            isCandidate: finalEval?.isCandidate || false
          };
        });

        // Sort by final score descending
        combinedData.sort((a, b) => b.finalScore - a.finalScore);

        const periodData = periods.find(p => p.id === selectedPeriod);

        // 🔥 NEW: Get Kepala BPS name
        const kepalaBpsName = getKepalaBpsName(usersData);

        reportResult = {
          period: periodData,
          employees: combinedData,
          summary: {
            totalEmployees: combinedData.length,
            candidates: combinedData.filter(emp => emp.berakhlak.isCandidate).length,
            bestEmployee: combinedData.find(emp => emp.isBestEmployee),
            averageBerakhlak: combinedData.length > 0 ? 
              (combinedData.reduce((sum, emp) => sum + emp.berakhlak.score, 0) / combinedData.length).toFixed(2) : 0,
            averageAttendance: combinedData.length > 0 ? 
              (combinedData.reduce((sum, emp) => sum + emp.attendance.percentage, 0) / combinedData.length).toFixed(2) : 0,
            averageCkp: combinedData.length > 0 ? 
              (combinedData.reduce((sum, emp) => sum + emp.ckp.score, 0) / combinedData.length).toFixed(2) : 0
          },
          kepalaBpsName: kepalaBpsName // 🔥 NEW: Add Kepala BPS name
        };
      }

      if (reportResult && reportResult.employees) {
        // Process data for display
        const combinedData = reportResult.employees || [];
        
        // Sort BerAKHLAK recap by voter count - INCLUDE ALL EMPLOYEES
        const berakhlakRecap = combinedData
          .sort((a, b) => b.berakhlak.voterCount - a.berakhlak.voterCount);

        setReportData({
          period: reportResult.period,
          employees: combinedData,
          berakhlakRecap: berakhlakRecap,
          attendanceRecap: combinedData,
          ckpRecap: combinedData.filter(emp => emp.ckp.score > 0),
          summary: reportResult.summary,
          metadata: reportResult.metadata,
          kepalaBpsName: reportResult.kepalaBpsName // 🔥 NEW: Pass Kepala BPS name
        });

        setSuccess('Report berhasil digenerate! Scroll ke bawah untuk melihat hasil.');
      } else {
        setError('Data report tidak valid atau kosong');
      }

    } catch (error) {
      console.error('Generate report error:', error);
      setError('Gagal generate report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!reportData) {
      setError('Generate report terlebih dahulu');
      return;
    }

    // Create printable version
    const printWindow = window.open('', '_blank');
    const htmlContent = generatePrintableHTML();
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Add slight delay to ensure content is loaded then trigger print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  };

  const generatePrintableHTML = () => {
    if (!reportData) return '';

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Laporan Evaluasi Pegawai - ${reportData.period?.namaPeriode}</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                font-size: 12px; 
                line-height: 1.4;
            }
            .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 2px solid #007bff;
                padding-bottom: 20px;
            }
            .logo-section {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 30px;
                margin-bottom: 20px;
                padding: 10px 0;
            }
            .logo-section img {
                height: 80px;
                width: auto;
                max-width: 120px;
                object-fit: contain;
            }
            .logo-section-fallback {
                display: none;
            }
            .logo-bps {
                width: 80px;
                height: 80px;
                background: #007bff;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                text-align: center;
            }
            .logo-berakhlak {
                width: 120px;
                height: 80px;
                background: #dc3545;
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                text-align: center;
            }
            .logo-berakhlak .main-text {
                font-size: 18px;
                margin-bottom: 5px;
            }
            .logo-berakhlak .sub-text {
                font-size: 8px;
                line-height: 1.2;
            }
            .report-title {
                font-size: 12px;
                color: #333;
                margin: 10px 0;
            }
            .main-title {
                font-size: 16px;
                font-weight: bold;
                color: #000;
                margin: 10px 0;
                text-transform: uppercase;
            }
            .period-title {
                font-size: 14px;
                font-weight: bold;
                color: #000;
                margin: 5px 0;
            }
            .agency-title {
                font-size: 14px;
                font-weight: bold;
                color: #000;
                margin: 5px 0;
            }
            .date-print {
                font-size: 10px;
                color: #666;
                margin-top: 10px;
            }
            .best-employee-box {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                border: 2px solid #f39c12;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
            }
            .best-employee-title {
                font-size: 16px;
                font-weight: bold;
                color: #8B4513;
                margin-bottom: 10px;
            }
            .best-employee-name {
                font-size: 20px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 5px;
            }
            .best-employee-score {
                font-size: 16px;
                color: #27ae60;
                font-weight: bold;
            }
            .best-employee-position {
                font-size: 12px;
                color: #7f8c8d;
                margin-top: 5px;
            }
            .section { 
                margin-bottom: 30px; 
                page-break-inside: avoid;
            }
            .section-title { 
                font-size: 14px; 
                font-weight: bold; 
                margin-bottom: 10px; 
                background-color: #f8f9fa; 
                padding: 8px; 
                border-left: 4px solid #007bff;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 15px; 
                font-size: 10px;
            }
            th, td { 
                border: 1px solid #ddd; 
                padding: 4px; 
                text-align: center; 
                vertical-align: middle;
            }
            th { 
                background-color: #f8f9fa; 
                font-weight: bold; 
                font-size: 10px;
            }
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .best-employee-row { 
                background-color: #fff3cd; 
                font-weight: bold; 
            }
            .candidate-row { 
                background-color: #d4edda; 
            }
            .summary-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            }
            .stat-box {
                text-align: center;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                border-left: 4px solid #007bff;
            }
            .stat-value {
                font-size: 20px;
                font-weight: bold;
                color: #007bff;
            }
            .stat-label {
                font-size: 11px;
                color: #666;
                margin-top: 5px;
            }
            .footer {
                margin-top: 50px;
                text-align: right;
                font-size: 12px;
            }
            @media print {
                .no-print { display: none; }
                body { margin: 0; }
                .section { page-break-inside: avoid; }
                table { font-size: 9px; }
                th, td { padding: 3px; }
            }
        </style>
    </head>
    <body>
        <!-- Header dengan Logo -->
        <div class="header">
            <!-- Logo Section -->
            <div class="logo-section">
                <img src="./Logo-BPS.png" alt="Logo BPS" style="height: 80px; width: auto;" onerror="this.style.display='none'">
                <img src="./Logo-RB.png" alt="Logo RB" style="height: 80px; width: auto; margin: 0 20px;" onerror="this.style.display='none'">
                <img src="./Logo-Berakhlak.png" alt="Logo BerAKHLAK" style="height: 80px; width: auto;" onerror="this.style.display='none'">
            </div>
            
            <!-- Fallback Logo -->
            <div class="logo-section-fallback" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 20px;">
                <div class="logo-bps">
                    BPS<br>
                    <small style="font-size: 10px;">KABUPATEN<br>PRINGSEWU</small>
                </div>
                <div class="logo-rb" style="width: 80px; height: 80px; background: #007bff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; text-align: center;">
                    RB<br>
                    <small style="font-size: 8px;">REFORMASI<br>BIROKRASI</small>
                </div>
                <div class="logo-berakhlak">
                    <div class="main-text">BerAKHLAK</div>
                    <div class="sub-text">
                        Berorientasi Pelayanan • Akuntabel<br>
                        Kompeten • Harmonis • Loyal<br>
                        Adaptif • Kolaboratif
                    </div>
                </div>
            </div>
            
            <!-- Text Content -->
            <div style="text-align: center;">
                <div class="report-title">LAPORAN PEMBERIAN REWARD BAGI PEGAWAI</div>
                <div class="main-title">PEMILIHAN PEGAWAI TERBAIK (EMPLOYEE OF THE MONTH)</div>
                <div class="period-title">PERIODE "${reportData.period?.namaPeriode?.toUpperCase()}"</div>
                <div class="agency-title">BADAN PUSAT STATISTIK KABUPATEN PRINGSEWU</div>
            </div>
            <div class="date-print">Tanggal Cetak: ${formattedDate}</div>
        </div>

        <!-- Summary Statistics -->
        <div class="summary-stats">
            <div class="stat-box">
                <div class="stat-value">${reportData.summary.totalEmployees}</div>
                <div class="stat-label">Total Pegawai</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${reportData.summary.candidates}</div>
                <div class="stat-label">Kandidat Terbaik</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${reportData.summary.averageCkp}</div>
                <div class="stat-label">Rata-rata CKP</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${reportData.summary.averageAttendance}%</div>
                <div class="stat-label">Rata-rata Presensi</div>
            </div>
        </div>

        <!-- Best Employee Box -->
        ${reportData.summary.bestEmployee ? `
        <div class="best-employee-box">
            <div class="best-employee-title">🏆 Best Employee of the Month - ${reportData.period?.namaPeriode}</div>
            <div class="best-employee-name">${reportData.summary.bestEmployee.user.nama}</div>
            <div class="best-employee-score">Skor Akhir: ${reportData.summary.bestEmployee.finalScore.toFixed(2)}</div>
            <div class="best-employee-position">${reportData.summary.bestEmployee.user.jabatan}</div>
        </div>
        ` : '<div class="best-employee-box"><div class="best-employee-title">Best Employee belum ditentukan</div></div>'}

        <!-- Leaderboard Final -->
        <div class="section">
            <div class="section-title">LEADERBOARD FINAL - SEMUA PEGAWAI</div>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Nama Pegawai</th>
                        <th>Jabatan</th>
                        <th>Pemilih</th>
                        <th>BerAKHLAK</th>
                        <th>Presensi</th>
                        <th>CKP</th>
                        <th>30% BerAKHLAK</th>
                        <th>40% Presensi</th>
                        <th>30% CKP</th>
                        <th>SKOR TOTAL</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.employees.map((emp, index) => `
                    <tr class="${emp.isBestEmployee ? 'best-employee-row' : emp.isCandidate ? 'candidate-row' : ''}">
                        <td><strong>${index + 1}</strong></td>
                        <td class="text-left">${emp.user.nama}</td>
                        <td class="text-left" style="font-size: 9px;">${emp.user.jabatan}</td>
                        <td><strong>${emp.berakhlak.voterCount}</strong></td>
                        <td>${emp.berakhlak.score.toFixed(1)}</td>
                        <td>${emp.attendance.percentage.toFixed(0)}%</td>
                        <td>${emp.ckp.score}</td>
                        <td>${emp.berakhlak.weightedScore.toFixed(1)}</td>
                        <td>${emp.attendance.weightedScore.toFixed(1)}</td>
                        <td>${emp.ckp.weightedScore.toFixed(1)}</td>
                        <td><strong>${emp.finalScore.toFixed(2)}</strong></td>
                        <td>
                            ${emp.isBestEmployee ? 'Best Employee' : 
                              emp.isCandidate ? 'Kandidat' : 'Regular'}
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Rekap BerAKHLAK -->
        <div class="section">
            <div class="section-title">REKAP TOKOH BerAKHLAK</div>
            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nama</th>
                        <th>Jumlah Pemilih</th>
                        <th>Total Skor BerAKHLAK</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.berakhlakRecap.map((emp, index) => `
                    <tr class="${emp.isBestEmployee ? 'best-employee-row' : emp.berakhlak.isCandidate ? 'candidate-row' : ''}">
                        <td>${index + 1}</td>
                        <td class="text-left">${emp.user.nama}</td>
                        <td><strong>${emp.berakhlak.voterCount}</strong></td>
                        <td>${emp.berakhlak.score.toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- 🔥 FIXED: Rekap Presensi with Individual Violation Counts -->
        <div class="section">
            <div class="section-title">REKAP PRESENSI</div>
            <table>
                <thead>
                    <tr>
                        <th rowSpan="2">No</th>
                        <th rowSpan="2">Nama</th>
                        <th rowSpan="2">Persentase Awal</th>
                        <th colSpan="5">Detail Pelanggaran</th>
                        <th rowSpan="2">Total Minus (%)</th>
                        <th rowSpan="2">Total Nilai Presensi (%)</th>
                    </tr>
                    <tr>
                        <th>TK</th>
                        <th>PSW</th>
                        <th>TLT</th>
                        <th>APEL</th>
                        <th>CT</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.employees.map((emp, index) => `
                    <tr class="${emp.isBestEmployee ? 'best-employee-row' : emp.isCandidate ? 'candidate-row' : ''}">
                        <td>${index + 1}</td>
                        <td class="text-left">${emp.user.nama}</td>
                        <td>100%</td>
                        <td>${emp.attendance.tidakKerja || 0}</td>
                        <td>${emp.attendance.pulangAwal || 0}</td>
                        <td>${emp.attendance.telat || 0}</td>
                        <td>${emp.attendance.absenApel || 0}</td>
                        <td>${emp.attendance.cuti || 0}</td>
                        <td>${(100 - emp.attendance.percentage).toFixed(1)}%</td>
                        <td><strong>${emp.attendance.percentage.toFixed(1)}%</strong></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Rekap CKP -->
        <div class="section">
            <div class="section-title">REKAP CAPAIAN KINERJA PEGAWAI (CKP)</div>
            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nama</th>
                        <th>Skor CKP</th>
                        <th>Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.employees.map((emp, index) => `
                    <tr class="${emp.isBestEmployee ? 'best-employee-row' : emp.isCandidate ? 'candidate-row' : ''}">
                        <td>${index + 1}</td>
                        <td class="text-left">${emp.user.nama}</td>
                        <td><strong>${emp.ckp.score}</strong></td>
                        <td class="text-left" style="font-size: 9px;">${emp.ckp.keterangan || '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- 🔥 FIXED: Footer with Dynamic Kepala BPS Name -->
        <div class="footer">
            <p>Pringsewu, ${formattedDate}</p>
            <br><br><br>
            <p><strong>${reportData.kepalaBpsName || 'Kepala BPS Kabupaten Pringsewu'}</strong></p>
            <br><br><br>
            <p><strong>_________________________</strong></p>
            <br>
            <p style="font-size: 10px; color: #666;">
                *Laporan ini dicetak otomatis dari sistem pada ${new Date().toLocaleDateString('id-ID', { 
                  day: '2-digit', month: 'long', year: 'numeric'
                })} ${new Date().toLocaleTimeString('id-ID')}
            </p>
        </div>
        
        <!-- JavaScript untuk Logo Fallback -->
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const logoSection = document.querySelector('.logo-section');
                const logoFallback = document.querySelector('.logo-section-fallback');
                const images = logoSection.querySelectorAll('img');
                let loadedImages = 0;
                
                images.forEach(function(img) {
                    img.onload = function() {
                        loadedImages++;
                        if (loadedImages === 1) {
                            logoFallback.style.display = 'none';
                        }
                    };
                    
                    img.onerror = function() {
                        this.style.display = 'none';
                        setTimeout(function() {
                            const visibleImages = Array.from(images).filter(img => img.style.display !== 'none');
                            if (visibleImages.length === 0) {
                                logoSection.style.display = 'none';
                                logoFallback.style.display = 'flex';
                            }
                        }, 100);
                    };
                });
            });
        </script>
    </body>
    </html>
    `;
  };

  if (loading && !reportData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuat data report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-file-pdf me-2"></i>
            Laporan Evaluasi Pegawai
          </h1>
          <p className="text-muted">Generate laporan komprehensif evaluasi pegawai dalam format PDF</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show">
          <i className="fas fa-check-circle me-2"></i>
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Report Configuration */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-cog me-2"></i>
            Konfigurasi Laporan
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label">Periode Evaluasi *</label>
              <select
                className="form-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">-- Pilih Periode --</option>
                {periods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.namaPeriode} {period.isActive && '(Aktif)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <button 
                className="btn btn-primary btn-lg w-100"
                onClick={generateReport}
                disabled={loading || !selectedPeriod}
              >
                {loading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Generating Report...
                  </>
                ) : (
                  <>
                    <i className="fas fa-chart-bar me-2"></i>
                    Generate Laporan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-eye me-2"></i>
              Preview Laporan - {reportData.period?.namaPeriode}
            </h5>
            <button 
              className="btn btn-danger btn-lg"
              onClick={downloadPDF}
              title="Download Laporan PDF"
            >
              <i className="fas fa-download me-2"></i>
              Download PDF
            </button>
          </div>
          <div className="card-body">
            {/* Summary Stats */}
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="text-center p-3 bg-light rounded">
                  <h4 className="text-primary mb-1">{reportData.summary.totalEmployees}</h4>
                  <small className="text-muted">Total Pegawai</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 bg-light rounded">
                  <h4 className="text-success mb-1">{reportData.summary.candidates}</h4>
                  <small className="text-muted">Kandidat Terbaik</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 bg-light rounded">
                  <h4 className="text-info mb-1">{reportData.summary.averageCkp}</h4>
                  <small className="text-muted">Rata-rata CKP</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 bg-light rounded">
                  <h4 className="text-warning mb-1">{reportData.summary.averageAttendance}%</h4>
                  <small className="text-muted">Rata-rata Presensi</small>
                </div>
              </div>
            </div>

            {/* Best Employee */}
            {reportData.summary.bestEmployee && (
              <div className="alert alert-warning text-center mb-4" style={{ background: 'linear-gradient(135deg, #ffd700, #ffed4e)', border: '2px solid #f39c12' }}>
                <h5 className="alert-heading">
                  <i className="fas fa-trophy me-2"></i>
                  🏆 Best Employee of the Month - {reportData.period?.namaPeriode}
                </h5>
                <h4 className="mb-1" style={{ color: '#2c3e50' }}>{reportData.summary.bestEmployee.user.nama}</h4>
                <p className="mb-0">
                  Skor Akhir: <strong style={{ color: '#27ae60' }}>{reportData.summary.bestEmployee.finalScore.toFixed(2)}</strong>
                  <br />
                  <small className="text-muted">{reportData.summary.bestEmployee.user.jabatan}</small>
                </p>
              </div>
            )}

            {/* Leaderboard Table */}
            <h6 className="mb-3">Leaderboard Final - Semua Pegawai</h6>
            <div className="table-responsive mb-4">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Rank</th>
                    <th>Nama</th>
                    <th>Jabatan</th>
                    <th>Pemilih</th>
                    <th>BerAKHLAK</th>
                    <th>Presensi</th>
                    <th>CKP</th>
                    <th>Skor Akhir</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.employees.slice(0, 20).map((emp, index) => (
                    <tr key={emp.user.id} className={emp.isBestEmployee ? 'table-warning' : emp.isCandidate ? 'table-info' : ''}>
                      <td>
                        <strong>#{index + 1}</strong>
                        {emp.isBestEmployee && <i className="fas fa-crown text-warning ms-1"></i>}
                      </td>
                      <td>{emp.user.nama}</td>
                      <td><small>{emp.user.jabatan}</small></td>
                      <td className="text-center">
                        <strong>{emp.berakhlak.voterCount}</strong>
                      </td>
                      <td className="text-center">{emp.berakhlak.score.toFixed(1)}</td>
                      <td className="text-center">{emp.attendance.percentage.toFixed(0)}%</td>
                      <td className="text-center">{emp.ckp.score}</td>
                      <td className="text-center"><strong>{emp.finalScore.toFixed(2)}</strong></td>
                      <td>
                        {emp.isBestEmployee && <span className="badge bg-warning text-dark">Best Employee</span>}
                        {emp.isCandidate && !emp.isBestEmployee && <span className="badge bg-info">Kandidat</span>}
                        {!emp.isCandidate && !emp.isBestEmployee && <span className="badge bg-light text-dark">Regular</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BerAKHLAK Recap */}
            <h6 className="mb-3">Rekap BerAKHLAK - Semua Pegawai</h6>
            <div className="table-responsive mb-4">
              <table className="table table-striped">
                <thead className="table-light">
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Jumlah Pemilih</th>
                    <th>Total Skor BerAKHLAK</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.berakhlakRecap.map((emp, index) => (
                    <tr key={emp.user.id} className={emp.isBestEmployee ? 'table-warning' : emp.berakhlak.isCandidate ? 'table-info' : ''}>
                      <td>{index + 1}</td>
                      <td>{emp.user.nama}</td>
                      <td className="text-center">
                        <strong>{emp.berakhlak.voterCount}</strong>
                        {emp.berakhlak.voterCount === 0 && <small className="text-muted d-block">(Tidak ada pemilih)</small>}
                      </td>
                      <td className="text-center">{emp.berakhlak.score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 🔥 FIXED: Attendance Recap with Individual Violation Counts */}
            <h6 className="mb-3">Preview Rekap Presensi</h6>
            <div className="table-responsive mb-4">
              <table className="table table-striped">
                <thead className="table-light">
                  <tr>
                    <th rowSpan="2">No</th>
                    <th rowSpan="2">Nama</th>
                    <th rowSpan="2">Persentase Awal</th>
                    <th colSpan="5">Detail Pelanggaran</th>
                    <th rowSpan="2">Total Minus (%)</th>
                    <th rowSpan="2">Total Nilai Presensi (%)</th>
                  </tr>
                  <tr>
                    <th>TK</th>
                    <th>PSW</th>
                    <th>TLT</th>
                    <th>APEL</th>
                    <th>CT</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.employees.slice(0, 10).map((emp, index) => (
                    <tr key={emp.user.id} className={emp.isBestEmployee ? 'table-warning' : emp.berakhlak.isCandidate ? 'table-info' : ''}>
                      <td>{index + 1}</td>
                      <td>{emp.user.nama}</td>
                      <td>100%</td>
                      <td className="text-center">{emp.attendance.tidakKerja || 0}</td>
                      <td className="text-center">{emp.attendance.pulangAwal || 0}</td>
                      <td className="text-center">{emp.attendance.telat || 0}</td>
                      <td className="text-center">{emp.attendance.absenApel || 0}</td>
                      <td className="text-center">{emp.attendance.cuti || 0}</td>
                      <td className="text-center">{(100 - emp.attendance.percentage).toFixed(1)}%</td>
                      <td className="text-center"><strong>{emp.attendance.percentage.toFixed(1)}%</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CKP Recap Preview */}
            <h6 className="mb-3">Preview Rekap CKP</h6>
            <div className="table-responsive mb-4">
              <table className="table table-striped">
                <thead className="table-light">
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Skor CKP</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.employees.slice(0, 10).map((emp, index) => (
                    <tr key={emp.user.id} className={emp.isBestEmployee ? 'table-warning' : emp.berakhlak.isCandidate ? 'table-info' : ''}>
                      <td>{index + 1}</td>
                      <td>{emp.user.nama}</td>
                      <td className="text-center"><strong>{emp.ckp.score}</strong></td>
                      <td><small>{emp.ckp.keterangan || '-'}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Instructions */}
            <div className="alert alert-info mt-4">
              <h6 className="alert-heading">
                <i className="fas fa-info-circle me-2"></i>
                Petunjuk Download PDF
              </h6>
              <ul className="mb-0">
                <li>Klik tombol "Download PDF" untuk membuka preview print</li>
                <li>Di dialog print, pilih "Save as PDF" sebagai destination</li>
                <li>Atur orientasi ke "Landscape" untuk tampilan yang lebih baik</li>
                <li>Pastikan "Print headers and footers" dicentang</li>
                <li>Laporan akan mengikuti format resmi dengan logo dan header BPS</li>
                <li><strong>🔥 BARU:</strong> Nama Kepala BPS akan otomatis diambil dari database berdasarkan jabatan atau role</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Instructions when no report generated */}
      {!reportData && (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="fas fa-file-pdf fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Belum Ada Laporan yang Digenerate</h5>
            <p className="text-muted">
              Pilih periode evaluasi di atas, kemudian klik "Generate Laporan" untuk membuat laporan komprehensif.
              <br />
              Laporan akan mencakup:
            </p>
            <ul className="list-unstyled text-start d-inline-block">
              <li>✅ Best Employee of the Month</li>
              <li>✅ Leaderboard Final (kandidat + semua pegawai)</li>
              <li>✅ Rekap BerAKHLAK (nama, pemilih, skor)</li>
              <li>✅ <strong>Rekap Presensi (TK, PSW, TLT, APEL, CT dengan jumlah detail)</strong></li>
              <li>✅ Rekap CKP (nama, skor, dan keterangan)</li>
              <li>✅ Format PDF resmi dengan logo BPS</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveReportPage;