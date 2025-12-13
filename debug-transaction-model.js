// Debug script to check Transaction model initialization
const path = require('path');
process.chdir(path.join(__dirname, 'kisaan-backend-node'));

// Import the Transaction model
const { Transaction } = require('./src/models/transaction');

console.log('Transaction model:', Transaction);
console.log('Transaction.create:', Transaction.create);
console.log('Transaction._model:', Transaction._model);
console.log('Transaction.sequelize:', Transaction.sequelize);
console.log('Transaction.getTableName:', Transaction.getTableName ? Transaction.getTableName() : 'no getTableName');

// Try creating an instance
try {
  console.log('Attempting to build an instance...');
  const instance = Transaction.build({
    shop_id: 1,
    farmer_id: 5,
    buyer_id: 4,
    category_id: 1,
    product_name: 'Test',
    quantity: 100,
    unit_price: 10,
    total_amount: 1000,
    commission_amount: 100,
    farmer_earning: 900
  });
  console.log('Build successful:', instance.id);
} catch (error) {
  console.error('Build failed:', error.message);
}

// Check if create is available
try {
  console.log('Checking create function...');
  console.log('typeof Transaction.create:', typeof Transaction.create);
  console.log('Transaction.create.toString():', Transaction.create ? Transaction.create.toString().substring(0, 100) : 'no create function');
} catch (error) {
  console.error('Error checking create:', error.message);
}