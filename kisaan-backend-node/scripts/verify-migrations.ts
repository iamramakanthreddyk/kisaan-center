import sequelize from '../src/config/database';

async function verify() {
  console.log('\n=== Verifying Migration Results ===\n');
  
  // Check new columns in kisaan_payments
  console.log('1. Checking kisaan_payments table:');
  const [paymentCols] = await sequelize.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'kisaan_payments' 
      AND column_name IN ('settlement_type', 'balance_before', 'balance_after')
    ORDER BY column_name
  `);
  console.log(paymentCols);
  
  // Check new columns in kisaan_expenses
  console.log('\n2. Checking kisaan_expenses table:');
  const [expenseCols] = await sequelize.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'kisaan_expenses' 
      AND column_name IN ('expense_date', 'category', 'ledger_entry_id')
    ORDER BY column_name
  `);
  console.log(expenseCols);
  
  // Check new columns in kisaan_transaction_ledger
  console.log('\n3. Checking kisaan_transaction_ledger table:');
  const [ledgerCols] = await sequelize.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'kisaan_transaction_ledger' 
      AND column_name IN ('payment_id', 'expense_id', 'credit_id', 'transaction_type', 'purpose')
    ORDER BY column_name
  `);
  console.log(ledgerCols);
  
  // Check new functions
  console.log('\n4. Checking database functions:');
  const [functions] = await sequelize.query(`
    SELECT routine_name, routine_type
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
      AND routine_name IN (
        'get_user_ledger_balance',
        'check_user_balance',
        'find_balance_drift',
        'get_user_financial_summary',
        'reconcile_all_balances'
      )
    ORDER BY routine_name
  `);
  console.log(functions);
  
  // Test one of the functions
  console.log('\n5. Testing get_user_ledger_balance function:');
  try {
    const [test] = await sequelize.query(`SELECT get_user_ledger_balance(1) as balance`);
    console.log('Function works! Sample result:', test);
  } catch (err) {
    console.log('Function test error:', (err as Error).message);
  }
  
  console.log('\n=== Verification Complete ===\n');
  
  await sequelize.close();
}

verify().catch(console.error);
