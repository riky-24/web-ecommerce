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
  const data = await db.load();
  data.coupons = data.coupons || [];
  data.coupons.push(c);
  await db.save(data);
  return c;
}

async function getCouponByCode(code) {
  const data = await db.load();
  return (data.coupons || []).find((c) => c.code === code) || null;
}

async function listCoupons() {
  const data = await db.load();
  return (data.coupons || []).slice();
}

module.exports = { createCoupon, getCouponByCode, listCoupons };
