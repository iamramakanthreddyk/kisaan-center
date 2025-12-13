/**
 * Script to inspect actual database tables
 * Run: npx ts-node scripts/inspect-tables.ts
 */

import { Sequelize } from 'sequelize';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:yd2A4TKG1d7J,yd2A@manoj-test.dev.ea.mpi-internal.com:5432/kisaan_dev?sslmode=require';

async function inspectTables() {
  const sequelize = new Sequelize(DATABASE_URL, {
    logging: false,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 Tables in database:');
    console.log('='.repeat(50));
    (tables as any[]).forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    // Check specific tables we need for migrations
    const criticalTables = [
      'kisaan_users',
      'kisaan_transactions', 
      'kisaan_payments',
      'kisaan_expenses',
      'payment_allocations',
      'kisaan_payment_allocations',
      'expense_settlements',
      'kisaan_expense_settlements'
    ];

    console.log('\n🔍 Critical tables status:');
    console.log('='.repeat(50));
    
    for (const tableName of criticalTables) {
      const [result] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `);
      const exists = (result as any)[0].exists;
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
    }

    // Get columns for kisaan_payments
    console.log('\n💰 kisaan_payments columns:');
    console.log('='.repeat(50));
    const [paymentCols] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'kisaan_payments'
      ORDER BY ordinal_position;
    `);
    (paymentCols as any[]).forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Get columns for kisaan_expenses
    console.log('\n💸 kisaan_expenses columns:');
    console.log('='.repeat(50));
    const [expenseCols] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'kisaan_expenses'
      ORDER BY ordinal_position;
    `);
    (expenseCols as any[]).forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

inspectTables();
