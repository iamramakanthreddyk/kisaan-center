import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

/*
  Schema Structure Verification Script
  ------------------------------------
  Compares the canonical SQL in complete-schema.sql with the live database's tables & columns.
  Focuses on presence/absence, not full datatype or index parity (can be extended).
*/

interface ExpectedColumn { name: string; raw: string; }
interface ExpectedTable { name: string; columns: ExpectedColumn[]; }

function parseSchema(sql: string): ExpectedTable[] {
  const tables: ExpectedTable[] = [];
  const createTableRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_\.]+)\s*\(([^;]+?)\);/gi;
  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(sql))) {
    const [, tableName, body] = match;
    const cols: ExpectedColumn[] = [];
    // Split top-level commas (naive but works for simple column lines) – ignore constraint-only lines
    body.split(/,(?=(?:[^()]*\([^()]*\))*[^()]*$)/).map(s => s.trim()).forEach(line => {
      if (!line) return;
      const lc = line.toLowerCase();
      if (lc.startsWith('constraint') || lc.startsWith('primary key') || lc.startsWith('unique') || lc.startsWith('foreign key')) return;
      const columnNameMatch = line.match(/^\"?([a-zA-Z0-9_]+)\"?\s+/);
      if (columnNameMatch) {
        cols.push({ name: columnNameMatch[1], raw: line });
      }
    });
    tables.push({ name: tableName, columns: cols });
  }
  return tables;
}

async function main() {
  const envPath = path.join(process.cwd(), '.env');
  require('dotenv').config({ path: envPath });
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL_MODE ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();
  const schemaDir = path.join(process.cwd(), 'schema');
  const unifiedPath = path.join(schemaDir, 'unified-schema.sql');
  const sql = fs.readFileSync(unifiedPath, 'utf8');
  const expected = parseSchema(sql);

  const problems: string[] = [];

  for (const t of expected) {
    const { rows: tableRows } = await client.query(`SELECT to_regclass($1) as exists`, [t.name]);
    const exists = !!tableRows[0].exists;
    if (!exists) {
      problems.push(`MISSING TABLE: ${t.name}`);
      continue;
    }
    const tableOnly = t.name.includes('.') ? t.name.split('.').pop()! : t.name;
    const { rows: colRows } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY 1`,
      [tableOnly]
    );
    const liveCols = new Set(colRows.map(r => r.column_name));
    for (const c of t.columns) {
      if (!liveCols.has(c.name)) {
        problems.push(`MISSING COLUMN: ${t.name}.${c.name} (live has: ${Array.from(liveCols).join(',')})`);
      }
    }
  }

  if (problems.length === 0) {
    console.log('SCHEMA STRUCTURE OK');
  } else {
    console.log('SCHEMA STRUCTURE DISCREPANCIES FOUND:');
    problems.forEach(p => console.log(' - ' + p));
    process.exitCode = 2;
  }
  await client.end();
}

main().catch(e => {
  console.error('Schema verification failed:', e);
  process.exit(1);
});
