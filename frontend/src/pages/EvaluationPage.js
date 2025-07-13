// src/pages/EvaluationPage.js - FINAL CORRECTED WITH ARROWS
import React, { useState, useEffect, useRef } from 'react'; // Tambahkan useRef
import Select, { components } from 'react-select';
import { evaluationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/EvaluationPage.scss';

// StyledSearchableSelect (Tidak ada perubahan)
const StyledSearchableSelect = ({ options, value, onChange, placeholder, disabled = false }) => {
  const formattedOptions = options.map(opt => ({ value: opt.id, label: opt.nama, jabatan: opt.jabatan }));
  const selectedValue = formattedOptions.find(opt => opt.value === value);
  const Option = (props) => ( <components.Option {...props}> <div className="fw-bold">{props.data.label}</div> <small className="text-muted">{props.data.jabatan}</small> </components.Option> );
  const customStyles = {
    control: (p, s) => ({ ...p, minHeight: '48px', border: s.isFocused ? '1px solid #2c549c' : '1px solid #ced4da', boxShadow: s.isFocused ? '0 0 0 0.25rem rgba(44, 84, 156, 0.25)' : 'none', '&:hover': { borderColor: s.isFocused ? '#2c549c' : '#adb5bd' } }),
    option: (p, s) => ({ ...p, backgroundColor: s.isSelected ? '#2c549c' : s.isFocused ? '#f8f9fa' : 'white', color: s.isSelected ? 'white' : 'black', padding: '1rem' }),
    placeholder: (p) => ({ ...p, color: '#6c757d' }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
  };
  return <Select
    options={formattedOptions} value={selectedValue} onChange={(opt) => onChange(opt.value)} placeholder={placeholder} isDisabled={disabled} components={{ Option }}
    menuPortalTarget={document.body} styles={customStyles} noOptionsMessage={() => 'Tidak ada pegawai ditemukan'}
    formatOptionLabel={({ label, jabatan }) => ( <div><div className="fw-bold">{label}</div><small className="text-muted">{jabatan}</small></div>)}
  />;
};

// SimpleNumberInput (Tidak ada perubahan)
const SimpleNumberInput = ({ value, onChange, onBlur, min, max, placeholder, isInvalid }) => {
  const handleInputChange = (e) => { const inputValue = e.target.value; if (inputValue === '' || /^[0-9]+$/.test(inputValue)) { onChange(inputValue); } };
  const handleKeyDown = (e) => { if (e.key === 'ArrowUp') { e.preventDefault(); const newValue = Math.min(max, (parseInt(value) || min - 1) + 1); onChange(newValue.toString()); } else if (e.key === 'ArrowDown') { e.preventDefault(); const newValue = Math.max(min, (parseInt(value) || max + 1) - 1); onChange(newValue.toString()); } };
  return <input type="text" className={`simple-number-input ${isInvalid ? 'is-invalid' : ''}`} value={value} onChange={handleInputChange} onBlur={onBlur} onKeyDown={handleKeyDown} placeholder={placeholder} inputMode="numeric" maxLength="3" />;
};

// Komponen Utama (Tidak ada perubahan)
const EvaluationPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [parameters, setParameters] = useState([]);
  const [scoreRanges, setScoreRanges] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [evaluations, setEvaluations] = useState([ { targetUserId: '', scores: {} }, { targetUserId: '', scores: {} }, { targetUserId: '', scores: {} } ]);
  const [warnings, setWarnings] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setLoading(true); setError('');
        const [paramsRes, rangesRes, periodRes, usersRes, myEvalsRes] = await Promise.all([ evaluationAPI.getParameters(), evaluationAPI.getScoreRanges(), evaluationAPI.getActivePeriod(), evaluationAPI.getEligibleUsers(), evaluationAPI.getMyEvaluations() ]);
        const period = periodRes.data.data.period;
        setParameters(paramsRes.data.data.parameters); setScoreRanges(rangesRes.data.data.ranges); setActivePeriod(period); setEligibleUsers(usersRes.data.data.users);
        const currentPeriodEvaluations = myEvalsRes.data.data.evaluations.filter(ev => ev.period.id === period.id);
        if (currentPeriodEvaluations.length > 0) { setHasEvaluated(true); setStep(5); }
        else { const initialScores = {}; paramsRes.data.data.parameters.forEach(param => { initialScores[param.id] = ''; }); setEvaluations(prev => prev.map(ev => ({ ...ev, scores: { ...initialScores } }))); }
      } catch (err) { setError(`Gagal memuat data: ${err.response?.data?.message || err.message}`); }
      finally { setLoading(false); }
    };
    loadMasterData();
  }, []);

  const handleUserSelection = (index, userId) => { setEvaluations(prev => { const updated = [...prev]; updated[index].targetUserId = userId; return updated; }); setError(''); };
  const handleScoreChange = (evalIndex, paramId, value) => {
    setEvaluations(prevEvals => { const newEvals = [...prevEvals]; newEvals[evalIndex].scores[paramId] = value; return newEvals; });
    const range = scoreRanges.find(r => r.ranking === evalIndex + 1); const warningKey = `${evalIndex}-${paramId}`; const numValue = parseInt(value); setError('');
    if (value === '' || (range && numValue >= range.nilaiMin && numValue <= range.nilaiMax)) { setWarnings(prev => { const newWarnings = { ...prev }; delete newWarnings[warningKey]; return newWarnings; }); }
    else { setWarnings(prev => ({ ...prev, [warningKey]: `Nilai harus antara ${range.nilaiMin} - ${range.nilaiMax}` })); }
  };
  const handleScoreBlur = (evalIndex, paramId) => { const value = evaluations[evalIndex].scores[paramId]; if (value === '') { const warningKey = `${evalIndex}-${paramId}`; setWarnings(prev => ({ ...prev, [warningKey]: 'Nilai tidak boleh kosong' })); } };
  const nextStep = () => { setError(''); if (step === 1) setStep(2); if (step === 2) { const selectedUsers = evaluations.map(e => e.targetUserId).filter(Boolean); if (selectedUsers.length !== 3) { setError('Pilih 3 pegawai untuk dinilai.'); return; } if (new Set(selectedUsers).size !== 3) { setError('Pegawai yang dipilih tidak boleh sama.'); return; } setStep(3); } };
  const prevStep = () => setStep(prev => prev - 1);
  const handleSubmit = async () => {
    setError('');
    if (Object.keys(warnings).length > 0) { setError('Terdapat nilai yang tidak valid. Mohon perbaiki semua kolom yang ditandai merah.'); return; }
    for (let i = 0; i < evaluations.length; i++) { for (const param of parameters) { const score = evaluations[i].scores[param.id]; if (score === '' || score === null) { setError(`Lengkapi semua nilai untuk Tokoh ${i + 1}.`); handleScoreChange(i, param.id, ''); return; } } }
    try {
      setSubmitting(true);
      const submissionData = { periodId: activePeriod.id, evaluations: evaluations.map(ev => ({ targetUserId: ev.targetUserId, scores: parameters.map(param => ({ parameterId: param.id, value: parseInt(ev.scores[param.id]) })) })) };
      await evaluationAPI.submit(submissionData);
      setSuccess('Evaluasi berhasil disimpan! Terima kasih atas partisipasi Anda.'); setStep(4);
    } catch (err) { setError(err.response?.data?.message || err.message); } finally { setSubmitting(false); }
  };

  const getScoreRange = (ranking) => scoreRanges.find(r => r.ranking === ranking) ? `${scoreRanges.find(r => r.ranking === ranking).nilaiMin} - ${scoreRanges.find(r => r.ranking === ranking).nilaiMax}` : '';
  const getAvailableUsers = (currentIndex) => eligibleUsers.filter(u => !evaluations.map((e, i) => i !== currentIndex ? e.targetUserId : null).filter(Boolean).includes(u.id));

  if (loading) return ( <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}} role="status"></div></div> );

  const renderHeader = () => ( <div className="evaluation-header text-center"><h1 className="mb-3"><i className="fas fa-star text-warning me-2"></i>Penilaian Tokoh BerAKHLAK</h1><p className="mb-3">Periode: <strong>{activePeriod?.namaPeriode}</strong> | Penilai: <strong>{user?.nama}</strong></p>{!hasEvaluated && (<><div className="progress-wrapper mx-auto" style={{maxWidth: '400px'}}><div className="progress" style={{ height: '8px' }}><div className="progress-bar" style={{ width: `${(step / 4) * 100}%` }}></div></div></div><small className="mt-2 d-block opacity-75">Langkah {step} dari 4</small></>)}</div> );

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1Intro nextStep={nextStep} />;
      case 2: return <Step2UserSelection evaluations={evaluations} handleUserSelection={handleUserSelection} getAvailableUsers={getAvailableUsers} getScoreRange={getScoreRange} prevStep={prevStep} nextStep={nextStep} />;
      case 3: return <Step3Scoring evaluations={evaluations} handleScoreChange={handleScoreChange} handleScoreBlur={handleScoreBlur} warnings={warnings} scoreRanges={scoreRanges} parameters={parameters} eligibleUsers={eligibleUsers} prevStep={prevStep} handleSubmit={handleSubmit} submitting={submitting} />;
      case 4: return <Step4Success periodName={activePeriod?.namaPeriode} />;
      case 5: return <Step5AlreadyEvaluated periodName={activePeriod?.namaPeriode} />;
      default: return null;
    }
  };

  return ( <div className="evaluation-page-container p-0 p-md-4">{renderHeader()}{error && ( <div className="alert alert-danger d-flex align-items-center mt-4 mx-3 mx-md-0" role="alert"><i className="fas fa-exclamation-triangle me-2"></i><div>{error}</div></div> )}<div className="step-wrapper mt-4">{renderStep()}</div></div> );
};

