import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'railway',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'shortline.proxy.rlwy.net',
    port: parseInt(process.env.DB_PORT || '49525'),
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
  }
);

(async () => {
  try {
    console.log('Checking users in database...');
    const [users] = await sequelize.query('SELECT id, username, role, created_at FROM kisaan_users ORDER BY created_at DESC LIMIT 10');
    console.log('Users found:', (users as any[]).length);
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
})();