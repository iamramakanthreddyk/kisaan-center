/**
 * COMPLEX SETTLEMENT SCENARIOS TEST
 * 
 * Scenario: 10 transactions with various settlement patterns:
 * - Partial payments from both farmer and buyer
 * - Expenses (embedded with transaction and separate)
 * - Owner paying farmer (with expense consideration)
 * - Owner receiving from buyer
 * - Balance reconciliation across all scenarios
 * 
 * Goal: Verify that settlement logic correctly handles complex cases
 */

const axios = require('axios');

// ============================================================================
// CONSTANTS
// ============================================================================
const BASE_URL = 'http://localhost:8000/api';
const OWNER_ID = 2;
const SHOP_ID = 1;
const FARMER_ID = 61;
const BUYER_ID = 62;

const testCredentials = {
  username: 'ramakanthreddy_0_107',
  password: 'reddy@123'
};

let authToken = null;

// Helper: Get auth headers
const headers = () => ({
  Authorization: `Bearer ${authToken}`,
  'Content-Type': 'application/json'
});

// ============================================================================
// TEST DATA SETUP
// ============================================================================
const scenarios = [
  {
    name: 'TXN 1: Full Payment + No Expense',
    transaction: { quantity: 5, unit_price: 100, commission_rate: 5 }, // 500 total, 25 commission, 475 farmer earning
    payments: {
      buyer: { amount: 500, status: 'PAID' }, // Buyer pays full amount
      farmer: null
    },
    expense: null
  },
  {
    name: 'TXN 2: Partial Payment (Buyer 50%, Shop) + Expense Embedded',
    transaction: { quantity: 10, unit_price: 100, commission_rate: 5 }, // 1000 total, 50 commission, 950 farmer earning
    payments: {
      buyer: { amount: 500, status: 'PAID' }, // Buyer pays 50%
      farmer: null
    },
    expense: { amount: 50, category: 'transport', description: 'Transport cost' } // Embedded with transaction
  },
  {
    name: 'TXN 3: Buyer Pays 30% + Farmer Pays 20% + Separate Expense',
    transaction: { quantity: 15, unit_price: 100, commission_rate: 5 }, // 1500 total, 75 commission, 1425 farmer earning
    payments: {
      buyer: { amount: 450, status: 'PAID' }, // Buyer pays 30%
      farmer: { amount: 300, status: 'PAID' } // Farmer pays 20% (advance repayment)
    },
    expense: null,
    separateExpense: { amount: 100, category: 'packaging', description: 'Packaging materials' }
  },
  {
    name: 'TXN 4: No Buyer Payment + Farmer Pays Partial + Expense',
    transaction: { quantity: 8, unit_price: 150, commission_rate: 5 }, // 1200 total, 60 commission, 1140 farmer earning
    payments: {
      buyer: null,
      farmer: { amount: 400, status: 'PAID' } // Farmer pays 400 (might be expense settlement)
    },
    expense: { amount: 75, category: 'labor', description: 'Labor cost' }
  },
  {
    name: 'TXN 5: Buyer Partial 60% + No Farmer Payment + No Expense',
    transaction: { quantity: 12, unit_price: 80, commission_rate: 5 }, // 960 total, 48 commission, 912 farmer earning
    payments: {
      buyer: { amount: 576, status: 'PAID' }, // 60% of total
      farmer: null
    },
    expense: null
  },
  {
    name: 'TXN 6: No Payments Yet + Large Expense',
    transaction: { quantity: 20, unit_price: 120, commission_rate: 5 }, // 2400 total, 120 commission, 2280 farmer earning
    payments: {
      buyer: null,
      farmer: null
    },
    expense: { amount: 200, category: 'storage', description: 'Storage fees' }
  },
  {
    name: 'TXN 7: Buyer 25% + Farmer 50% + Mixed Expense',
    transaction: { quantity: 10, unit_price: 100, commission_rate: 5 }, // 1000 total, 50 commission, 950 farmer earning
    payments: {
      buyer: { amount: 250, status: 'PAID' }, // 25%
      farmer: { amount: 475, status: 'PAID' } // 50%
    },
    expense: { amount: 60, category: 'misc', description: 'Miscellaneous' }
  },
  {
    name: 'TXN 8: Buyer 40% + Farmer 30% + No Expense',
    transaction: { quantity: 14, unit_price: 90, commission_rate: 5 }, // 1260 total, 63 commission, 1197 farmer earning
    payments: {
      buyer: { amount: 504, status: 'PAID' }, // 40%
      farmer: { amount: 359, status: 'PAID' } // 30%
    },
    expense: null
  },
  {
    name: 'TXN 9: Only Farmer Payment 80% + Expense',
    transaction: { quantity: 11, unit_price: 110, commission_rate: 5 }, // 1210 total, 60.5 commission, 1149.5 farmer earning
    payments: {
      buyer: null,
      farmer: { amount: 968, status: 'PAID' } // 80%
    },
    expense: { amount: 80, category: 'packaging', description: 'Box packaging' }
  },
  {
    name: 'TXN 10: Buyer 70% + Farmer 15% + No Expense',
    transaction: { quantity: 18, unit_price: 95, commission_rate: 5 }, // 1710 total, 85.5 commission, 1624.5 farmer earning
    payments: {
      buyer: { amount: 1197, status: 'PAID' }, // 70%
      farmer: { amount: 256.5, status: 'PAID' } // 15%
    },
    expense: null
  }
];

