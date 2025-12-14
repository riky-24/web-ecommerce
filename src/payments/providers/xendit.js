const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

const API_BASE = process.env.XENDIT_API_BASE || 'https://api.xendit.co';
const CREATE_URL = process.env.XENDIT_CREATE_QR_URL || `${API_BASE}/qr_codes`;
const APP_BASE = process.env.APP_BASE_URL || null;
const API_KEY = process.env.XENDIT_API_KEY;

if (!API_KEY) {
  // avoid throwing at import time in dev if provider isn't used; but warn
  console.warn('Xendit provider loaded but XENDIT_API_KEY is not set.');
}

async function createPayment({ product, amount, currency }) {
  if (!API_KEY) throw new Error('XENDIT_API_KEY not configured');
  const id = uuidv4();

  const callbackUrl = process.env.QRIS_CALLBACK_URL || (APP_BASE ? `${APP_BASE.replace(/\/$/, '')}/checkout/qris-callback` : null);
  const payload = {
    external_id: id,
    amount: Math.round(Number(amount)),
    description: product.name,
    callback_url: callbackUrl,
    currency: currency || 'idr',
  };

  const auth = { username: API_KEY, password: '' };
  const resp = await axios.post(CREATE_URL, payload, { auth });

  const data = resp.data || {};

  // Map provider fields to our expected contract. Providers vary; try several keys.
  const paymentUrl = data.qr_url || data.qr_link || data.payment_url || data.url || (data.actions && data.actions.find(a => a.name === 'qr')?.url) || null;
  const qr = data.qr_image || data.qr_string || (paymentUrl ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paymentUrl)}` : null);
  const expiresAt = data.expires_at || null;

  // persist order so status can be polled
  await db.insertOrder({
    id,
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
  // If a status endpoint is configured, attempt to fetch provider status
  if (process.env.XENDIT_GET_STATUS_URL) {
    try {
      const url = process.env.XENDIT_GET_STATUS_URL.replace('{id}', paymentId);
      const resp = await axios.get(url, { auth: { username: API_KEY, password: '' } });
      const status = resp.data?.status;
      if (status === 'PAID' || status === 'paid' || status === 'COMPLETED') {
        return await db.updateOrderStatus(paymentId, 'paid');
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // fallback: update local DB when provider callback arrives
  const updated = await db.updateOrderStatus(paymentId, 'paid');
  return updated;
}

async function handleCallback(req) {
  // Generic callback handler: try to extract a provider payment id and mark paid
  const body = req.body || {};
  const paymentId = body.external_id || body.payment_id || body.qr_id || body.id || body.reference;
  if (!paymentId) return null;
  const updated = await db.updateOrderStatus(paymentId, 'paid');
  return updated;
}

module.exports = { createPayment, confirmPayment, handleCallback };
