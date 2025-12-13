const { Pool } = require('pg');
const pool = new Pool({
  host: 'xxxxxxx',
  database: 'kisaan_dev',
  user: 'postgres',
  password: 'yyyyyyy',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

pool.query(
  "SELECT id, shop_id, created_at FROM kisaan_transactions WHERE shop_id = 7 AND created_at::date = '2025-09-14' ORDER BY created_at DESC;"
).then(res => {
  console.log(res.rows);
  pool.end();
}).catch(e => {
  console.error(e);
  pool.end();
});