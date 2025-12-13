#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'kisaan-backend-node', '.env') });

function getMigrationsDir() {
  return path.resolve(__dirname, '..', 'kisaan-backend-node', 'src', 'migrations');
}

async function main() {
  const cfg = {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
  };

  console.log('[check-db-state] connecting with', { host: cfg.host, database: cfg.database, user: cfg.user, ssl: !!cfg.ssl });

  const pool = new Pool(cfg);
  try {
    const client = await pool.connect();

    // List tables in public schema starting with kisaan_
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type='BASE TABLE'
      ORDER BY table_name;
    `);
    const allTables = tablesRes.rows.map(r => r.table_name);

    // Check for _migrations table
    let applied = [];
    try {
      const migRes = await client.query("SELECT name, executed_at FROM _migrations ORDER BY executed_at");
      applied = migRes.rows.map(r => r.name);
    } catch (err) {
      // _migrations may not exist
      if (err.code === '42P01' || /relation \"_migrations\" does not exist/.test(err.message)) {
        console.log('[check-db-state] _migrations table not found on DB');
      } else {
        console.error('[check-db-state] error querying _migrations:', err.message || err);
      }
    }

    // Read local migrations directory
    const migrationsDir = getMigrationsDir();
    let localFiles = [];
    try {
      localFiles = fs.readdirSync(migrationsDir).filter(f => /\.(sql|ts)$/i.test(f)).sort();
    } catch (err) {
      console.error('[check-db-state] cannot read migrations dir', migrationsDir, err.message || err);
    }

    console.log('\n===== DB TABLES (public schema) =====');
    console.log(allTables.join('\n') || '(no tables)');

    console.log('\n===== _migrations APPLIED =====');
    if (applied.length) console.log(applied.join('\n')); else console.log('(none)');

    console.log('\n===== LOCAL MIGRATION FILES =====');
    if (localFiles.length) console.log(localFiles.join('\n')); else console.log('(none)');

    // Compare sets
    const appliedSet = new Set(applied || []);
    const missing = localFiles.filter(f => !appliedSet.has(f));
    const extra = (applied || []).filter(a => !localFiles.includes(a));

    console.log('\n===== MIGRATION COMPARISON =====');
    console.log('Missing (present locally but NOT applied):', missing.length ? '\n  ' + missing.join('\n  ') : '(none)');
    console.log('Extra (applied on DB but no local file):', extra.length ? '\n  ' + extra.join('\n  ') : '(none)');

    client.release();
  } catch (err) {
    console.error('[check-db-state] fatal error:', err.message || err);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
