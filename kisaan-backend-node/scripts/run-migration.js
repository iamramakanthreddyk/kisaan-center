#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

(async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kisaan_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : undefined
  });
  try {
    await client.connect();
    const file = 'src/migrations/20250924_add_shop_extended_columns.sql';
    const sql = fs.readFileSync(file, 'utf8');
    console.log('Running migration file:', file);
    await client.query(sql);
    const check = await client.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='kisaan_shops' AND column_name IN ('location','email','commission_rate','settings')");
    console.log('Columns now present:', check.rows);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
