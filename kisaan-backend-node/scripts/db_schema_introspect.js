const { Client } = require('pg');

// Hardcoded DB config (from your .env)
const client = new Client({
  host: 'shortline.proxy.rlwy.net',
  port: 49525,
  user: 'postgres',
  password: 'IXJOqiwkhhuNCbVtaSCGkCKLbBOBwtVo',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
});

async function getTablesAndColumns() {
  await client.connect();
  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);
  for (const row of tablesRes.rows) {
    const table = row.table_name;
    console.log(`\nTable: ${table}`);
    const columnsRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [table]);
    for (const col of columnsRes.rows) {
      console.log(`  - ${col.column_name} (${col.data_type})${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ' DEFAULT ' + col.column_default : ''}`);
    }
  }
  await client.end();
}

getTablesAndColumns().catch(console.error);