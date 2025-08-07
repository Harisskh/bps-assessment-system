// src/pages/EvaluationPage.js - UPDATED FOR SINGLE BERAKHLAK CATEGORY
import React, { useState, useEffect } from 'react';
import Select, { components } from 'react-select';
import { evaluationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/EvaluationPage.scss';

// StyledSearchableSelect - Tidak berubah
const StyledSearchableSelect = ({ options, value, onChange, placeholder, disabled = false }) => {
  const formattedOptions = options.map(opt => ({ value: opt.id, label: opt.nama, jabatan: opt.jabatan }));
  const selectedValue = formattedOptions.find(opt => opt.value === value);
  
  const Option = (props) => (
    <components.Option {...props}>
      <div className="fw-bold">{props.data.label}</div>
      <small className="text-muted">{props.data.jabatan}</small>
    </components.Option>
  );
  
  const customStyles = {
    control: (p, s) => ({
      ...p,
      minHeight: '48px',
      border: s.isFocused ? '1px solid #2c549c' : '1px solid #ced4da',
      boxShadow: s.isFocused ? '0 0 0 0.25rem rgba(44, 84, 156, 0.25)' : 'none',
      '&:hover': { borderColor: s.isFocused ? '#2c549c' : '#adb5bd' }
    }),
    option: (p, s) => ({
      ...p,
      backgroundColor: s.isSelected ? '#2c549c' : s.isFocused ? '#f8f9fa' : 'white',
      color: s.isSelected ? 'white' : 'black',
      padding: '1rem'
    }),
    placeholder: (p) => ({ ...p, color: '#6c757d' }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
  };
  
  return (
    <Select
      options={formattedOptions}
      value={selectedValue}
      onChange={(opt) => onChange(opt.value)}
      placeholder={placeholder}
      isDisabled={disabled}
      components={{ Option }}
      menuPortalTarget={document.body}
      styles={customStyles}
      noOptionsMessage={() => 'Tidak ada pegawai ditemukan'}
      formatOptionLabel={({ label, jabatan }) => (
        <div>
          <div className="fw-bold">{label}</div>
          <small className="text-muted">{jabatan}</small>
        </div>
      )}
    />
  );
};

// SimpleNumberInput - Tidak berubah
const SimpleNumberInput = ({ value, onChange, onBlur, min, max, placeholder, isInvalid }) => {
  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    if (inputValue === '' || /^[0-9]+$/.test(inputValue)) {
      onChange(inputValue);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = Math.min(max, (parseInt(value) || min - 1) + 1);
      onChange(newValue.toString());
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = Math.max(min, (parseInt(value) || max + 1) - 1);
      onChange(newValue.toString());
    }
  };
  
  return (
    <input
      type="text"
      className={`simple-number-input ${isInvalid ? 'is-invalid' : ''}`}
      value={value}
      onChange={handleInputChange}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      inputMode="numeric"
      maxLength="3"
    />
  );
};

// 🔥 UPDATED: Main Component - Single Category Logic
const EvaluationPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [parameters, setParameters] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  
  // 🔥 UPDATED: Single evaluation state instead of array
  const [evaluation, setEvaluation] = useState({
    targetUserId: '',
    scores: {}
  });
  
  const [warnings, setWarnings] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
  const loadMasterData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [paramsRes, periodRes, usersRes, myEvalsRes] = await Promise.all([
        evaluationAPI.getParameters(),
        evaluationAPI.getActivePeriod(),
        evaluationAPI.getEligibleUsers(),
        evaluationAPI.getMyEvaluations()
      ]);
      
      const period = periodRes.data.data.period;
      setParameters(paramsRes.data.data.parameters);
      setActivePeriod(period);
      setEligibleUsers(usersRes.data.data.users);
        
        // 🔥 UPDATED: Check if user has evaluated anyone in current period
        const currentPeriodEvaluations = myEvalsRes.data.data.evaluations.filter(
        ev => (ev.period?.id || ev.periodId) === period.id
      );
      
      if (currentPeriodEvaluations.length > 0) {
        setHasEvaluated(true);
        setStep(4); // Skip to success page
      } else {
        // Initialize scores
        const initialScores = {};
        paramsRes.data.data.parameters.forEach(param => {
          initialScores[param.id] = '';
        });
        setEvaluation(prev => ({ ...prev, scores: initialScores }));
      }
      
    } catch (err) {
      setError(`Gagal memuat data: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  loadMasterData();
}, []);

  // 🔥 UPDATED: Single user selection
  const handleUserSelection = (userId) => {
    setEvaluation(prev => ({ ...prev, targetUserId: userId }));
    setError('');
  };

  // 🔥 UPDATED: Single evaluation score change
  const handleScoreChange = (paramId, value) => {
    setEvaluation(prev => ({
      ...prev,
      scores: { ...prev.scores, [paramId]: value }
    }));
    
    const numValue = parseInt(value);
    setError('');
    
    // Validate range 80-100
    if (value === '' || (numValue >= 80 && numValue <= 100)) {
      setWarnings(prev => {
        const newWarnings = { ...prev };
        delete newWarnings[paramId];
        return newWarnings;
      });
    } else {
      setWarnings(prev => ({
        ...prev,
        [paramId]: 'Nilai harus antara 80 - 100'
      }));
    }
  };

  const handleScoreBlur = (paramId) => {
    const value = evaluation.scores[paramId];
    if (value === '') {
      setWarnings(prev => ({
        ...prev,
        [paramId]: 'Nilai tidak boleh kosong'
      }));
    }
  };

  const nextStep = () => {
    setError('');
    
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Check if user is selected
      if (!evaluation.targetUserId) {
        setError('Pilih pegawai untuk dinilai.');
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => setStep(prev => prev - 1);

  // 🔥 UPDATED: Submit single evaluation
  const handleSubmit = async () => {
    setError('');
    
    if (Object.keys(warnings).length > 0) {
      setError('Terdapat nilai yang tidak valid. Mohon perbaiki semua kolom yang ditandai merah.');
      return;
    }
    
    // Check all scores are filled
    for (const param of parameters) {
      const score = evaluation.scores[param.id];
      if (score === '' || score === null) {
        setError('Lengkapi semua nilai parameter.');
        handleScoreChange(param.id, '');
        return;
      }
    }
    
    try {
      setSubmitting(true);
      
      // 🔥 UPDATED: Single evaluation submission
      const submissionData = {
        periodId: activePeriod.id,
        evaluations: [
          {
            targetUserId: evaluation.targetUserId,
            ranking: 1, // Always submit as ranking 1 since there's only one category now
            scores: parameters.map(param => ({
              parameterId: param.id,
              value: parseInt(evaluation.scores[param.id])
            }))
          }
        ]
      };
      
      await evaluationAPI.submit(submissionData);
      setSuccess('Evaluasi berhasil disimpan! Terima kasih atas partisipasi Anda.');
      setStep(4);
      
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex vh-100 justify-content-center align-items-center">
        <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}} role="status"></div>
      </div>
    );
  }

  const renderHeader = () => (
    <div className="evaluation-header text-center">
      <h1 className="mb-3">
        <i className="fas fa-star text-warning me-2"></i>
        Penilaian Tokoh BerAKHLAK
      </h1>
      <p className="mb-3">
        Periode: <strong>{activePeriod?.namaPeriode}</strong> | 
        Penilai: <strong>{user?.nama}</strong>
      </p>
      {!hasEvaluated && (
        <>
          <div className="progress-wrapper mx-auto" style={{maxWidth: '400px'}}>
            <div className="progress" style={{ height: '8px' }}>
              <div className="progress-bar" style={{ width: `${(step / 3) * 100}%` }}></div>
            </div>
          </div>
          <small className="mt-2 d-block opacity-75">Langkah {step} dari 3</small>
        </>
      )}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Intro nextStep={nextStep} />;
      case 2:
        return (
          <Step2UserSelection
            evaluation={evaluation}
            handleUserSelection={handleUserSelection}
            eligibleUsers={eligibleUsers}
            prevStep={prevStep}
            nextStep={nextStep}
          />
        );
      case 3:
        return (
          <Step3Scoring
            evaluation={evaluation}
            handleScoreChange={handleScoreChange}
            handleScoreBlur={handleScoreBlur}
            warnings={warnings}
            parameters={parameters}
            eligibleUsers={eligibleUsers}
            prevStep={prevStep}
            handleSubmit={handleSubmit}
            submitting={submitting}
          />
        );
      case 4:
        return <Step4Success periodName={activePeriod?.namaPeriode} />;
      default:
        return null;
    }
  };

  return (
    <div className="evaluation-page-container p-0 p-md-4">
      {renderHeader()}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mt-4 mx-3 mx-md-0" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <div>{error}</div>
        </div>
      )}
      <div className="step-wrapper mt-4">
        {renderStep()}
      </div>
    </div>
  );
};

// Step1Intro - Updated description
const Step1Intro = ({ nextStep }) => {
  const berakhlakValues = [
    { name: 'Berorientasi Pelayanan', description: 'Komitmen memberikan pelayanan prima demi kepuasan masyarakat.', icon: 'fa-hands-helping' },
    { name: 'Akuntabel', description: 'Bertanggung jawab atas kepercayaan yang diberikan.', icon: 'fa-shield-alt' },
    { name: 'Kompeten', description: 'Terus belajar dan mengembangkan kapabilitas.', icon: 'fa-graduation-cap' },
    { name: 'Harmonis', description: 'Saling peduli dan menghargai perbedaan.', icon: 'fa-heart' },
    { name: 'Loyal', description: 'Berdedikasi dan mengutamakan kepentingan Bangsa dan Negara.', icon: 'fa-flag' },
    { name: 'Adaptif', description: 'Terus berinovasi dan antusias dalam menghadapi perubahan.', icon: 'fa-lightbulb' },
    { name: 'Kolaboratif', description: 'Membangun kerja sama yang sinergis.', icon: 'fa-users' }
  ];

  return (
    <div className="intro-section mx-3 mx-md-0">
      <div className="card intro-card">
        <div className="card-body p-4 p-lg-5">
          <div className="text-center mb-5">
            <button className="btn btn-warning btn-start-evaluation" onClick={nextStep}>
              Mulai Penilaian <i className="fas fa-arrow-right ms-2"></i>
            </button>
          </div>
          <div className="row g-5">
            <div className="col-lg-7">
              <h2 className="text-primary mb-3">7 Nilai Inti ASN BerAKHLAK</h2>
              <p className="text-muted mb-4">
                Sebagai landasan penilaian, mari kita ingat kembali 7 Core Values ASN yang diluncurkan 
                Presiden RI pada 27 Juli 2021 sebagai wujud komitmen kita bersama.
              </p>
              <div className="berakhlak-values-list">
                {berakhlakValues.map(value => (
                  <div className="value-item" key={value.name}>
                    <div className="value-icon">
                      <i className={`fas ${value.icon}`}></i>
                    </div>
                    <div>
                      <strong>{value.name}</strong>
                      <p className="text-muted small mb-0">{value.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-lg-5">
              <div className="how-to-card">
                <h4 className="mb-4">Cara Penilaian</h4>
                <div className="step-item">
                  <div className="step-icon d-flex align-items-center justify-content-center">
                    <i className="fas fa-user-check"></i>
                  </div>
                  <div>
                    <strong>Pilih 1 Pegawai</strong>
                    <p className="text-muted mb-0 small">
                      Pilih satu pegawai untuk dinominasikan sebagai Tokoh BerAKHLAK.
                    </p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-icon d-flex align-items-center justify-content-center">
                    <i className="fas fa-tasks"></i>
                  </div>
                  <div>
                    <strong>Beri Nilai 8 Parameter</strong>
                    <p className="text-muted mb-0 small">
                      Berikan skor 80-100 untuk setiap parameter BerAKHLAK.
                    </p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-icon d-flex align-items-center justify-content-center">
                    <i className="fas fa-check-double"></i>
                  </div>
                  <div>
                    <strong>Submit Penilaian</strong>
                    <p className="text-muted mb-0 small">
                      Anda dapat menilai beberapa pegawai dalam satu periode.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 🔥 UPDATED: Step2UserSelection - Single user selection
const Step2UserSelection = ({ evaluation, handleUserSelection, eligibleUsers, prevStep, nextStep }) => {
  return (
    <div className="card evaluation-card border-0 border-md-1">
      <div className="card-body p-4 p-lg-5">
        <h3 className="text-primary mb-4">Langkah 2: Silahkan Pilih Pegawai</h3>
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="selection-card">
              <div className="tokoh-header">
                <h5 className="mb-0">Tokoh BerAKHLAK</h5>
                <small>Rentang Nilai: 80 - 100</small>
              </div>
              <div className="p-3">
                <StyledSearchableSelect
                  options={eligibleUsers}
                  value={evaluation.targetUserId}
                  onChange={handleUserSelection}
                  placeholder="Cari & pilih pegawai..."
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="navigation-buttons mt-4">
          <button className="btn btn-outline-secondary" onClick={prevStep}>
            <i className="fas fa-arrow-left me-md-2"></i>
            <span className="d-none d-md-inline">Kembali</span>
          </button>
          <button className="btn btn-primary" onClick={nextStep}>
            <span className="d-none d-md-inline">Lanjut</span>
            <i className="fas fa-arrow-right ms-md-2"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

// 🔥 UPDATED: Step3Scoring - Single evaluation scoring
const Step3Scoring = ({ evaluation, handleScoreChange, handleScoreBlur, warnings, parameters, eligibleUsers, prevStep, handleSubmit, submitting }) => {
  const user = eligibleUsers.find(u => u.id === evaluation.targetUserId);
  
  return (
    <div className="card evaluation-card mx-3 mx-md-0">
      <div className="card-body p-4 p-lg-5">
        <h3 className="text-primary mb-4">Langkah 3: Input Penilaian Tokoh BerAKHLAK</h3>
        
        <div className="selected-user-info mb-4">
          <div className="alert alert-info">
            <strong>Pegawai yang dinilai:</strong> {user?.nama || 'Tidak diketahui'}
            <br />
            <small className="text-muted">Jabatan: {user?.jabatan || 'Tidak diketahui'}</small>
          </div>
        </div>

        <div className="row g-3 g-md-4">
          {parameters.map(param => (
            <div className="col-md-6" key={param.id}>
              <div className="parameter-card h-100">
                <label className="parameter-label">
                  {param.urutan}. {param.namaParameter}
                </label>
                <div>
                  <SimpleNumberInput
                    value={evaluation.scores[param.id] || ''}
                    onChange={(value) => handleScoreChange(param.id, value)}
                    onBlur={() => handleScoreBlur(param.id)}
                    min={80}
                    max={100}
                    placeholder="80-100"
                    isInvalid={!!warnings[param.id]}
                  />
                  {warnings[param.id] && (
                    <small className="validation-warning">
                      {warnings[param.id]}
                    </small>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="card-footer bg-transparent border-0 pt-0 pb-4 px-4 px-lg-5">
        <div className="navigation-buttons">
          <button className="btn btn-outline-secondary" onClick={prevStep}>
            <i className="fas fa-arrow-left me-md-2"></i>
            <span className="d-none d-md-inline">Kembali</span>
          </button>
          <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Menyimpan...
              </>
            ) : (
              <>
                <span className="d-none d-md-inline">Submit Evaluasi</span>
                <i className="fas fa-paper-plane ms-md-2"></i>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Result Pages - Updated text
const ResultPageBase = ({ icon, color, title, text, children }) => (
  <div className="result-page">
    <div className="card">
      <div className="card-body text-center py-5 px-4">
        <i className={`fas ${icon} ${color} mb-3 result-icon`}></i>
        <h2 className={`${color} mb-3`}>{title}</h2>
        <p className="text-muted fs-5 mb-4">{text}</p>
        <div className="d-flex justify-content-center mt-4">
          {children || (
            <a href="/dashboard" className="btn btn-primary px-4">
              <i className="fas fa-home me-2"></i>
              Kembali ke Dashboard
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
);

const Step4Success = ({ periodName }) => (
  <ResultPageBase
    icon="fa-check-circle"
    color="text-success"
    title="Evaluasi Berhasil Disimpan!"
    text={
      <>
        Terima kasih atas partisipasi Anda dalam penilaian Tokoh BerAKHLAK periode{' '}
        <strong>{periodName}</strong>. Anda dapat menilai pegawai lain dengan kembali ke halaman ini.
      </>
    }
  />
);

export default EvaluationPage;