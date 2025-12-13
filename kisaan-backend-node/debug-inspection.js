/**
 * DEBUG & INSPECTION SCRIPT
 * ==========================
 * 
 * Purpose: Inspect database state, check balances, validate constraints
 * No test scenarios - just data inspection
 * 
 * Run: node debug-inspection.js
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:8000/api';

let TOKEN = null;

const headers = () => ({
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
});

// ============================================================================
// LOGIN
// ============================================================================
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'ramakanthreddy_0_107',
      password: 'reddy@123'
    });
    TOKEN = response.data.data.token;
    console.log('✅ Logged in successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// ============================================================================
// INSPECT: ALL USERS WITH BALANCES
// ============================================================================
async function inspectUsers() {
  console.log('\n' + '='.repeat(80));
  console.log('USERS & BALANCES');
  console.log('='.repeat(80));

  try {
    const response = await axios.get(`${BASE_URL}/users`, { headers: headers() });
    const users = response.data.data;

    console.log(`\nTotal Users: ${users.length}\n`);
    console.log('┌─ ID ─┬─ Username ─────────────┬─ Role ────┬─ Balance ────┬─ Shop ID ┐');

    users.forEach(user => {
      const balance = parseFloat(user.balance || 0).toFixed(2);
      const shopId = user.shop_id ? String(user.shop_id).padEnd(8) : 'N/A'.padEnd(8);
      console.log(
        `│ ${String(user.id).padEnd(4)} │ ${String(user.username).padEnd(23)} │ ${String(user.role).padEnd(9)} │ ${balance.padStart(12)} │ ${shopId} │`
      );
    });
    console.log('└──────┴───────────────────────┴───────────┴──────────────┴──────────┘');
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }
}

// ============================================================================
// INSPECT: ALL SHOPS
// ============================================================================
async function inspectShops() {
  console.log('\n' + '='.repeat(80));
  console.log('SHOPS');
  console.log('='.repeat(80));

  try {
    const response = await axios.get(`${BASE_URL}/shops`, { headers: headers() });
    const shops = response.data.data;

    console.log(`\nTotal Shops: ${shops.length}\n`);

    shops.forEach((shop, idx) => {
      console.log(`${idx + 1}. ${shop.name}`);
      console.log(`   ID: ${shop.id}`);
      console.log(`   Owner: ${shop.owner_id}`);
      console.log(`   Location: ${shop.location}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }
}

// ============================================================================
// INSPECT: ALL TRANSACTIONS
// ============================================================================
async function inspectTransactions() {
  console.log('\n' + '='.repeat(80));
  console.log('TRANSACTIONS');
  console.log('='.repeat(80));

  try {
    const response = await axios.get(`${BASE_URL}/transactions`, { headers: headers() });
    const transactions = response.data.data;

    console.log(`\nTotal Transactions: ${transactions.length}\n`);
    console.log('┌─ ID ─┬─ Total ──┬─ Commission ┬─ Farmer Earning ┬─ Status ─────┐');

    transactions.forEach(txn => {
      const total = parseFloat(txn.total_amount || 0).toFixed(2);
      const commission = parseFloat(txn.commission_amount || 0).toFixed(2);
      const earning = parseFloat(txn.farmer_earning || 0).toFixed(2);
      console.log(
        `│ ${String(txn.id).padEnd(4)} │ ${total.padStart(8)} │ ${commission.padStart(12)} │ ${earning.padStart(15)} │ ${String(txn.status || 'PENDING').padEnd(12)} │`
      );
    });
    console.log('└──────┴──────────┴──────────────┴─────────────────┴──────────────┘');
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }
}

// ============================================================================
// INSPECT: ALL PAYMENTS
// ============================================================================
async function inspectPayments() {
  console.log('\n' + '='.repeat(80));
  console.log('PAYMENTS');
  console.log('='.repeat(80));

  try {
    const response = await axios.get(`${BASE_URL}/payments`, { headers: headers() });
    const payments = response.data.data;

    console.log(`\nTotal Payments: ${payments.length}\n`);
    console.log('┌─ ID ─┬─ Amount ──┬─ Status ──┬─ Payer ────┬─ Payee ────┐');

    payments.forEach(payment => {
      const amount = parseFloat(payment.amount || 0).toFixed(2);
      console.log(
        `│ ${String(payment.id).padEnd(4)} │ ${amount.padStart(9)} │ ${String(payment.status || 'PENDING').padEnd(9)} │ ${String(payment.payer_type || '?').padEnd(10)} │ ${String(payment.payee_type || '?').padEnd(10)} │`
      );
    });
    console.log('└──────┴───────────┴───────────┴────────────┴────────────┘');
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }
}

// ============================================================================
// INSPECT: ALL EXPENSES
// ============================================================================
async function inspectExpenses() {
  console.log('\n' + '='.repeat(80));
  console.log('EXPENSES');
  console.log('='.repeat(80));

  try {
    const response = await axios.get(`${BASE_URL}/expenses`, { headers: headers() });
    const expenses = response.data.data || [];

    console.log(`\nTotal Expenses: ${expenses.length}\n`);

    if (expenses.length === 0) {
      console.log('No expenses found.');
      return;
    }

    expenses.forEach((expense, idx) => {
      console.log(`${idx + 1}. ${expense.type || 'Unknown'}`);
      console.log(`   ID: ${expense.id}`);
      console.log(`   Amount: ${expense.amount}`);
      console.log(`   User: ${expense.user_id}`);
      console.log(`   Shop: ${expense.shop_id}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }
}

// ============================================================================
// INSPECT: BALANCE DRIFT
// ============================================================================
async function inspectBalanceDrift() {
  console.log('\n' + '='.repeat(80));
  console.log('BALANCE VALIDATION');
  console.log('='.repeat(80));

  try {
    const response = await axios.get(`${BASE_URL}/users`, { headers: headers() });
    const users = response.data.data;

    const farmers = users.filter(u => u.role === 'farmer');
    const buyers = users.filter(u => u.role === 'buyer');

    console.log(`\nFarmers: ${farmers.length}`);
    farmers.forEach(f => {
      console.log(`  - ${f.username} (ID: ${f.id}): Balance = ${f.balance}`);
    });

    console.log(`\nBuyers: ${buyers.length}`);
    buyers.forEach(b => {
      console.log(`  - ${b.username} (ID: ${b.id}): Balance = ${b.balance}`);
    });

    console.log('\n💡 Tip: Use BalanceCalculationService to validate balance consistency');
  } catch (error) {
    console.error('❌ Failed:', error.response?.data?.message || error.message);
  }
}

// ============================================================================
// MAIN INSPECTOR
// ============================================================================
async function runInspection() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(25) + 'DATABASE INSPECTION SCRIPT' + ' '.repeat(27) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + ' View all users, shops, transactions, payments, expenses' + ' '.repeat(24) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  if (!(await login())) {
    process.exit(1);
  }

  await inspectUsers();
  await inspectShops();
  await inspectTransactions();
  await inspectPayments();
  await inspectExpenses();
  await inspectBalanceDrift();

  console.log('\n' + '='.repeat(80));
  console.log('✅ INSPECTION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// RUN
// ============================================================================
runInspection().catch(error => {
  console.error('Inspection failed:', error);
  process.exit(1);
});
