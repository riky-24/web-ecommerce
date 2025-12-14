#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data.sqlite');

function runSqlite() {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    db.exec(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS qrisId TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymentMethod TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymentId TEXT;
    `);
    console.log('SQLite migration applied');
    db.close();
    return true;
  } catch (e) {
    console.warn('Better-sqlite3 not available or migration failed:', e.message);
    return false;
  }
}

function runJson() {
  // fallback: ensure JSON file contains proper fields
  const jsonPath = dbPath === ':memory:' ? null : (path.isAbsolute(dbPath) ? dbPath + '.json' : path.join(process.cwd(), dbPath + '.json'));
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.warn('No JSON DB file found; nothing to migrate.');
    return;
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw || '{}');
  data.products = data.products || [];
  data.products = data.products.map((p) => ({ category: 'general', qrisId: null, ...p }));
  data.orders = data.orders || [];
  data.orders = data.orders.map((o) => ({ paymentMethod: null, paymentId: null, ...o }));
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log('JSON DB migration applied to', jsonPath);
}

const applied = runSqlite();
if (!applied) runJson();
console.log('Migration complete');
