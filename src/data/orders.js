const { v4: uuidv4 } = require('uuid');
const db = require('../db');

async function createOrder({
  productId,
  username,
  amount,
  currency,
  stripeSessionId,
  status = 'pending',
}) {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const order = {
    id,
    productId,
    username,
    amount,
    currency,
    stripeSessionId,
    status,
    createdAt,
  };
  await db.insertOrder(order);
  return order;
}

async function getOrder(id) {
  return db.getOrderById(id);
}

module.exports = { createOrder, getOrder };
