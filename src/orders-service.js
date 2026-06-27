'use strict';

const db = require('./db');

function toApi(order, items) {
  return {
    id: order.id,
    total: order.total_cents / 100,
    status: order.status,
    paymentMethod: order.payment_method,
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

function validateShipping(shipping) {
  for (const field of ['name', 'email', 'address', 'city', 'zip']) {
    if (!String((shipping || {})[field] || '').trim()) {
      throw { status: 400, error: `Shipping ${field} is required.` };
    }
  }
}

function priceCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw { status: 400, error: 'Your cart is empty.' };
  }
  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  const lineItems = [];
  let totalCents = 0;

  for (const item of items) {
    const product = getProduct.get(Number(item.productId));
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 0));
    if (!product) {
      throw { status: 400, error: 'A product in your cart no longer exists.' };
    }
    if (product.stock < qty) {
      throw { status: 409, error: `Only ${product.stock} of "${product.name}" left in stock.` };
    }
    totalCents += product.price_cents * qty;
    lineItems.push({ product, qty });
  }
  return { lineItems, totalCents };
}

function createOrder({ userId = null, items, shipping, paymentMethod = 'manual', paymentId = null }) {
  validateShipping(shipping);
  const { lineItems, totalCents } = priceCart(items);

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO orders (user_id, total_cents, status, payment_method, payment_id, shipping_name, shipping_email, shipping_address, shipping_city, shipping_zip)
         VALUES (?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        totalCents,
        paymentMethod,
        paymentId,
        String(shipping.name).trim(),
        String(shipping.email).trim(),
        String(shipping.address).trim(),
        String(shipping.city).trim(),
        String(shipping.zip).trim()
      );

    const orderId = info.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, name, price_cents, quantity) VALUES (?, ?, ?, ?, ?)`
    );
    const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const { product, qty } of lineItems) {
      insertItem.run(orderId, product.id, product.name, product.price_cents, qty);
      decStock.run(qty, product.id);
    }
    return orderId;
  });

  const orderId = tx();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  return toApi(order, orderItems);
}

module.exports = { toApi, validateShipping, priceCart, createOrder };
