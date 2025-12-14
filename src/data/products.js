const { v4: uuidv4 } = require('uuid');
const db = require('../db');

async function listProducts() {
  return db.listProducts();
}

async function getProduct(id) {
  return db.getProductById(id);
}

async function createProduct({
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
}) {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const p = {
    id,
    name,
    price: Number(price),
    description: description || '',
    currency: currency || 'usd',
    license: !!license,
    type: type || 'one-time',
    interval: interval || null,
    stripeId: stripeId || null,
    category: category || 'general',
    qrisId: qrisId || null,
    createdAt,
  };
  await db.insertProduct(p);
  return p;
}

async function updateProduct(id, attrs) {
  return db.updateProductById(id, attrs);
}

async function deleteProduct(id) {
  return db.deleteProductById(id);
}

function clearProducts() {
  return db.deleteAllProducts();
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  clearProducts,
};
