import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import sequelize from '../src/config/database';

/**
 * Generic migration runner.
 *
 * Features:
 *  - Discovers all files in src/migrations (sorted lexicographically)
 *  - Supports .ts programmatic migrations exporting { up(queryInterface, Sequelize) }
 *  - Supports .sql migrations (executed as a single batch)
 *  - Idempotent via _migrations ledger table recording executed file names
 *  - Safe to re-run: already applied migrations are skipped
 */
const MIGRATION_DIR_CANDIDATES = [
  path.resolve(__dirname, '..', 'src', 'migrations'),         // dist/src/migrations
  path.resolve(__dirname, '..', '..', 'src', 'migrations'),    // build/src/migrations
  path.resolve(__dirname, '..', 'migrations'),                 // dist/migrations (fallback)
];

function resolveMigrationsDir(): string | null {
  for (const dir of MIGRATION_DIR_CANDIDATES) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

async function ensureLedger() {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function hasRun(name: string): Promise<boolean> {
  const [rows] = await sequelize.query(`SELECT name FROM _migrations WHERE name = $1`, { bind: [name] });
  // rows can be any[] depending on dialect typing; treat length>0 as applied
  return Array.isArray(rows) && rows.length > 0;
}

async function recordRun(name: string) {
  await sequelize.query(`INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, { bind: [name] });
}

async function runSqlMigration(filePath: string, fileName: string) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`  ▶ Executing SQL migration: ${fileName}`);
  await sequelize.query(sql);
  await recordRun(fileName);
  console.log(`  ✔ SQL migration applied: ${fileName}`);
}

async function runTsMigration(filePath: string, fileName: string) {
  console.log(`  ▶ Executing TS migration: ${fileName}`);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(filePath);
  if (!mod || typeof mod.up !== 'function') {
    throw new Error(`Migration ${fileName} does not export an 'up' function`);
  }
  await mod.up(sequelize.getQueryInterface(), Sequelize);
  await recordRun(fileName);
  console.log(`  ✔ TS migration applied: ${fileName}`);
}

async function discoverMigrations(): Promise<{ dir: string; files: string[] }> {
  const dir = resolveMigrationsDir();
  if (!dir) {
    console.log('No migrations directory found in candidates:', MIGRATION_DIR_CANDIDATES.join(', '));
    return { dir: '', files: [] };
  }
  console.log('Using migrations directory:', dir);
  return fs
    .readdirSync(dir)
    // Accept .sql, .ts, .js but ignore declaration files (.d.ts) and sourcemaps
    .filter(f => /(\.sql|\.ts|\.js)$/i.test(f) && !/\.d\.ts$/i.test(f) && !/\.map$/i.test(f))
    .sort()
    .reduce<{ dir: string; files: string[] }>((acc, f) => {
      acc.files.push(f);
      acc.dir = dir;
      return acc;
    }, { dir, files: [] });
}

async function runAllMigrations() {
  await ensureLedger();
  const { dir, files } = await discoverMigrations();
  console.log('🔄 Running migrations from', dir || 'N/A');
  if (!dir) {
    console.log('Found 0 migration file(s).');
    return;
  }
  console.log(`Found ${files.length} migration file(s).`);
  for (const file of files) {
    try {
      if (await hasRun(file)) {
        console.log(`  ↷ Skipping already applied: ${file}`);
        continue;
      }
      const full = path.join(dir, file);
      if (file.endsWith('.sql')) {
        await runSqlMigration(full, file);
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        await runTsMigration(full, file);
      } else {
        console.log(`  ⚠ Unsupported migration type (skipped): ${file}`);
      }
    } catch (err) {
      console.error(`  ✖ Migration failed for ${file}:`, err);
      throw err; // stop on first failure
    }
  }
  console.log('✅ All migrations processed');
}

async function main() {
  try {
    await runAllMigrations();
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}

export { runAllMigrations };