// ============================================================================
// AUTHENTICATION
// ============================================================================
async function authenticate() {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: AUTHENTICATE OWNER');
  console.log('='.repeat(80));

  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, testCredentials);
    authToken = res.data.data.token;
    console.log('✅ AUTHENTICATED - Token acquired');
    return true;
  } catch (error) {
    console.error('❌ AUTHENTICATION FAILED:', error.response?.data?.message || error.message);
    return false;
  }
}

// ============================================================================
// PHASE 1: CREATE 10 COMPLEX TRANSACTIONS
// ============================================================================
async function phase1_createTransactions() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1: CREATE 10 COMPLEX TRANSACTIONS');
  console.log('='.repeat(80));

  const createdTransactions = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`\n📝 ${scenario.name}`);

    try {
      const txnData = {
        shop_id: SHOP_ID,
        farmer_id: FARMER_ID,
        buyer_id: BUYER_ID,
        category_id: 1,
        product_id: 801,
        product_name: `Test Product ${i + 1}`,
        quantity: scenario.transaction.quantity,
        unit_price: scenario.transaction.unit_price,
        commission_rate: scenario.transaction.commission_rate
      };

      const txnRes = await axios.post(`${BASE_URL}/transactions`, txnData, { headers: headers() });
      const txn = txnRes.data.data;

      console.log(`   ✅ Created: ID ${txn.id}`);
      console.log(`      Total: ${txn.total_amount}, Commission: ${txn.commission_amount}, Farmer Earning: ${txn.farmer_earning}`);

      // Add embedded expense if specified
      if (scenario.expense) {
        try {
          const expRes = await axios.post(
            `${BASE_URL}/expenses`,
            {
              user_id: FARMER_ID,
              shop_id: SHOP_ID,
              amount: scenario.expense.amount,
              category: scenario.expense.category,
              description: scenario.expense.description
            },
            { headers: headers() }
          );
          console.log(`   💰 Added Expense: ${scenario.expense.amount} (${scenario.expense.category})`);
        } catch (e) {
          console.warn(`   ⚠️  Expense creation skipped: ${e.response?.data?.message || e.message}`);
        }
      }

      createdTransactions.push({ txn, scenario });
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.response?.data?.message || error.message}`);
    }
  }

  return createdTransactions;
}

// ============================================================================
// PHASE 2: CREATE PAYMENTS (BUYER & FARMER)
// ============================================================================
async function phase2_createPayments(transactions) {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2: CREATE PAYMENTS (BUYER & FARMER)');
  console.log('='.repeat(80));

  const paymentHistory = [];

  for (let i = 0; i < transactions.length; i++) {
    const { txn, scenario } = transactions[i];

    console.log(`\n📌 TXN ${i + 1} (ID ${txn.id}): ${scenario.name}`);

    // Buyer payment
    if (scenario.payments.buyer) {
      try {
        const buyerPayment = await axios.post(
          `${BASE_URL}/payments`,
          {
            transaction_id: txn.id,
            payer_type: 'BUYER',
            payee_type: 'SHOP',
            amount: scenario.payments.buyer.amount,
            method: 'CASH',
            status: scenario.payments.buyer.status,
            payment_date: new Date()
          },
          { headers: headers() }
        );
        console.log(`   ✅ Buyer Payment: ₹${scenario.payments.buyer.amount} (ID ${buyerPayment.data.data.id})`);
        paymentHistory.push({ type: 'buyer', txnId: txn.id, amount: scenario.payments.buyer.amount });
      } catch (e) {
        console.error(`   ❌ Buyer Payment FAILED: ${e.response?.data?.message || e.message}`);
      }
    }

    // Farmer payment
    if (scenario.payments.farmer) {
      try {
        const farmerPayment = await axios.post(
          `${BASE_URL}/payments`,
          {
            transaction_id: txn.id,
            payer_type: 'FARMER',
            payee_type: 'SHOP',
            amount: scenario.payments.farmer.amount,
            method: 'CASH',
            status: scenario.payments.farmer.status,
            payment_date: new Date()
          },
          { headers: headers() }
        );
        console.log(`   ✅ Farmer Payment: ₹${scenario.payments.farmer.amount} (ID ${farmerPayment.data.data.id})`);
        paymentHistory.push({ type: 'farmer', txnId: txn.id, amount: scenario.payments.farmer.amount });
      } catch (e) {
        console.error(`   ❌ Farmer Payment FAILED: ${e.response?.data?.message || e.message}`);
      }
    }

    // Separate expense (if not embedded)
    if (scenario.separateExpense) {
      try {
        const expRes = await axios.post(
          `${BASE_URL}/expenses`,
          {
            user_id: FARMER_ID,
            shop_id: SHOP_ID,
            amount: scenario.separateExpense.amount,
            category: scenario.separateExpense.category,
            description: scenario.separateExpense.description
          },
          { headers: headers() }
        );
        console.log(`   💰 Added Separate Expense: ₹${scenario.separateExpense.amount} (${scenario.separateExpense.category})`);
      } catch (e) {
        console.warn(`   ⚠️  Separate Expense skipped: ${e.response?.data?.message || e.message}`);
      }
    }
  }

  return paymentHistory;
}

// ============================================================================
// PHASE 3: FETCH CURRENT BALANCES
// ============================================================================
async function phase3_fetchBalances() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 3: FETCH CURRENT BALANCES');
  console.log('='.repeat(80));

  try {
    const farmerRes = await axios.get(`${BASE_URL}/users/${FARMER_ID}`, { headers: headers() });
    const farmer = farmerRes.data.data;

    const buyerRes = await axios.get(`${BASE_URL}/users/${BUYER_ID}`, { headers: headers() });
    const buyer = buyerRes.data.data;

    console.log(`\n💼 FARMER (ID ${FARMER_ID}):`);
    console.log(`   Current Balance: ₹${farmer.balance}`);
    console.log(`   Total Earnings: ₹${farmer.total_earnings || 'N/A'}`);
    console.log(`   Total Paid: ₹${farmer.total_paid || 'N/A'}`);

    console.log(`\n👥 BUYER (ID ${BUYER_ID}):`);
    console.log(`   Current Balance: ₹${buyer.balance}`);
    console.log(`   Total Owed: ₹${buyer.total_owed || 'N/A'}`);
    console.log(`   Total Paid: ₹${buyer.total_paid || 'N/A'}`);

    return { farmer, buyer };
  } catch (error) {
    console.error('❌ FAILED TO FETCH BALANCES:', error.response?.data?.message || error.message);
    return null;
  }
}

// ============================================================================
// PHASE 4: OWNER PAYS FARMER WITH PARTIAL AMOUNT
// ============================================================================
async function phase4_ownerPaysFarmer(farmer) {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 4: OWNER PAYS FARMER (SETTLEMENT)');
  console.log('='.repeat(80));

  console.log(`\n📊 Pre-Payment State:`);
  console.log(`   Farmer Balance: ₹${farmer.balance}`);
  console.log(`   Settlement Amount: ₹500 (Partial payment from owner's commission)`);

  try {
    const paymentRes = await axios.post(
      `${BASE_URL}/payments`,
      {
        payer_type: 'SHOP',
        payee_type: 'FARMER',
        counterparty_id: FARMER_ID,
        shop_id: SHOP_ID,
        amount: 500,
        method: 'BANK_TRANSFER',
        status: 'PAID',
        payment_date: new Date(),
        notes: 'Owner settlement to farmer'
      },
      { headers: headers() }
    );

    const payment = paymentRes.data.data;
    console.log(`\n✅ PAYMENT CREATED (ID ${payment.id}):`);
    console.log(`   Amount: ₹${payment.amount}`);
    console.log(`   Applied to Expenses: ₹${payment.applied_to_expenses || 0}`);
    console.log(`   Applied to Balance: ₹${payment.applied_to_balance || 0}`);
    
    if (payment.fifo_result) {
      console.log(`   FIFO Settlements:`, JSON.stringify(payment.fifo_result, null, 2));
    }

    // Fetch updated farmer balance
    const farmerRes = await axios.get(`${BASE_URL}/users/${FARMER_ID}`, { headers: headers() });
    const updatedFarmer = farmerRes.data.data;

    console.log(`\n📊 Post-Payment State:`);
    console.log(`   Farmer Balance: ₹${updatedFarmer.balance}`);
    console.log(`   Balance Change: ₹${updatedFarmer.balance - farmer.balance}`);

    return updatedFarmer;
  } catch (error) {
    console.error('❌ OWNER PAYMENT FAILED:', error.response?.data?.message || error.message);
    return farmer;
  }
}

