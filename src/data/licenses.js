const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function generateKey() {
  return uuidv4();
}

async function createLicense({
  orderId,
  productId,
  username,
  expiresAt = null,
}) {
  const key = generateKey();
  const createdAt = new Date().toISOString();
  const lic = { key, orderId, productId, username, expiresAt, createdAt };
  await db.insertLicense(lic);
  return lic;
}

async function getLicensesForUser(username) {
  return db.listLicensesForUser(username);
}

module.exports = { generateKey, createLicense, getLicensesForUser };
