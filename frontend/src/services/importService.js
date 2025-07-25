import { API_BASE_URL } from '../config/config';

/**
 * Import service untuk handle API calls yang berkaitan dengan import
 */
export const importService = {
  /**
   * Download template Excel
   * @returns {Promise<Blob>} Template file blob
   */
  downloadTemplate: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/import/template`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.blob();
  },

  /**
   * Upload dan import file Excel
   * @param {File} file - File Excel yang akan diimport
   * @returns {Promise<Object>} Response dari server
   */
  importUsers: async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/import/users`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Import gagal');
    }

    return result;
  }
};