// ============================================================================
// PHASE 5: OWNER RECEIVES FROM BUYER
// ============================================================================
async function phase5_ownerReceivesFromBuyer(buyer) {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 5: OWNER RECEIVES PAYMENT FROM BUYER');
  console.log('='.repeat(80));

  console.log(`\n📊 Pre-Payment State:`);
  console.log(`   Buyer Balance: ₹${buyer.balance}`);
  console.log(`   Collection Amount: ₹300 (Outstanding payment)`);

  try {
    const paymentRes = await axios.post(
      `${BASE_URL}/payments`,
      {
        payer_type: 'BUYER',
        payee_type: 'SHOP',
        counterparty_id: BUYER_ID,
        shop_id: SHOP_ID,
        amount: 300,
        method: 'CASH',
        status: 'PAID',
        payment_date: new Date(),
        notes: 'Outstanding collection from buyer'
      },
      { headers: headers() }
    );

    const payment = paymentRes.data.data;
    console.log(`\n✅ PAYMENT RECEIVED (ID ${payment.id}):`);
    console.log(`   Amount: ₹${payment.amount}`);
    console.log(`   Applied to Balance: ₹${payment.applied_to_balance || 0}`);

    // Fetch updated buyer balance
    const buyerRes = await axios.get(`${BASE_URL}/users/${BUYER_ID}`, { headers: headers() });
    const updatedBuyer = buyerRes.data.data;

    console.log(`\n📊 Post-Payment State:`);
    console.log(`   Buyer Balance: ₹${updatedBuyer.balance}`);
    console.log(`   Balance Change: ₹${updatedBuyer.balance - buyer.balance}`);

    return updatedBuyer;
  } catch (error) {
    console.error('❌ BUYER PAYMENT FAILED:', error.response?.data?.message || error.message);
    return buyer;
  }
}

