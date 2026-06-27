(function () {
  'use strict';

  const TOKEN_KEY = 'loomwell_token';
  const USER_KEY = 'loomwell_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch (e) {
      return null;
    }
  }
  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function isLoggedIn() {
    return !!getToken();
  }

  async function request(path, { method = 'GET', body, auth = false } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    let res;
    try {
      res = await fetch('/api' + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new Error('Could not reach the server. Is it running?');
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {}
    }

    if (!res.ok) {
      const message = (data && data.error) || `Request failed (${res.status}).`;
      if (res.status === 401 && auth) {
        clearSession();
      }
      throw new Error(message);
    }
    return data;
  }

  window.api = {
    getToken,
    getUser,
    setSession,
    clearSession,
    isLoggedIn,
    request,
    get: (p, auth) => request(p, { auth }),
    post: (p, body, auth) => request(p, { method: 'POST', body, auth }),
    put: (p, body, auth) => request(p, { method: 'PUT', body, auth }),
    del: (p, auth) => request(p, { method: 'DELETE', auth }),
  };
})();
