'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../auth');

const router = express.Router();

function orderToApi(order, items) {
  return {
    id: order.id,
    total: order.total_cents / 100,
    status: order.status,
    createdAt: order.created_at,
    shipping: {
      name: order.shipping_name,
      email: order.shipping_email,
      address: order.shipping_address,
      city: order.shipping_city,
      zip: order.shipping_zip,
    },
    items: items.map((i) => ({
      productId: i.product_id,
      name: i.name,
      price: i.price_cents / 100,
      quantity: i.quantity,
    })),
  };
}

router.post('/', optionalAuth, (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const shipping = req.body.shipping || {};

  if (items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  for (const field of ['name', 'email', 'address', 'city', 'zip']) {
    if (!String(shipping[field] || '').trim()) {
      return res.status(400).json({ error: `Shipping ${field} is required.` });
    }
  }

  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  const lineItems = [];
  let totalCents = 0;

  for (const item of items) {
    const product = getProduct.get(Number(item.productId));
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 0));

    if (!product) {
      return res.status(400).json({ error: `A product in your cart no longer exists.` });
    }
    if (product.stock < qty) {
      return res
        .status(409)
        .json({ error: `Only ${product.stock} of "${product.name}" left in stock.` });
    }

    totalCents += product.price_cents * qty;
    lineItems.push({ product, qty });
  }

  const userId = req.user ? req.user.id : null;
  const createOrder = db.transaction(() => {
    const orderInfo = db
      .prepare(
        `INSERT INTO orders (user_id, total_cents, status, shipping_name, shipping_email, shipping_address, shipping_city, shipping_zip)
         VALUES (?, ?, 'paid', ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        totalCents,
        String(shipping.name).trim(),
        String(shipping.email).trim(),
        String(shipping.address).trim(),
        String(shipping.city).trim(),
        String(shipping.zip).trim()
      );

    const orderId = orderInfo.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, name, price_cents, quantity)
       VALUES (?, ?, ?, ?, ?)`
    );
    const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    for (const { product, qty } of lineItems) {
      insertItem.run(orderId, product.id, product.name, product.price_cents, qty);
      decStock.run(qty, product.id);
    }
    return orderId;
  });

  const orderId = createOrder();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  res.status(201).json({ order: orderToApi(order, orderItems) });
});

router.get('/', requireAuth, (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id);

  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const result = orders.map((o) => orderToApi(o, getItems.all(o.id)));
  res.json({ orders: result });
});

router.get('/:id', requireAuth, (req, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(Number(req.params.id), req.user.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ order: orderToApi(order, items) });
});

module.exports = router;
