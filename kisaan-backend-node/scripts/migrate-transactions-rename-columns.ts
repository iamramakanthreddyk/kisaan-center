import { Client } from 'pg';
import path from 'path';
import fs from 'fs';

/*
  One-off migration:
  - Detect legacy columns total_sale_value, shop_commission
  - If new columns total_amount, commission_amount missing, add them
  - Copy data over
  - Recompute farmer_earning = total_amount - commission_amount where needed
  - (Optionally) drop old columns with --drop-legacy flag
*/

async function main() {
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL_MODE ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();
  const dropLegacy = process.argv.includes('--drop-legacy');

  const q = (sql: string) => client.query(sql);

  const { rows: cols } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='kisaan_transactions'`);
  const hasTotalAmount = cols.some(c => c.column_name === 'total_amount');
  const hasCommissionAmount = cols.some(c => c.column_name === 'commission_amount');
  const hasLegacyTotal = cols.some(c => c.column_name === 'total_sale_value');
  const hasLegacyCommission = cols.some(c => c.column_name === 'shop_commission');

  if (!hasLegacyTotal && !hasLegacyCommission && hasTotalAmount && hasCommissionAmount) {
    console.log('Nothing to do: schema already normalized.');
    await client.end();
    return;
  }

  await client.query('BEGIN');
  try {
    if (!hasTotalAmount) {
      console.log('Adding total_amount column');
      await q(`ALTER TABLE kisaan_transactions ADD COLUMN total_amount NUMERIC(12,2)`);
    }
    if (!hasCommissionAmount) {
      console.log('Adding commission_amount column');
      await q(`ALTER TABLE kisaan_transactions ADD COLUMN commission_amount NUMERIC(12,2)`);
    }
    // Populate from legacy
    if (hasLegacyTotal) {
      console.log('Backfilling total_amount from total_sale_value');
      await q(`UPDATE kisaan_transactions SET total_amount = total_sale_value WHERE total_amount IS NULL`);
    }
    if (hasLegacyCommission) {
      console.log('Backfilling commission_amount from shop_commission');
      await q(`UPDATE kisaan_transactions SET commission_amount = shop_commission WHERE commission_amount IS NULL`);
    }
    // Recompute farmer_earning if null or zero but we have values
    console.log('Recomputing farmer_earning where needed');
    await q(`UPDATE kisaan_transactions SET farmer_earning = total_amount - COALESCE(commission_amount,0)
             WHERE total_amount IS NOT NULL AND (farmer_earning IS NULL OR farmer_earning = 0)`);

    if (dropLegacy) {
      if (hasLegacyTotal) {
        console.log('Dropping legacy column total_sale_value');
        await q(`ALTER TABLE kisaan_transactions DROP COLUMN total_sale_value`);
      }
      if (hasLegacyCommission) {
        console.log('Dropping legacy column shop_commission');
        await q(`ALTER TABLE kisaan_transactions DROP COLUMN shop_commission`);
      }
    }
    // Enforce NOT NULL if data is fully populated
    await q(`ALTER TABLE kisaan_transactions ALTER COLUMN total_amount SET NOT NULL`);
    await q(`ALTER TABLE kisaan_transactions ALTER COLUMN commission_amount SET NOT NULL`);

    await client.query('COMMIT');
    console.log('Migration complete. Use --drop-legacy to remove old columns after validation.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();