import axios from 'axios';

// API Health Check Utility
export const checkAPIHealth = async () => {
  const results = {
    backendStatus: 'disconnected',
    endpoints: {},
    errors: []
  };

  try {
    // Check if backend is running
    const healthResponse = await axios.get('/health', { timeout: 5000 });
    results.backendStatus = 'connected';
    console.log('✅ Backend health check:', healthResponse.data);
  } catch (error) {
    results.backendStatus = 'disconnected';
    results.errors.push({
      endpoint: '/health',
      error: error.message,
      suggestion: '���� �� ��� VITE_API_URL ������ ������'
    });
    console.error('❌ Backend health check failed:', error.message);
  }

  // Test critical endpoints
  const testEndpoints = [
    { path: '/api/stock-movements', name: 'Stock Movements' },
    { path: '/api/products', name: 'Products' },
    { path: '/api/warehouses', name: 'Warehouses' },
    { path: '/api/invoices', name: 'Invoices' }
  ];

  for (const endpoint of testEndpoints) {
    try {
      const response = await axios.get(``, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      results.endpoints[endpoint.path] = {
        status: 'success',
        dataCount: Array.isArray(response.data) ? response.data.length : 'object',
        responseTime: 'normal'
      };
      console.log(`✅ ${endpoint.name} endpoint working: ${endpoint.path}`);
    } catch (error) {
      results.endpoints[endpoint.path] = {
        status: 'error',
        error: error.message,
        statusCode: error.response?.status || 'no response'
      };
      results.errors.push({
        endpoint: endpoint.path,
        error: error.message,
        suggestion: error.response?.status === 404 ?
          'الـ endpoint غير موجود في الخادم' :
          'تحقق من تشغيل الخادم أو صحة البيانات'
      });
      console.error(`❌ ${endpoint.name} endpoint failed:`, error.message);
    }
  }

  return results;
};

// Display results in console with formatting
export const displayHealthCheckResults = (results) => {
  console.log('\n🏥 API Health Check Results:');
  console.log('='.repeat(50));
  console.log(`Backend Status: ${results.backendStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}`);

  console.log('\n📡 Endpoint Status:');
  Object.entries(results.endpoints).forEach(([path, status]) => {
    const icon = status.status === 'success' ? '✅' : '❌';
    const info = status.status === 'success'
      ? `(Data: ${status.dataCount})`
      : `(Error: ${status.statusCode})`;
    console.log(`${icon} ${path} ${info}`);
  });

  if (results.errors.length > 0) {
    console.log('\n💡 Suggestions:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.endpoint}: ${error.suggestion}`);
    });
  }

  console.log('='.repeat(50));
};

// Quick test function to be called from browser console
export const testAPI = async () => {
  try {
    const results = await checkAPIHealth();
    displayHealthCheckResults(results);
    return results;
  } catch (error) {
    console.error('Health check failed:', error);
    return { error: error.message };
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.testAPI = testAPI;
  window.checkAPIHealth = checkAPIHealth;
}


