(function () {
  'use strict';

  const SHIP_THRESHOLD = 150;
  const SHIP_COST = 8.95;

  const formWrap = document.getElementById('checkout-form-wrap');
  const summaryEl = document.getElementById('checkout-summary');

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

  function renderSummary() {
    const items = window.Cart.items();
    const subtotal = window.Cart.subtotal();
    const shipping = subtotal >= SHIP_THRESHOLD ? 0 : SHIP_COST;
    const total = subtotal + shipping;

    summaryEl.innerHTML = `
      <div class="summary">
        <h3>Order summary</h3>
        ${items
          .map(
            (i) => `<div class="row"><span>${window.UI.escapeHtml(i.name)} × ${i.quantity}</span>
              <span>${window.UI.money(i.price * i.quantity)}</span></div>`
          )
          .join('')}
        <div class="row" style="border-top:1px solid var(--border);margin-top:6px;padding-top:12px">
          <span>Subtotal</span><span>${window.UI.money(subtotal)}</span></div>
        <div class="row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : window.UI.money(shipping)}</span></div>
        <div class="row total"><span>Total</span><span>${window.UI.money(total)}</span></div>
      </div>`;
  }

  function renderForm() {
    const user = window.api.getUser() || {};
    const loggedIn = window.api.isLoggedIn();
    const guestNote = loggedIn
      ? `<div class="checkout-note">Checking out as <strong>${window.UI.escapeHtml(user.email || '')}</strong></div>`
      : `<div class="checkout-note">Checking out as a guest.
           <a href="/login.html?redirect=${encodeURIComponent('/checkout.html')}">Log in</a>
           for faster checkout and order history.</div>`;
    formWrap.innerHTML = `
      <div class="panel">
        <h1>Checkout</h1>
        <p class="sub">Enter where we should ship your order.</p>
        ${guestNote}
        <div class="alert error" id="checkout-alert"></div>
        <form id="checkout-form" novalidate>
          <div class="field">
            <label for="c-name">Full name</label>
            <input id="c-name" name="name" autocomplete="name" value="${window.UI.escapeHtml(user.name || '')}" required />
          </div>
          <div class="field">
            <label for="c-email">Email</label>
            <input id="c-email" name="email" type="email" autocomplete="email" value="${window.UI.escapeHtml(user.email || '')}" required />
          </div>
          <div class="field">
            <label for="c-address">Street address</label>
            <input id="c-address" name="address" autocomplete="street-address" placeholder="123 Market Street" required />
          </div>
          <div class="form-row">
            <div class="field">
              <label for="c-city">City</label>
              <input id="c-city" name="city" autocomplete="address-level2" placeholder="Boston" required />
            </div>
            <div class="field">
              <label for="c-zip">ZIP / Postal code</label>
              <input id="c-zip" name="zip" autocomplete="postal-code" placeholder="02108" required />
            </div>
          </div>
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="place-order">
            Place order
          </button>
          <p class="note" style="text-align:center;color:var(--faint);font-size:.8rem;margin-top:12px">
            You won't be charged until your order ships.
          </p>
        </form>
      </div>`;

    document.getElementById('checkout-form').addEventListener('submit', placeOrder);
  }

  async function placeOrder(e) {
    e.preventDefault();
    const alertEl = document.getElementById('checkout-alert');
    const btn = document.getElementById('place-order');
    alertEl.classList.remove('show');

    const form = e.target;
    const shipping = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      city: form.city.value.trim(),
      zip: form.zip.value.trim(),
    };

    if (Object.values(shipping).some((v) => !v)) {
      alertEl.textContent = 'Please fill in all shipping fields.';
      alertEl.classList.add('show');
      return;
    }

    const items = window.Cart.items().map((i) => ({ productId: i.id, quantity: i.quantity }));

    btn.disabled = true;
    btn.textContent = 'Placing order...';
    try {
      const { order } = await window.api.post('/orders', { items, shipping }, window.api.isLoggedIn());
      window.Cart.clear();
      showConfirmation(order);
    } catch (err) {
      alertEl.textContent = err.message;
      alertEl.classList.add('show');
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  }

  function showConfirmation(order) {
    summaryEl.innerHTML = '';
    const loggedIn = window.api.isLoggedIn();
    const actions = loggedIn
      ? `<a class="btn btn-primary" href="/orders.html">View my orders</a>
         <a class="btn btn-outline" href="/shop.html">Keep shopping</a>`
      : `<a class="btn btn-primary" href="/shop.html">Keep shopping</a>
         <a class="btn btn-outline" href="/register.html">Create an account</a>`;
    const guestLine = loggedIn
      ? ''
      : `<p class="muted" style="font-size:.88rem;margin-top:4px">A confirmation has been sent to ${window.UI.escapeHtml(order.shipping.email)}.</p>`;
    formWrap.innerHTML = `
      <div class="panel center">
        <div class="state-icon" style="background:var(--accent-soft);color:var(--accent-ink);width:64px;height:64px">
          ${window.UI.icon('check', 30)}
        </div>
        <h1 style="margin-top:16px">Order confirmed</h1>
        <p class="sub">Thanks, ${window.UI.escapeHtml(order.shipping.name)}. Your order
          <strong>#${order.id}</strong> totalling <strong>${window.UI.money(order.total)}</strong> is on its way.</p>
        ${guestLine}
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px">
          ${actions}
        </div>
      </div>`;
    window.UI.updateCartBadge();
    window.UI.toast('Order placed successfully', 'success');
  }

  function init() {
    window.UI.renderHeader('');
    window.UI.renderFooter();
    if (!guardCart()) return;
    renderForm();
    renderSummary();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