// Step1Intro (Tidak ada perubahan)
const Step1Intro = ({ nextStep }) => { const berakhlakValues = [ { name: 'Berorientasi Pelayanan', description: 'Komitmen memberikan pelayanan prima demi kepuasan masyarakat.', icon: 'fa-hands-helping' }, { name: 'Akuntabel', description: 'Bertanggung jawab atas kepercayaan yang diberikan.', icon: 'fa-shield-alt' }, { name: 'Kompeten', description: 'Terus belajar dan mengembangkan kapabilitas.', icon: 'fa-graduation-cap' }, { name: 'Harmonis', description: 'Saling peduli dan menghargai perbedaan.', icon: 'fa-heart' }, { name: 'Loyal', description: 'Berdedikasi dan mengutamakan kepentingan Bangsa dan Negara.', icon: 'fa-flag' }, { name: 'Adaptif', description: 'Terus berinovasi dan antusias dalam menghadapi perubahan.', icon: 'fa-lightbulb' }, { name: 'Kolaboratif', description: 'Membangun kerja sama yang sinergis.', icon: 'fa-users' }]; return ( <div className="intro-section mx-3 mx-md-0"><div className="card intro-card"><div className="card-body p-4 p-lg-5"><div className="text-center mb-5"><button className="btn btn-warning btn-start-evaluation" onClick={nextStep}>Mulai Penilaian <i className="fas fa-arrow-right ms-2"></i></button></div><div className="row g-5"><div className="col-lg-7"><h2 className="text-primary mb-3">7 Nilai Inti ASN BerAKHLAK</h2><p className="text-muted mb-4">Sebagai landasan penilaian, mari kita ingat kembali 7 Core Values ASN yang diluncurkan Presiden RI pada 27 Juli 2021 sebagai wujud komitmen kita bersama.</p><div className="berakhlak-values-list">{berakhlakValues.map(value => ( <div className="value-item" key={value.name}><div className="value-icon"><i className={`fas ${value.icon}`}></i></div><div><strong>{value.name}</strong><p className="text-muted small mb-0">{value.description}</p></div></div> ))}</div></div><div className="col-lg-5"><div className="how-to-card"><h4 className="mb-4">Cara Penilaian</h4><div className="step-item"><div className="step-icon d-flex align-items-center justify-content-center"><i className="fas fa-users"></i></div><div><strong>Pilih 3 Pegawai</strong><p className="text-muted mb-0 small">Pilih tiga kandidat untuk dinominasikan sebagai Tokoh 1, 2, dan 3.</p></div></div><div className="step-item"><div className="step-icon d-flex align-items-center justify-content-center"><i className="fas fa-tasks"></i></div><div><strong>Beri Nilai 8 Parameter</strong><p className="text-muted mb-0 small">Berikan skor untuk setiap parameter BerAKHLAK pada masing-masing kandidat.</p></div></div><div className="step-item"><div className="step-icon d-flex align-items-center justify-content-center"><i className="fas fa-check-double"></i></div><div><strong>Submit Penilaian</strong><p className="text-muted mb-0 small">Anda hanya dapat melakukan penilaian satu kali untuk setiap periode.</p></div></div></div></div></div></div></div></div> ); };

