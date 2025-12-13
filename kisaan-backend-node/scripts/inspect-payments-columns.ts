import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load same .env resolution logic as database.ts (simplified)
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kisaan_dev',
    port: Number(process.env.DB_PORT || 5432),
    ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const sql = `SELECT column_name, data_type, is_nullable, column_default
               FROM information_schema.columns
               WHERE table_name='kisaan_payments'
               ORDER BY ordinal_position`;
  const res = await client.query(sql);
  console.table(res.rows);
  await client.end();
}

main().catch(err => { console.error('inspect-payments-columns error', err); process.exit(1); });
