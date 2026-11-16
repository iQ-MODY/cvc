/*!
 * Lab Library — shared core
 * Data loading + validation, language registry, clipboard, toast, theme.
 * Vanilla JS, no build step. Exposes a single global: window.LabCore
 */
(function () {
  'use strict';

  // Resolve the site root from this script's own URL (assets/lab/js/lab-core.js -> /)
  var currentScript = document.currentScript;
  var BASE = currentScript && currentScript.src
    ? new URL('../../../', currentScript.src).pathname
    : '/';
  var DATA_URL = BASE + 'data/labs.json';

  /* ------------------------------------------------------------------ *
   * Language registry
   * key: canonical id used in labs.json
   * prism: Prism grammar name, deps: Prism components to load (in order)
   * ------------------------------------------------------------------ */
  var LANGUAGES = {
    python:     { label: 'Python',     prism: 'python',     ext: 'py',   deps: ['python'] },
    matlab:     { label: 'MATLAB',     prism: 'matlab',     ext: 'm',    deps: ['matlab'] },
    c:          { label: 'C',          prism: 'c',          ext: 'c',    deps: ['c'] },
    cpp:        { label: 'C++',        prism: 'cpp',        ext: 'cpp',  deps: ['c', 'cpp'] },
    java:       { label: 'Java',       prism: 'java',       ext: 'java', deps: ['java'] },
    javascript: { label: 'JavaScript', prism: 'javascript', ext: 'js',   deps: [] },
    html:       { label: 'HTML',       prism: 'markup',     ext: 'html', deps: [] },
    css:        { label: 'CSS',        prism: 'css',        ext: 'css',  deps: [] },
    assembly:   { label: 'Assembly',   prism: 'nasm',       ext: 'asm',  deps: ['nasm'] },
    sql:        { label: 'SQL',        prism: 'sql',        ext: 'sql',  deps: ['sql'] },
    json:       { label: 'JSON',       prism: 'json',       ext: 'json', deps: ['json'] },
    text:       { label: 'Plain text', prism: null,         ext: 'txt',  deps: [] }
  };

  var ALIASES = {
    py: 'python', python3: 'python',
    m: 'matlab', octave: 'matlab',
    'c++': 'cpp', cplusplus: 'cpp', cxx: 'cpp',
    js: 'javascript', ecmascript: 'javascript',
    htm: 'html', markup: 'html', xml: 'html',
    asm: 'assembly', nasm: 'assembly', masm: 'assembly', x86: 'assembly', '8086': 'assembly',
    mysql: 'sql', sqlite: 'sql', plsql: 'sql',
    plain: 'text', plaintext: 'text', txt: 'text'
  };

  function normalizeLanguage(value) {
    var key = String(value == null ? '' : value).trim().toLowerCase();
    if (LANGUAGES[key]) return key;
    if (ALIASES[key]) return ALIASES[key];
    return 'text';
  }

  function getLanguage(key) {
    return LANGUAGES[normalizeLanguage(key)];
  }

  /* ------------------------------------------------------------------ *
   * Data loading + validation
   * ------------------------------------------------------------------ */
  function LabError(kind, message) {
    var err = new Error(message);
    err.kind = kind; // 'network' | 'malformed' | 'schema'
    return err;
  }

  function isPositiveInt(n) {
    return typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 999999999;
  }

  function asText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  /**
   * Validate raw JSON and return { labs: [...], warnings: [...] }.
   * Invalid entries are skipped (never fatal) so one typo can't take
   * the whole library down. Only a wrong top-level shape is fatal.
   */
  function validate(raw) {
    var list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.labs) ? raw.labs : null;
    if (!list) throw LabError('schema', 'Expected an object with a "labs" array.');

    var warnings = [];
    var seen = Object.create(null);
    var labs = [];

    list.forEach(function (item, index) {
      var where = 'labs[' + index + ']';
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        warnings.push(where + ': not an object — skipped.');
        return;
      }

      var id = item.id;
      if (typeof id === 'string' && /^\d+$/.test(id.trim())) id = Number(id.trim());
      if (!isPositiveInt(id)) {
        warnings.push(where + ': "id" must be a positive integer — skipped.');
        return;
      }
      if (seen[id]) {
        warnings.push(where + ': duplicate id ' + id + ' — skipped (first one wins).');
        return;
      }

      var code = item.code;
      if (Array.isArray(code) && code.every(function (l) { return typeof l === 'string'; })) {
        code = code.join('\n');
      }
      if (typeof code !== 'string') {
        warnings.push(where + ' (id ' + id + '): "code" must be a string or an array of strings — skipped.');
        return;
      }

      seen[id] = true;
      labs.push({
        id: id,
        title: asText(item.title) || 'Lab #' + id,
        subject: asText(item.subject) || 'General',
        language: normalizeLanguage(item.language),
        description: asText(item.description),
        updatedAt: asText(item.updatedAt),
        code: code // kept byte-for-byte; never trimmed or reformatted
      });
    });

    labs.sort(function (a, b) { return a.id - b.id; });
    return { labs: labs, warnings: warnings };
  }

  var cache = null;

  function loadLabs() {
    if (cache) return cache;
    cache = fetch(DATA_URL, { cache: 'no-cache', credentials: 'same-origin' })
      .catch(function () {
        throw LabError('network', 'Could not reach the Lab Library data. Check your connection and try again.');
      })
      .then(function (res) {
        if (!res.ok) throw LabError('network', 'The Lab Library data could not be loaded (HTTP ' + res.status + ').');
        return res.text();
      })
      .then(function (text) {
        var raw;
        try {
          raw = JSON.parse(text);
        } catch (e) {
          throw LabError('malformed', 'data/labs.json is not valid JSON: ' + e.message);
        }
        var result = validate(raw);
        if (result.warnings.length && window.console) {
          console.warn('[Lab Library] ' + result.warnings.length + ' issue(s) in data/labs.json:\n  ' + result.warnings.join('\n  '));
        }
        return result;
      });
    cache.catch(function () { cache = null; }); // allow retry after failure
    return cache;
  }

  /* ------------------------------------------------------------------ *
   * Formatting helpers
   * ------------------------------------------------------------------ */
  function formatDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
    if (!m) return value || '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (isNaN(d.getTime())) return value;
    try {
      return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
    } catch (e) {
      return value;
    }
  }

  function labUrl(id) {
    return location.origin + BASE + 'lab/' + id;
  }

  function labPath(id) {
    return BASE + 'lab/' + id;
  }

  /** Tiny element builder. Text is always set via textContent (never innerHTML). */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val == null || val === false) return;
        if (key === 'class') node.className = val;
        else if (key === 'text') node.textContent = val;
        else node.setAttribute(key, val === true ? '' : val);
      });
    }
    (children || []).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  /* ------------------------------------------------------------------ *
   * Clipboard
   * 1. Async Clipboard API (secure contexts, incl. iOS Safari 13.4+)
   * 2. Hidden <textarea> + execCommand('copy') (older browsers / blocked API)
   * Returns a Promise<boolean>. Must be called directly from a user gesture.
   * ------------------------------------------------------------------ */
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;' +
      'opacity:0;font-size:16px;white-space:pre;'; // 16px stops iOS zooming in
    document.body.appendChild(ta);

    var selection = document.getSelection();
    var previous = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    var active = document.activeElement;

    var ok = false;
    try {
      ta.focus({ preventScroll: true });
      ta.select();
      ta.setSelectionRange(0, text.length); // required on iOS
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }

    document.body.removeChild(ta);
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }
    if (active && typeof active.focus === 'function') {
      try { active.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    return ok;
  }

  function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  /* ------------------------------------------------------------------ *
   * Toast
   * ------------------------------------------------------------------ */
  var toastTimer = null;
  function toast(message, type) {
    var host = document.getElementById('lab-toast');
    if (!host) {
      host = el('div', { id: 'lab-toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(host);
    }
    host.textContent = message;
    host.dataset.type = type || 'info';
    host.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { host.classList.remove('is-visible'); }, 2600);
  }

  /* ------------------------------------------------------------------ *
   * Theme (dark by default; preference remembered per browser)
   * ------------------------------------------------------------------ */
  var THEME_KEY = 'lab-theme';
  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  }
  function initTheme() {
    applyTheme(readTheme() || 'dark');
    var btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode */ }
    });
  }

  window.LabCore = {
    BASE: BASE,
    LANGUAGES: LANGUAGES,
    normalizeLanguage: normalizeLanguage,
    getLanguage: getLanguage,
    validate: validate,
    loadLabs: loadLabs,
    formatDate: formatDate,
    labUrl: labUrl,
    labPath: labPath,
    el: el,
    copyText: copyText,
    toast: toast,
    initTheme: initTheme
  };
})();