// =================================================================
// PERUBAHAN UTAMA DI SINI: Menambahkan Panah pada Carousel Geser
// =================================================================
const Step2UserSelection = ({ evaluations, handleUserSelection, getAvailableUsers, getScoreRange, prevStep, nextStep }) => {
  const scrollContainerRef = useRef(null);

  const handleArrowScroll = (direction) => {
    if (scrollContainerRef.current) {
      const card = scrollContainerRef.current.querySelector('.carousel-item-wrapper');
      if (!card) return;
      
      const scrollAmount = card.offsetWidth + 16; // Lebar kartu + gap
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };
  
  const renderSelectionCard = (rank) => (
    <div className="selection-card">
      <div className={`tokoh-header tokoh-${rank}`}>
        <h5 className="mb-0">Tokoh {rank}</h5>
        <small>Rentang Nilai: {getScoreRange(rank)}</small>
      </div>
      <div className="p-3">
        <StyledSearchableSelect
          options={getAvailableUsers(rank - 1)}
          value={evaluations[rank - 1].targetUserId}
          onChange={(userId) => handleUserSelection(rank - 1, userId)}
          placeholder="Cari & pilih pegawai..."
        />
      </div>
    </div>
  );

  return (
    <div className="card evaluation-card border-0 border-md-1">
      <div className="card-body p-0 p-lg-5">
        <h3 className="text-primary mb-4 px-3 px-lg-0">Langkah 2: Pilih 3 Pegawai</h3>

        {/* Tampilan Desktop: Grid 3 kolom */}
        <div className="row g-4 d-none d-lg-flex">
          {[1, 2, 3].map(rank => (
            <div key={`desktop-${rank}`} className="col-lg-4">{renderSelectionCard(rank)}</div>
          ))}
        </div>

        {/* Tampilan Mobile: Carousel dengan Panah */}
        <div className="d-lg-none position-relative">
          <div ref={scrollContainerRef} className="selection-carousel-container">
            <div className="selection-carousel">
              {[1, 2, 3].map(rank => (
                <div key={`mobile-${rank}`} className="carousel-item-wrapper">{renderSelectionCard(rank)}</div>
              ))}
            </div>
          </div>
          
          <button className="carousel-arrow left" onClick={() => handleArrowScroll('left')} aria-label="Geser ke kiri">
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="carousel-arrow right" onClick={() => handleArrowScroll('right')} aria-label="Geser ke kanan">
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div className="navigation-buttons mt-4 px-3 px-lg-0">
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

// Step3Scoring (Tidak ada perubahan)
const Step3Scoring = ({ evaluations, handleScoreChange, handleScoreBlur, warnings, scoreRanges, parameters, eligibleUsers, prevStep, handleSubmit, submitting }) => {
    return (
      <div className="card evaluation-card mx-3 mx-md-0">
            <div className="card-body p-4 p-lg-5">
                <h3 className="text-primary mb-4">Langkah 3: Beri Nilai</h3>
                <div className="accordion accordion-penilaian" id="accordionScoring">
                    {evaluations.map((ev, index) => {
                        const rank = index + 1;
                        const range = scoreRanges.find(r => r.ranking === rank);
                        const user = eligibleUsers.find(u => u.id === ev.targetUserId);
                        return (
                            <div className={`accordion-item tokoh-${rank}`} key={index}>
                                <h2 className="accordion-header" id={`heading${rank}`}>
                                    <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target={`#collapse${rank}`} aria-expanded="true" aria-controls={`collapse${rank}`}>
                                        <div className="d-flex w-100 justify-content-between align-items-center">
                                            <span><strong>Tokoh {rank}</strong>: {user?.nama || 'Pegawai Belum Dipilih'}</span>
                                        </div>
                                    </button>
                                </h2>
                                <div id={`collapse${rank}`} className="accordion-collapse collapse show" aria-labelledby={`heading${rank}`}>
                                    <div className="accordion-body">
                                        <div className="row g-3 g-md-4">
                                            {parameters.map(param => (
                                                <div className="col-md-6" key={param.id}>
                                                    <div className="parameter-card h-100">
                                                        <label className="parameter-label">{param.urutan}. {param.namaParameter}</label>
                                                        <div>
                                                            <SimpleNumberInput value={ev.scores[param.id] || ''} onChange={(value) => handleScoreChange(index, param.id, value)} onBlur={() => handleScoreBlur(index, param.id)} min={range?.nilaiMin || 80} max={range?.nilaiMax || 100} placeholder={`${range?.nilaiMin}-${range?.nilaiMax}`} isInvalid={!!warnings[`${index}-${param.id}`]} />
                                                            {warnings[`${index}-${param.id}`] && (<small className="validation-warning">{warnings[`${index}-${param.id}`]}</small>)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="card-footer bg-transparent border-0 pt-0 pb-4 px-4 px-lg-5">
                <div className="navigation-buttons">
                    <button className="btn btn-outline-secondary" onClick={prevStep}>
                        <i className="fas fa-arrow-left me-md-2"></i>
                        <span className="d-none d-md-inline">Kembali</span>
                    </button>
                    <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Menyimpan...</> : <>
                        <span className="d-none d-md-inline">Submit Evaluasi</span>
                        <i className="fas fa-paper-plane ms-md-2"></i>
                        </>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Halaman Hasil (Tidak ada perubahan)
const ResultPageBase = ({ icon, color, title, text, children }) => ( <div className="result-page"><div className="card"><div className="card-body text-center py-5 px-4"><i className={`fas ${icon} ${color} mb-3 result-icon`}></i><h2 className={`${color} mb-3`}>{title}</h2><p className="text-muted fs-5 mb-4">{text}</p><div className="d-flex justify-content-center mt-4">{children || <a href="/dashboard" className="btn btn-primary px-4"><i className="fas fa-home me-2"></i>Kembali ke Dashboard</a>}</div></div></div></div> );
const Step4Success = ({ periodName }) => ( <ResultPageBase icon="fa-check-circle" color="text-success" title="Evaluasi Berhasil Disimpan!" text={<>Terima kasih atas partisipasi Anda dalam penilaian Tokoh BerAKHLAK periode <strong>{periodName}</strong>.</>} /> );
const Step5AlreadyEvaluated = ({ periodName }) => ( <ResultPageBase icon="fa-shield-alt" color="text-primary" title="Anda Sudah Melakukan Penilaian!" text={<>Terima kasih atas partisipasi Anda dalam penilaian Tokoh BerAKHLAK periode <strong>{periodName}</strong>. Penilaian hanya dapat dilakukan satu kali per periode.</>} /> );

export default EvaluationPage;