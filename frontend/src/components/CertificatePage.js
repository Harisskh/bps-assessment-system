// src/components/CertificatePage.js - REDIRECTED TO FULL PAGE
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CertificatePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the full page version
    console.log('🔄 Redirecting to full certificate page...');
    navigate('/certificate', { replace: true });
  }, [navigate]);

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Mengalihkan ke halaman sertifikat...</p>
      </div>
    </div>
  );
};

export default CertificatePage;