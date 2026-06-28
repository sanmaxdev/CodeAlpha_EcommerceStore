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
      loadReviews();
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

  // ---- Reviews ----------------------------------------------------------
  const E = (s) => window.UI.escapeHtml(s);

  function fmtDate(s) {
    const d = new Date(String(s).replace(' ', 'T') + 'Z');
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function starRow(n) {
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }

  async function loadReviews() {
    const sec = document.getElementById('reviews-section');
    if (!sec) return;
    try {
      const data = await window.api.get('/products/' + id + '/reviews', true);
      renderReviews(sec, data);
    } catch (e) {
      sec.style.display = 'none';
    }
  }

  function starInputHtml() {
    let h = '<div class="star-input" id="star-input" role="radiogroup" aria-label="Your rating">';
    for (let i = 1; i <= 5; i++) {
      h += `<button type="button" data-v="${i}" aria-label="${i} star${i > 1 ? 's' : ''}">★</button>`;
    }
    return h + '</div>';
  }

  function writeArea(el) {
    if (!el.loggedIn) {
      return `<div class="review-note">Only verified buyers can write a review.
        <a href="/login.html?redirect=${encodeURIComponent('/product.html?id=' + id)}">Log in</a>
        if you've purchased this item.</div>`;
    }
    if (el.canReview) {
      return `<div class="review-form">
        <h3>Write a review</h3>
        <div class="alert error" id="review-alert"></div>
        ${starInputHtml()}
        <div class="field">
          <textarea id="review-body" rows="3" maxlength="1000" placeholder="How is the fit and quality? Anything worth knowing?"></textarea>
        </div>
        <button class="btn btn-primary" id="review-submit" type="button">Submit review</button>
      </div>`;
    }
    if (el.hasReviewed) {
      return `<div class="review-note">Thanks for reviewing this product.</div>`;
    }
    return `<div class="review-note">Only verified buyers can review this product. Once you've purchased it, your review will appear here.</div>`;
  }

  function reviewCard(r) {
    return `<div class="review-card">
      <div class="review-top">
        <span class="stars">${starRow(r.rating)}</span>
        <span class="review-author">${E(r.author)}</span>
        <span class="verified-badge">${window.UI.icon('check', 12)} Verified buyer</span>
        <span class="review-date">${fmtDate(r.createdAt)}</span>
      </div>
      <p class="review-body">${E(r.body)}</p>
    </div>`;
  }

  function renderReviews(sec, data) {
    const { reviews, summary, eligibility } = data;
    const head = `<div class="section-head"><div><h2>Customer reviews</h2></div></div>`;
    const sum = summary.count
      ? `<div class="reviews-summary">
           <span class="big">${summary.average.toFixed(1)}</span>
           <span class="stars">${starRow(Math.round(summary.average))}</span>
           <span class="count">Based on ${summary.count} verified ${summary.count === 1 ? 'review' : 'reviews'}</span>
         </div>`
      : `<div class="reviews-summary"><span class="count">No reviews yet. Verified buyers can be the first to review.</span></div>`;
    const list = reviews.length ? `<div class="review-list">${reviews.map(reviewCard).join('')}</div>` : '';
    sec.innerHTML = head + sum + writeArea(eligibility) + list;
    wireForm(sec);
  }

  function wireForm(sec) {
    let selected = 0;
    const si = sec.querySelector('#star-input');
    if (si) {
      si.querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => {
          selected = Number(b.dataset.v);
          si.querySelectorAll('button').forEach((x) =>
            x.classList.toggle('on', Number(x.dataset.v) <= selected)
          );
        });
      });
    }
    const submit = sec.querySelector('#review-submit');
    if (submit) {
      submit.addEventListener('click', async () => {
        const alertEl = sec.querySelector('#review-alert');
        alertEl.className = 'alert';
        const body = sec.querySelector('#review-body').value.trim();
        if (!selected) {
          alertEl.textContent = 'Please choose a star rating.';
          alertEl.className = 'alert error show';
          return;
        }
        if (body.length < 3) {
          alertEl.textContent = 'Please write a short review.';
          alertEl.className = 'alert error show';
          return;
        }
        submit.disabled = true;
        submit.textContent = 'Submitting...';
        try {
          const data = await window.api.post('/products/' + id + '/reviews', { rating: selected, body }, true);
          window.UI.toast('Thanks for your review', 'success');
          renderReviews(sec, {
            reviews: data.reviews,
            summary: data.summary,
            eligibility: { loggedIn: true, purchased: true, hasReviewed: true, canReview: false },
          });
          updateHeaderRating(data.summary);
        } catch (err) {
          alertEl.textContent = err.message;
          alertEl.className = 'alert error show';
          submit.disabled = false;
          submit.textContent = 'Submit review';
        }
      });
    }
  }

  function updateHeaderRating(summary) {
    const el = document.querySelector('.detail-info .rating');
    if (el && summary.count) {
      el.innerHTML = `<span class="stars">${starRow(Math.round(summary.average))}</span>
        <span>${summary.average.toFixed(1)} · ${summary.count} review${summary.count === 1 ? '' : 's'}</span>`;
    }
  }

  function init() {
    window.UI.renderHeader('shop');
    window.UI.renderFooter();
    window.UI.initAddToCart();
    load();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
