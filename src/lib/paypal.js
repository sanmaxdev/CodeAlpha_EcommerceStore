'use strict';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const MODE = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
const CURRENCY = process.env.PAYPAL_CURRENCY || 'USD';
const BASE = MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

async function accessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) throw new Error('PayPal auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function createOrder(amount) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: CURRENCY, value: amount.toFixed(2) } }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('PayPal create failed: ' + JSON.stringify(data));
  return data;
}

async function captureOrder(orderId) {
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('PayPal capture failed: ' + JSON.stringify(data));
  return data;
}

module.exports = { isConfigured, accessToken, createOrder, captureOrder, CLIENT_ID, CURRENCY, MODE };
