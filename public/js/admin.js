(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const money = (n) => window.UI.money(n);
  const esc = (s) => window.UI.escapeHtml(s);

  function fmtDate(s) {
    const d = new Date(String(s).replace(' ', 'T') + 'Z');
    if (isNaN(d)) return s;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function statusBadge(status) {
    return `<span class="badge-st st-${esc(status)}">${esc(status)}</span>`;
  }

  let STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

  async function uploadImage(file) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + window.api.getToken() },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed.');
    return data.path;
  }

  // ---- Dashboard --------------------------------------------------------
  async function loadDashboard() {
    try {
      const { stats, recentOrders } = await window.api.get('/admin/stats', true);
      $('stat-cards').innerHTML = [
        ['Products', stats.products, stats.lowStock + ' low on stock'],
        ['Orders', stats.orders, 'all time'],
        ['Revenue', money(stats.revenue), 'excl. cancelled'],
        ['Customers', stats.customers, 'registered'],
      ]
        .map(
          ([label, value, sub]) =>
            `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${esc(sub)}</div></div>`
        )
        .join('');

      $('recent-orders').innerHTML = recentOrders.length
        ? `<table class="atable"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>${recentOrders
            .map(
              (o) =>
                `<tr><td>#${o.id}</td><td>${esc(o.customer)}</td><td>${fmtDate(o.createdAt)}</td><td class="num">${money(o.total)}</td><td>${statusBadge(o.status)}</td></tr>`
            )
            .join('')}</tbody></table>`
        : '<div style="padding:24px;color:var(--muted)">No orders yet.</div>';
    } catch (e) {
      $('stat-cards').innerHTML = `<div class="stat-card">Could not load stats: ${esc(e.message)}</div>`;
    }
  }

  // ---- Products ---------------------------------------------------------
  async function loadProducts() {
    try {
      const { products } = await window.api.get('/admin/products', true);
      const cats = [...new Set(products.map((p) => p.category))];
      $('cat-list').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');

      $('products-table').innerHTML = `<table class="atable">
        <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Featured</th><th></th></tr></thead>
        <tbody>${products
          .map(
            (p) => `<tr data-id="${p.id}">
              <td><img class="thumb" src="${esc(p.image)}" alt="" /></td>
              <td class="prod-name">${esc(p.name)}</td>
              <td>${esc(p.category)}</td>
              <td class="num">${money(p.price)}</td>
              <td class="num">${p.stock}${p.stock <= 5 ? ' <span class="pill-y">low</span>' : ''}</td>
              <td class="num">${p.rating.toFixed(1)}</td>
              <td>${p.featured ? '<span class="pill-y">yes</span>' : '<span style="color:var(--faint)">no</span>'}</td>
              <td><div class="table-actions">
                <button class="btn btn-outline btn-sm js-edit">Edit</button>
                <button class="btn btn-danger btn-sm js-del">Delete</button>
              </div></td>
            </tr>`
          )
          .join('')}</tbody></table>`;

      window.__products = products;
    } catch (e) {
      $('products-table').innerHTML = `<div style="padding:24px">Could not load products: ${esc(e.message)}</div>`;
    }
  }

  function openModal(product) {
    $('product-alert').className = 'alert';
    $('modal-title').textContent = product ? 'Edit product' : 'Add product';
    $('p-id').value = product ? product.id : '';
    $('p-name').value = product ? product.name : '';
    $('p-category').value = product ? product.category : '';
    $('p-price').value = product ? product.price : '';
    $('p-stock').value = product ? product.stock : 0;
    $('p-rating').value = product ? product.rating : 4.5;
    $('p-featured').checked = product ? product.featured : false;
    $('p-description').value = product ? product.description : '';
    $('p-image').value = product ? product.image : '';
    setPreview(product ? product.image : '');
    $('upload-hint').textContent = '';
    $('product-modal').classList.add('open');
  }
  function closeModal() {
    $('product-modal').classList.remove('open');
  }
  function setPreview(src) {
    const el = $('p-preview');
    if (src) {
      el.src = src;
      el.style.visibility = 'visible';
    } else {
      el.style.visibility = 'hidden';
    }
  }

  async function submitProduct(e) {
    e.preventDefault();
    const alertEl = $('product-alert');
    alertEl.className = 'alert';
    const id = $('p-id').value;
    const body = {
      name: $('p-name').value.trim(),
      category: $('p-category').value.trim(),
      price: $('p-price').value,
      stock: $('p-stock').value,
      rating: $('p-rating').value,
      featured: $('p-featured').checked,
      description: $('p-description').value.trim(),
      image: $('p-image').value.trim(),
    };
    const btn = $('product-submit');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      if (id) await window.api.put('/admin/products/' + id, body, true);
      else await window.api.post('/admin/products', body, true);
      closeModal();
      window.UI.toast('Product saved', 'success');
      loadProducts();
      loadDashboard();
    } catch (err) {
      alertEl.textContent = err.message;
      alertEl.className = 'alert error show';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save product';
    }
  }

  // ---- Orders -----------------------------------------------------------
  async function loadOrders() {
    try {
      const { orders, statuses } = await window.api.get('/admin/orders', true);
      STATUSES = statuses || STATUSES;
      $('orders-table').innerHTML = orders.length
        ? `<table class="atable">
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>${orders
            .map(
              (o) => `<tr>
                <td>#${o.id}</td>
                <td class="prod-name">${esc(o.shipping.name)}<br><span style="color:var(--faint);font-size:.82rem">${esc(o.shipping.email)}</span></td>
                <td>${fmtDate(o.createdAt)}</td>
                <td>${o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                <td class="num">${money(o.total)}</td>
                <td>${esc(o.paymentMethod)}</td>
                <td><select class="status-select js-status" data-id="${o.id}">${STATUSES.map(
                  (s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${s}</option>`
                ).join('')}</select></td>
              </tr>`
            )
            .join('')}</tbody></table>`
        : '<div style="padding:24px;color:var(--muted)">No orders yet.</div>';
    } catch (e) {
      $('orders-table').innerHTML = `<div style="padding:24px">Could not load orders: ${esc(e.message)}</div>`;
    }
  }

  // ---- Wiring -----------------------------------------------------------
  function wire() {
    document.querySelectorAll('.admin-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach((t) => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
        $('panel-' + tab.dataset.tab).classList.add('active');
      });
    });

    $('add-product-btn').addEventListener('click', () => openModal(null));
    $('modal-close').addEventListener('click', closeModal);
    $('product-modal').addEventListener('click', (e) => {
      if (e.target === $('product-modal')) closeModal();
    });
    $('product-form').addEventListener('submit', submitProduct);
    $('p-image').addEventListener('input', () => setPreview($('p-image').value.trim()));

    $('p-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      $('upload-hint').textContent = 'Uploading...';
      try {
        const path = await uploadImage(file);
        $('p-image').value = path;
        setPreview(path);
        $('upload-hint').textContent = 'Uploaded.';
      } catch (err) {
        $('upload-hint').textContent = err.message;
      }
    });

    $('products-table').addEventListener('click', async (e) => {
      const row = e.target.closest('tr[data-id]');
      if (!row) return;
      const id = Number(row.dataset.id);
      if (e.target.closest('.js-edit')) {
        const p = (window.__products || []).find((x) => x.id === id);
        if (p) openModal(p);
      } else if (e.target.closest('.js-del')) {
        if (!confirm('Delete this product? This cannot be undone.')) return;
        try {
          await window.api.del('/admin/products/' + id, true);
          window.UI.toast('Product deleted');
          loadProducts();
          loadDashboard();
        } catch (err) {
          alert(err.message);
        }
      }
    });

    $('orders-table').addEventListener('change', async (e) => {
      const sel = e.target.closest('.js-status');
      if (!sel) return;
      const id = sel.dataset.id;
      const status = sel.value;
      try {
        await window.api.put('/admin/orders/' + id + '/status', { status }, true);
        window.UI.toast('Order #' + id + ' marked ' + status, 'success');
        loadDashboard();
      } catch (err) {
        alert(err.message);
        loadOrders();
      }
    });

    $('admin-logout').addEventListener('click', () => {
      window.api.clearSession();
      location.href = '/login.html';
    });
  }

  async function init() {
    if (!window.api.isLoggedIn()) {
      location.href = '/login.html?redirect=' + encodeURIComponent('/admin.html');
      return;
    }
    let me;
    try {
      me = await window.api.get('/auth/me', true);
    } catch (e) {
      location.href = '/login.html?redirect=' + encodeURIComponent('/admin.html');
      return;
    }
    if (!me.user || !me.user.isAdmin) {
      document.getElementById('admin-root').innerHTML =
        '<div style="max-width:520px;margin:80px auto;text-align:center;padding:0 24px">' +
        '<h1 style="font-family:Bricolage Grotesque,sans-serif">Admin access only</h1>' +
        '<p style="color:var(--muted);margin:12px 0 20px">This account is not an administrator.</p>' +
        '<a class="btn btn-primary" href="/index.html">Back to store</a></div>';
      return;
    }
    wire();
    loadDashboard();
    loadProducts();
    loadOrders();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
