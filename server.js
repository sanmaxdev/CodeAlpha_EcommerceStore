'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');

const seed = require('./src/seed');
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const adminRoutes = require('./src/routes/admin');
const { router: paymentRoutes, stripeWebhook } = require('./src/routes/payments');

seed();

const app = express();
const PORT = process.env.PORT || 4000;

// Stripe webhook needs the raw body for signature verification, so it is
// registered before the JSON body parser.
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
  console.log(`\n  Loomwell store running at http://localhost:${PORT}\n`);
});
