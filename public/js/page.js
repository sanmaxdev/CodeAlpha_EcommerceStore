(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    window.UI.renderHeader(document.body.dataset.nav || '');
    window.UI.renderFooter();
    window.UI.observeReveals(document);
  });
})();
