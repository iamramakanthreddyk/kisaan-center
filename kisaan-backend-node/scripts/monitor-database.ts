// Database monitor script to detect when data is being cleared
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'kisaan_dev',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.DB_SSL_MODE === 'require' ? {
      ssl: { require: true, rejectUnauthorized: false }
    } : {},
  }
);

async function monitorDatabase() {
  try {
    await sequelize.authenticate();
    console.log('🔍 Database Monitor - Connected');
    
    // Check current user count (excluding superadmin)
    const [users] = await sequelize.query("SELECT COUNT(*) as count FROM kisaan_users WHERE role != 'superadmin'");
    const [shops] = await sequelize.query("SELECT COUNT(*) as count FROM kisaan_shops");
    const [transactions] = await sequelize.query("SELECT COUNT(*) as count FROM kisaan_transactions");
    
    const userCount = (users as any[])[0].count;
    const shopCount = (shops as any[])[0].count;
    const transactionCount = (transactions as any[])[0].count;
    
    console.log('📊 Current Database State:');
    console.log(`   • Users (non-superadmin): ${userCount}`);
    console.log(`   • Shops: ${shopCount}`);
    console.log(`   • Transactions: ${transactionCount}`);
    console.log(`   • Timestamp: ${new Date().toISOString()}`);
    
    if (userCount === '0' && shopCount === '0' && transactionCount === '0') {
      console.log('⚠️  WARNING: Database appears to have been cleared!');
      console.log('   This suggests a script or process is clearing data');
    }
    
  } catch (error) {
    console.error('❌ Database monitor error:', error);
  } finally {
    await sequelize.close();
  }
}

// If called directly, run once
if (require.main === module) {
  monitorDatabase();
}

export { monitorDatabase };