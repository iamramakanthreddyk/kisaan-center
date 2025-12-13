import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';

// Prefer test env if NODE_ENV=test
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, `../${envFile}`) });

async function main() {
  const useSSL = process.env.DB_SSL_MODE === 'require';
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'postgres',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      dialect: 'postgres',
      logging: false,
      dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    }
  );
  try {
    const start = Date.now();
    await sequelize.authenticate();
    const [versionRow]: any = await sequelize.query('SELECT version();');
    const ms = Date.now() - start;
    console.log('✅ Connected to DB');
    console.log('   Host:', process.env.DB_HOST);
    console.log('   DB:', process.env.DB_NAME);
    console.log('   SSL:', useSSL);
    console.log('   Version:', versionRow[0].version);
    console.log(`   Latency: ${ms}ms`);
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main();
}
