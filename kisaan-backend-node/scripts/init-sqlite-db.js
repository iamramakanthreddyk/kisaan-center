// Node.js script to initialize SQLite DB with schema and seed data
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../..', 'local-sqlite-setup', 'kisaan-center.sqlite');
const schemaPath = path.join(__dirname, '../..', 'local-sqlite-setup', 'schema.sqlite.sql');
const seedPath = path.join(__dirname, '../..', 'local-sqlite-setup', 'seed-data.sqlite.sql');

function runSqlFile(db, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        console.error('Error executing SQL file:', filePath, err);
        reject(err);
      } else {
        console.log('Successfully executed:', filePath);
        resolve();
      }
    });
  });
}

async function main() {
  console.log('Database path:', dbPath);
  console.log('Schema path:', schemaPath);
  
  // Remove old DB for a clean start
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Deleted old database file');
  }
  
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created directory:', dir);
  }
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    }
  });
  
  try {
    await runSqlFile(db, schemaPath);
    await runSqlFile(db, seedPath);
    console.log('✅ SQLite DB initialized successfully!');
    console.log('Database file:', dbPath);
  } catch (err) {
    console.error('❌ Error initializing DB:', err);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
    });
  }
}

main();
