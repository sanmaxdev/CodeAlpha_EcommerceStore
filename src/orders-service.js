'use strict';

const db = require('./db');

const FREE_SHIP_THRESHOLD_CENTS = 15000;
const SHIP_FLAT_CENTS = 895;

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

function priceCart(items, { allowOversell = false } = {}) {
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
    if (!allowOversell && product.stock < qty) {
      throw { status: 409, error: `Only ${product.stock} of "${product.name}" left in stock.` };
    }
    totalCents += product.price_cents * qty;
    lineItems.push({ product, qty });
  }
  return { lineItems, totalCents };
}

function computeTotals(items, { allowOversell = false } = {}) {
  const { lineItems, totalCents: subtotalCents } = priceCart(items, { allowOversell });
  const shippingCents = subtotalCents >= FREE_SHIP_THRESHOLD_CENTS ? 0 : SHIP_FLAT_CENTS;
  return { lineItems, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}

// `force` is used after a payment has already succeeded (PayPal/Stripe): the
// order must never be lost to a stock race, so stock checks are skipped and
// the decrement is clamped at zero.
function createOrder({
  userId = null,
  items,
  shipping,
  paymentMethod = 'manual',
  paymentId = null,
  force = false,
}) {
  validateShipping(shipping);
  const { lineItems, totalCents } = computeTotals(items, { allowOversell: force });

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
    const decStock = db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?');
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

module.exports = { toApi, validateShipping, priceCart, computeTotals, createOrder };
