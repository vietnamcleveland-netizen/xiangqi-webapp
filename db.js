const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.sqlite');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function runMigrations() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('⚠️ No migration files found.');
    return;
  }
  const db = new sqlite3.Database(DB_FILE);
  db.serialize(() => {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log('Running migration:', file);
      db.exec(sql);
    }
  });
  db.close(() => console.log('✅ Migration completed.'));
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'migrate') runMigrations();
  else console.log('Usage: node db.js migrate');
}

module.exports = { runMigrations };
