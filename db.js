import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'xiangqi.sqlite');

export function getDB() {
  sqlite3.verbose();
  return new sqlite3.Database(DB_PATH);
}

export function run(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err){
      if (err) reject(err); else resolve(this);
    });
  });
}

export function all(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function(err, rows){
      if (err) reject(err); else resolve(rows);
    });
  });
}

export async function migrate() {
  const db = getDB();
  const ddl = fs.readFileSync(path.join(__dirname, 'migrations', '001_init.sql'), 'utf8');
  await run(db, 'PRAGMA foreign_keys = ON;');
  await run(db, 'BEGIN;');
  await run(db, ddl);
  await run(db, 'COMMIT;');
  db.close();
  console.log('✅ Migrated');
}

if (process.argv[2] === 'migrate') {
  migrate().catch(e=>{console.error(e); process.exit(1);});
}