(function () {
  'use strict';

  const mode = window.AUTH_MODE || 'login';
  const redirect = new URLSearchParams(location.search).get('redirect') || '/index.html';

  function init() {
    window.UI.renderHeader('');
    window.UI.renderFooter();

    if (window.api.isLoggedIn()) {
      location.href = redirect;
      return;
    }

    const form = document.getElementById('auth-form');
    form.addEventListener('submit', submit);
  }

  async function submit(e) {
    e.preventDefault();
    const alertEl = document.getElementById('auth-alert');
    const btn = document.getElementById('auth-submit');
    alertEl.className = 'alert';

    const form = e.target;
    const payload = { email: form.email.value.trim(), password: form.password.value };
    if (mode === 'register') payload.name = form.name.value.trim();

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = mode === 'register' ? 'Creating account...' : 'Signing in...';

    try {
      const path = mode === 'register' ? '/auth/register' : '/auth/login';
      const { token, user } = await window.api.post(path, payload);
      window.api.setSession(token, user);
      window.UI.toast(`Welcome${user.name ? ', ' + user.name.split(' ')[0] : ''}.`, 'success');
      setTimeout(() => (location.href = redirect), 500);
    } catch (err) {
      alertEl.textContent = err.message;
      alertEl.className = 'alert error show';
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
