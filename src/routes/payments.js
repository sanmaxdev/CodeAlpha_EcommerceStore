'use strict';

const express = require('express');
const paypal = require('../lib/paypal');
const { optionalAuth } = require('../auth');
const { priceCart, validateShipping, createOrder } = require('../orders-service');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    paypal: {
      enabled: paypal.isConfigured(),
      clientId: paypal.CLIENT_ID,
      currency: paypal.CURRENCY,
      mode: paypal.MODE,
    },
  });
});

router.post('/paypal/create-order', optionalAuth, async (req, res) => {
  if (!paypal.isConfigured()) {
    return res.status(503).json({ error: 'PayPal is not configured.' });
  }
  try {
    validateShipping(req.body.shipping);
    const { totalCents } = priceCart(req.body.items);
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
    priceCart(req.body.items);

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
    });
    res.status(201).json({ order });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    console.error(err);
    res.status(502).json({ error: 'Payment capture failed.' });
  }
});

module.exports = router;
