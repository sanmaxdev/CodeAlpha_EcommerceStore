'use strict';

const express = require('express');
const db = require('../db');
const paypal = require('../lib/paypal');
const stripe = require('../lib/stripe');
const { optionalAuth } = require('../auth');
const { validateShipping, computeTotals, createOrder, toApi } = require('../orders-service');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    paypal: {
      enabled: paypal.isConfigured(),
      clientId: paypal.CLIENT_ID,
      currency: paypal.CURRENCY,
      mode: paypal.MODE,
    },
    stripe: { enabled: stripe.isConfigured() },
  });
});

// ---- PayPal -------------------------------------------------------------
router.post('/paypal/create-order', optionalAuth, async (req, res) => {
  if (!paypal.isConfigured()) {
    return res.status(503).json({ error: 'PayPal is not configured.' });
  }
  try {
    validateShipping(req.body.shipping);
    const { totalCents } = computeTotals(req.body.items);
    const order = await paypal.createOrder(totalCents / 100);
    res.json({ id: order.id });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    console.error(err);
    res.status(502).json({ error: 'Could not start the PayPal payment.' });
  }
});

router.post('/paypal/capture-order', optionalAuth, async (req, res) => {
  if (!paypal.isConfigured()) {
    return res.status(503).json({ error: 'PayPal is not configured.' });
  }
  const paypalOrderId = String(req.body.paypalOrderId || '');
  if (!paypalOrderId) {
    return res.status(400).json({ error: 'Missing PayPal order id.' });
  }
  try {
    validateShipping(req.body.shipping);
    const capture = await paypal.captureOrder(paypalOrderId);
    if (capture.status !== 'COMPLETED') {
      return res.status(402).json({ error: 'Payment was not completed.' });
    }
    const captureId =
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalOrderId;
    const order = createOrder({
      userId: req.user ? req.user.id : null,
      items: req.body.items,
      shipping: req.body.shipping,
      paymentMethod: 'paypal',
      paymentId: captureId,
      force: true,
    });
    res.status(201).json({ order });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    console.error(err);
    res.status(502).json({ error: 'Payment capture failed.' });
  }
});

// ---- Stripe -------------------------------------------------------------
function sanitizeOrigin(o) {
  o = String(o || '');
  return /^https?:\/\/[^\s/]+$/.test(o) ? o : '';
}
function packCart(items) {
  return (Array.isArray(items) ? items : [])
    .map((i) => `${Number(i.productId)}:${Math.max(1, Math.floor(Number(i.quantity) || 0))}`)
    .join(',');
}
function unpackCart(str) {
  return String(str || '')
    .split(',')
    .filter(Boolean)
    .map((p) => {
      const [id, q] = p.split(':');
      return { productId: Number(id), quantity: Number(q) };
    });
}
function orderByPaymentId(pid) {
  const o = db.prepare('SELECT * FROM orders WHERE payment_id = ?').get(pid);
  if (!o) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  return toApi(o, items);
}
function finalizeStripeSession(session) {
  const pid =
    (typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && session.payment_intent.id) || session.id;
  const existing = orderByPaymentId(pid);
  if (existing) return existing;

  const m = session.metadata || {};
  return createOrder({
    userId: m.user_id ? Number(m.user_id) : null,
    items: unpackCart(m.cart),
    shipping: {
      name: m.ship_name,
      email: m.ship_email,
      address: m.ship_address,
      city: m.ship_city,
      zip: m.ship_zip,
    },
    paymentMethod: 'stripe',
    paymentId: pid,
    force: true,
  });
}

router.post('/stripe/create-session', optionalAuth, async (req, res) => {
  if (!stripe.isConfigured()) {
    return res.status(503).json({ error: 'Card payment is not configured.' });
  }
  try {
    const shipping = req.body.shipping || {};
    validateShipping(shipping);
    const { lineItems, shippingCents } = computeTotals(req.body.items);

    const line_items = lineItems.map(({ product, qty }) => ({
      quantity: qty,
      price_data: {
        currency: stripe.CURRENCY,
        product_data: { name: product.name },
        unit_amount: product.price_cents,
      },
    }));
    if (shippingCents > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: stripe.CURRENCY,
          product_data: { name: 'Shipping' },
          unit_amount: shippingCents,
        },
      });
    }

    const origin = sanitizeOrigin(req.body.origin) || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.client.checkout.sessions.create({
      mode: 'payment',
      line_items,
      customer_email: shipping.email,
      success_url: `${origin}/checkout.html?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html?stripe=cancel`,
      metadata: {
        cart: packCart(req.body.items),
        ship_name: shipping.name,
        ship_email: shipping.email,
        ship_address: shipping.address,
        ship_city: shipping.city,
        ship_zip: shipping.zip,
        ...(req.user ? { user_id: String(req.user.id) } : {}),
      },
    });
    res.json({ url: session.url, id: session.id });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    console.error(err);
    res.status(502).json({ error: 'Could not start the card payment.' });
  }
});

router.post('/stripe/confirm', optionalAuth, async (req, res) => {
  if (!stripe.isConfigured()) {
    return res.status(503).json({ error: 'Card payment is not configured.' });
  }
  const sessionId = String(req.body.sessionId || '');
  if (!sessionId) return res.status(400).json({ error: 'Missing session id.' });
  try {
    const session = await stripe.client.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment was not completed.' });
    }
    const order = finalizeStripeSession(session);
    res.status(201).json({ order });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    console.error(err);
    res.status(502).json({ error: 'Could not confirm the payment.' });
  }
});

function stripeWebhook(req, res) {
  if (!stripe.isConfigured()) return res.status(503).end();
  let event;
  try {
    if (stripe.WEBHOOK_SECRET) {
      event = stripe.client.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        stripe.WEBHOOK_SECRET
      );
    } else {
      event = JSON.parse(req.body.toString('utf8'));
    }
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid') finalizeStripeSession(session);
    }
  } catch (e) {
    console.error('Stripe webhook handling error:', e);
  }
  res.json({ received: true });
}

module.exports = { router, stripeWebhook };
