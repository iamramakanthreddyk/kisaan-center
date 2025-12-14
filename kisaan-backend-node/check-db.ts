import sequelize from './src/config/database';

(async () => {
  try {
    console.log('Checking database state...');

    // Check migrations
    const [rows] = await sequelize.query('SELECT name, executed_at FROM _migrations ORDER BY executed_at DESC LIMIT 10');
    console.log('Recent migrations:');
    console.log(rows);

    // Check if counterparty_id exists in transactions
    const [cols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'kisaan_transactions' AND column_name = 'counterparty_id'");
    console.log('counterparty_id in transactions:', cols.length > 0 ? 'EXISTS' : 'MISSING');

    // Check payments table
    const [payCols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'kisaan_payments' AND column_name = 'counterparty_id'");
    console.log('counterparty_id in payments:', payCols.length > 0 ? 'EXISTS' : 'MISSING');

    // Check other missing columns
    const [prodCols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'kisaan_transactions' AND column_name = 'product_id'");
    console.log('product_id in transactions:', prodCols.length > 0 ? 'EXISTS' : 'MISSING');

    const [commCols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'kisaan_transactions' AND column_name = 'commission_rate'");
    console.log('commission_rate in transactions:', commCols.length > 0 ? 'EXISTS' : 'MISSING');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();