// ============================================================================
// PHASE 6: FETCH PAYMENT HISTORY & EXPENSE SUMMARY
// ============================================================================
async function phase6_summaryReports() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 6: SUMMARY REPORTS');
  console.log('='.repeat(80));

  try {
    // Farmer payments & expenses
    console.log(`\n📋 FARMER PAYMENTS & EXPENSES:`);
    const farmerPaymentsRes = await axios.get(
      `${BASE_URL}/payments/farmers/${FARMER_ID}`,
      { headers: headers() }
    );

    const farmerData = farmerPaymentsRes.data.data || {};
    console.log(`   Total Payments: ${farmerData.totalPayments || 0}`);
    console.log(`   Total Paid: ₹${farmerData.totalPaid || 0}`);

    if (farmerData.expenses) {
      console.log(`   Total Expenses: ₹${farmerData.expenses.totalExpenses || 0}`);
      console.log(`   Total Settled: ₹${farmerData.expenses.totalSettled || 0}`);
      console.log(`   Total Unsettled: ₹${farmerData.expenses.totalUnsettled || 0}`);
    }

    // Buyer payments
    console.log(`\n📋 BUYER PAYMENTS:`);
    const buyerPaymentsRes = await axios.get(
      `${BASE_URL}/payments/buyers/${BUYER_ID}`,
      { headers: headers() }
    );

    const buyerData = buyerPaymentsRes.data.data || {};
    console.log(`   Total Payments: ${buyerData.totalPayments || 0}`);
    console.log(`   Total Paid: ₹${buyerData.totalPaid || 0}`);
  } catch (error) {
    console.warn('⚠️  Could not fetch summary reports:', error.response?.data?.message || error.message);
  }
}

