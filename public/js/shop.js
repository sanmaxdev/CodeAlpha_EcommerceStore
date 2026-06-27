(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const state = {
    search: params.get('search') || '',
    category: params.get('category') || 'All',
    price: 'any',
    rating: 'any',
    inStock: false,
    sort: 'default',
  };

  let ALL = [];

  const gridEl = document.getElementById('product-grid');
  const countEl = document.getElementById('shop-count');
  const resultsEl = document.getElementById('shop-results');
  const titleEl = document.getElementById('shop-title');
  const searchEl = document.getElementById('f-search');
  const sortEl = document.getElementById('sort-select');

  function skeletons(n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `<div class="sk-card"><div class="skeleton sk-img"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>`;
    }
    return html;
  }

  function priceMatch(p) {
    if (state.price === 'under75') return p.price < 75;
    if (state.price === '75to125') return p.price >= 75 && p.price <= 125;
    if (state.price === 'over125') return p.price > 125;
    return true;
  }

  function apply() {
    let list = ALL.slice();

    if (state.category !== 'All') list = list.filter((p) => p.category === state.category);
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter((p) =>
        (p.name + ' ' + p.description + ' ' + p.category).toLowerCase().includes(q)
      );
    }
    list = list.filter(priceMatch);
    if (state.rating !== 'any') list = list.filter((p) => p.rating >= parseFloat(state.rating));
    if (state.inStock) list = list.filter((p) => p.stock > 0);

    switch (state.sort) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating': list.sort((a, b) => b.rating - a.rating); break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: list.sort((a, b) => (b.featured === a.featured ? a.id - b.id : b.featured - a.featured));
    }

    render(list);
  }

  function render(list) {
    const label = `${list.length} ${list.length === 1 ? 'piece' : 'pieces'}`;
    if (resultsEl) resultsEl.textContent = label;
    if (countEl) countEl.textContent = state.category === 'All' ? label : `${label} in ${state.category}`;
    if (titleEl) titleEl.textContent = state.category === 'All' ? 'Shop all' : state.category;

    if (list.length === 0) {
      gridEl.innerHTML = `
        <div class="state" style="grid-column:1/-1">
          <div class="state-icon">${window.UI.icon('search', 22)}</div>
          <h3>No matches</h3>
          <p>Try widening your filters or clearing them.</p>
        </div>`;
      return;
    }
    gridEl.innerHTML = list.map(window.UI.productCard).join('');
    window.UI.revealStagger(gridEl);
  }

  function setActive(containerId, attr, value) {
    document.querySelectorAll(`#${containerId} .filter-opt`).forEach((b) =>
      b.classList.toggle('active', b.dataset[attr] === value)
    );
  }

  function syncFilterUI() {
    setActive('f-category', 'cat', state.category);
    setActive('f-price', 'price', state.price);
    setActive('f-rating', 'rating', state.rating);
    if (searchEl) searchEl.value = state.search;
    const instock = document.getElementById('f-instock');
    if (instock) instock.checked = state.inStock;
    if (sortEl) sortEl.value = state.sort;
  }

  function wire() {
    document.getElementById('f-category').addEventListener('click', (e) => {
      const b = e.target.closest('.filter-opt');
      if (!b) return;
      state.category = b.dataset.cat;
      setActive('f-category', 'cat', state.category);
      apply();
    });
    document.getElementById('f-price').addEventListener('click', (e) => {
      const b = e.target.closest('.filter-opt');
      if (!b) return;
      state.price = b.dataset.price;
      setActive('f-price', 'price', state.price);
      apply();
    });
    document.getElementById('f-rating').addEventListener('click', (e) => {
      const b = e.target.closest('.filter-opt');
      if (!b) return;
      state.rating = b.dataset.rating;
      setActive('f-rating', 'rating', state.rating);
      apply();
    });
    document.getElementById('f-instock').addEventListener('change', (e) => {
      state.inStock = e.target.checked;
      apply();
    });
    searchEl.addEventListener('input', () => {
      state.search = searchEl.value.trim();
      apply();
    });
    sortEl.addEventListener('change', () => {
      state.sort = sortEl.value;
      apply();
    });
    document.getElementById('f-clear').addEventListener('click', () => {
      state.search = '';
      state.category = 'All';
      state.price = 'any';
      state.rating = 'any';
      state.inStock = false;
      state.sort = 'default';
      syncFilterUI();
      apply();
    });
    const toggle = document.getElementById('filters-toggle');
    if (toggle) {
      toggle.addEventListener('click', () =>
        document.getElementById('filters').classList.toggle('open')
      );
    }
  }

  async function init() {
    window.UI.renderHeader('shop');
    window.UI.renderFooter();
    window.UI.initAddToCart();

    gridEl.innerHTML = skeletons(9);
    try {
      const { products } = await window.api.get('/products');
      ALL = products;
      wire();
      syncFilterUI();
      apply();
    } catch (err) {
      gridEl.innerHTML = `
        <div class="state" style="grid-column:1/-1">
          <div class="state-icon">${window.UI.icon('box', 22)}</div>
          <h3>Could not load products</h3>
          <p>${window.UI.escapeHtml(err.message)}</p>
        </div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
