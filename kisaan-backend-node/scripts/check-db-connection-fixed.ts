import dotenv from 'dotenv';
import path from 'path';
import { QueryTypes } from 'sequelize';
import sequelize from '../src/config/database';

// Prefer .env.local for local development
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');
try {
  const useLocal = process.env.NODE_ENV !== 'production' && require('fs').existsSync(envLocalPath);
  dotenv.config({ path: useLocal ? envLocalPath : envPath });
} catch {
  // ignore
}

async function run() {
  console.log('🔎 Checking DB connectivity using Sequelize config...');
  try {
    await sequelize.authenticate();
    console.log('✅ Connection to DB succeeded (sequelize.authenticate)');

    const tables = await sequelize.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name LIMIT 200`,
      { type: QueryTypes.SELECT }
    );

    console.log(`📚 Public schema tables (${Array.isArray(tables) ? tables.length : 0} shown up to 200):`);
    (tables || []).slice(0, 200).forEach(t => console.log(' -', t.table_name));

    const kisaanRows = await sequelize.query<{ count: number }>(
      `SELECT count(*)::int as count FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name LIKE 'kisaan_%'`,
      { type: QueryTypes.SELECT }
    );
    const count = Array.isArray(kisaanRows) && kisaanRows.length ? (kisaanRows[0] as any).count : 0;
    console.log(`🔢 Kisaan tables count: ${count}`);

    process.exit(0);
  } catch (err) {
    console.error('✖ DB connectivity check failed:', err instanceof Error ? err.message : err);
    process.exit(2);
  } finally {
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
  }
}

run();
