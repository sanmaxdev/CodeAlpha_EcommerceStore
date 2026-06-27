(function () {
  'use strict';

  function init() {
    window.UI.renderHeader('contact');
    window.UI.renderFooter();
    window.UI.observeReveals(document);

    const form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();
      const alertEl = document.getElementById('contact-alert');
      alertEl.className = 'alert';

      if (!name || !email || !message) {
        alertEl.textContent = 'Please fill in your name, email, and message.';
        alertEl.className = 'alert error show';
        return;
      }
      form.reset();
      alertEl.textContent = `Thanks, ${name.split(' ')[0]}. We will reply to ${email} within one business day.`;
      alertEl.className = 'alert success show';
      window.UI.toast('Message sent', 'success');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
