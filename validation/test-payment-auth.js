// Quick test for payment endpoint authentication
const API_BASE = 'https://kisaancenter-backend.whiteisland-e1233153.northeurope.azurecontainerapps.io/api';

console.log('🔍 Testing Payment Endpoint Authentication Fix');
console.log('===============================================');

async function testPaymentAuth() {
  try {
    console.log('Testing GET /api/payments (should return 401 after fix)');
    
    const response = await fetch(`${API_BASE}/payments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ Payment authentication is now working correctly!');
      return true;
    } else if (response.status === 200) {
      console.log('❌ Payment endpoint still not protected (returns 200)');
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
      return false;
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

testPaymentAuth();