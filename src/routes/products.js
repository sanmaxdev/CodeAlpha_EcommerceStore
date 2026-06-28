'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../auth');

const router = express.Router();

function hasPurchased(userId, productId) {
  return !!db
    .prepare(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status != 'cancelled'
       LIMIT 1`
    )
    .get(userId, productId);
}

function reviewsForProduct(productId) {
  return db
    .prepare(
      `SELECT r.id, r.rating, r.body, r.created_at, u.name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? ORDER BY r.id DESC`
    )
    .all(productId)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      author: displayName(r.name),
      createdAt: r.created_at,
      verified: true,
    }));
}

function reviewSummary(productId) {
  const agg = db
    .prepare('SELECT COUNT(*) AS count, AVG(rating) AS avg FROM reviews WHERE product_id = ?')
    .get(productId);
  return {
    count: agg.count,
    average: agg.count ? Math.round(agg.avg * 10) / 10 : 0,
  };
}

function recomputeProductRating(productId) {
  const { count, average } = reviewSummary(productId);
  if (count > 0) {
    db.prepare('UPDATE products SET rating = ? WHERE id = ?').run(average, productId);
  }
}

function displayName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0] || 'Customer';
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

function toApi(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price_cents / 100,
    priceCents: p.price_cents,
    category: p.category,
    image: p.image,
    stock: p.stock,
    rating: p.rating,
    featured: !!p.featured,
  };
}

router.get('/', (req, res) => {
  const { category, search, sort, featured } = req.query;

  const where = [];
  const params = {};

  if (category && category !== 'All') {
    where.push('category = @category');
    params.category = category;
  }
  if (search) {
    where.push('(name LIKE @q OR description LIKE @q OR category LIKE @q)');
    params.q = `%${search}%`;
  }
  if (featured === 'true') {
    where.push('featured = 1');
  }

  let sql = 'SELECT * FROM products';
  if (where.length) sql += ' WHERE ' + where.join(' AND ');

  switch (sort) {
    case 'price-asc':
      sql += ' ORDER BY price_cents ASC';
      break;
    case 'price-desc':
      sql += ' ORDER BY price_cents DESC';
      break;
    case 'rating':
      sql += ' ORDER BY rating DESC';
      break;
    case 'name':
      sql += ' ORDER BY name ASC';
      break;
    default:
      sql += ' ORDER BY featured DESC, id ASC';
  }

  const rows = db.prepare(sql).all(params);
  res.json({ products: rows.map(toApi) });
});

router.get('/categories', (req, res) => {
  const rows = db
    .prepare('SELECT category, COUNT(*) AS count FROM products GROUP BY category ORDER BY category')
    .all();
  res.json({ categories: rows });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = Number.isInteger(id)
    ? db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    : null;

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const related = db
    .prepare('SELECT * FROM products WHERE category = ? AND id != ? ORDER BY rating DESC LIMIT 4')
    .all(product.category, product.id);

  res.json({ product: toApi(product), related: related.map(toApi) });
});

router.get('/:id/reviews', optionalAuth, (req, res) => {
  const id = Number(req.params.id);
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const reviews = reviewsForProduct(id);
  const summary = reviewSummary(id);

  let eligibility = { loggedIn: false, purchased: false, hasReviewed: false, canReview: false };
  if (req.user) {
    const purchased = hasPurchased(req.user.id, id);
    const hasReviewed = !!db
      .prepare('SELECT 1 FROM reviews WHERE product_id = ? AND user_id = ? LIMIT 1')
      .get(id, req.user.id);
    eligibility = {
      loggedIn: true,
      purchased,
      hasReviewed,
      canReview: purchased && !hasReviewed,
    };
  }

  res.json({ reviews, summary, eligibility });
});

router.post('/:id/reviews', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const rating = Math.floor(Number(req.body.rating));
  const body = String(req.body.body || '').trim();

  if (!(rating >= 1 && rating <= 5)) {
    return res.status(400).json({ error: 'Please choose a rating from 1 to 5 stars.' });
  }
  if (body.length < 3) {
    return res.status(400).json({ error: 'Please write a short review.' });
  }
  if (body.length > 1000) {
    return res.status(400).json({ error: 'Reviews are limited to 1000 characters.' });
  }
  if (!hasPurchased(req.user.id, id)) {
    return res.status(403).json({ error: 'Only verified buyers can review this product.' });
  }
  const exists = db
    .prepare('SELECT 1 FROM reviews WHERE product_id = ? AND user_id = ? LIMIT 1')
    .get(id, req.user.id);
  if (exists) {
    return res.status(409).json({ error: 'You have already reviewed this product.' });
  }

  db.prepare('INSERT INTO reviews (product_id, user_id, rating, body) VALUES (?, ?, ?, ?)').run(
    id,
    req.user.id,
    rating,
    body
  );
  recomputeProductRating(id);

  res.status(201).json({ reviews: reviewsForProduct(id), summary: reviewSummary(id) });
});

module.exports = router;
