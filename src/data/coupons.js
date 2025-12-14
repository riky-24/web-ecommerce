const { v4: uuidv4 } = require('uuid');
const db = require('../db');

async function createCoupon({
  code,
  percentOff = null,
  amountOff = null,
  stripeId = null,
  active = true,
}) {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const c = { id, code, percentOff, amountOff, stripeId, active, createdAt };
  await db.insertCoupon(c);
  return c;
}

async function getCouponByCode(code) {
  return db.getCouponByCode(code);
}

async function listCoupons() {
  return db.listCoupons();
}

module.exports = { createCoupon, getCouponByCode, listCoupons };
