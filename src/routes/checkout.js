const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_xxx', {
  apiVersion: '2024-08-19',
});
const { getProduct } = require('../data/products');
const qris = require('../payments/qris');
const db = require('../db');

// Create a Stripe Checkout session for a product
router.post('/create-session', async (req, res) => {
  const {
    productId,
    successUrl,
    cancelUrl,
    quantity = 1,
    coupon,
  } = req.body || {};
  if (!productId || !successUrl || !cancelUrl)
    return res
      .status(400)
      .json({ error: 'productId, successUrl and cancelUrl required' });
  const product = await getProduct(productId);
  if (!product) return res.status(404).json({ error: 'product not found' });
  try {
    const priceData = {
      currency: product.currency || 'usd',
      product_data: { name: product.name },
      unit_amount: Math.round(product.price * 100),
    };
    if (product.type === 'subscription') {
      // include recurring info for subscription price
      priceData.recurring = { interval: product.interval || 'month' };
    }
    const line_items = [{ price_data: priceData, quantity }];
    const params = {
      payment_method_types: ['card'],
      mode: product.type === 'subscription' ? 'subscription' : 'payment',
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { productId },
    };
    if (product.type === 'subscription') {
      // ensure subscription metadata is set so subsequent invoices/subscriptions can be linked
      params.subscription_data = { metadata: { productId } };
    }
    if (coupon) params.discounts = [{ coupon }];
    const session = await stripe.checkout.sessions.create(params);
    return res.json({ sessionId: session.id, url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Create a QRIS payment
router.post('/create-qris', async (req, res) => {
  const { productId } = req.body || {};
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const product = await getProduct(productId);
  if (!product) return res.status(404).json({ error: 'product not found' });
  try {
    const amount = Number(product.price);
    const info = await qris.createPayment({ product, amount, currency: product.currency });
    return res.json({ paymentId: info.id, qr: info.qr, paymentUrl: info.paymentUrl, expiresAt: info.expiresAt });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Poll QRIS status
router.get('/qris-status/:id', async (req, res) => {
  const id = req.params.id;
  const order = await db.getOrderById(id);
  if (!order) return res.status(404).json({ error: 'not found' });
  return res.json({ status: order.status });
});

// Simulate provider callback (for testing / dev only)
router.post('/qris-callback', async (req, res) => {
  const { paymentId } = req.body || {};
  if (!paymentId) return res.status(400).json({ error: 'paymentId required' });
  const updated = await qris.confirmPayment(paymentId);
  if (!updated) return res.status(404).json({ error: 'payment not found' });
  return res.json({ status: updated.status });
});

module.exports = router;
