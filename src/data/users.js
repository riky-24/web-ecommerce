const bcrypt = require('bcryptjs');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

async function createUser({ username, password }) {
  const existing = await db.getUser(username);
  if (existing) throw new Error('User exists');
  const hashed = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();
  await db.insertUser(username, hashed, createdAt);
  return { username, createdAt };
}

async function verifyUser({ username, password }) {
  const user = await db.getUser(username);
  if (!user) return false;
  // debug logs can be enabled via DEBUG_AUTH=true in test env
  if (process.env.DEBUG_AUTH === 'true') {
    // eslint-disable-next-line no-console
    console.log('verifyUser fetched user:', {
      username: user.username,
      failedAttempts: user.failedAttempts,
      lockUntil: user.lockUntil,
    });
  }
  const now = Date.now();
  if (user.lockUntil && new Date(user.lockUntil).getTime() > now) {
    return { locked: true, until: user.lockUntil };
  }
  const ok = await bcrypt.compare(password, user.password);
  if (ok) {
    await db.resetFailedLogin(username);
    return { username: user.username };
  }
  const res = await db.incrementFailedLogin(username);
  // log failed attempt count in test env for diagnostics
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line no-console
    console.log('incrementFailedLogin result for', username, res);
  }
  if (res && res.lockUntil) {
    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line no-console
      console.log('User locked by system:', {
        username,
        attempts: res.attempts,
        lockUntil: res.lockUntil,
      });
    }
    await db.insertAudit({
      id: uuidv4(),
      actor: 'system',
      action: 'lock',
      target: username,
      details: JSON.stringify({ attempts: res.attempts }),
      createdAt: new Date().toISOString(),
    });
  }
  return false;
}

function clearUsers() {
  return db.deleteAllUsers();
}

module.exports = { createUser, verifyUser, clearUsers };
