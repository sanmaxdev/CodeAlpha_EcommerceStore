'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../auth');
const { createOrder, toApi } = require('../orders-service');

const router = express.Router();

router.post('/', optionalAuth, (req, res) => {
  try {
    const order = createOrder({
      userId: req.user ? req.user.id : null,
      items: req.body.items,
      shipping: req.body.shipping,
      paymentMethod: 'manual',
    });
    res.status(201).json({ order });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    throw err;
  }
});

router.get('/', requireAuth, (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id);
  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  res.json({ orders: orders.map((o) => toApi(o, getItems.all(o.id))) });
});

router.get('/:id', requireAuth, (req, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(Number(req.params.id), req.user.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ order: toApi(order, items) });
});

module.exports = router;
