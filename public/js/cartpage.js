(function () {
  'use strict';

  const itemsEl = document.getElementById('cart-items');
  const summaryEl = document.getElementById('cart-summary');

  const SHIP_THRESHOLD = 150;
  const SHIP_COST = 8.95;

  function render() {
    const items = window.Cart.items();

    if (items.length === 0) {
      itemsEl.innerHTML = `
        <div class="state">
          <div class="state-icon">${window.UI.icon('cart', 22)}</div>
          <h3>Your cart is empty</h3>
          <p>Browse the shop and add a few pieces you like.</p>
          <a class="btn btn-primary" href="/index.html" style="margin-top:14px">Start shopping</a>
        </div>`;
      summaryEl.innerHTML = '';
      return;
    }

    itemsEl.innerHTML = items
      .map(
        (i) => `
        <div class="cart-item" data-id="${i.id}">
          <a class="ci-media" href="/product.html?id=${i.id}">
            <img src="${window.UI.escapeHtml(i.image)}" alt="${window.UI.escapeHtml(i.name)}" />
          </a>
          <div>
            <div class="ci-name"><a href="/product.html?id=${i.id}">${window.UI.escapeHtml(i.name)}</a></div>
            <div class="ci-cat">${window.UI.escapeHtml(i.category)}</div>
            <div class="ci-controls">
              <div class="qty">
                <button type="button" class="js-dec" aria-label="Decrease">−</button>
                <input type="number" class="js-qty" value="${i.quantity}" min="1" max="${i.stock}" aria-label="Quantity" />
                <button type="button" class="js-inc" aria-label="Increase">+</button>
              </div>
              <button class="ci-remove js-remove">${window.UI.icon('trash', 14)} Remove</button>
            </div>
          </div>
          <div class="ci-price">
            <div class="line">${window.UI.money(i.price * i.quantity)}</div>
            <div class="each">${window.UI.money(i.price)} each</div>
          </div>
        </div>`
      )
      .join('');

    const subtotal = window.Cart.subtotal();
    const shipping = subtotal >= SHIP_THRESHOLD || subtotal === 0 ? 0 : SHIP_COST;
    const total = subtotal + shipping;
    const toFree = Math.max(0, SHIP_THRESHOLD - subtotal);

    summaryEl.innerHTML = `
      <div class="summary">
        <h3>Order summary</h3>
        <div class="row"><span>Subtotal</span><span>${window.UI.money(subtotal)}</span></div>
        <div class="row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : window.UI.money(shipping)}</span></div>
        ${
          toFree > 0
            ? `<div class="row" style="font-size:.82rem"><span>Add ${window.UI.money(toFree)} for free shipping</span><span></span></div>`
            : ''
        }
        <div class="row total"><span>Total</span><span>${window.UI.money(total)}</span></div>
        <a class="btn btn-primary btn-block btn-lg" href="/checkout.html">
          Checkout ${window.UI.icon('arrow', 16)}
        </a>
        <a class="btn btn-ghost btn-block" href="/index.html" style="margin-top:8px">Continue shopping</a>
        <p class="note">Free shipping over $150 · 30-day returns</p>
      </div>`;
  }

  function wire() {
    itemsEl.addEventListener('click', (e) => {
      const row = e.target.closest('.cart-item');
      if (!row) return;
      const id = Number(row.dataset.id);
      const input = row.querySelector('.js-qty');

      if (e.target.closest('.js-inc')) {
        window.Cart.setQty(id, parseInt(input.value, 10) + 1);
        render();
      } else if (e.target.closest('.js-dec')) {
        window.Cart.setQty(id, parseInt(input.value, 10) - 1);
        render();
      } else if (e.target.closest('.js-remove')) {
        window.Cart.remove(id);
        window.UI.toast('Removed from cart');
        render();
      }
    });
    itemsEl.addEventListener('change', (e) => {
      if (!e.target.classList.contains('js-qty')) return;
      const row = e.target.closest('.cart-item');
      window.Cart.setQty(Number(row.dataset.id), parseInt(e.target.value, 10) || 1);
      render();
    });
  }

  function init() {
    window.UI.renderHeader('cart');
    window.UI.renderFooter();
    wire();
    render();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
