
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

// Prefer .env.local for local development, fallback to .env
let envPath = path.resolve(__dirname, '../../.env');
const envLocalPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) {
  envPath = envLocalPath;
}
dotenv.config({ path: envPath });
console.log('[ENV] Loading from:', envPath);

const dbDialect = process.env.DB_DIALECT || 'postgres';
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
  DB_DIALECT: dbDialect,
  DB_SSL_MODE: sslMode,
  ENV_PATH: envPath
});

let sequelize: Sequelize;

if (dbDialect === 'sqlite') {
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
  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: dbDialect as 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql',
    logging: false,
    ...(sslMode === 'require'
      ? {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }
      : {}),
  });
}

export default sequelize;
