// Test script to validate login response format fix
const API_BASE = 'http://localhost:8000/api';

console.log('🔍 Testing Login Response Format Fix');
console.log('====================================');

async function testLoginResponseFormat() {
  try {
    console.log('Testing login with correct credentials...');
    
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'superadmin',
        password: 'superadminpass'
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response structure:', JSON.stringify(data, null, 2));
      
      // Validate expected structure
      const checks = [
        { name: 'Has success field', condition: typeof data.success === 'boolean' },
        { name: 'Has message field', condition: typeof data.message === 'string' },
        { name: 'Has data field', condition: typeof data.data === 'object' },
        { name: 'Data has token', condition: data.data && typeof data.data.token === 'string' },
        { name: 'Data has user', condition: data.data && typeof data.data.user === 'object' },
        { name: 'User has id', condition: data.data && data.data.user && data.data.user.id },
        { name: 'User has username', condition: data.data && data.data.user && data.data.user.username },
        { name: 'User has role', condition: data.data && data.data.user && data.data.user.role }
      ];
      
      console.log('\n✅ Structure Validation:');
      let allPassed = true;
      checks.forEach(check => {
        const status = check.condition ? '✅' : '❌';
        console.log(`  ${status} ${check.name}`);
        if (!check.condition) allPassed = false;
      });
      
      console.log('\n🎯 Result:');
      if (allPassed) {
        console.log('✅ Login response format is correct!');
        console.log('✅ Frontend should now work with this response structure.');
        return true;
      } else {
        console.log('❌ Login response format has issues.');
        return false;
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Login failed:', errorText);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

testLoginResponseFormat();