(function () {
  'use strict';

  const THEME_KEY = 'loomwell_theme';

  const money = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stars(rating) {
    const full = Math.round(rating);
    return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  }

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    cart: '<path d="M6 2 4 6v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6l-2-4z"/><path d="M4 6h16"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
  };
  function icon(name, size = 20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
  }
  function setTheme(t) {
    const html = document.documentElement;
    html.classList.add('theme-anim');
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
    updateThemeSwitch();
    window.clearTimeout(setTheme._t);
    setTheme._t = window.setTimeout(() => html.classList.remove('theme-anim'), 440);
  }
  function updateThemeSwitch() {
    const sw = document.querySelector('.theme-switch');
    if (!sw) return;
    const t = getTheme();
    sw.dataset.active = t;
    sw.querySelectorAll('.ts-opt').forEach((o) => o.classList.toggle('active', o.dataset.val === t));
  }

  let revealObserver = null;
  function ensureObserver() {
    if (revealObserver || !('IntersectionObserver' in window)) return revealObserver;
    revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    return revealObserver;
  }
  function observeReveals(root) {
    const scope = root || document;
    const els = scope.querySelectorAll('.reveal:not(.in)');
    const obs = ensureObserver();
    if (!obs) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    els.forEach((el) => obs.observe(el));
  }
  function revealStagger(container) {
    if (!container) return;
    Array.from(container.children).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = Math.min(i, 8) * 55 + 'ms';
    });
    observeReveals(container);
  }

  function initHeaderScroll(header) {
    header = header || document.querySelector('.site-header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function toast(message, type = 'default', ms = 2600) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (type !== 'default' ? type : '');
    el.innerHTML =
      (type === 'success' ? icon('check', 18) : '') + `<span>${escapeHtml(message)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 260);
    }, ms);
  }

  function renderHeader(active) {
    applyTheme(getTheme());
    const host = document.getElementById('app-header');
    if (!host) return;
    const user = window.api.getUser();
    const loggedIn = window.api.isLoggedIn();

    const account = loggedIn
      ? `<a class="account-chip" href="/orders.html" title="My account">
           <span class="avatar">${escapeHtml((user.name || '?').charAt(0).toUpperCase())}</span>
           <span class="acc-name">${escapeHtml((user.name || '').split(' ')[0])}</span>
         </a>
         <button class="icon-btn" id="logout-btn" title="Log out" aria-label="Log out">${icon('logout')}</button>`
      : `<a class="btn btn-outline btn-sm" href="/login.html">Log in</a>`;

    const cats = ['Shirts', 'Dresses', 'Footwear', 'Accessories'];
    const ddLinks = cats
      .map((c) => `<a href="/shop.html?category=${c}">${c} ${icon('arrow', 14)}</a>`)
      .join('');

    host.innerHTML = `
      <header class="site-header">
        <div class="header-inner">
          <a class="brand" href="/index.html" aria-label="Loomwell home">Loomwell</a>
          <nav class="header-nav">
            <a href="/shop.html" class="${active === 'shop' ? 'active' : ''}">Shop</a>
            <span class="nav-dd">
              <button class="nav-dd-btn" type="button" aria-haspopup="true">Categories ${icon('chevron', 14)}</button>
              <div class="nav-dd-panel">
                ${ddLinks}
                <div class="dd-sep"></div>
                <a href="/shop.html">All products ${icon('arrow', 14)}</a>
              </div>
            </span>
            <a href="/contact.html" class="${active === 'contact' ? 'active' : ''}">Contact</a>
          </nav>
          <form class="header-search" role="search" id="header-search">
            <span class="sicon">${icon('search', 16)}</span>
            <input type="search" name="q" placeholder="Search" aria-label="Search products" />
          </form>
          <div class="header-actions">
            <a class="icon-btn" href="/cart.html" id="cart-link" title="Cart" aria-label="Cart">
              ${icon('cart')}
              <span class="cart-badge" id="cart-badge" hidden>0</span>
            </a>
            ${account}
            <button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Menu" aria-expanded="false">${icon('menu')}</button>
          </div>
        </div>
      </header>
      <div class="mobile-nav" id="mobile-nav">
        <a href="/shop.html">Shop ${icon('arrow', 16)}</a>
        <div class="mn-label">Categories</div>
        ${cats.map((c) => `<a class="mn-sub" href="/shop.html?category=${c}">${c}</a>`).join('')}
        <a href="/contact.html">Contact ${icon('arrow', 16)}</a>
        <a href="/orders.html">My orders ${icon('arrow', 16)}</a>
        ${loggedIn ? '' : '<a href="/login.html">Log in ' + icon('arrow', 16) + '</a>'}
      </div>`;

    const form = document.getElementById('header-search');
    if (form) {
      const input = form.querySelector('input');
      const params = new URLSearchParams(location.search);
      if (params.get('search')) input.value = params.get('search');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        location.href = '/shop.html' + (q ? '?search=' + encodeURIComponent(q) : '');
      });
    }
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.api.clearSession();
        toast('You have been logged out.');
        setTimeout(() => (location.href = '/index.html'), 600);
      });
    }
    const headerEl = host.querySelector('.site-header');
    if (headerEl && document.querySelector('.hero-slideshow')) {
      headerEl.classList.add('header-overlay');
    }

    const menuBtn = document.getElementById('menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    if (menuBtn && mobileNav) {
      menuBtn.addEventListener('click', () => {
        const open = mobileNav.classList.toggle('open');
        menuBtn.innerHTML = open ? icon('close') : icon('menu');
        menuBtn.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
        if (headerEl) {
          if (open) headerEl.classList.add('scrolled');
          else headerEl.classList.toggle('scrolled', window.scrollY > 30);
        }
      });
    }
    updateCartBadge();
    initHeaderScroll(headerEl);
  }

  function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const c = window.Cart.count();
    badge.textContent = c;
    badge.hidden = c === 0;
  }

  function renderFooter() {
    const host = document.getElementById('app-footer');
    if (!host) return;
    host.innerHTML = `
      <footer class="site-footer">
        <div class="wrap footer-grid">
          <div class="footer-brand">
            <a class="brand" href="/index.html">Loomwell</a>
            <p>Considered clothing and accessories, made to last and priced fairly.</p>
            <form id="news-form" class="news-form">
              <input type="email" name="email" placeholder="Email address" aria-label="Email address" required />
              <button class="btn btn-primary" type="submit">Join</button>
            </form>
          </div>
          <nav class="footer-col">
            <h4>Shop</h4>
            <a href="/shop.html">All products</a>
            <a href="/shop.html?category=Shirts">Shirts</a>
            <a href="/shop.html?category=Dresses">Dresses</a>
            <a href="/shop.html?category=Footwear">Footwear</a>
            <a href="/shop.html?category=Accessories">Accessories</a>
          </nav>
          <nav class="footer-col">
            <h4>Help</h4>
            <a href="/contact.html">Contact us</a>
            <a href="/shipping-returns.html">Shipping &amp; returns</a>
            <a href="/orders.html">My orders</a>
            <a href="/login.html">Log in</a>
          </nav>
          <nav class="footer-col">
            <h4>Company</h4>
            <a href="/privacy.html">Privacy policy</a>
            <a href="/terms.html">Terms of service</a>
          </nav>
        </div>
        <div class="wrap footer-bottom">
          <span>&copy; ${currentYear()} Loomwell</span>
          <div class="theme-switch" role="group" aria-label="Color theme">
            <span class="ts-glider" aria-hidden="true"></span>
            <button class="ts-opt" data-val="light" type="button" title="Light mode" aria-label="Light mode">${icon('sun', 16)}</button>
            <button class="ts-opt" data-val="dark" type="button" title="Dark mode" aria-label="Dark mode">${icon('moon', 16)}</button>
          </div>
          <span>Free shipping over $150 · 30-day returns</span>
        </div>
      </footer>`;

    const news = document.getElementById('news-form');
    if (news) {
      news.addEventListener('submit', (e) => {
        e.preventDefault();
        news.reset();
        toast('You are on the list. Welcome.', 'success');
      });
    }
    const sw = host.querySelector('.theme-switch');
    if (sw) {
      sw.querySelectorAll('.ts-opt').forEach((o) =>
        o.addEventListener('click', () => setTheme(o.dataset.val))
      );
      updateThemeSwitch();
    }
  }

  function currentYear() {
    return new Date().getFullYear();
  }

  function productCard(p) {
    const low = p.stock > 0 && p.stock <= 5;
    const out = p.stock === 0;
    return `
      <article class="card"
        data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}"
        data-image="${escapeHtml(p.image)}" data-category="${escapeHtml(p.category)}" data-stock="${p.stock}">
        <a class="card-media" href="/product.html?id=${p.id}" aria-label="${escapeHtml(p.name)}">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
          ${low ? '<span class="card-low">Low stock</span>' : ''}
          ${out ? '<span class="card-low">Sold out</span>' : ''}
        </a>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(p.category)}</span>
          <h3 class="card-name"><a href="/product.html?id=${p.id}">${escapeHtml(p.name)}</a></h3>
          <div class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)}</div>
          <div class="card-foot">
            <span class="price">${money(p.price)}</span>
            <button class="add-btn js-add" ${out ? 'disabled' : ''} aria-label="Add ${escapeHtml(p.name)} to cart">
              Add
            </button>
          </div>
        </div>
      </article>`;
  }

  function initAddToCart() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-add');
      if (!btn) return;
      const card = btn.closest('[data-id]');
      if (!card) return;
      const p = {
        id: Number(card.dataset.id),
        name: card.dataset.name,
        price: Number(card.dataset.price),
        image: card.dataset.image,
        category: card.dataset.category,
        stock: Number(card.dataset.stock),
      };
      window.Cart.add(p, 1);
      toast(`${p.name} added to cart`, 'success');
    });
  }

  window.Cart.onChange(updateCartBadge);

  window.UI = {
    money,
    escapeHtml,
    stars,
    icon,
    toast,
    renderHeader,
    renderFooter,
    updateCartBadge,
    productCard,
    initAddToCart,
    getTheme,
    setTheme,
    observeReveals,
    revealStagger,
  };
})();