// ============================================================================
// ANALYSIS SECTION
// ============================================================================
async function analyzeSettlementLogic() {
  console.log('\n' + '='.repeat(80));
  console.log('SETTLEMENT LOGIC ANALYSIS');
  console.log('='.repeat(80));

  console.log(`
📌 KEY FINDINGS:

1️⃣  FARMER BALANCE CALCULATION:
   Formula: Sum(Unpaid Transaction Earnings) - Sum(Unsettled Expenses)
   
   When Owner Pays Farmer:
   - FIFO Logic applies expenses FIRST
   - Remaining payment reduces unpaid earnings
   - Negative balance = farmer advance/debt

2️⃣  BUYER BALANCE CALCULATION:
   Formula: Sum(Unpaid Transaction Amounts) - Sum(Buyer Payments)
   
   When Owner Receives from Buyer:
   - Allocates payment to oldest unpaid transactions (FIFO)
   - Reduces buyer's outstanding balance
   - Can go negative if overpayment (refund scenario)

3️⃣  EXPENSE SETTLEMENT:
   - Farmer expenses are DEDUCTED from farmer balance
   - When owner pays farmer, FIFO settles expenses FIRST
   - Remaining amount applied to transaction balance
   - Unsettled expenses reduce farmer's available earnings

4️⃣  PARTIAL PAYMENT HANDLING:
   - Multiple partial payments per transaction allowed
   - Each payment allocated independently
   - Payment allocations tracked in payment_allocations table
   - Outstanding amounts recalculated after each payment

5️⃣  OWNER SETTLEMENT:
   - Owner -> Farmer: Settles expenses + earnings
   - Buyer -> Shop: Reduces buyer's outstanding balance
   - Both follow FIFO allocation for consistency
  `);
}

