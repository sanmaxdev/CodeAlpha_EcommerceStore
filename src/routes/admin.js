'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { requireAdmin } = require('../auth');

const router = express.Router();
router.use(requireAdmin);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const base =
      path
        .basename(file.originalname, path.extname(file.originalname))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40) || 'upload';
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

function productToApi(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price_cents / 100,
    category: p.category,
    image: p.image,
    stock: p.stock,
    rating: p.rating,
    featured: !!p.featured,
  };
}

function uniqueSlug(name, excludeId) {
  const base =
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'product';
  let slug = base;
  let n = 2;
  const find = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?');
  while (find.get(slug, excludeId || 0)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function parseProductBody(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();
  const image = String(body.image || '').trim();
  const price = Number(body.price);
  const stock = Math.max(0, Math.floor(Number(body.stock) || 0));
  let rating = Number(body.rating);
  const featured = body.featured ? 1 : 0;

  if (!name) throw { status: 400, error: 'Product name is required.' };
  if (!category) throw { status: 400, error: 'Category is required.' };
  if (!Number.isFinite(price) || price < 0) throw { status: 400, error: 'Enter a valid price.' };
  if (!Number.isFinite(rating)) rating = 0;
  rating = Math.min(5, Math.max(0, rating));

  return {
    name,
    category,
    description,
    image: image || 'https://placehold.co/800x800?text=No+image',
    price_cents: Math.round(price * 100),
    stock,
    rating,
    featured,
  };
}

// ---- Dashboard ----------------------------------------------------------
router.get('/stats', (req, res) => {
  const products = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
  const lowStock = db.prepare('SELECT COUNT(*) AS c FROM products WHERE stock <= 5').get().c;
  const orders = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const customers = db.prepare('SELECT COUNT(*) AS c FROM users WHERE is_admin = 0').get().c;
  const revenueCents =
    db.prepare("SELECT COALESCE(SUM(total_cents),0) AS s FROM orders WHERE status != 'cancelled'").get()
      .s;

  const recent = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 6').all();
  const recentOrders = recent.map((o) => ({
    id: o.id,
    customer: o.shipping_name,
    total: o.total_cents / 100,
    status: o.status,
    createdAt: o.created_at,
  }));

  res.json({
    stats: {
      products,
      lowStock,
      orders,
      customers,
      revenue: revenueCents / 100,
    },
    recentOrders,
  });
});

// ---- Products -----------------------------------------------------------
router.get('/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.json({ products: rows.map(productToApi) });
});

router.post('/products', (req, res) => {
  try {
    const p = parseProductBody(req.body);
    const slug = uniqueSlug(p.name);
    const info = db
      .prepare(
        `INSERT INTO products (name, slug, description, price_cents, category, image, stock, rating, featured)
         VALUES (@name, @slug, @description, @price_cents, @category, @image, @stock, @rating, @featured)`
      )
      .run({ ...p, slug });
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ product: productToApi(row) });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    throw err;
  }
});

router.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });
  try {
    const p = parseProductBody(req.body);
    const slug = uniqueSlug(p.name, id);
    db.prepare(
      `UPDATE products SET name=@name, slug=@slug, description=@description, price_cents=@price_cents,
         category=@category, image=@image, stock=@stock, rating=@rating, featured=@featured WHERE id=@id`
    ).run({ ...p, slug, id });
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ product: productToApi(row) });
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.error });
    throw err;
  }
});

router.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file received.' });
  res.status(201).json({ path: '/uploads/' + req.file.filename });
});

// ---- Orders -------------------------------------------------------------
const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

router.get('/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const result = orders.map((o) => ({
    id: o.id,
    total: o.total_cents / 100,
    status: o.status,
    paymentMethod: o.payment_method,
    createdAt: o.created_at,
    shipping: {
      name: o.shipping_name,
      email: o.shipping_email,
      address: o.shipping_address,
      city: o.shipping_city,
      zip: o.shipping_zip,
    },
    items: getItems.all(o.id).map((i) => ({
      name: i.name,
      price: i.price_cents / 100,
      quantity: i.quantity,
    })),
  }));
  res.json({ orders: result, statuses: ORDER_STATUSES });
});

router.put('/orders/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '').trim();
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  res.json({ ok: true, status });
});

module.exports = router;
