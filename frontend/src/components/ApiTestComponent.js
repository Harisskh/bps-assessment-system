// src/components/ApiTestComponent.js - TEST API ENDPOINTS
import React, { useState } from 'react';
import { attendanceAPI, periodAPI, userAPI, testConnection } from '../services/api';

const ApiTestComponent = () => {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const addResult = (endpoint, method, success, data, error) => {
    const result = {
      id: Date.now() + Math.random(),
      endpoint,
      method,
      success,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [result, ...prev]);
  };

  const testAllEndpoints = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Backend Connection
    try {
      const result = await testConnection();
      addResult('/test', 'GET', result.success, result.data, result.error);
    } catch (error) {
      addResult('/test', 'GET', false, null, error.message);
    }

    // Test 2: Periods API - Multiple possible endpoints
    const periodEndpoints = [
      { call: () => periodAPI.getAll(), path: '/periods', method: 'GET' },
      { call: () => periodAPI.getActive(), path: '/periods/active', method: 'GET' }
    ];

    for (const endpoint of periodEndpoints) {
      try {
        const response = await endpoint.call();
        addResult(endpoint.path, endpoint.method, true, {
          message: 'Success',
          dataLength: response.data?.data?.periods?.length || 
                     response.data?.periods?.length || 
                     (Array.isArray(response.data) ? response.data.length : 1)
        }, null);
      } catch (error) {
        addResult(endpoint.path, endpoint.method, false, null, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
    }

    // Test 3: Users API
    const userEndpoints = [
      { call: () => userAPI.getAll(), path: '/users', method: 'GET' },
      { call: () => userAPI.getAll({}), path: '/users?', method: 'GET' }
    ];

    for (const endpoint of userEndpoints) {
      try {
        const response = await endpoint.call();
        addResult(endpoint.path, endpoint.method, true, {
          message: 'Success',
          dataLength: response.data?.data?.users?.length || 
                     response.data?.users?.length || 
                     (Array.isArray(response.data) ? response.data.length : 1)
        }, null);
      } catch (error) {
        addResult(endpoint.path, endpoint.method, false, null, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
    }

    // Test 4: Attendance API
    const attendanceEndpoints = [
      { call: () => attendanceAPI.getAll(), path: '/attendance', method: 'GET' },
      { call: () => attendanceAPI.getAll({}), path: '/attendance?', method: 'GET' }
    ];

    for (const endpoint of attendanceEndpoints) {
      try {
        const response = await endpoint.call();
        addResult(endpoint.path, endpoint.method, true, {
          message: 'Success',
          dataLength: response.data?.data?.attendanceRecords?.length || 
                     response.data?.attendanceRecords?.length || 
                     (Array.isArray(response.data) ? response.data.length : 0)
        }, null);
      } catch (error) {
        addResult(endpoint.path, endpoint.method, false, null, {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
    }

    // Test 5: Health Check
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      addResult('/health', 'GET', response.ok, data, null);
    } catch (error) {
      addResult('/health', 'GET', false, null, error.message);
    }

    setTesting(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="fas fa-flask me-2"></i>
            API Endpoint Test
          </h6>
          <div>
            <button 
              className="btn btn-outline-secondary btn-sm me-2"
              onClick={clearResults}
              disabled={testing}
            >
              Clear
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={testAllEndpoints}
              disabled={testing}
            >
              {testing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Testing...
                </>
              ) : (
                <>
                  <i className="fas fa-play me-2"></i>
                  Test All APIs
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="card-body">
        {results.length === 0 ? (
          <div className="text-center text-muted py-3">
            <i className="fas fa-vial fa-2x mb-2 d-block"></i>
            <p>Klik "Test All APIs" untuk memulai pengujian endpoint</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map(result => (
                  <tr key={result.id}>
                    <td>
                      <small className="text-muted">{result.timestamp}</small>
                    </td>
                    <td>
                      <span className={`badge ${
                        result.method === 'GET' ? 'bg-info' :
                        result.method === 'POST' ? 'bg-success' :
                        result.method === 'PUT' ? 'bg-warning' :
                        result.method === 'DELETE' ? 'bg-danger' : 'bg-secondary'
                      }`}>
                        {result.method}
                      </span>
                    </td>
                    <td>
                      <code>{result.endpoint}</code>
                    </td>
                    <td>
                      <span className={`badge ${result.success ? 'bg-success' : 'bg-danger'}`}>
                        {result.success ? '✓ Success' : '✗ Failed'}
                      </span>
                    </td>
                    <td>
                      {result.success ? (
                        <small className="text-success">
                          {result.data?.message || 'OK'}
                          {result.data?.dataLength !== undefined && (
                            <span className="ms-2">({result.data.dataLength} items)</span>
                          )}
                        </small>
                      ) : (
                        <small className="text-danger">
                          {result.error?.status && `${result.error.status}: `}
                          {result.error?.message || result.error}
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <small className="text-muted">
          <i className="fas fa-info-circle me-1"></i>
          Hasil test akan menunjukkan endpoint mana yang berfungsi dan mana yang perlu diperbaiki.
        </small>
      </div>
    </div>
  );
};

export default ApiTestComponent;