// Node.js script to initialize SQLite DB with schema and seed data
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'kisaan_local.db');
const schemaPath = path.join(__dirname, 'schema.sqlite.sql');
const seedPath = path.join(__dirname, 'seed-data.sqlite.sql');

function runSqlFile(db, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function main() {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath); // Remove old DB for a clean start
  }
  const db = new sqlite3.Database(dbPath);
  try {
    await runSqlFile(db, schemaPath);
    await runSqlFile(db, seedPath);
    console.log('SQLite DB initialized successfully!');
  } catch (err) {
    console.error('Error initializing DB:', err);
  } finally {
    db.close();
  }
}

main();
