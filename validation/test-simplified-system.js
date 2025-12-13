const axios = require('axios');

const BASE_URL = 'http://localhost:8000';

async function testSimplifiedSystem() {
    try {
        console.log('🔐 Step 1: Logging in to get authentication token...');
        
        // Login to get token
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'ramakanthreddy_0_107',
            password: 'reddy@123'
        });
        
        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;
        console.log('✅ Login successful! Token received.');
        console.log('User info:', user);
        
        // Set up headers for authenticated requests
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('\n🧪 Step 2: Testing simplified system endpoints...');
        
        // Test 1: Check balance for the logged-in user
        console.log('\n📊 Testing balance endpoint...');
        try {
            const userId = user.id;
            console.log('Using user ID:', userId);
            const balanceResponse = await axios.get(`${BASE_URL}/api/simple/balance/${userId}`, { headers });
            console.log('✅ Balance check successful:', balanceResponse.data);
        } catch (error) {
            console.log('❌ Balance check failed:', error.response?.data || error.message);
        }
        
        // Test 2: Test the simple test endpoint
        console.log('\n🔧 Testing simple test endpoint...');
        try {
            const testResponse = await axios.get(`${BASE_URL}/api/simple/test`, { headers });
            console.log('✅ Test endpoint successful:', testResponse.data);
        } catch (error) {
            console.log('❌ Test endpoint failed:', error.response?.data || error.message);
        }
        
        // Test 3: Create a simple transaction (if we have required data)
        console.log('\n💰 Testing transaction creation...');
        try {
            const transactionData = {
                shop_id: 1,
                farmer_id: 2,
                buyer_id: 3,
                category_id: 1,
                product_name: 'Test Product',
                quantity: 10,
                unit_price: 50,
                commission_rate: 5
            };
            
            const transactionResponse = await axios.post(`${BASE_URL}/api/simple/transaction`, transactionData, { headers });
            console.log('✅ Transaction creation successful:', transactionResponse.data);
            
            // After transaction, check balances again
            console.log('\n📊 Checking balances after transaction...');
            const farmerBalance = await axios.get(`${BASE_URL}/api/simple/balance/2`, { headers });
            const buyerBalance = await axios.get(`${BASE_URL}/api/simple/balance/3`, { headers });
            
            console.log('Farmer balance:', farmerBalance.data);
            console.log('Buyer balance:', buyerBalance.data);
            
        } catch (error) {
            console.log('❌ Transaction creation failed:', error.response?.data || error.message);
        }
        
        console.log('\n🎉 Simplified system testing completed!');
        
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
    }
}

// Run the test
testSimplifiedSystem();