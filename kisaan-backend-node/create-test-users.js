const axios = require('axios');
const BASE_URL = 'http://localhost:8000/api';

async function createTestUsers() {
  try {
    // Login as owner
    console.log('🔐 Logging in as owner...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'ramakanthreddy_0_107',
      password: 'reddy@123'
    });

    const token = loginRes.data.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('✅ Owner logged in');

    // Get owner's shop (owners have null shop_id but own shops)
    const shopsRes = await axios.get(`${BASE_URL}/shops`, { headers });
    const ownerShop = shopsRes.data.data[0];
    const shopId = ownerShop ? ownerShop.id : 1;

    // Create farmer user
    console.log('\n👨‍🌾 Creating farmer user...');
    const farmerRes = await axios.post(`${BASE_URL}/users`, {
      username: 'farmer_test_1',
      password: 'farmer@123',
      firstname: 'Farmer',
      role: 'farmer',
      shop_id: shopId,
      email: 'farmer@test.com'
    }, { headers });

    console.log(`✅ Farmer created - ID: ${farmerRes.data.data.id}`);

    // Create buyer user
    console.log('\n🛒 Creating buyer user...');
    const buyerRes = await axios.post(`${BASE_URL}/users`, {
      username: 'buyer_test_1',
      password: 'buyer@123',
      firstname: 'Buyer',
      role: 'buyer',
      shop_id: shopId,
      email: 'buyer@test.com'
    }, { headers });

    console.log(`✅ Buyer created - ID: ${buyerRes.data.data.id}`);

    console.log('\n✅ TEST USERS CREATED SUCCESSFULLY');
    console.log(`   Farmer ID: ${farmerRes.data.data.id}`);
    console.log(`   Buyer ID: ${buyerRes.data.data.id}`);
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }
}

createTestUsers();
