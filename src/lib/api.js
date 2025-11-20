import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
// Backend documented base path: /api/v1
const API_BASE = `${BACKEND_URL.replace(/\/+$/,'')}/api/v1`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ensure default instance sends cookies (for session-based auth)
api.defaults.withCredentials = true;

/**
 * Create axios instance with Basic Auth header
 * @param {string} username 
 * @param {string} password 
 * @returns {axios.AxiosInstance}
 */
export const createBasicAuthApi = (username, password) => {
  const credentials = btoa(`${username}:${password}`);
  const authedApi = axios.create({
    baseURL: API_BASE,
    // if backend uses cookies/sessions for admin routes, enable withCredentials
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
  });
  return authedApi;
};

export default api;
export { API_BASE };
