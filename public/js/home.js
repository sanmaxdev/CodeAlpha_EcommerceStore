(function () {
  'use strict';

  const featuredEl = document.getElementById('featured-grid');

  function skeletons(n) {
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `<div class="sk-card"><div class="skeleton sk-img"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line short"></div></div>`;
    }
    return html;
  }

  async function loadFeatured() {
    if (!featuredEl) return;
    featuredEl.innerHTML = skeletons(4);
    try {
      const { products } = await window.api.get('/products?featured=true');
      featuredEl.innerHTML = products.slice(0, 4).map(window.UI.productCard).join('');
      window.UI.revealStagger(featuredEl);
    } catch (e) {
      const section = featuredEl.closest('.section');
      if (section) section.style.display = 'none';
    }
  }

  function init() {
    window.UI.renderHeader('home');
    window.UI.renderFooter();
    window.UI.initAddToCart();

    window.UI.observeReveals(document);
    const catGrid = document.querySelector('.cat-grid');
    if (catGrid) window.UI.revealStagger(catGrid);

    loadFeatured();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
