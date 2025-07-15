// src/pages/LoginPage.js - ENHANCED UI VERSION WITH FAILED LOGIN ATTEMPTS
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Enhanced Form Styles dengan animasi dan efek modern
const EnhancedFormStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            font-family: 'Inter', sans-serif;
        }
        
        .login-container {
            background: linear-gradient(135deg,rgb(164, 175, 222) 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .login-left {
            position: relative;
            background-image: url('/bgkantor.jpg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
        }
        
        .login-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(158, 191, 240, 0.5) 0%, rgba(171, 186, 234, 0.5) 50%);
            backdrop-filter: blur(0.5px);
        }
        
        .login-right {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            border-left: 0px solid rgba(255, 255, 255, 0.2);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .login-header {
            background: linear-gradient(135deg, #667eea 0%,rgb(53, 50, 149) 100%);
            padding: 1rem 0 1rem 0;
            margin-bottom: 0;
        }
        
        .login-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 1rem;
        }
        
        .form-floating {
            position: relative;
        }
        
        .form-control {
            border: 2px solid rgba(13, 110, 253, 0.1);
            border-radius: 16px;
            padding: 1rem 3rem 1rem 1.25rem; /* Padding untuk icon mata */
            font-size: 1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            height: 60px;
        }
        
        /* Menghilangkan ikon mata bawaan browser */
        .form-control::-ms-reveal,
        .form-control::-ms-clear {
            display: none;
        }
        
        .form-control::-webkit-contacts-auto-fill-button,
        .form-control::-webkit-credentials-auto-fill-button {
            display: none !important;
        }
        
        .form-control:focus {
            border-color: #0d6efd;
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
            background: rgba(255, 255, 255, 1);
            transform: translateY(-2px);
        }
        
        .form-floating > label {
            padding: 1rem 1.25rem;
            font-weight: 500;
            color: #6c757d;
            transition: all 0.1s ease;
        }
        
        .btn-login {
            background: linear-gradient(135deg, #0d6efd 0%, #3366ff 100%);
            border: none;
            border-radius: 16px;
            padding: 1rem 2rem;
            font-weight: 600;
            font-size: 1.1rem;
            letter-spacing: 0.5px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 25px rgba(13, 110, 253, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        .btn-login::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }
        
        .btn-login:hover::before {
            left: 100%;
        }
        
        .btn-login:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(13, 110, 253, 0.4);
            background: linear-gradient(135deg, #0b5ed7 0%, #2c5fff 100%);
        }
        
        .btn-login:active {
            transform: translateY(-1px);
        }
        
        .logo-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 1rem;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .bps-logo {
            width: 100px;
            height: 100px;
            object-fit: contain;
            filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
            transition: transform 0.3s ease;
            margin-bottom: 1rem;
        }
        
        .bps-logo:hover {
            transform: scale(1.05);
        }
        
        .bps-title {
            background: linear-gradient(135deg, #0d6efd 0%,rgb(42, 202, 61) 50%, #fd7e14 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            font-size: 1.75rem;
            text-align: center;
            margin-bottom: 0.5rem;
            letter-spacing: -0.5px;
        }
        
        .welcome-text {
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            color: white !important;
        }
        
        .glassmorphism {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
        }
        
        .glassmorphism-logo {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(15px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            padding: 12px 16px;
            transition: all 0.3s ease;
        }
        
        .glassmorphism-logo:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }
        
        .sipeka-logo {
            background: linear-gradient(135deg, #0d6efd, #3366ff);
            border-radius: 16px;
            padding: 0px;
            box-shadow: 0 8px 20px rgba(23, 68, 134, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .floating-shapes {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
        }
        
        .shape {
            position: absolute;
            opacity: 0.2;
            background: rgba(22, 17, 177, 0.1);
            animation: float 6s ease-in-out infinite;
        }
        
        .shape:nth-child(1) {
            top: 20%;
            left: 20%;
            animation-delay: 0s;
        }
        
        .shape:nth-child(2) {
            top: 40%;
            left: 80%;
            animation-delay: 2s;
        }
        
        .shape:nth-child(3) {
            bottom: 20%;
            left: 40%;
            animation-delay: 4s;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        .alert {
            border-radius: 16px;
            border: none;
            backdrop-filter: blur(10px);
        }
        
        .form-section {
            animation: slideUp 0.8s ease-out;
        }
        
        .form-floating {
            animation: fadeInUp 0.6s ease-out;
        }
        
        .form-floating:nth-child(1) { animation-delay: 0.1s; opacity: 0; animation-fill-mode: forwards; }
        .form-floating:nth-child(2) { animation-delay: 0.2s; opacity: 0; animation-fill-mode: forwards; }
        .btn-login { animation: fadeInUp 0.6s ease-out 0.3s; opacity: 0; animation-fill-mode: forwards; }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .input-icon {
            position: absolute;
            right: 1.25rem;
            top: 50%;
            transform: translateY(-50%);
            color: #6c757d;
            transition: color 0.3s ease;
            pointer-events: none;
            z-index: 5;
        }
        
        .form-control:focus + .input-icon {
            color: #0d6efd;
        }
        
        .password-toggle {
            position: absolute;
            right: 1.25rem; 
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #6c757d;
            cursor: pointer;
            z-index: 6;
            padding: 0.25rem;
            transition: color 0.3s ease;
        }
        
        .password-toggle:hover {
            color: #0d6efd;
        }
        
        
        /* BAGIAN CSS UNTUK RESPONSIVE POSISI LOGO - BISA DISESUAIKAN DI SINI */
        @media (max-width: 992px) {
            .login-left {
                min-height: 30vh;
            }
            
            .login-right {
                border-left: none;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .login-header {
                padding: 1.5rem 0 1rem 0;
            }
            
            .login-content {
                padding: 1.5rem;
            }
        }

        .btn-forgot-password:hover {
            color: #0d6efd !important; /* Hover warna biru */
        }
        
        @media (max-width: 576px) {
            .login-header {
                padding: 1rem 0 0.8rem 0;
            }
            
            .login-content {
                padding: 1rem;
                justify-content: flex-start;
                padding-top: 2rem;
            }
            
            .form-section {
                margin-top: 0;
            }
            
        }
    `}</style>
);

// Komponen Logo BPS menggunakan gambar - dipindah ke kiri atas dengan glassmorphism
const BpsLogo = () => (
    <div className="d-flex align-items-center glassmorphism-logo">
        <img 
            src="/logobps.png" 
            alt="Logo BPS" 
            style={{
                width: '50px',
                height: '50px',
                objectFit: 'contain',
                marginRight: '12px'
            }}
        />
        <div>
            <h6 className="mb-0 fw-bold text-white" style={{
                fontSize: '15px', 
                lineHeight: '1.2',
                fontFamily: "'Inter', sans-serif",
                fontWeight: '700',
                letterSpacing: '-0.3px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
                BPS KABUPATEN
            </h6>
            <h6 className="mb-0 fw-bold text-white" style={{
                fontSize: '15px', 
                lineHeight: '1.2',
                fontFamily: "'Inter', sans-serif", 
                fontWeight: '700',
                letterSpacing: '-0.3px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
                PRINGSEWU
            </h6>
        </div>
    </div>
);

// Komponen Logo SIPEKA yang diperbarui dengan text align left dan warna putih
const SipekaLogo = () => (
    <div className="d-flex align-items-center justify-content-center text-white">
        <div className="sipeka-logo me-3" style={{background: 'rgba(53, 45, 191, 0.8)', padding: '4px'}}>
            <svg width="60" height="60" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 29V18.5C13 16.567 14.567 15 16.5 15H20.5" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M20.5 15H23.5C25.433 15 27 16.567 27 18.5V29" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M20.5 29V24C20.5 22.3431 19.1569 21 17.5 21H16.5" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
        </div>
        <div className="text-start">
            <h4 className="mb-0 fw-bold text-white">SiAPIK</h4>
            <small className="text-white opacity-75">Sistem Apresiasi Pegawai Terbaik</small>
        </div>
    </div>
);

// Komponen Ilustrasi Login dengan foto kantor
const LoginIllustration = () => (
    <div className="col-lg-7 login-left d-none d-lg-flex flex-column align-items-center justify-content-center text-center p-5 position-relative">
        {/* Overlay dengan gradient */}
        <div className="login-overlay"></div>
        
        {/* Logo BPS di pojok kiri atas */}
        <div className="position-absolute" style={{top: '2rem', left: '2rem', zIndex: 10}}>
            <BpsLogo />
        </div>
        
        {/* Floating shapes untuk dekorasi */}
        <div className="floating-shapes">
            <div className="shape">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="white">
                    <circle cx="30" cy="30" r="30"/>
                </svg>
            </div>
            <div className="shape">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="white">
                    <rect width="40" height="40" rx="8"/>
                </svg>
            </div>
            <div className="shape">
                <svg width="50" height="50" viewBox="0 0 50 50" fill="white">
                    <polygon points="25,5 45,40 5,40"/>
                </svg>
            </div>
        </div>
        
        {/* Konten utama - welcome text dengan tipografi yang lebih menonjol */}
        <div className="position-relative z-3">
            <div className="text-center text-white">
                <h1 className="display-3 fw-bold mb-3 welcome-text" style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: '800',
                    letterSpacing: '-1px',
                    fontSize: 'clamp(2.5rem, 5vw, 4rem)'
                }}>
                    Selamat Datang
                </h1>
            </div>
        </div>
    </div>
);

const LoginPage = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        const result = await login(credentials);
        
        if (result.success) {
          // Reset failed attempts on successful login
          setFailedAttempts(0);
          navigate('/dashboard');
        } else {
          // Increment failed attempts
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);
          
          if (newFailedAttempts >= 3) {
            setError('Anda telah gagal login 3 kali. Silahkan tanya admin untuk reset password atau username Anda.');
          } else {
            setError(result.message || 'Terjadi kesalahan saat login.');
          }
        }
    } catch (err) {
        // Increment failed attempts for network errors too
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        if (newFailedAttempts >= 3) {
          setError('Anda telah gagal login 3 kali. Silahkan tanya admin untuk reset password atau username Anda.');
        } else {
          setError('Tidak dapat terhubung ke server. Coba lagi nanti.');
        }
        console.error(err);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <EnhancedFormStyles />
      <div className="row g-0 min-vh-100">
        
        <LoginIllustration />

        <div className="col-lg-5 login-right">
          
          {/* Header dengan Logo SIPEKA - AREA UNGU */}
          <div className="login-header">
            <div className="container-fluid px-4">
              <SipekaLogo />
            </div>
          </div>
          
          {/* Content Area */}
          <div className="login-content">
            <div className="w-100 position-relative form-section mx-auto" style={{ maxWidth: '420px' }}>

              {error && (
                <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-exclamation-triangle-fill flex-shrink-0 me-3" viewBox="0 0 16 16">
                      <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                  </svg>
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="glassmorphism p-4">
                <div className="mb-4">
                  <div className="text-center mb-4">
                    <h2 className="h3 fw-bold text-dark mb-2">
                      Selamat Datang! 👋
                    </h2>
                    <p className="text-muted mb-0">
                      Silahkan masuk untuk mengakses sistem penilaian kinerja pegawai BPS Kabupaten Pringsewu 
                    </p>
                </div>
                  <div className="form-floating position-relative">
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        name="username"
                        value={credentials.username}
                        onChange={handleChange}
                        placeholder="Username"
                        required
                        disabled={loading || failedAttempts >= 3}
                      />
                      <label htmlFor="username">Username</label>
                      <div className="input-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                          </svg>
                      </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="form-floating position-relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        id="password"
                        name="password"
                        value={credentials.password}
                        onChange={handleChange}
                        placeholder="Password"
                        required
                        disabled={loading || failedAttempts >= 3}
                      />
                      <label htmlFor="password">Password</label>
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                        disabled={failedAttempts >= 3}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                              {showPassword ? (
                                  <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                              ) : (
                                  <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                              )}
                              <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                          </svg>
                      </button>
                  </div>
                </div>

                <div className="d-grid mb-4">
                  <button
                    type="submit"
                    className="btn btn-primary btn-login"
                    disabled={loading || failedAttempts >= 3}
                  >
                    {failedAttempts >= 3 ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                        </svg>
                        <span>Akun Terkunci</span>
                      </>
                    ) : loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                          <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                        </svg>
                        Masuk
                      </>
                    )}
                  </button>
                </div>
              </form>
              
              <div className="text-center mt-3">
                  <small className="text-muted">
                    &copy; {new Date().getFullYear()} BPS Kabupaten Pringsewu. Hak cipta dilindungi.
                  </small>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;