// src/components/ApiTest.js - COMPONENT UNTUK TEST API
import React, { useState } from 'react';
import { testConnection, evaluationAPI } from '../services/api';

const ApiTest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, data, error) => {
    setResults(prev => [...prev, { test, success, data, error, timestamp: new Date() }]);
  };

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    // Test 1: Backend Connection
    try {
      const result = await testConnection();
      addResult('Backend Connection', result.success, result.data, null);
    } catch (error) {
      addResult('Backend Connection', false, null, error.message);
    }

    // Test 2: Get Parameters
    try {
      const response = await evaluationAPI.getParameters();
      addResult('Get Parameters', true, `${response.data.data.parameters.length} parameters loaded`, null);
    } catch (error) {
      addResult('Get Parameters', false, null, error.response?.data?.message || error.message);
    }

    // Test 3: Get Active Period
    try {
      const response = await evaluationAPI.getActivePeriod();
      addResult('Get Active Period', true, response.data.data.period.namaPeriode, null);
    } catch (error) {
      addResult('Get Active Period', false, null, error.response?.data?.message || error.message);
    }

    // Test 4: Get Eligible Users
    try {
      const response = await evaluationAPI.getEligibleUsers();
      addResult('Get Eligible Users', true, `${response.data.data.users.length} users available`, null);
    } catch (error) {
      addResult('Get Eligible Users', false, null, error.response?.data?.message || error.message);
    }

    setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="mb-0">API Connection Test</h6>
      </div>
      <div className="card-body">
        <button 
          className="btn btn-primary btn-sm mb-3 w-100" 
          onClick={runTests}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Testing...
            </>
          ) : (
            'Run API Tests'
          )}
        </button>

        {results.length > 0 && (
          <div className="small">
            {results.map((result, index) => (
              <div key={index} className={`p-2 mb-2 rounded ${result.success ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                <div className="d-flex justify-content-between align-items-center">
                  <strong>{result.test}</strong>
                  <span className={`badge ${result.success ? 'bg-success' : 'bg-danger'}`}>
                    {result.success ? 'OK' : 'FAIL'}
                  </span>
                </div>
                <div className="mt-1">
                  {result.success ? (
                    <small>{result.data}</small>
                  ) : (
                    <small>{result.error}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiTest;