// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    const result = await login(credentials);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <h1 className="h4 text-gray-900 mb-4">
                    <strong>BPS Assessment System</strong>
                  </h1>
                  <p className="text-muted">
                    Sistem Penilaian Pegawai<br />
                    BPS Kabupaten Pringsewu
                  </p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      Username
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="username"
                      name="username"
                      value={credentials.username}
                      onChange={handleChange}
                      placeholder="Masukkan username"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      id="password"
                      name="password"
                      value={credentials.password}
                      onChange={handleChange}
                      placeholder="Masukkan password"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-4">
                  <hr />
                  <h6 className="text-center text-muted mb-3">Demo Credentials:</h6>
                  <div className="row text-center">
                    <div className="col-4">
                      <small className="text-muted">
                        <strong>Admin:</strong><br />
                        admin<br />
                        admin2025
                      </small>
                    </div>
                    <div className="col-4">
                      <small className="text-muted">
                        <strong>Pimpinan:</strong><br />
                        eko.purnomo<br />
                        pimpinan2025
                      </small>
                    </div>
                    <div className="col-4">
                      <small className="text-muted">
                        <strong>Staff:</strong><br />
                        erwansyah<br />
                        bps2025
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4">
              <small className="text-muted">
                © 2025 BPS Kabupaten Pringsewu. All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;