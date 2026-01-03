
// =============================================
// SCHEMA MANAGEMENT NOTICE
// =============================================
// Database schema is now managed by ./schema/schema-manager.js
// Do NOT use sequelize.sync() or force sync in production
// Use: npm run schema:init for schema initialization
// =============================================

import { Sequelize } from 'sequelize';

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Prefer .env.local for local development only, fallback to .env
let envPath = path.resolve(__dirname, '../../.env');
const envLocalPath = path.resolve(__dirname, '../../.env.local');

// Only use .env.local in local development environments
const isLocalDev = process.env.NODE_ENV !== 'production' &&
                   process.env.NODE_ENV !== 'test' &&
                   process.env.CI !== 'true' &&
                   fs.existsSync(envLocalPath);

if (isLocalDev) {
  envPath = envLocalPath;
}
dotenv.config({ path: envPath });
console.log('[ENV] Loading from:', envPath);

const dbDialect = process.env.DB_DIALECT || 'postgres';

// Force PostgreSQL in production, test, and CI environments
const isProductionOrCI = process.env.NODE_ENV === 'production' ||
                        process.env.NODE_ENV === 'test' ||
                        process.env.CI === 'true';

const finalDbDialect = isProductionOrCI ? 'postgres' : dbDialect;
const dbName = process.env.NODE_ENV === 'test' 
  ? (process.env.DB_NAME_TEST || 'kisaan_test')
  : (process.env.DB_NAME || 'kisaan_dev');
const dbUser = process.env.NODE_ENV === 'test' 
  ? (process.env.DB_TEST_USER || process.env.DB_USER || 'postgres')
  : (process.env.DB_USER || 'postgres');
const dbPassword = process.env.NODE_ENV === 'test' 
  ? (process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || '')
  : (process.env.DB_PASSWORD || '');
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432');
const sslMode = process.env.DB_SSL_MODE || '';

console.log('[DB CONFIG] Environment variables loaded:', {
  DB_HOST: dbHost,
  DB_NAME: dbName,
  DB_USER: dbUser,
  DB_PASSWORD: dbPassword ? '***masked***' : 'empty',
  DB_PORT: dbPort,
  DB_DIALECT: finalDbDialect,
  DB_SSL_MODE: sslMode,
  ENV_PATH: envPath,
  IS_PRODUCTION_OR_CI: isProductionOrCI
});

let sequelize: Sequelize;

if (finalDbDialect === 'sqlite') {
  const sqliteStorage = process.env.DB_STORAGE
    ? path.resolve(process.cwd(), process.env.DB_STORAGE)
    : path.resolve(__dirname, '../../data/kisaan-local.sqlite');

  console.log('[DB CONFIG] Using SQLite storage at:', sqliteStorage);

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteStorage,
    logging: false,
  });
} else {
  const isProd = isProductionOrCI;
  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: finalDbDialect as 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql',
    // Disable verbose logging in production; allow debug via DEBUG env
    logging: isProd ? false : (process.env.SEQ_LOGGING === 'true' ? console.log : false),
    pool: {
      // Conservative pool sizing to avoid exceeding managed DB connection limits
      max: parseInt(process.env.DB_POOL_MAX || '2', 10),
      min: parseInt(process.env.DB_POOL_MIN || '1', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '20000', 10),
    },
    ...(sslMode === 'require'
      ? {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
              ca: undefined,
              key: undefined,
              cert: undefined,
            },
          },
        }
      : {}),
  });
}

export default sequelize;
