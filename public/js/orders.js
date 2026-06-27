(function () {
  'use strict';

  const root = document.getElementById('orders-root');

  function fmtDate(s) {
    const d = new Date(s.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return s;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function skeleton() {
    return `<div class="order-card">
      <div class="skeleton sk-line" style="width:40%;margin-left:0"></div>
      <div class="skeleton sk-line" style="margin-left:0"></div>
      <div class="skeleton sk-line short" style="margin-left:0"></div>
    </div>`.repeat(2);
  }

  async function load() {
    root.innerHTML = skeleton();
    try {
      const { orders } = await window.api.get('/orders', true);

      if (orders.length === 0) {
        root.innerHTML = `
          <div class="state">
            <div class="state-icon">${window.UI.icon('box', 22)}</div>
            <h3>No orders yet</h3>
            <p>When you place an order it will show up here.</p>
            <a class="btn btn-primary" href="/index.html" style="margin-top:14px">Browse the shop</a>
          </div>`;
        return;
      }

      root.innerHTML = orders
        .map(
          (o) => `
        <div class="order-card">
          <div class="order-top">
            <div>
              <div class="order-id">Order #${o.id}</div>
              <div class="order-date">Placed ${fmtDate(o.createdAt)} · shipped to ${window.UI.escapeHtml(o.shipping.city)}</div>
            </div>
            <span class="status-badge">${window.UI.escapeHtml(o.status)}</span>
          </div>
          <div class="order-lines">
            ${o.items
              .map(
                (it) =>
                  `<div class="order-line">
                    <span class="ol-name">${window.UI.escapeHtml(it.name)} × ${it.quantity}</span>
                    <span>${window.UI.money(it.price * it.quantity)}</span>
                  </div>`
              )
              .join('')}
          </div>
          <div class="order-total"><span>Total</span><span>${window.UI.money(o.total)}</span></div>
        </div>`
        )
        .join('');
      window.UI.revealStagger(root);
    } catch (err) {
      root.innerHTML = `
        <div class="state">
          <div class="state-icon">${window.UI.icon('box', 22)}</div>
          <h3>Could not load orders</h3>
          <p>${window.UI.escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  function init() {
    window.UI.renderHeader('orders');
    window.UI.renderFooter();

    if (!window.api.isLoggedIn()) {
      location.href = '/login.html?redirect=' + encodeURIComponent('/orders.html');
      return;
    }
    load();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
