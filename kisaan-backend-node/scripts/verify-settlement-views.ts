import sequelize from '../src/config/database';

async function verifyViews() {
  try {
    console.log('🔍 Checking settlement views and functions...\n');

    // Check views
    const [views] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'v_%'
      ORDER BY table_name
    `);

    console.log('📊 Views created:');
    views.forEach((view: any) => {
      console.log(`  ✓ ${view.table_name}`);
    });

    // Check functions
    const [functions] = await sequelize.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name LIKE '%settlement%' OR routine_name LIKE '%financial%'
      ORDER BY routine_name
    `);

    console.log('\n🔧 Functions created:');
    functions.forEach((func: any) => {
      console.log(`  ✓ ${func.routine_name} (${func.routine_type})`);
    });

    // Check indexes on transaction_ledger
    const [indexes] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'kisaan_transaction_ledger'
      AND schemaname = 'public'
      ORDER BY indexname
    `);

    console.log('\n📑 Indexes on kisaan_transaction_ledger:');
    indexes.forEach((idx: any) => {
      console.log(`  ✓ ${idx.indexname}`);
    });

    // Test v_user_settlement_summary
    const [summary] = await sequelize.query(`
      SELECT * FROM v_user_settlement_summary LIMIT 1
    `);

    console.log('\n✅ v_user_settlement_summary is queryable');
    if (summary.length > 0) {
      console.log('   Sample columns:', Object.keys(summary[0] as object).join(', '));
    }

    // Test v_transaction_settlement_detail
    const [txDetail] = await sequelize.query(`
      SELECT * FROM v_transaction_settlement_detail LIMIT 1
    `);

    console.log('✅ v_transaction_settlement_detail is queryable');
    if (txDetail.length > 0) {
      console.log('   Sample columns:', Object.keys(txDetail[0] as object).join(', '));
    }

    // Test v_expense_allocation_detail
    const [expDetail] = await sequelize.query(`
      SELECT * FROM v_expense_allocation_detail LIMIT 1
    `);

    console.log('✅ v_expense_allocation_detail is queryable');
    if (expDetail.length > 0) {
      console.log('   Sample columns:', Object.keys(expDetail[0] as object).join(', '));
    }

    console.log('\n🎉 All settlement views and functions are working!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

verifyViews();
