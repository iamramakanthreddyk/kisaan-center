import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

// Load .env (fallback to production style) and allow override via passed ENV_FILE
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: path.resolve(__dirname, `../${envFile}`) });

const log = (m: string) => console.log(m);

async function ensureConnection(): Promise<Sequelize> {
  const useSSL = process.env.DB_SSL_MODE === 'require';
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'kisaan_dev',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      dialect: 'postgres',
      logging: false,
      dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    }
  );
  await sequelize.authenticate();
  return sequelize;
}

async function prepareSchema() {
  // Reuse existing schema manager prepare command via child process for consistency
  execSync('node schema/schema-manager.js prepare', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
}

async function seedMinimal(sequelize: Sequelize) {
  // Superadmin + categories + basic plan (idempotent inserts)
  const [sa] = await sequelize.query("SELECT id FROM kisaan_users WHERE username='superadmin'");
  if (!(sa as any[]).length) {
    const passwordHash = await bcrypt.hash('superadminpass', 10);
    await sequelize.query(`INSERT INTO kisaan_users (username, password, role, status, balance, cumulative_value, created_at, updated_at) VALUES ('superadmin', '${passwordHash}', 'superadmin', 'active', 0, 0, NOW(), NOW())`);
    log('✅ Seeded superadmin');
  }
  const [cat] = await sequelize.query('SELECT id FROM kisaan_categories LIMIT 1');
  if (!(cat as any[]).length) {
    await sequelize.query(`INSERT INTO kisaan_categories (name, description, status, created_at, updated_at) VALUES ('General','General category','active',NOW(),NOW())`);
    log('✅ Seeded base category');
  }
  const [plan] = await sequelize.query('SELECT id FROM kisaan_plans LIMIT 1');
  if (!(plan as any[]).length) {
    await sequelize.query(`INSERT INTO kisaan_plans (name, description, price, features, is_active, created_at, updated_at) VALUES ('Basic Plan','Default plan',0,'[]',true,NOW(),NOW())`);
    log('✅ Seeded basic plan');
  }
}

async function seedFull(sequelize: Sequelize) {
  // COMPLETELY BLOCKED - Seed script disabled to prevent data loss
  log('🚫 SEED SCRIPT COMPLETELY BLOCKED - Data protection active');
  log('⚠️  If you need to seed data, please do it manually with extreme caution');
  return;
  
  // Original code blocked:
  // const { seedGlobalData } = await import('./seed-global-data');
  // await seedGlobalData();
  // log('✅ Full global data seed complete');
}

async function main() {
  try {
    log('🚀 DB Bootstrap starting');
    const mode = process.argv.includes('--full-seed') ? 'full' : (process.argv.includes('--minimal-seed') ? 'minimal' : 'none');
    const skipSeed = mode === 'none';

    const sequelize = await ensureConnection();
    log('✅ Connected to database');

    await prepareSchema();

    if (!skipSeed) {
      if (mode === 'minimal') {
        await seedMinimal(sequelize);
      } else if (mode === 'full') {
        await seedFull(sequelize);
      }
    } else {
      log('ℹ️  No seed requested');
    }

    await sequelize.close();
    log('✅ DB Bootstrap complete');
  } catch (err: any) {
    console.error('❌ DB Bootstrap failed:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
