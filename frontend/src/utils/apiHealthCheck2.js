import axios from 'axios';

const API_BASE = (import.meta?.env?.VITE_API_URL) || 'http://localhost:8000';

export const checkAPIHealth = async () => {
  const results = { backendStatus: 'disconnected', endpoints: {}, errors: [] };
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    results.backendStatus = 'connected';
  } catch (error) {
    results.backendStatus = 'disconnected';
    results.errors.push({ endpoint: '/health', error: error.message, suggestion: 'Check VITE_API_URL and server status' });
  }

  const testEndpoints = ['/api/stock-movements', '/api/products', '/api/warehouses', '/api/invoices'];
  for (const path of testEndpoints) {
    try {
      const res = await axios.get(`${API_BASE}${path}`, { timeout: 5000, headers: { 'Content-Type': 'application/json' } });
      results.endpoints[path] = { status: 'success', dataCount: Array.isArray(res.data) ? res.data.length : 'object' };
    } catch (error) {
      results.endpoints[path] = { status: 'error', error: error.message, statusCode: error.response?.status || 'no response' };
      results.errors.push({ endpoint: path, error: error.message, suggestion: 'Verify path and auth' });
    }
  }
  return results;
};

export const displayHealthCheckResults = (results) => {
  console.log('API:', results.backendStatus);
  Object.entries(results.endpoints).forEach(([p, s]) => console.log(p, s.status));
};

export const testAPI = async () => {
  const r = await checkAPIHealth();
  displayHealthCheckResults(r);
  return r;
};

if (typeof window !== 'undefined') {
  window.testAPI = testAPI;
  window.checkAPIHealth = checkAPIHealth;
}

