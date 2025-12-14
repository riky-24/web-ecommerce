const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_xxx', {
  apiVersion: '2024-08-19',
});
const { createOrder } = require('../data/orders');
const { createLicense } = require('../data/licenses');
const { getProduct } = require('../data/products');
const { sendLicenseEmail } = require('../utils/email');

// Raw body is needed to verify stripe signature; in app.js we'll mount this route before json body parsing or use raw body
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // in tests or if secret not configured, accept parsed JSON payload (handle raw Buffer)
        if (Buffer.isBuffer(req.body)) {
          try {
            event = JSON.parse(req.body.toString('utf8'));
          } catch (e) {
            return res.status(400).send(`Invalid JSON payload: ${e.message}`);
          }
        } else {
          event = req.body;
        }
      }
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object;
      // example: store order and generate license if product requires
      const metadata = session.metadata || {};
      const productId =
        metadata.productId ||
        (session.display_items &&
          session.display_items[0] &&
          session.display_items[0].custom &&
          session.display_items[0].custom.name);
      const username = metadata.username || session.customer_email || 'unknown';
      const amount = session.amount_total
        ? session.amount_total / 100
        : (session.amount_subtotal || 0) / 100;
      const currency = session.currency || 'usd';
      const order = await createOrder({
        productId,
        username,
        amount,
        currency,
        stripeSessionId: session.id,
        status: 'paid',
      });
      let product = null;
      try {
        product = await getProduct(productId);
      } catch (err) {
        console.error('Error looking up product', err && err.message);
      }
      if (product && product.license === true) {
        const license = await createLicense({
          orderId: order.id,
          productId,
          username,
        });
        try {
          await sendLicenseEmail(username, license, product);
        } catch (err) {
          console.error('Failed to send license email', err.message);
        }
      }
    }

    // handle subscription invoice payments so we can grant licenses on recurring billing
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      let productId = null;
      let username = invoice.customer_email || null;
      try {
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription
          );
          productId = subscription.metadata && subscription.metadata.productId;
          if (!username && subscription.customer) {
            const cust = await stripe.customers.retrieve(subscription.customer);
            username = cust.email || username;
          }
        }
      } catch (err) {
        console.error('Failed to retrieve subscription/customer', err.message);
      }
      username = username || 'unknown';
      const amount = invoice.amount_paid ? invoice.amount_paid / 100 : 0;
      const currency = invoice.currency || 'usd';
      const order = await createOrder({
        productId,
        username,
        amount,
        currency,
        stripeSessionId: invoice.id,
        status: 'paid',
      });
      const product = await getProduct(productId);
      if (product && product.license === true) {
        const license = await createLicense({
          orderId: order.id,
          productId,
          username,
        });
        try {
          await sendLicenseEmail(username, license, product);
        } catch (err) {
          console.error('Failed to send license email', err.message);
        }
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
