// Simple test to verify component imports work
// Run with: node test-imports.js

console.log('Testing component imports...');

try {
  // Test if the main files exist and can be read
  const fs = require('fs');
  const path = require('path');
  
  const filesToCheck = [
    'src/pages/OwnerDashboard.tsx',
    'src/components/AddUserDialog.tsx',
    'src/components/CreateTransactionDialog.tsx',
    'src/components/TransactionsList.tsx'
  ];
  
  filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });
  
  console.log('\nComponent files check complete!');
  console.log('\nTo test the full implementation:');
  console.log('1. Start the backend: cd kisaan-backend-node && npm start');
  console.log('2. Start the frontend: cd kisaan-frontend && npm run dev');
  console.log('3. Login as owner and navigate to /owner');
  
} catch (error) {
  console.error('Error checking files:', error.message);
}