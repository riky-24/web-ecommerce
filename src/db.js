const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, '..', 'data.sqlite');

let mode = 'none';
let sqliteDb = null;
let low = null;

try {
  // try to use better-sqlite3 if available
  const Database = require('better-sqlite3');
  sqliteDb = new Database(dbPath);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      failedAttempts INTEGER DEFAULT 0,
      lockUntil TEXT
    );
    -- unlock token storage
    CREATE TABLE IF NOT EXISTS unlock_tokens (
      token TEXT PRIMARY KEY,
      username TEXT,
      expiresAt TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      productId TEXT,
      username TEXT,
      amount REAL,
      currency TEXT,
      stripeSessionId TEXT,
      paymentMethod TEXT,
      paymentId TEXT,
      status TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS licenses (
      key TEXT PRIMARY KEY,
      orderId TEXT,
      productId TEXT,
      username TEXT,
      expiresAt TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY,
      actor TEXT,
      action TEXT,
      target TEXT,
      details TEXT,
      createdAt TEXT
    );
  `);
  mode = 'sqlite';
  // ensure schema has columns for older DBs
  try {
    const info = sqliteDb.prepare("PRAGMA table_info('users')").all();
    const cols = info.map((c) => c.name);
    if (!cols.includes('failedAttempts'))
      sqliteDb
        .prepare(
          'ALTER TABLE users ADD COLUMN failedAttempts INTEGER DEFAULT 0'
        )
        .run();
    if (!cols.includes('lockUntil'))
      sqliteDb.prepare('ALTER TABLE users ADD COLUMN lockUntil TEXT').run();
  } catch (e) {
    // ignore
  }

  // ensure product schema has expected columns (add on upgrade)
  try {
    const info = sqliteDb.prepare("PRAGMA table_info('products')").all();
    const cols = info.map((c) => c.name);
    if (!cols.includes('currency'))
      sqliteDb
        .prepare("ALTER TABLE products ADD COLUMN currency TEXT DEFAULT 'usd'")
        .run();
    if (!cols.includes('license'))
      sqliteDb
        .prepare('ALTER TABLE products ADD COLUMN license INTEGER DEFAULT 0')
        .run();
    if (!cols.includes('type'))
      sqliteDb
        .prepare("ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'one-time'")
        .run();
    if (!cols.includes('interval'))
      sqliteDb.prepare('ALTER TABLE products ADD COLUMN interval TEXT').run();
    if (!cols.includes('stripeId'))
      sqliteDb.prepare('ALTER TABLE products ADD COLUMN stripeId TEXT').run();
    if (!cols.includes('updatedAt'))
      sqliteDb.prepare('ALTER TABLE products ADD COLUMN updatedAt TEXT').run();
    if (!cols.includes('category'))
      sqliteDb
        .prepare(
          "ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'general'"
        )
        .run();
    if (!cols.includes('qrisId'))
      sqliteDb.prepare('ALTER TABLE products ADD COLUMN qrisId TEXT').run();
  } catch (e) {
    // ignore
  }
} catch (e) {
  // fallback to a simple JSON file store (no native deps)
  const fs = require('fs').promises;
  const filePath =
    dbPath === ':memory:'
      ? null
      : path.isAbsolute(dbPath)
      ? dbPath + '.json'
      : path.join(process.cwd(), dbPath + '.json');
  const memory = {
    users: [],
    products: [],
    orders: [],
    licenses: [],
    coupons: [],
    audit: [],
  };

  const load = async () => {
    if (!filePath) return memory;
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      return memory;
    }
  };

  const save = async (data) => {
    if (!filePath) {
      // persist all top-level collections into the in-memory store
      Object.assign(memory, data);
      return;
    }
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  };

  low = { load, save, memory };
  mode = 'jsonfile';
}

async function getUser(username) {
  if (mode === 'sqlite') {
    return sqliteDb
      .prepare(
        'SELECT username, password, createdAt, failedAttempts, lockUntil FROM users WHERE username = ?'
      )
      .get(username);
  }
  const data = await low.load();
  return data.users.find((u) => u.username === username) || null;
}

async function insertUser(username, password, createdAt) {
  if (mode === 'sqlite') {
    return sqliteDb
      .prepare(
        'INSERT INTO users (username, password, createdAt, failedAttempts, lockUntil) VALUES (?, ?, ?, ?, ?)'
      )
      .run(username, password, createdAt, 0, null);
  }
  const data = await low.load();
  data.users.push({
    username,
    password,
    createdAt,
    failedAttempts: 0,
    lockUntil: null,
  });
  await low.save(data);
}

async function deleteAllUsers() {
  if (mode === 'sqlite') {
    // remove users and related ephemeral audit entries for clean test runs
    const t1 = sqliteDb.prepare('DELETE FROM users').run();
    try {
      sqliteDb.prepare('DELETE FROM audit').run();
    } catch (e) {
      // ignore if audit table not present or cannot be cleared
    }
    return t1;
  }
  const data = await low.load();
  data.users = [];
  // also clear audits in JSON fallback mode to keep test state isolated
  data.audit = [];
  await low.save(data);
}

// account lockout helpers
async function incrementFailedLogin(
  username,
  limit = 5,
  lockMs = 30 * 60 * 1000
) {
  if (mode === 'sqlite') {
    const user = sqliteDb
      .prepare('SELECT failedAttempts FROM users WHERE username = ?')
      .get(username);
    if (!user) return null;
    const attempts = (user.failedAttempts || 0) + 1;
    let lockUntil = null;
    if (attempts >= limit)
      lockUntil = new Date(Date.now() + lockMs).toISOString();
    sqliteDb
      .prepare(
        'UPDATE users SET failedAttempts = ?, lockUntil = ? WHERE username = ?'
      )
      .run(attempts, lockUntil, username);
    // if we have just locked the user, record an audit entry
    if (lockUntil) {
      try {
        sqliteDb
          .prepare(
            'INSERT INTO audit (id, actor, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run(
            uuidv4(),
            'system',
            'lock',
            username,
            JSON.stringify({ attempts }),
            new Date().toISOString()
          );
        if (process.env.DEBUG_DB === 'true') {
          // eslint-disable-next-line no-console
          console.log('db: inserted audit lock for', username, {
            attempts,
            lockUntil,
          });
        }
      } catch (e) {
        // ignore audit insert errors
      }
    }
    return { attempts, lockUntil };
  }
  const data = await low.load();
  const u = (data.users || []).find((u) => u.username === username);
  if (!u) return null;
  u.failedAttempts = (u.failedAttempts || 0) + 1;
  if (u.failedAttempts >= limit)
    u.lockUntil = new Date(Date.now() + lockMs).toISOString();
  // record audit entry when the user becomes locked (json fallback)
  if (u.lockUntil) {
    data.audit = data.audit || [];
    data.audit.push({
      id: uuidv4(),
      actor: 'system',
      action: 'lock',
      target: username,
      details: JSON.stringify({ attempts: u.failedAttempts }),
      createdAt: new Date().toISOString(),
    });
    if (process.env.DEBUG_DB === 'true') {
      // eslint-disable-next-line no-console
      console.log('db: appended audit lock (json) for', username, {
        attempts: u.failedAttempts,
        lockUntil: u.lockUntil,
      });
    }
  }
  await low.save(data);
  return { attempts: u.failedAttempts, lockUntil: u.lockUntil };
}

async function resetFailedLogin(username) {
  if (mode === 'sqlite') {
    return sqliteDb
      .prepare(
        'UPDATE users SET failedAttempts = 0, lockUntil = NULL WHERE username = ?'
      )
      .run(username);
  }
  const data = await low.load();
  const u = (data.users || []).find((u) => u.username === username);
  if (!u) return null;
  u.failedAttempts = 0;
  u.lockUntil = null;
  await low.save(data);
  return true;
}

async function listProducts() {
  if (mode === 'sqlite') {
    return sqliteDb.prepare('SELECT * FROM products').all();
  }
  const data = await low.load();
  return data.products.slice();
}

async function getProductById(id) {
  if (mode === 'sqlite')
    return sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(id);
  const data = await low.load();
  return data.products.find((p) => p.id === id) || null;
}

async function insertProduct(product) {
  if (mode === 'sqlite') {
    return sqliteDb
      .prepare(
        'INSERT INTO products (id, name, price, description, currency, license, type, interval, stripeId, category, qrisId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        product.id,
        product.name,
        product.price,
        product.description,
        product.currency || 'usd',
        product.license ? 1 : 0,
        product.type || 'one-time',
        product.interval || null,
        product.stripeId || null,
        product.category || 'general',
        product.qrisId || null,
        product.createdAt,
        product.updatedAt || null
      );
  }
  const data = await low.load();
  data.products.push(product);
  await low.save(data);
}

async function updateProductById(id, attrs) {
  if (mode === 'sqlite') {
    const existing = sqliteDb
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(id);
    if (!existing) return null;
    const name = attrs.name || existing.name;
    const price = attrs.price != null ? Number(attrs.price) : existing.price;
    const description =
      attrs.description != null ? attrs.description : existing.description;
    const currency = attrs.currency || existing.currency || 'usd';
    const license =
      attrs.license != null
        ? attrs.license
          ? 1
          : 0
        : existing.license
        ? 1
        : 0;
    const type = attrs.type || existing.type || 'one-time';
    const interval =
      attrs.interval != null ? attrs.interval : existing.interval;
    const stripeId =
      attrs.stripeId != null ? attrs.stripeId : existing.stripeId;
    const category = attrs.category || existing.category || 'general';
    const qrisId =
      attrs.qrisId != null ? attrs.qrisId : existing.qrisId || null;
    const updatedAt = new Date().toISOString();
    sqliteDb
      .prepare(
        'UPDATE products SET name = ?, price = ?, description = ?, currency = ?, license = ?, type = ?, interval = ?, stripeId = ?, category = ?, qrisId = ?, updatedAt = ? WHERE id = ?'
      )
      .run(
        name,
        price,
        description,
        currency,
        license,
        type,
        interval,
        stripeId,
        category,
        qrisId,
        updatedAt,
        id
      );
    return sqliteDb.prepare('SELECT * FROM products WHERE id = ?').get(id);
  }
  const data = await low.load();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  data.products[idx] = {
    ...data.products[idx],
    ...attrs,
    price: attrs.price != null ? Number(attrs.price) : data.products[idx].price,
    updatedAt: new Date().toISOString(),
  };
  await low.save(data);
  return data.products[idx];
}

async function deleteProductById(id) {
  if (mode === 'sqlite') {
    const info = sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(id);
    return info.changes > 0;
  }
  const data = await low.load();
  const before = data.products.length;
  data.products = data.products.filter((p) => p.id !== id);
  await low.save(data);
  return data.products.length < before;
}

async function deleteAllProducts() {
  if (mode === 'sqlite') {
    return sqliteDb.prepare('DELETE FROM products').run();
  }
  const data = await low.load();
  data.products = [];
  await low.save(data);
}

module.exports = {
  mode,
  getUser,
  insertUser,
  deleteAllUsers,
  // orders
  insertOrder: async (order) => {
    if (mode === 'sqlite')
      return sqliteDb
        .prepare(
          'INSERT INTO orders (id, productId, username, amount, currency, stripeSessionId, paymentMethod, paymentId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          order.id,
          order.productId,
          order.username,
          order.amount,
          order.currency,
          order.stripeSessionId,
          order.paymentMethod || null,
          order.paymentId || null,
          order.status,
          order.createdAt
        );
    const data = await low.load();
    data.orders = data.orders || [];
    data.orders.push(order);
    await low.save(data);
  },
  getOrderById: async (id) => {
    if (mode === 'sqlite')
      return sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const data = await low.load();
    return (data.orders || []).find((o) => o.id === id) || null;
  },
  listOrders: async () => {
    if (mode === 'sqlite')
      return sqliteDb.prepare('SELECT * FROM orders').all();
    const data = await low.load();
    return data.orders || [];
  },
  listProducts,
  getProductById,
  insertProduct,
  updateProductById,
  deleteProductById,
  deleteAllProducts,
  // licenses
  insertLicense: async (lic) => {
    if (mode === 'sqlite')
      return sqliteDb
        .prepare(
          'INSERT INTO licenses (key, orderId, productId, username, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          lic.key,
          lic.orderId,
          lic.productId,
          lic.username,
          lic.expiresAt,
          lic.createdAt
        );
    const data = await low.load();
    data.licenses = data.licenses || [];
    data.licenses.push(lic);
    await low.save(data);
  },
  listLicensesForUser: async (username) => {
    if (mode === 'sqlite')
      return sqliteDb
        .prepare('SELECT * FROM licenses WHERE username = ?')
        .all(username);
    const data = await low.load();
    return (data.licenses || []).filter((l) => l.username === username);
  },
  listLicenses: async () => {
    if (mode === 'sqlite')
      return sqliteDb.prepare('SELECT * FROM licenses').all();
    const data = await low.load();
    return data.licenses || [];
  },
  getLicenseByKey: async (key) => {
    if (mode === 'sqlite')
      return sqliteDb.prepare('SELECT * FROM licenses WHERE key = ?').get(key);
    const data = await low.load();
    return (data.licenses || []).find((l) => l.key === key) || null;
  },
  // low-level load/save for fallback (kept for backward compatibility)
  load: async () => {
    if (mode === 'sqlite') return { users: [], products: [] };
    return low.load();
  },
  save: async (data) => {
    if (mode === 'sqlite') return;
    return low.save(data);
  },
  // audit log helpers
  insertAudit: async (entry) => {
    if (mode === 'sqlite')
      return sqliteDb
        .prepare(
          'INSERT INTO audit (id, actor, action, target, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          entry.id,
          entry.actor,
          entry.action,
          entry.target,
          entry.details,
          entry.createdAt
        );
    const data = await low.load();
    data.audit = data.audit || [];
    data.audit.push(entry);
    await low.save(data);
  },
  listAudits: async () => {
    if (mode === 'sqlite')
      return sqliteDb
        .prepare('SELECT * FROM audit ORDER BY createdAt DESC')
        .all();
    const data = await low.load();
    return data.audit || [];
  },
  updateOrderStatus: async (id, status) => {
    if (mode === 'sqlite') {
      sqliteDb
        .prepare('UPDATE orders SET status = ? WHERE id = ?')
        .run(status, id);
      return sqliteDb.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    }
    const data = await low.load();
    const idx = (data.orders || []).findIndex((o) => o.id === id);
    if (idx === -1) return null;
    data.orders[idx].status = status;
    await low.save(data);
    return data.orders[idx];
  },
  // account lockout helpers (exported)
  incrementFailedLogin: async (username, limit, lockMs) => {
    return incrementFailedLogin(username, limit, lockMs);
  },
  resetFailedLogin: async (username) => {
    return resetFailedLogin(username);
  },
};
