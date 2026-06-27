'use strict';

const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, isAdmin: !!user.is_admin };
}

function userFromToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub) || null;
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  const user = userFromToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
  req.user = user;
  next();
}

function optionalAuth(req, res, next) {
  req.user = userFromToken(req);
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

module.exports = { signToken, publicUser, requireAuth, optionalAuth, requireAdmin, JWT_SECRET };
