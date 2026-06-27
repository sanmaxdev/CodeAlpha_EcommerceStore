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

  function initHeroSlideshow() {
    const slidesWrap = document.getElementById('hero-slides');
    const dotsWrap = document.getElementById('hero-dots');
    if (!slidesWrap || !dotsWrap) return;
    const slides = Array.from(slidesWrap.children);
    if (slides.length <= 1) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.className = 'hero-dot' + (i === 0 ? ' active' : '');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show slide ' + (i + 1));
      b.addEventListener('click', () => go(i));
      dotsWrap.appendChild(b);
    });
    const dots = Array.from(dotsWrap.children);

    let current = 0;
    let timer = null;

    function go(i) {
      if (i === current) return;
      slides[current].classList.remove('is-active', 'kb');
      dots[current].classList.remove('active');
      current = i;
      slides[current].classList.add('is-active');
      if (!reduce) {
        void slides[current].offsetWidth;
        slides[current].classList.add('kb');
      }
      dots[current].classList.add('active');
      restart();
    }
    function next() {
      go((current + 1) % slides.length);
    }
    function restart() {
      if (reduce) return;
      window.clearInterval(timer);
      timer = window.setInterval(next, 5500);
    }
    restart();
  }

  function init() {
    window.UI.renderHeader('home');
    window.UI.renderFooter();
    window.UI.initAddToCart();

    initHeroSlideshow();
    window.UI.observeReveals(document);
    const catGrid = document.querySelector('.cat-grid');
    if (catGrid) window.UI.revealStagger(catGrid);

    loadFeatured();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
