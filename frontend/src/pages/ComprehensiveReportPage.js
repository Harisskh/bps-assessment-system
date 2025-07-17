import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { periodAPI, finalEvaluationAPI, attendanceAPI, ckpAPI, userAPI } from '../services/api';

const ComprehensiveReportPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [reportData, setReportData] = useState(null);
  
  // Filter states
  const [reportType, setReportType] = useState('COMPREHENSIVE'); // COMPREHENSIVE, BERAKHLAK_ONLY, ATTENDANCE_ONLY, CKP_ONLY
  const [includeGraphs, setIncludeGraphs] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);

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

      // Get all data needed for report
      const [finalEvaluationResponse, attendanceResponse, ckpResponse, usersResponse] = await Promise.all([
        finalEvaluationAPI.getFinal({ periodId: selectedPeriod, limit: 1000 }),
        attendanceAPI.getAll({ periodId: selectedPeriod, limit: 1000 }),
        ckpAPI.getAll({ periodId: selectedPeriod, limit: 1000 }),
        userAPI.getAll({ isActive: true, limit: 1000 })
      ]);

      const finalEvaluations = finalEvaluationResponse.data.data?.finalEvaluations || [];
      const attendanceData = attendanceResponse.data.data?.attendance || [];
      const ckpData = ckpResponse.data.data?.ckp || [];
      const usersData = usersResponse.data.data?.users || [];

      // Process and combine data
      const combinedData = usersData.map(user => {
        const finalEval = finalEvaluations.find(fe => fe.userId === user.id);
        const attendance = attendanceData.find(att => att.userId === user.id);
        const ckp = ckpData.find(c => c.userId === user.id);

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
            voterCount: finalEval?.voterCount || 0,
            isCandidate: finalEval?.isCandidate || false,
            weightedScore: finalEval ? (finalEval.berakhlakScore * 0.3) : 0
          },
          attendance: {
            percentage: attendance ? attendance.totalNilaiPresensi : 100,
            tidakKerja: attendance?.jumlahTidakKerja || 0,
            pulangAwal: attendance?.jumlahPulangAwal || 0,
            telat: attendance?.jumlahTelat || 0,
            absenApel: attendance?.jumlahAbsenApel || 0,
            cuti: attendance?.jumlahCuti || 0,
            weightedScore: attendance ? (attendance.totalNilaiPresensi * 0.4) : 40
          },
          ckp: {
            score: ckp?.score || 0,
            keterangan: ckp?.keterangan || '',
            weightedScore: ckp ? (ckp.score * 0.3) : 0
          },
          finalScore: finalEval?.finalScore || 0,
          ranking: finalEval?.ranking || null,
          isBestEmployee: finalEval?.isBestEmployee || false
        };
      });

      // Sort by final score descending
      combinedData.sort((a, b) => b.finalScore - a.finalScore);

      const periodData = periods.find(p => p.id === selectedPeriod);

      setReportData({
        period: periodData,
        employees: combinedData,
        summary: {
          totalEmployees: combinedData.length,
          candidates: combinedData.filter(emp => emp.berakhlak.isCandidate).length,
          bestEmployee: combinedData.find(emp => emp.isBestEmployee),
          averageBerakhlak: (combinedData.reduce((sum, emp) => sum + emp.berakhlak.score, 0) / combinedData.length).toFixed(2),
          averageAttendance: (combinedData.reduce((sum, emp) => sum + emp.attendance.percentage, 0) / combinedData.length).toFixed(2),
          averageCkp: (combinedData.reduce((sum, emp) => sum + emp.ckp.score, 0) / combinedData.length).toFixed(2)
        }
      });

      setSuccess('Report berhasil digenerate! Scroll ke bawah untuk melihat hasil.');

    } catch (error) {
      console.error('Generate report error:', error);
      setError('Gagal generate report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData) {
      setError('Generate report terlebih dahulu');
      return;
    }

    // Create printable version
    const printWindow = window.open('', '_blank');
    const htmlContent = generatePrintableHTML();
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Add slight delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  };

  const generatePrintableHTML = () => {
    if (!reportData) return '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Laporan Evaluasi Pegawai - ${reportData.period?.namaPeriode}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 18px; font-weight: bold; }
            .header h2 { margin: 5px 0; font-size: 16px; }
            .header p { margin: 2px 0; font-size: 12px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; 
                           background-color: #f8f9fa; padding: 8px; border-left: 4px solid #007bff; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .best-employee { background-color: #fff3cd; font-weight: bold; }
            .candidate { background-color: #d4edda; }
            .summary-box { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 16px; font-weight: bold; color: #007bff; }
            .summary-label { font-size: 11px; color: #666; }
            @media print {
                .no-print { display: none; }
                body { margin: 0; }
                .section { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <!-- Header -->
        <div class="header">
            <h1>LAPORAN EVALUASI PEGAWAI</h1>
            <h2>BPS KABUPATEN PRINGSEWU</h2>
            <p>Periode: ${reportData.period?.namaPeriode}</p>
            <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { 
              day: '2-digit', month: 'long', year: 'numeric'
            })}</p>
        </div>

        <!-- Summary -->
        <div class="section">
            <div class="section-title">RINGKASAN EVALUASI</div>
            <div class="summary-box">
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">${reportData.summary.totalEmployees}</div>
                        <div class="summary-label">Total Pegawai</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${reportData.summary.candidates}</div>
                        <div class="summary-label">Kandidat Terbaik</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${reportData.summary.averageBerakhlak}</div>
                        <div class="summary-label">Rata-rata BerAKHLAK</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${reportData.summary.averageAttendance}%</div>
                        <div class="summary-label">Rata-rata Presensi</div>
                    </div>
                </div>
            </div>
            ${reportData.summary.bestEmployee ? `
            <div style="text-align: center; background-color: #d4edda; padding: 10px; border-radius: 5px;">
                <strong style="color: #155724;">🏆 BEST EMPLOYEE OF THE MONTH: ${reportData.summary.bestEmployee.user.nama}</strong>
                <br><small>Skor Akhir: ${reportData.summary.bestEmployee.finalScore}</small>
            </div>
            ` : ''}
        </div>

        <!-- PRESENSI Section -->
        <div class="section">
            <div class="section-title">REKAP PRESENSI (Bobot: 40%)</div>
            <table>
                <thead>
                    <tr>
                        <th rowspan="2">No</th>
                        <th rowspan="2">Nama</th>
                        <th rowspan="2">Persentase Awal</th>
                        <th colspan="5">Minus</th>
                        <th rowspan="2">Total Minus</th>
                        <th rowspan="2">Total Nilai Presensi (%)</th>
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
                    <tr class="${emp.isBestEmployee ? 'best-employee' : emp.berakhlak.isCandidate ? 'candidate' : ''}">
                        <td>${index + 1}</td>
                        <td class="text-left">${emp.user.nama}</td>
                        <td>100%</td>
                        <td>${emp.attendance.tidakKerja}</td>
                        <td>${emp.attendance.pulangAwal}</td>
                        <td>${emp.attendance.telat}</td>
                        <td>${emp.attendance.absenApel}</td>
                        <td>${emp.attendance.cuti}</td>
                        <td>${(100 - emp.attendance.percentage).toFixed(0)}%</td>
                        <td><strong>${emp.attendance.percentage.toFixed(0)}%</strong></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- CKP Section -->
        <div class="section">
            <div class="section-title">REKAP CKP (Bobot: 30%)</div>
            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nama</th>
                        <th>Nilai CKP</th>
                        <th>Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.employees.map((emp, index) => `
                    <tr class="${emp.isBestEmployee ? 'best-employee' : emp.berakhlak.isCandidate ? 'candidate' : ''}">
                        <td>${index + 1}</td>
                        <td class="text-left">${emp.user.nama}</td>
                        <td><strong>${emp.ckp.score}</strong></td>
                        <td class="text-left">${emp.ckp.keterangan}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- BerAKHLAK Section -->
        <div class="section">
            <div class="section-title">REKAP TOKOH BerAKHLAK (Bobot: 30%)</div>
            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Tokoh BerAKHLAK</th>
                        <th>Jumlah Pemilih</th>
                        <th>Skor</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.employees
                      .filter(emp => emp.berakhlak.voterCount > 0)
                      .sort((a, b) => b.berakhlak.voterCount - a.berakhlak.voterCount)
                      .map((emp, index) => `
                    <tr class="${emp.isBestEmployee ? 'best-employee' : emp.berakhlak.isCandidate ? 'candidate' : ''}">
                        <td>${index + 1}</td>
                        <td class="text-left">${emp.user.nama}</td>
                        <td><strong>${emp.berakhlak.voterCount}</strong></td>
                        <td>${emp.berakhlak.score.toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Final Evaluation -->
        <div class="section">
            <div class="section-title">REKAPITULASI EVALUASI FINAL</div>
            <table>
                <thead>
                    <tr>
                        <th>Ranking</th>
                        <th>Nama Pegawai</th>
                        <th>Skor BerAKHLAK</th>
                        <th>Skor Presensi</th>
                        <th>Skor CKP</th>
                        <th>30% BerAKHLAK</th>
                        <th>40% Presensi</th>
                        <th>30% CKP</th>
                        <th>SKOR TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.employees
                      .filter(emp => emp.berakhlak.isCandidate)
                      .slice(0, 10) // Top 10
                      .map((emp, index) => `
                    <tr class="${emp.isBestEmployee ? 'best-employee' : 'candidate'}">
                        <td><strong>${index + 1}</strong></td>
                        <td class="text-left">${emp.user.nama}</td>
                        <td>${emp.berakhlak.score.toFixed(2)}</td>
                        <td>${emp.attendance.percentage.toFixed(0)}%</td>
                        <td>${emp.ckp.score}</td>
                        <td>${emp.berakhlak.weightedScore.toFixed(2)}</td>
                        <td>${emp.attendance.weightedScore.toFixed(2)}</td>
                        <td>${emp.ckp.weightedScore.toFixed(2)}</td>
                        <td><strong>${emp.finalScore.toFixed(2)}</strong></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Footer -->
        <div style="margin-top: 50px; text-align: right;">
            <p>Pringsewu, ${new Date().toLocaleDateString('id-ID', { 
              day: '2-digit', month: 'long', year: 'numeric'
            })}</p>
            <p style="margin-top: 60px;">
                <strong>Kepala BPS Kabupaten Pringsewu</strong>
            </p>
            <p style="margin-top: 40px;">
                <strong>_________________________</strong>
            </p>
        </div>
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
        <div className="d-flex gap-2">
          {reportData && (
            <button 
              className="btn btn-danger"
              onClick={exportToPDF}
              disabled={loading}
            >
              <i className="fas fa-file-pdf me-2"></i>
              Export PDF
            </button>
          )}
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
          <div className="row g-3">
            <div className="col-md-4">
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
            <div className="col-md-4">
              <label className="form-label">Jenis Laporan</label>
              <select
                className="form-select"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="COMPREHENSIVE">Laporan Lengkap (All-in-One)</option>
                <option value="BERAKHLAK_ONLY">Hanya BerAKHLAK</option>
                <option value="ATTENDANCE_ONLY">Hanya Presensi</option>
                <option value="CKP_ONLY">Hanya CKP</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Opsi Tambahan</label>
              <div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeGraphs"
                    checked={includeGraphs}
                    onChange={(e) => setIncludeGraphs(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="includeGraphs">
                    Sertakan Grafik
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="includeDetails"
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="includeDetails">
                    Detail Lengkap
                  </label>
                </div>
              </div>
            </div>
            <div className="col-12">
              <button 
                className="btn btn-primary btn-lg"
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
              className="btn btn-outline-danger"
              onClick={exportToPDF}
              title="Export ke PDF"
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
                  <h4 className="text-info mb-1">{reportData.summary.averageBerakhlak}</h4>
                  <small className="text-muted">Rata-rata BerAKHLAK</small>
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
              <div className="alert alert-success text-center mb-4">
                <h5 className="alert-heading">
                  <i className="fas fa-trophy me-2"></i>
                  Best Employee of the Month
                </h5>
                <h4 className="mb-1">{reportData.summary.bestEmployee.user.nama}</h4>
                <p className="mb-0">
                  Skor Akhir: <strong>{reportData.summary.bestEmployee.finalScore.toFixed(2)}</strong>
                  <br />
                  <small className="text-muted">{reportData.summary.bestEmployee.user.jabatan}</small>
                </p>
              </div>
            )}

            {/* Top 10 Table */}
            <h6 className="mb-3">Top 10 Pegawai Terbaik</h6>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Rank</th>
                    <th>Nama</th>
                    <th>Jabatan</th>
                    <th>BerAKHLAK</th>
                    <th>Presensi</th>
                    <th>CKP</th>
                    <th>Skor Akhir</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.employees.slice(0, 10).map((emp, index) => (
                    <tr key={emp.user.id} className={emp.isBestEmployee ? 'table-warning' : emp.berakhlak.isCandidate ? 'table-info' : ''}>
                      <td>
                        <strong>#{index + 1}</strong>
                        {emp.isBestEmployee && <i className="fas fa-crown text-warning ms-1"></i>}
                      </td>
                      <td>{emp.user.nama}</td>
                      <td><small>{emp.user.jabatan}</small></td>
                      <td>
                        {emp.berakhlak.score.toFixed(1)}
                        <small className="d-block text-muted">({emp.berakhlak.voterCount} votes)</small>
                      </td>
                      <td>{emp.attendance.percentage.toFixed(0)}%</td>
                      <td>{emp.ckp.score}</td>
                      <td><strong>{emp.finalScore.toFixed(2)}</strong></td>
                      <td>
                        {emp.isBestEmployee && <span className="badge bg-warning text-dark">Best Employee</span>}
                        {emp.berakhlak.isCandidate && !emp.isBestEmployee && <span className="badge bg-info">Kandidat</span>}
                        {!emp.berakhlak.isCandidate && <span className="badge bg-light text-dark">Regular</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Instructions */}
            <div className="alert alert-info mt-4">
              <h6 className="alert-heading">
                <i className="fas fa-info-circle me-2"></i>
                Petunjuk Export PDF
              </h6>
              <ul className="mb-0">
                <li>Klik tombol "Export PDF" untuk membuka preview print</li>
                <li>Di dialog print, pilih "Save as PDF" sebagai destination</li>
                <li>Atur orientasi ke "Landscape" untuk tampilan yang lebih baik</li>
                <li>Pastikan "Print headers and footers" dicentang</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveReportPage;