const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in env');
  process.exit(1);
}

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error('Usage: node run_sql.js <path-to-sql-file>');
  process.exit(1);
}

(async ()=>{
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const res = await client.query(sql);
    console.log('SQL executed, result:', res.command || res.rows?.length || 'done');
    if (res.rows) console.log(res.rows.slice(0,20));
  } catch (err) {
    console.error('SQL execution failed', err.message || err);
  } finally {
    await client.end();
  }
})();