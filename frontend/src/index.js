// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Disable Bootstrap dropdown
document.addEventListener('DOMContentLoaded', function() {
    // Remove any bootstrap dropdown data attributes
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
        el.removeAttribute('data-bs-toggle');
    });
});