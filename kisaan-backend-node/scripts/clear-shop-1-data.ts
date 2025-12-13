import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function executeSQLFile() {
  const useSSL = process.env.DB_SSL_MODE === 'require';
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'postgres',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    }
  );

  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');

    // Read the SQL file
    const sqlFilePath = path.resolve(__dirname, '../../clear_shop_1_data.sql');
    console.log('📖 Reading SQL file:', sqlFilePath);

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 SQL file loaded, size:', sqlContent.length, 'characters');

    // Execute the entire SQL file as one transaction
    console.log('🔄 Executing SQL script...');
    await sequelize.query(sqlContent);
    console.log('✅ SQL script executed successfully!');

    // Run verification query
    console.log('\n🔍 Running verification query...');
    const [verificationResults]: any = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM kisaan_transactions WHERE shop_id = 1) as transactions_remaining,
        (SELECT COUNT(*) FROM kisaan_payments WHERE shop_id = 1) as payments_remaining,
        (SELECT COUNT(*) FROM kisaan_expenses WHERE shop_id = 1) as expenses_remaining,
        (SELECT COUNT(*) FROM kisaan_settlements WHERE shop_id = 1) as settlements_remaining
    `);

    const results = verificationResults[0];
    console.log('\n📊 Verification Results:');
    console.log('   Transactions remaining:', results.transactions_remaining);
    console.log('   Payments remaining:', results.payments_remaining);
    console.log('   Expenses remaining:', results.expenses_remaining);
    console.log('   Settlements remaining:', results.settlements_remaining);

    const totalRemaining = results.transactions_remaining + results.payments_remaining +
                          results.expenses_remaining + results.settlements_remaining;

    if (totalRemaining === 0) {
      console.log('✅ SUCCESS: All shop 1 data has been cleared!');
    } else {
      console.log('⚠️  WARNING: Some data still remains for shop 1');
    }

  } catch (error: any) {
    console.error('❌ Error executing SQL file:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  executeSQLFile();
}