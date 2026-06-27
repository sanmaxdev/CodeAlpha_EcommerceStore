(function () {
  'use strict';

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
  };
  function icon(name, size = 20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
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

    host.innerHTML = `
      <header class="site-header">
        <div class="header-inner">
          <a class="brand" href="/index.html" aria-label="Loomwell home">Loomwell</a>
          <nav class="header-nav">
            <a href="/index.html" class="${active === 'shop' ? 'active' : ''}">Shop</a>
            <a href="/index.html?category=Shirts">Shirts</a>
            <a href="/index.html?category=Dresses">Dresses</a>
            <a href="/index.html?category=Footwear">Footwear</a>
            <a href="/index.html?category=Accessories">Accessories</a>
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
          </div>
        </div>
      </header>`;

    const form = document.getElementById('header-search');
    if (form) {
      const input = form.querySelector('input');
      const params = new URLSearchParams(location.search);
      if (params.get('search')) input.value = params.get('search');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        location.href = '/index.html' + (q ? '?search=' + encodeURIComponent(q) : '');
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
    updateCartBadge();
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
          </div>
          <nav class="footer-col">
            <h4>Shop</h4>
            <a href="/index.html?category=Shirts">Shirts</a>
            <a href="/index.html?category=Dresses">Dresses</a>
            <a href="/index.html?category=Footwear">Footwear</a>
            <a href="/index.html?category=Accessories">Accessories</a>
          </nav>
          <nav class="footer-col">
            <h4>Account</h4>
            <a href="/orders.html">My orders</a>
            <a href="/cart.html">Cart</a>
            <a href="/login.html">Log in</a>
            <a href="/register.html">Create account</a>
          </nav>
          <div class="footer-col footer-news">
            <h4>Stay in the loop</h4>
            <p>New arrivals and occasional offers. No spam.</p>
            <form id="news-form" class="news-form">
              <input type="email" name="email" placeholder="Email address" aria-label="Email address" required />
              <button class="btn btn-primary" type="submit">Join</button>
            </form>
          </div>
        </div>
        <div class="wrap footer-bottom">
          <span>&copy; ${currentYear()} Loomwell</span>
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
  };
})();
