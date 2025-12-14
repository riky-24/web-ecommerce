// Mock QRIS payment provider (existing lightweight inline SVG placeholder)
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

async function createPayment({ product, amount, currency }) {
  const id = uuidv4();

  // create a QR code data URL representing a payment URL (simple SVG placeholder)
  const paymentUrl = `https://pay.example.com/qris/${id}`; // placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="#111">${paymentUrl}</text></svg>`;
  const qr = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // persist a pending order so we can poll status
  await db.insertOrder({
    id: id,
    productId: product.id,
    username: null,
    amount,
    currency,
    paymentMethod: 'qris',
    paymentId: id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  return { id, qr, paymentUrl, expiresAt };
}

async function confirmPayment(paymentId) {
  const updated = await db.updateOrderStatus(paymentId, 'paid');
  return updated;
}

module.exports = { createPayment, confirmPayment };