// ============================================================================
// UI IMPROVEMENT SUGGESTIONS
// ============================================================================
function suggestUIImprovements() {
  console.log('\n' + '='.repeat(80));
  console.log('UI IMPROVEMENT SUGGESTIONS');
  console.log('='.repeat(80));

  console.log(`
🎨 RECOMMENDED UI CHANGES:

1️⃣  BALANCE BREAKDOWN CARD (For Owner Payment UI):
   Current: Shows single balance number
   Suggested: Show detailed breakdown
   
   ┌─────────────────────────────────────┐
   │ Farmer Settlement Details           │
   ├─────────────────────────────────────┤
   │ Transaction Earnings:  ₹5000        │
   │ - Unsettled Expenses:  ₹-150        │ ← Show deductions clearly
   │ ─────────────────────────────────   │
   │ Net Payable:           ₹4850        │ ← What owner owes/collects
   │                                     │
   │ Already Paid:          ₹2000        │ ← Previous settlements
   │ ─────────────────────────────────   │
   │ Outstanding Balance:   ₹2850        │ ← What remains
   └─────────────────────────────────────┘

2️⃣  TRANSACTION SETTLEMENT STATUS TABLE:
   Current: Only transaction list
   Suggested: Show payment status per transaction
   
   TXN#  | Amount | Buyer Paid | Farmer Paid | Outstanding | Expenses
   ─────┼────────┼───────────┼────────────┼─────────────┼──────────
   1001 | ₹500   | ₹250 (50%)| ₹0        | ₹250        | ₹50
   1002 | ₹1000  | ₹600 (60%)| ₹100      | ₹300        | ₹75
   
3️⃣  EXPENSE IMPACT VISUALIZATION:
   Current: Expenses shown separately
   Suggested: Show how expenses reduce farmer earnings
   
   Original Earning: ₹500
   - Transport Expense: ₹50
   ─────────────────
   Net Earning: ₹450  ← Impact shown clearly

4️⃣  PAYMENT DIRECTION INTELLIGENCE:
   Current: Manual selection (pay/receive)
   Suggested: Auto-suggest based on balance state
   
   if (farmerBalance > 0) {
     suggest "Pay to Farmer" (shop owes farmer earnings)
   } else if (farmerBalance < 0) {
     suggest "Receive from Farmer" (farmer owes shop advance)
   }
   
   if (buyerBalance > 0) {
     suggest "Receive from Buyer" (buyer owes outstanding)
   }

5️⃣  SETTLEMENT PREVIEW MODAL:
   Current: No preview, direct payment
   Suggested: Show what will be settled before confirming
   
   "You are about to pay ₹500 to farmer [Name]"
   
   Settlement Breakdown:
   - ₹150 for unsettled expenses
   - ₹350 for transaction earnings
   
   Farmer Balance after:
   From: ₹200  →  To: ₹-150 (No longer owed by farmer)

6️⃣  EXPENSE STATUS TRACKING:
   Current: Expenses list without settlement info
   Suggested: Show which expenses are settled
   
   Expense      | Amount | Settled | Remaining | Status
   ─────────────┼────────┼─────────┼───────────┼─────────
   Transport    | ₹100   | ₹100    | ₹0        | ✅ SETTLED
   Packaging    | ₹75    | ₹0      | ₹75       | ⏳ PENDING

7️⃣  PAYMENT ALLOCATION HISTORY:
   Current: Shows payment amount only
   Suggested: Shows how payment was allocated
   
   Payment #1: ₹500
   ├─ ₹150 → Settled expenses
   └─ ₹350 → Reduced unpaid earnings
   
   Payment #2: ₹300
   ├─ ₹0 → Expenses (all settled)
   └─ ₹300 → Reduced unpaid earnings

8️⃣  MULTI-TRANSACTION PAYMENT FLOW:
   Current: Single payment to single user
   Suggested: Show bulk settlement across transactions
   
   "Settling ₹1200 across 3 transactions:"
   ├─ TXN 1001: Pay ₹400
   ├─ TXN 1002: Pay ₹500
   └─ TXN 1003: Pay ₹300

9️⃣  OWNER DASHBOARD METRICS:
   Add these KPIs for better insights:
   - Total Outstanding to Farmers: ₹X
   - Total Receivable from Buyers: ₹Y
   - Total Unsettled Expenses: ₹Z
   - Payment Efficiency: % of transactions fully settled
  `);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function runComplexSettlementTest() {
  try {
    // Authenticate
    const authenticated = await authenticate();
    if (!authenticated) return;

    // Phase 1: Create 10 transactions
    const transactions = await phase1_createTransactions();
    if (transactions.length === 0) {
      console.error('❌ No transactions created. Aborting test.');
      return;
    }

    // Phase 2: Create payments
    const paymentHistory = await phase2_createPayments(transactions);

    // Phase 3: Fetch balances
    const balances = await phase3_fetchBalances();
    if (!balances) {
      console.error('❌ Could not fetch balances.');
      return;
    }

    // Phase 4: Owner pays farmer
    const updatedFarmer = await phase4_ownerPaysFarmer(balances.farmer);

    // Phase 5: Owner receives from buyer
    const updatedBuyer = await phase5_ownerReceivesFromBuyer(balances.buyer);

    // Phase 6: Summary reports
    await phase6_summaryReports();

    // Analysis
    await analyzeSettlementLogic();

    // UI suggestions
    suggestUIImprovements();

    console.log('\n' + '='.repeat(80));
    console.log('✅ COMPLEX SETTLEMENT TEST COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
  }
}

// Run the test
runComplexSettlementTest().catch(console.error);
