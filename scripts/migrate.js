#!/usr/bin/env node
const path = require('path');
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('Optional dependency `better-sqlite3` not installed.');
  console.warn(
    'The app will perform additive migrations on startup; to run this script manually install `better-sqlite3` or rely on automatic runtime migrations.'
  );
  process.exit(0);
}

const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, '..', 'data.sqlite');
const db = new Database(dbPath);

function ensureColumn(table, column, stmt) {
  const info = db.prepare(`PRAGMA table_info('${table}')`).all();
  const cols = info.map((c) => c.name);
  if (!cols.includes(column)) {
    console.log(`Adding column ${column} to ${table}`);
    db.prepare(stmt).run();
  } else {
    console.log(`Column ${column} already exists on ${table}`);
  }
}

try {
  ensureColumn(
    'users',
    'failedAttempts',
    'ALTER TABLE users ADD COLUMN failedAttempts INTEGER DEFAULT 0'
  );
  ensureColumn(
    'users',
    'lockUntil',
    'ALTER TABLE users ADD COLUMN lockUntil TEXT'
  );

  ensureColumn(
    'products',
    'currency',
    "ALTER TABLE products ADD COLUMN currency TEXT DEFAULT 'usd'"
  );
  ensureColumn(
    'products',
    'license',
    'ALTER TABLE products ADD COLUMN license INTEGER DEFAULT 0'
  );
  ensureColumn(
    'products',
    'type',
    "ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'one-time'"
  );
  ensureColumn(
    'products',
    'interval',
    'ALTER TABLE products ADD COLUMN interval TEXT'
  );
  ensureColumn(
    'products',
    'stripeId',
    'ALTER TABLE products ADD COLUMN stripeId TEXT'
  );
  ensureColumn(
    'products',
    'updatedAt',
    'ALTER TABLE products ADD COLUMN updatedAt TEXT'
  );

  console.log('Migration complete');
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
}
