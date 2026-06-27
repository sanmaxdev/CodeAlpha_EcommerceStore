'use strict';

const express = require('express');
const db = require('../db');

const router = express.Router();

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

module.exports = router;
