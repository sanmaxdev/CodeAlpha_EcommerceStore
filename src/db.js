'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'store.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    is_admin      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    slug        TEXT    NOT NULL UNIQUE,
    description TEXT    NOT NULL,
    price_cents INTEGER NOT NULL,
    category    TEXT    NOT NULL,
    image       TEXT    NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0,
    rating      REAL    NOT NULL DEFAULT 0,
    featured    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER REFERENCES users(id),
    total_cents      INTEGER NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'paid',
    payment_method   TEXT    NOT NULL DEFAULT 'manual',
    payment_id       TEXT,
    shipping_name    TEXT    NOT NULL,
    shipping_email   TEXT    NOT NULL,
    shipping_address TEXT    NOT NULL,
    shipping_city    TEXT    NOT NULL,
    shipping_zip     TEXT    NOT NULL,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    name        TEXT    NOT NULL,
    price_cents INTEGER NOT NULL,
    quantity    INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_orders_user      ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`);

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('orders', 'payment_method', "TEXT NOT NULL DEFAULT 'manual'");
ensureColumn('orders', 'payment_id', 'TEXT');

module.exports = db;
