(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const state = {
    category: params.get('category') || 'All',
    search: params.get('search') || '',
    sort: 'default',
  };

  const gridEl = document.getElementById('product-grid');
  const chipsEl = document.getElementById('category-chips');
  const sortEl = document.getElementById('sort-select');
  const resultsEl = document.getElementById('results-label');
  const featuredEl = document.getElementById('featured-grid');

  function skeletons(n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `<div class="sk-card">
        <div class="skeleton sk-img"></div>
        <div class="skeleton sk-line"></div>
        <div class="skeleton sk-line short"></div>
      </div>`;
    }
    return html;
  }

  async function loadCategories() {
    try {
      const { categories } = await window.api.get('/products/categories');
      const all = [{ category: 'All' }].concat(categories);
      chipsEl.innerHTML = all
        .map(
          (c) =>
            `<button class="chip ${c.category === state.category ? 'active' : ''}" data-cat="${c.category}">
              ${window.UI.escapeHtml(c.category)}${c.count ? ` <span class="chip-count">${c.count}</span>` : ''}
            </button>`
        )
        .join('');
      chipsEl.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          state.category = chip.dataset.cat;
          chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
          loadProducts();
        });
      });
    } catch (e) {
      chipsEl.innerHTML = '';
    }
  }

  async function loadFeatured() {
    if (!featuredEl) return;
    featuredEl.innerHTML = skeletons(4);
    try {
      const { products } = await window.api.get('/products?featured=true');
      featuredEl.innerHTML = products.slice(0, 4).map(window.UI.productCard).join('');
      window.UI.revealStagger(featuredEl);
    } catch (e) {
      featuredEl.closest('.section').style.display = 'none';
    }
  }

  async function loadProducts() {
    gridEl.innerHTML = skeletons(8);
    const q = new URLSearchParams();
    if (state.category && state.category !== 'All') q.set('category', state.category);
    if (state.search) q.set('search', state.search);
    if (state.sort && state.sort !== 'default') q.set('sort', state.sort);

    try {
      const { products } = await window.api.get('/products?' + q.toString());

      if (resultsEl) {
        if (state.search) {
          resultsEl.textContent = `${products.length} result${products.length === 1 ? '' : 's'} for "${state.search}"`;
        } else if (state.category !== 'All') {
          resultsEl.textContent = `${products.length} piece${products.length === 1 ? '' : 's'} in ${state.category}`;
        } else {
          resultsEl.textContent = `${products.length} pieces`;
        }
      }

      if (products.length === 0) {
        gridEl.innerHTML = `
          <div class="state" style="grid-column: 1 / -1;">
            <div class="state-icon">${window.UI.icon('search', 22)}</div>
            <h3>Nothing here yet</h3>
            <p>Try a different search or category.</p>
          </div>`;
        return;
      }
      gridEl.innerHTML = products.map(window.UI.productCard).join('');
      window.UI.revealStagger(gridEl);
    } catch (err) {
      gridEl.innerHTML = `
        <div class="state" style="grid-column: 1 / -1;">
          <div class="state-icon">${window.UI.icon('box', 22)}</div>
          <h3>Could not load products</h3>
          <p>${window.UI.escapeHtml(err.message)}</p>
          <button class="btn btn-outline" id="retry" style="margin-top:14px">Retry</button>
        </div>`;
      const retry = document.getElementById('retry');
      if (retry) retry.addEventListener('click', loadProducts);
    }
  }

  function init() {
    window.UI.renderHeader('shop');
    window.UI.renderFooter();
    window.UI.initAddToCart();

    if (sortEl) {
      sortEl.value = state.sort;
      sortEl.addEventListener('change', () => {
        state.sort = sortEl.value;
        loadProducts();
      });
    }

    window.UI.observeReveals(document);
    const catGrid = document.querySelector('.cat-grid');
    if (catGrid) window.UI.revealStagger(catGrid);

    loadCategories();
    loadFeatured();
    loadProducts();

    if (state.category !== 'All' || state.search) {
      const catalog = document.getElementById('catalog');
      if (catalog) catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
