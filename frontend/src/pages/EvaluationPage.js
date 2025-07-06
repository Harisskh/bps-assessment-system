// src/pages/EvaluationPage.js - FIXED INPUT SYSTEM LENGKAP
import React, { useState, useEffect } from 'react';
import { evaluationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Searchable Select Component
const SearchableSelect = ({ options, value, onChange, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option =>
    option.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(option => option.id === value);

  const handleSelect = (option) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="position-relative">
      <div 
        className={`form-control d-flex justify-content-between align-items-center ${disabled ? 'bg-light' : ''}`}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', minHeight: '38px' }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'text-dark' : 'text-muted'}>
          {selectedOption ? `${selectedOption.nama} - ${selectedOption.jabatan}` : placeholder}
        </span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-muted`}></i>
      </div>
      
      {isOpen && (
        <div 
          className="position-absolute w-100 bg-white border rounded shadow-lg"
          style={{ zIndex: 1050, maxHeight: '300px', top: '100%' }}
        >
          <div className="p-2 border-bottom">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Cari pegawai..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-auto" style={{ maxHeight: '240px' }}>
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-muted text-center">
                <i className="fas fa-search me-2"></i>
                Tidak ada pegawai ditemukan
              </div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className={`p-2 cursor-pointer border-bottom ${value === option.id ? 'bg-primary text-white' : 'hover-bg-light'}`}
                  onClick={() => handleSelect(option)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => !value || value !== option.id ? e.target.classList.add('bg-light') : null}
                  onMouseLeave={(e) => !value || value !== option.id ? e.target.classList.remove('bg-light') : null}
                >
                  <div className="fw-bold">{option.nama}</div>
                  <small className={value === option.id ? 'text-white-50' : 'text-muted'}>
                    {option.jabatan}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// FIXED: Enhanced Number Input dengan icon + dan -
const NumberInputWithArrows = ({ value, onChange, min, max, placeholder, disabled = false }) => {
  const handleIncrement = () => {
    const currentValue = value === '' ? min : parseInt(value);
    const newValue = Math.min(max, currentValue + 1);
    onChange(newValue.toString());
  };

  const handleDecrement = () => {
    const currentValue = value === '' ? max : parseInt(value);
    const newValue = Math.max(min, currentValue - 1);
    onChange(newValue.toString());
  };

  // FIXED: Handle manual input properly
  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    
    // Allow empty input
    if (inputValue === '') {
      onChange('');
      return;
    }

    // FIXED: Allow only digits
    const cleanValue = inputValue.replace(/[^0-9]/g, '');
    
    if (cleanValue === '') {
      onChange('');
      return;
    }

    const numValue = parseInt(cleanValue);
    
    // FIXED: Update immediately, validate on blur
    if (!isNaN(numValue)) {
      onChange(cleanValue);
    }
  };

  // FIXED: Validate range on blur
  const handleBlur = () => {
    if (value === '') return;
    
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      if (numValue < min) {
        onChange(min.toString());
      } else if (numValue > max) {
        onChange(max.toString());
      }
    }
  };

  // FIXED: Handle key events
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className="input-group">
      <button 
        className="btn btn-outline-secondary d-flex align-items-center justify-content-center" 
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value === '' || parseInt(value || min) <= min}
        title="Kurangi nilai"
        style={{ width: '40px' }}
      >
        <i className="fas fa-minus"></i>
      </button>
      <input
        type="text"
        className="form-control text-center fw-bold"
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{ 
          fontSize: '1.1rem',
          minWidth: '80px'
        }}
        onFocus={(e) => e.target.select()}
        inputMode="numeric"
        pattern="[0-9]*"
      />
      <button 
        className="btn btn-outline-secondary d-flex align-items-center justify-content-center" 
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value === '' || parseInt(value || max) >= max}
        title="Tambah nilai"
        style={{ width: '40px' }}
      >
        <i className="fas fa-plus"></i>
      </button>
    </div>
  );
};

const EvaluationPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  
  // Master data
  const [parameters, setParameters] = useState([]);
  const [scoreRanges, setScoreRanges] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  
  // Form data
  const [evaluations, setEvaluations] = useState([
    { targetUserId: '', scores: {} }, // Tokoh 1
    { targetUserId: '', scores: {} }, // Tokoh 2  
    { targetUserId: '', scores: {} }  // Tokoh 3
  ]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load master data and check existing evaluations
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading master data...');
      
      const [paramsRes, rangesRes, periodRes, usersRes, myEvaluationsRes] = await Promise.all([
        evaluationAPI.getParameters(),
        evaluationAPI.getScoreRanges(),
        evaluationAPI.getActivePeriod(),
        evaluationAPI.getEligibleUsers(),
        evaluationAPI.getMyEvaluations() // Check if user has already evaluated
      ]);

      console.log('Master data loaded:', {
        parameters: paramsRes.data,
        ranges: rangesRes.data,
        period: periodRes.data,
        users: usersRes.data,
        myEvaluations: myEvaluationsRes.data
      });

      setParameters(paramsRes.data.data.parameters);
      setScoreRanges(rangesRes.data.data.ranges);
      setActivePeriod(periodRes.data.data.period);
      setEligibleUsers(usersRes.data.data.users);

      // Check if user has already evaluated for this period
      const currentPeriodEvaluations = myEvaluationsRes.data.data.evaluations.filter(
        evaluation => evaluation.period.id === periodRes.data.data.period.id
      );
      
      if (currentPeriodEvaluations.length > 0) {
        setHasEvaluated(true);
        setStep(5); // Show "Already Evaluated" step
        return;
      }

      // Initialize scores for each evaluation
      const initialScores = {};
      paramsRes.data.data.parameters.forEach(param => {
        initialScores[param.id] = '';
      });

      setEvaluations(prev => prev.map(evaluation => ({
        ...evaluation,
        scores: { ...initialScores }
      })));

    } catch (error) {
      console.error('Load master data error:', error);
      setError(`Gagal memuat data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelection = (evaluationIndex, userId) => {
    setEvaluations(prev => {
      const updated = [...prev];
      updated[evaluationIndex] = {
        ...updated[evaluationIndex],
        targetUserId: userId
      };
      return updated;
    });
    setError('');
  };

  const handleScoreChange = (evaluationIndex, parameterId, value) => {
    setError('');
    
    setEvaluations(prev => {
      const updated = [...prev];
      updated[evaluationIndex] = {
        ...updated[evaluationIndex],
        scores: {
          ...updated[evaluationIndex].scores,
          [parameterId]: value
        }
      };
      return updated;
    });
  };

  const validateStep = (stepNumber) => {
    setError('');
    
    if (stepNumber === 2) {
      const selectedUsers = evaluations.map(e => e.targetUserId).filter(Boolean);
      if (selectedUsers.length !== 3) {
        setError('Pilih 3 pegawai untuk dinilai (masing-masing untuk Tokoh 1, 2, dan 3)');
        return false;
      }
      
      const uniqueUsers = new Set(selectedUsers);
      if (uniqueUsers.size !== 3) {
        setError('Tidak dapat memilih pegawai yang sama untuk tokoh berbeda');
        return false;
      }
    }
    
    if (stepNumber === 3) {
      for (let i = 0; i < evaluations.length; i++) {
        const evaluation = evaluations[i];
        if (!evaluation.targetUserId) {
          setError(`Pilih pegawai untuk Tokoh ${i + 1}`);
          return false;
        }
        
        for (const param of parameters) {
          const score = evaluation.scores[param.id];
          if (!score && score !== 0) {
            setError(`Lengkapi nilai "${param.namaParameter}" untuk Tokoh ${i + 1}`);
            return false;
          }
        }
      }
    }
    
    return true;
  };

  const nextStep = () => {
    setError('');
    
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      const selectedUsers = evaluations.map(e => e.targetUserId).filter(Boolean);
      if (selectedUsers.length !== 3) {
        setError('Pilih 3 pegawai untuk dinilai (masing-masing untuk Tokoh 1, 2, dan 3)');
        return;
      }
      
      const uniqueUsers = new Set(selectedUsers);
      if (uniqueUsers.size !== 3) {
        setError('Tidak dapat memilih pegawai yang sama untuk tokoh berbeda');
        return;
      }
      
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      const submissionData = {
        periodId: activePeriod.id,
        evaluations: evaluations.map(evaluation => ({
          targetUserId: evaluation.targetUserId,
          scores: parameters.map(param => ({
            parameterId: param.id,
            value: parseInt(evaluation.scores[param.id])
          }))
        }))
      };

      console.log('Submitting evaluation:', submissionData);

      const response = await evaluationAPI.submit(submissionData);
      console.log('Submit response:', response.data);

      setSuccess('Evaluasi berhasil disimpan! Terima kasih atas partisipasi Anda.');
      setStep(4);
      
    } catch (error) {
      console.error('Submit evaluation error:', error);
      setError(error.response?.data?.message || 'Gagal menyimpan evaluasi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Memuat data evaluasi...</p>
        </div>
      </div>
    );
  }

  const getUserName = (userId) => {
    const targetUser = eligibleUsers.find(u => u.id === userId);
    return targetUser ? `${targetUser.nama} - ${targetUser.jabatan}` : '';
  };

  const getScoreRange = (ranking) => {
    const range = scoreRanges.find(r => r.ranking === ranking);
    return range ? `${range.nilaiMin}-${range.nilaiMax}` : '';
  };

  const getAvailableUsers = (currentEvaluationIndex) => {
    const selectedUserIds = evaluations
      .map((e, index) => index !== currentEvaluationIndex ? e.targetUserId : null)
      .filter(Boolean);
    
    return eligibleUsers.filter(user => !selectedUserIds.includes(user.id));
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-10 mx-auto">
          {/* Header */}
          <div className="card mb-4 shadow-sm">
            <div className="card-body text-center py-4">
              <h1 className="h3 mb-3 text-primary">
                <i className="fas fa-star text-warning me-2"></i>
                Penilaian Tokoh BerAKHLAK
              </h1>
              <p className="text-muted mb-1">
                Periode: <strong className="text-dark">{activePeriod?.namaPeriode}</strong>
              </p>
              <p className="text-muted mb-3">
                Penilai: <strong className="text-dark">{user?.nama}</strong> ({user?.jabatan})
              </p>
              
              {/* Progress Bar */}
              {!hasEvaluated && (
                <>
                  <div className="progress mb-2" style={{ height: '10px' }}>
                    <div 
                      className="progress-bar bg-primary" 
                      style={{ width: `${(step / 4) * 100}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">
                    Langkah {step} dari 4
                  </small>
                </>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Error!</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success" role="alert">
              <i className="fas fa-check-circle me-2"></i>
              {success}
            </div>
          )}

          {/* Step 5: Already Evaluated */}
          {step === 5 && hasEvaluated && (
            <div className="card shadow-sm">
              <div className="card-body text-center py-5">
                <i className="fas fa-check-circle text-success mb-3" style={{ fontSize: '4rem' }}></i>
                <h3 className="text-success mb-3">Anda Sudah Melakukan Penilaian!</h3>
                <p className="text-muted mb-4 fs-5">
                  Anda telah menyelesaikan penilaian untuk periode <strong>{activePeriod?.namaPeriode}</strong>.<br/>
                  Setiap pegawai hanya dapat melakukan penilaian <strong>satu kali per periode</strong>.
                </p>
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Informasi:</strong> Penilaian selanjutnya dapat dilakukan setelah periode baru dibuka oleh administrator.
                </div>
                <div className="d-flex justify-content-center gap-3">
                  <a href="/dashboard" className="btn btn-primary px-4">
                    <i className="fas fa-home me-2"></i>
                    Kembali ke Dashboard
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Introduction */}
          {step === 1 && !hasEvaluated && (
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h4 className="card-title text-primary mb-4">
                  <i className="fas fa-info-circle me-2"></i>
                  Tentang Penilaian Tokoh BerAKHLAK
                </h4>
                
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="text-secondary">Apa itu BerAKHLAK?</h6>
                    <p className="text-muted">
                      BerAKHLAK adalah nilai-nilai yang harus dimiliki oleh setiap pegawai BPS:
                    </p>
                    <div className="row">
                      <div className="col-6">
                        <ul className="list-unstyled">
                          <li className="mb-1"><strong>Ber</strong>orientasi Pelayanan</li>
                          <li className="mb-1"><strong>A</strong>kuntabel</li>
                          <li className="mb-1"><strong>K</strong>ompeten</li>
                          <li className="mb-1"><strong>H</strong>armonis</li>
                        </ul>
                      </div>
                      <div className="col-6">
                        <ul className="list-unstyled">
                          <li className="mb-1"><strong>L</strong>oyal</li>
                          <li className="mb-1"><strong>A</strong>daptif</li>
                          <li className="mb-1"><strong>K</strong>olaboratif</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <h6 className="text-secondary">Cara Penilaian:</h6>
                    <ol className="text-muted">
                      <li>Pilih <strong>3 pegawai</strong> yang akan dinilai</li>
                      <li>Beri nilai untuk <strong>8 parameter</strong> setiap pegawai</li>
                      <li>Rentang nilai:
                        <div className="mt-2">
                          <span className="badge bg-success me-2">Tokoh 1: 96-100</span>
                          <span className="badge bg-primary me-2">Tokoh 2: 86-95</span>
                          <span className="badge bg-info">Tokoh 3: 80-85</span>
                        </div>
                      </li>
                    </ol>
                    
                    <div className="alert alert-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Penting:</strong> Anda hanya dapat melakukan penilaian <strong>satu kali per periode</strong>.
                    </div>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <button 
                    className="btn btn-primary btn-lg px-5"
                    onClick={nextStep}
                  >
                    Mulai Penilaian
                    <i className="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: User Selection */}
          {step === 2 && !hasEvaluated && (
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h4 className="card-title text-primary mb-4">
                  <i className="fas fa-users me-2"></i>
                  Pilih 3 Pegawai untuk Dinilai
                </h4>
                
                {[1, 2, 3].map(ranking => (
                  <div key={ranking} className="mb-4">
                    <label className="form-label">
                      <span className={`badge ${ranking === 1 ? 'bg-success' : ranking === 2 ? 'bg-primary' : 'bg-info'} me-2 fs-6`}>
                        Tokoh {ranking}
                      </span>
                      <span className="text-muted">Rentang Nilai: {getScoreRange(ranking)}</span>
                    </label>
                    
                    <SearchableSelect
                      options={getAvailableUsers(ranking - 1)}
                      value={evaluations[ranking - 1].targetUserId}
                      onChange={(userId) => handleUserSelection(ranking - 1, userId)}
                      placeholder="-- Pilih Pegawai --"
                    />
                  </div>
                ))}

                <div className="d-flex justify-content-between mt-4">
                  <button 
                    className="btn btn-outline-secondary px-4"
                    onClick={prevStep}
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Kembali
                  </button>
                  <button 
                    className="btn btn-primary px-4"
                    onClick={nextStep}
                  >
                    Lanjut ke Penilaian
                    <i className="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Scoring dengan FIXED Number Input */}
          {step === 3 && !hasEvaluated && (
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h4 className="card-title text-primary mb-4">
                  <i className="fas fa-star text-warning me-2"></i>
                  Berikan Nilai untuk Setiap Parameter
                </h4>

                {evaluations.map((evaluation, evalIndex) => (
                  <div key={evalIndex} className="mb-5">
                    <div className={`border rounded-3 p-4 ${evalIndex === 0 ? 'border-success bg-light' : evalIndex === 1 ? 'border-primary bg-light' : 'border-info bg-light'}`}>
                      <h5 className="mb-3">
                        <span className={`badge ${evalIndex === 0 ? 'bg-success' : evalIndex === 1 ? 'bg-primary' : 'bg-info'} me-2 fs-6`}>
                          Tokoh {evalIndex + 1}
                        </span>
                        <span className="text-dark">{getUserName(evaluation.targetUserId)}</span>
                        <small className="text-muted ms-2">
                          (Rentang: {getScoreRange(evalIndex + 1)})
                        </small>
                      </h5>

                      <div className="row">
                        {parameters.map((param) => {
                          const range = scoreRanges.find(r => r.ranking === evalIndex + 1);
                          return (
                            <div key={param.id} className="col-md-6 mb-3">
                              <label className="form-label">
                                <small><strong>{param.urutan}.</strong> {param.namaParameter}</small>
                              </label>
                              <NumberInputWithArrows
                                value={evaluation.scores[param.id] || ''}
                                onChange={(value) => handleScoreChange(evalIndex, param.id, value)}
                                min={range?.nilaiMin || 80}
                                max={range?.nilaiMax || 100}
                                placeholder={`${range?.nilaiMin}-${range?.nilaiMax}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="d-flex justify-content-between mt-4">
                  <button 
                    className="btn btn-outline-secondary px-4"
                    onClick={prevStep}
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Kembali
                  </button>
                  <button 
                    className="btn btn-success btn-lg px-5"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Submit Evaluasi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="card shadow-sm">
              <div className="card-body text-center py-5">
                <i className="fas fa-check-circle text-success mb-3" style={{ fontSize: '4rem' }}></i>
                <h3 className="text-success mb-3">Evaluasi Berhasil Disimpan!</h3>
                <p className="text-muted mb-4 fs-5">
                  Terima kasih atas partisipasi Anda dalam penilaian Tokoh BerAKHLAK<br/>
                  periode <strong>{activePeriod?.namaPeriode}</strong>.
                </p>
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Catatan:</strong> Penilaian Anda telah tersimpan dan tidak dapat diubah. Penilaian selanjutnya dapat dilakukan di periode berikutnya.
                </div>
                <div className="d-flex justify-content-center gap-3">
                  <a href="/dashboard" className="btn btn-primary px-4">
                    <i className="fas fa-home me-2"></i>
                    Kembali ke Dashboard
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationPage;