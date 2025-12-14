const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const crypto = require('crypto');

const API_BASE = process.env.MIDTRANS_API_BASE || 'https://api.midtrans.com/v2';
const CREATE_URL = process.env.MIDTRANS_CREATE_QR_URL || `${API_BASE}/charge`;
const APP_BASE = process.env.APP_BASE_URL || null;
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

if (!SERVER_KEY) {
  console.warn('Midtrans provider loaded but MIDTRANS_SERVER_KEY is not set.');
}

async function createPayment({ product, amount, currency }) {
  if (!SERVER_KEY) throw new Error('MIDTRANS_SERVER_KEY not configured');
  const id = uuidv4();

  const callbackUrl = process.env.QRIS_CALLBACK_URL || (APP_BASE ? `${APP_BASE.replace(/\/$/, '')}/checkout/qris-callback` : null);
  const payload = {
    payment_type: 'qris',
    transaction_details: { order_id: id, gross_amount: Math.round(Number(amount)) },
    callback_url: callbackUrl,
    item_details: [{ id: product.id, price: Math.round(Number(amount)), name: product.name, quantity: 1 }],
  };

  const auth = { username: SERVER_KEY, password: '' };
  const resp = await axios.post(CREATE_URL, payload, { auth });
  const data = resp.data || {};

  const paymentUrl = data.actions?.find(a => a.name === 'qris')?.url || data.redirect_url || null;
  const qr = data.qr_image || (paymentUrl ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paymentUrl)}` : null);
  const expiresAt = data.expires_at || null;

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
  // Midtrans status endpoint template can be configured via MIDTRANS_GET_STATUS_URL
  if (process.env.MIDTRANS_GET_STATUS_URL) {
    try {
      const url = process.env.MIDTRANS_GET_STATUS_URL.replace('{id}', paymentId);
      const resp = await axios.get(url, { auth: { username: SERVER_KEY, password: '' } });
      const status = resp.data?.transaction_status;
      if (status === 'settlement' || status === 'capture' || status === 'paid') {
        return await db.updateOrderStatus(paymentId, 'paid');
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  const updated = await db.updateOrderStatus(paymentId, 'paid');
  return updated;
}

async function handleCallback(req) {
  const body = req.body || {};
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (serverKey) {
    // Midtrans may send signature_key either in body or via header 'x-midtrans-signature'
    const headerSig = req.headers['x-midtrans-signature'];
    const orderId = body.order_id || body.transaction_id || body.order_id;
    const statusCode = String(body.status_code || body.transaction_status || '');
    const gross = String(body.gross_amount || body.gross_amount || body.amount || '');
    const payload = `${orderId}${statusCode}${gross}${serverKey}`;
    const hashed = crypto.createHash('sha512').update(payload).digest('hex');
    if (headerSig) {
      if (headerSig !== hashed) throw new Error('invalid signature');
    } else if (body.signature_key) {
      if (body.signature_key !== hashed) throw new Error('invalid signature');
    }
  }

  const paymentId = body.order_id || body.transaction_id || body.external_id;
  if (!paymentId) return null;
  const updated = await db.updateOrderStatus(paymentId, 'paid');
  return updated;
}

module.exports = { createPayment, confirmPayment, handleCallback };
