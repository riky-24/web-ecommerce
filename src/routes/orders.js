const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const { getOrder } = require('../data/orders');

router.get('/:id', authRequired, async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not found' });
  // only owner or admin can view
  const adminUser = process.env.ADMIN_USERNAME;
  if (order.username !== req.user.username && req.user.username !== adminUser)
    return res.status(403).json({ error: 'forbidden' });
  return res.json(order);
});

// admin: list all orders
router.get('/', authRequired, async (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME;
  if (!adminUser || req.user.username !== adminUser)
    return res.status(403).json({ error: 'forbidden' });
  const list = await require('../db').listOrders();
  return res.json(list);
});

module.exports = router;
