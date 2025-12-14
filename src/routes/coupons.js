const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const { createCoupon, listCoupons } = require('../data/coupons');

// admin-only create coupon
router.post('/', authRequired, async (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME;
  if (!adminUser || req.user.username !== adminUser)
    return res.status(403).json({ error: 'forbidden' });
  const { code, percentOff, amountOff, stripeId } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  const c = await createCoupon({ code, percentOff, amountOff, stripeId });
  return res.status(201).json(c);
});

router.get('/', authRequired, async (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME;
  if (!adminUser || req.user.username !== adminUser)
    return res.status(403).json({ error: 'forbidden' });
  const list = await listCoupons();
  return res.json(list);
});

module.exports = router;
