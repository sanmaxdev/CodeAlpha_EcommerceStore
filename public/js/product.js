(function () {
  'use strict';

  const root = document.getElementById('detail-root');
  const relatedSection = document.getElementById('related-section');
  const relatedGrid = document.getElementById('related-grid');
  const crumbName = document.getElementById('crumb-name');

  const id = new URLSearchParams(location.search).get('id');

  function renderError(message) {
    root.innerHTML = `
      <div class="state" style="grid-column:1/-1">
        <div class="state-icon">${window.UI.icon('box', 22)}</div>
        <h3>Product unavailable</h3>
        <p>${window.UI.escapeHtml(message)}</p>
        <a class="btn btn-outline" href="/shop.html" style="margin-top:14px">Back to shop</a>
      </div>`;
  }

  async function load() {
    if (!id) return renderError('No product was specified.');
    try {
      const { product, related } = await window.api.get('/products/' + id);
      document.title = `${product.name} · Loomwell`;
      if (crumbName) crumbName.textContent = product.name;
      renderProduct(product);
      renderRelated(related);
    } catch (err) {
      renderError(err.message);
    }
  }

  function renderProduct(p) {
    const out = p.stock === 0;
    const low = p.stock > 0 && p.stock <= 5;
    root.innerHTML = `
      <div class="detail-media">
        <img src="${window.UI.escapeHtml(p.image)}" alt="${window.UI.escapeHtml(p.name)}" />
      </div>
      <div class="detail-info">
        <span class="card-cat">${window.UI.escapeHtml(p.category)}</span>
        <h1>${window.UI.escapeHtml(p.name)}</h1>
        <div class="rating">
          <span class="stars">${window.UI.stars(p.rating)}</span>
          <span>${p.rating.toFixed(1)} rating</span>
        </div>
        <div class="detail-price">${window.UI.money(p.price)}</div>
        <p class="detail-desc">${window.UI.escapeHtml(p.description)}</p>

        <div class="detail-meta">
          <div class="row"><span>Availability</span>
            <span class="stock-pill ${out ? 'low' : low ? 'low' : 'in'}">
              ${out ? 'Out of stock' : low ? `Only ${p.stock} left` : `In stock (${p.stock})`}
            </span></div>
          <div class="row"><span>Category</span><span>${window.UI.escapeHtml(p.category)}</span></div>
          <div class="row"><span>Shipping</span><span>Free over $150</span></div>
        </div>

        <div class="buy-row">
          <div class="qty">
            <button type="button" id="q-minus" aria-label="Decrease quantity">−</button>
            <input type="number" id="q-input" value="1" min="1" max="${Math.max(1, p.stock)}" aria-label="Quantity" />
            <button type="button" id="q-plus" aria-label="Increase quantity">+</button>
          </div>
          <button class="btn btn-primary btn-lg" id="add-detail" ${out ? 'disabled' : ''}>
            ${out ? 'Sold out' : 'Add to cart'}
          </button>
        </div>
        <a class="btn btn-ghost" href="/cart.html">View cart →</a>
      </div>`;

    if (out) return;

    const input = document.getElementById('q-input');
    const clamp = () => {
      let v = parseInt(input.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (v > p.stock) v = p.stock;
      input.value = v;
    };
    document.getElementById('q-minus').addEventListener('click', () => {
      input.value = Math.max(1, parseInt(input.value, 10) - 1);
    });
    document.getElementById('q-plus').addEventListener('click', () => {
      input.value = Math.min(p.stock, parseInt(input.value, 10) + 1);
    });
    input.addEventListener('change', clamp);

    document.getElementById('add-detail').addEventListener('click', () => {
      clamp();
      window.Cart.add(p, parseInt(input.value, 10));
      window.UI.toast(`${p.name} added to cart`, 'success');
    });
  }

  function renderRelated(related) {
    if (!related || related.length === 0) {
      relatedSection.style.display = 'none';
      return;
    }
    relatedGrid.innerHTML = related.map(window.UI.productCard).join('');
    window.UI.revealStagger(relatedGrid);
  }

  function init() {
    window.UI.renderHeader('shop');
    window.UI.renderFooter();
    window.UI.initAddToCart();
    load();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
