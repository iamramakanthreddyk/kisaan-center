#!/usr/bin/env node
/**
 * Inspect recent payments in the database using pg client.
 * Prints id, transaction_id, amount, payment_date, created_at, counterparty_id, shop_id
 */
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// Load backend .env (consistent with other scripts)
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

(async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kisaan_dev',
    port: Number(process.env.DB_PORT || 5432),
    ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    const sql = `SELECT id, transaction_id, amount, payment_date, created_at, counterparty_id, shop_id, status
                 FROM kisaan_payments
                 ORDER BY id DESC
                 LIMIT 50`;
    const res = await client.query(sql);
    if (!res || !res.rows || res.rows.length === 0) {
      console.log('No payments found');
      await client.end();
      process.exit(0);
    }

    console.log('Recent payments (most recent first):');
    console.log('id | transaction_id | amount | payment_date | created_at | counterparty_id | shop_id | status');
    for (const r of res.rows) {
      console.log(`${r.id} | ${r.transaction_id} | ${r.amount} | ${r.payment_date ? new Date(r.payment_date).toISOString() : null} | ${r.created_at ? new Date(r.created_at).toISOString() : null} | ${r.counterparty_id} | ${r.shop_id} | ${r.status}`);
    }
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Error inspecting payments:', err && err.stack ? err.stack : err);
    try { await client.end(); } catch (e) {}
    process.exit(2);
  }
})();
