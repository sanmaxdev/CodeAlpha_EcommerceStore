(function () {
  'use strict';

  const SHIP_THRESHOLD = 150;
  const SHIP_COST = 8.95;

  const formWrap = document.getElementById('checkout-form-wrap');
  const summaryEl = document.getElementById('checkout-summary');

  let config = { paypal: { enabled: false }, stripe: { enabled: false } };

  const loggedIn = () => window.api.isLoggedIn();
  const esc = (s) => window.UI.escapeHtml(s);

  function guardCart() {
    if (window.Cart.items().length === 0) {
      formWrap.innerHTML = `
        <div class="state">
          <div class="state-icon">${window.UI.icon('cart', 22)}</div>
          <h3>Nothing to check out</h3>
          <p>Your cart is empty.</p>
          <a class="btn btn-primary" href="/shop.html" style="margin-top:14px">Browse the shop</a>
        </div>`;
      summaryEl.innerHTML = '';
      return false;
    }
    return true;
  }

  function shippingCost(subtotal) {
    return subtotal >= SHIP_THRESHOLD ? 0 : SHIP_COST;
  }
  function getShipping() {
    return {
      name: val('c-name'),
      email: val('c-email'),
      address: val('c-address'),
      city: val('c-city'),
      zip: val('c-zip'),
    };
  }
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function getItems() {
    return window.Cart.items().map((i) => ({ productId: i.id, quantity: i.quantity }));
  }
  function showAlert(msg) {
    const a = document.getElementById('checkout-alert');
    if (!a) return;
    a.textContent = msg;
    a.classList.add('show');
    formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function validateShipping() {
    const s = getShipping();
    if (Object.values(s).some((v) => !v)) {
      showAlert('Please fill in all shipping fields before paying.');
      return false;
    }
    const a = document.getElementById('checkout-alert');
    if (a) a.classList.remove('show');
    return true;
  }

  function renderSummary() {
    const items = window.Cart.items();
    const subtotal = window.Cart.subtotal();
    const ship = shippingCost(subtotal);
    summaryEl.innerHTML = `
      <div class="summary">
        <h3>Order summary</h3>
        ${items
          .map(
            (i) => `<div class="row"><span>${esc(i.name)} × ${i.quantity}</span>
              <span>${window.UI.money(i.price * i.quantity)}</span></div>`
          )
          .join('')}
        <div class="row" style="border-top:1px solid var(--border);margin-top:6px;padding-top:12px">
          <span>Subtotal</span><span>${window.UI.money(subtotal)}</span></div>
        <div class="row"><span>Shipping</span><span>${ship === 0 ? 'Free' : window.UI.money(ship)}</span></div>
        <div class="row total"><span>Total</span><span>${window.UI.money(subtotal + ship)}</span></div>
      </div>`;
  }

  function renderForm() {
    const user = window.api.getUser() || {};
    const guestNote = loggedIn()
      ? `<div class="checkout-note">Checking out as <strong>${esc(user.email || '')}</strong></div>`
      : `<div class="checkout-note">Checking out as a guest.
           <a href="/login.html?redirect=${encodeURIComponent('/checkout.html')}">Log in</a>
           for faster checkout and order history.</div>`;

    formWrap.innerHTML = `
      <div class="panel">
        <h1>Checkout</h1>
        <p class="sub">Enter where we should ship your order.</p>
        ${guestNote}
        <div class="alert error" id="checkout-alert"></div>
        <div class="field"><label for="c-name">Full name</label>
          <input id="c-name" autocomplete="name" value="${esc(user.name || '')}" required /></div>
        <div class="field"><label for="c-email">Email</label>
          <input id="c-email" type="email" autocomplete="email" value="${esc(user.email || '')}" required /></div>
        <div class="field"><label for="c-address">Street address</label>
          <input id="c-address" autocomplete="street-address" placeholder="123 Market Street" required /></div>
        <div class="form-row">
          <div class="field"><label for="c-city">City</label>
            <input id="c-city" autocomplete="address-level2" placeholder="Boston" required /></div>
          <div class="field"><label for="c-zip">ZIP / Postal code</label>
            <input id="c-zip" autocomplete="postal-code" placeholder="02108" required /></div>
        </div>
        <div class="pay-head">Payment</div>
        <div id="payment-area"></div>
      </div>`;

    renderPayment();
  }

  function renderPayment() {
    const area = document.getElementById('payment-area');
    const methods = [];
    if (config.paypal && config.paypal.enabled) methods.push('paypal');
    if (config.stripe && config.stripe.enabled) methods.push('card');

    if (methods.length === 0) {
      renderDirectButton(area);
      return;
    }

    const labels = { paypal: 'PayPal', card: 'Credit / debit card' };
    let html = '';
    if (methods.length > 1) {
      html +=
        '<div class="pay-methods">' +
        methods
          .map(
            (m, i) =>
              `<button type="button" class="pay-method${i === 0 ? ' active' : ''}" data-method="${m}">${labels[m]}</button>`
          )
          .join('') +
        '</div>';
    }
    methods.forEach((m, i) => {
      const hidden = i === 0 ? '' : 'hidden';
      if (m === 'paypal') {
        html += `<div class="pay-panel" data-panel="paypal" ${hidden}>
          <div id="paypal-buttons"></div>
          <p class="note" style="text-align:center;color:var(--faint);font-size:.8rem;margin-top:10px">Secure payment via PayPal.</p></div>`;
      } else {
        html += `<div class="pay-panel" data-panel="card" ${hidden}>
          <button class="btn btn-primary btn-block btn-lg" id="stripe-btn" type="button">Pay with card</button>
          <p class="note" style="text-align:center;color:var(--faint);font-size:.8rem;margin-top:10px">You'll be securely redirected to Stripe to pay.</p></div>`;
      }
    });
    area.innerHTML = html;

    area.querySelectorAll('.pay-method').forEach((btn) => {
      btn.addEventListener('click', () => {
        area.querySelectorAll('.pay-method').forEach((b) => b.classList.toggle('active', b === btn));
        area
          .querySelectorAll('.pay-panel')
          .forEach((p) => (p.hidden = p.dataset.panel !== btn.dataset.method));
      });
    });

    if (methods.includes('paypal')) {
      loadPaypalSdk(config.paypal.clientId, config.paypal.currency || 'USD')
        .then(renderPaypalButtons)
        .catch(() => {
          if (methods.length === 1) renderDirectButton(area);
        });
    }
    const stripeBtn = document.getElementById('stripe-btn');
    if (stripeBtn) stripeBtn.addEventListener('click', startStripe);
  }

  function renderDirectButton(area) {
    area.innerHTML = `
      <button class="btn btn-primary btn-block btn-lg" id="place-order" type="button">Place order</button>
      <p class="note" style="text-align:center;color:var(--faint);font-size:.8rem;margin-top:12px">You won't be charged until your order ships.</p>`;
    document.getElementById('place-order').addEventListener('click', placeDirectOrder);
  }

  async function placeDirectOrder() {
    if (!validateShipping()) return;
    const btn = document.getElementById('place-order');
    btn.disabled = true;
    btn.textContent = 'Placing order...';
    try {
      const { order } = await window.api.post(
        '/orders',
        { items: getItems(), shipping: getShipping() },
        loggedIn()
      );
      window.Cart.clear();
      showConfirmation(order);
    } catch (err) {
      showAlert(err.message);
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  }

  // ---- Stripe -----------------------------------------------------------
  async function startStripe() {
    if (!validateShipping()) return;
    const btn = document.getElementById('stripe-btn');
    btn.disabled = true;
    btn.textContent = 'Redirecting...';
    try {
      const { url } = await window.api.post(
        '/payments/stripe/create-session',
        { items: getItems(), shipping: getShipping(), origin: location.origin },
        loggedIn()
      );
      window.location.href = url;
    } catch (err) {
      showAlert(err.message);
      btn.disabled = false;
      btn.textContent = 'Pay with card';
    }
  }

  async function handleStripeReturn(sessionId) {
    formWrap.innerHTML = `<div class="panel center"><h1 style="font-size:1.5rem">Finalizing your order…</h1><p class="sub">One moment, please don't close this tab.</p></div>`;
    summaryEl.innerHTML = '';
    try {
      const { order } = await window.api.post('/payments/stripe/confirm', { sessionId }, loggedIn());
      window.Cart.clear();
      history.replaceState({}, '', '/checkout.html');
      showConfirmation(order);
    } catch (err) {
      formWrap.innerHTML = `<div class="panel center">
        <h1 style="font-size:1.5rem">We couldn't confirm your payment</h1>
        <p class="sub">${esc(err.message)}</p>
        <a class="btn btn-primary" href="/cart.html">Back to cart</a></div>`;
    }
  }

  // ---- PayPal -----------------------------------------------------------
  function loadPaypalSdk(clientId, currency) {
    return new Promise((resolve, reject) => {
      if (window.paypal) return resolve();
      const s = document.createElement('script');
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
      s.onload = () => (window.paypal ? resolve() : reject(new Error('PayPal failed to load')));
      s.onerror = () => reject(new Error('PayPal failed to load'));
      document.head.appendChild(s);
    });
  }

  function renderPaypalButtons() {
    const container = document.getElementById('paypal-buttons');
    if (!window.paypal || !container) return;
    window.paypal
      .Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'paypal' },
        createOrder: async () => {
          if (!validateShipping()) throw new Error('Shipping details required.');
          const { id } = await window.api.post(
            '/payments/paypal/create-order',
            { items: getItems(), shipping: getShipping() },
            loggedIn()
          );
          return id;
        },
        onApprove: async (data) => {
          const { order } = await window.api.post(
            '/payments/paypal/capture-order',
            { paypalOrderId: data.orderID, items: getItems(), shipping: getShipping() },
            loggedIn()
          );
          window.Cart.clear();
          showConfirmation(order);
        },
        onError: () => window.UI.toast('Payment could not be completed. Please try again.', 'error'),
      })
      .render('#paypal-buttons');
  }

  // ---- Confirmation -----------------------------------------------------
  function showConfirmation(order) {
    summaryEl.innerHTML = '';
    const actions = loggedIn()
      ? `<a class="btn btn-primary" href="/orders.html">View my orders</a>
         <a class="btn btn-outline" href="/shop.html">Keep shopping</a>`
      : `<a class="btn btn-primary" href="/shop.html">Keep shopping</a>
         <a class="btn btn-outline" href="/register.html">Create an account</a>`;
    const guestLine = loggedIn()
      ? ''
      : `<p class="muted" style="font-size:.88rem;margin-top:4px">A confirmation has been sent to ${esc(order.shipping.email)}.</p>`;
    formWrap.innerHTML = `
      <div class="panel center">
        <div class="state-icon" style="background:var(--accent-soft);color:var(--accent-ink);width:64px;height:64px">
          ${window.UI.icon('check', 30)}
        </div>
        <h1 style="margin-top:16px">Order confirmed</h1>
        <p class="sub">Thanks, ${esc(order.shipping.name)}. Your order
          <strong>#${order.id}</strong> totalling <strong>${window.UI.money(order.total)}</strong> is on its way.</p>
        ${guestLine}
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px">${actions}</div>
      </div>`;
    window.UI.updateCartBadge();
    window.UI.toast('Order placed successfully', 'success');
  }

  async function init() {
    window.UI.renderHeader('');
    window.UI.renderFooter();

    const params = new URLSearchParams(location.search);
    if (params.get('stripe') === 'success' && params.get('session_id')) {
      return handleStripeReturn(params.get('session_id'));
    }
    if (!guardCart()) return;
    try {
      config = await window.api.get('/payments/config');
    } catch (e) {
      config = { paypal: { enabled: false }, stripe: { enabled: false } };
    }
    renderForm();
    renderSummary();
    if (params.get('stripe') === 'cancel') {
      window.UI.toast('Payment cancelled. Your cart is saved.');
      history.replaceState({}, '', '/checkout.html');
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
