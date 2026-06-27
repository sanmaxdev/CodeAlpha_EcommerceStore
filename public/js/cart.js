(function () {
  'use strict';

  const KEY = 'loomwell_cart';
  const listeners = [];

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    listeners.forEach((fn) => fn(items));
  }

  function items() {
    return read();
  }
  function count() {
    return read().reduce((n, i) => n + i.quantity, 0);
  }
  function subtotal() {
    return read().reduce((n, i) => n + i.price * i.quantity, 0);
  }

  function add(product, qty = 1) {
    const cart = read();
    const existing = cart.find((i) => i.id === product.id);
    const max = product.stock || 99;
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, max);
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        stock: product.stock,
        quantity: Math.min(qty, max),
      });
    }
    write(cart);
  }

  function setQty(id, qty) {
    const cart = read();
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.quantity = Math.max(1, Math.min(qty, item.stock || 99));
    write(cart);
  }

  function remove(id) {
    write(read().filter((i) => i.id !== id));
  }

  function clear() {
    write([]);
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  window.Cart = { items, count, subtotal, add, setQty, remove, clear, onChange };
})();
