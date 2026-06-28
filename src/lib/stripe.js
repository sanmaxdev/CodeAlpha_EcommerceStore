'use strict';

const Stripe = require('stripe');

const SECRET = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const CURRENCY = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

const client = SECRET ? new Stripe(SECRET) : null;

function isConfigured() {
  return !!client;
}

module.exports = { client, isConfigured, WEBHOOK_SECRET, CURRENCY };
