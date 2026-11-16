/*!
 * Lab Library — viewer
 * Served for /lab/<id> (either as a generated lab/<id>.html or via the
 * site-wide 404.html fallback). Reads the id from the URL, loads
 * data/labs.json and renders the matching lab.
 *
 * Safety: code from JSON is never executed and never injected as HTML.
 * Highlighting uses Prism.tokenize() and builds DOM nodes with text nodes only.
 */
(function () {
  'use strict';

  var C = window.LabCore;
  var el = C.el;
  var PRISM_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/';

  var state = { lab: null, labs: [] };
  var $ = function (sel) { return document.querySelector(sel); };

  /* ------------------------------------------------------------------ *
   * Routing
   * ------------------------------------------------------------------ */
  function parseRoute() {
    var path = location.pathname.replace(/\/index\.html$/, '/');
    var rel = path.indexOf(C.BASE) === 0 ? path.slice(C.BASE.length) : path.replace(/^\//, '');
    var m = /^lab\/([^/]+?)(?:\.html)?\/?$/.exec(rel);
    if (!m) return { type: 'page-not-found' };
    var raw = decodeURIComponent(m[1]);
    if (!/^\d{1,9}$/.test(raw)) return { type: 'invalid-id', raw: raw };
    var id = parseInt(raw, 10);
    if (id < 1) return { type: 'invalid-id', raw: raw };
    return { type: 'lab', id: id, canonical: String(id) !== raw || /\.html\/?$|\/$/.test(rel) };
  }

  /* ------------------------------------------------------------------ *
   * View switching
   * ------------------------------------------------------------------ */
  function show(view) {
    ['loading', 'lab', 'notfound', 'error'].forEach(function (name) {
      var node = document.getElementById('view-' + name);
      if (node) node.hidden = name !== view;
    });
    document.body.dataset.view = view;
  }

  function setMeta(title, description) {
    document.title = title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute('content', description);
  }

  function setNoIndex() {
    var meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
  }

  function renderNotFound(kind, detail) {
    var title = $('#nf-title');
    var text = $('#nf-text');
    var code = $('#nf-code');
    if (kind === 'page-not-found') {
      code.textContent = '404';
      title.textContent = 'Page not found';
      text.textContent = 'The page you were looking for doesn’t exist or has moved.';
      setMeta('Page not found · mohamed.codes', 'Page not found');
    } else if (kind === 'invalid-id') {
      code.textContent = '400';
      title.textContent = 'Invalid lab ID';
      text.textContent = 'Lab IDs are positive whole numbers, like /lab/1. “' + detail + '” isn’t one.';
      setMeta('Invalid lab ID · Lab Library', 'Invalid lab ID');
    } else {
      code.textContent = '404';
      title.textContent = 'Lab #' + detail + ' doesn’t exist';
      text.textContent = 'It may have been removed, or the link has a typo.';
      setMeta('Lab #' + detail + ' not found · Lab Library', 'Lab not found');
    }
    $('#crumb-id').textContent = kind === 'page-not-found' ? '404' : '#' + detail;

    // Suggest a few existing labs, if we have them
    var list = $('#nf-suggest');
    list.textContent = '';
    if (kind !== 'page-not-found' && state.labs.length) {
      state.labs.slice(0, 5).forEach(function (lab) {
        list.appendChild(el('li', null, [
          el('a', { href: C.labPath(lab.id) }, [
            el('span', { class: 'nf-suggest-id', text: '#' + lab.id }),
            el('span', { text: lab.title })
          ])
        ]));
      });
      list.hidden = false;
    } else {
      list.hidden = true;
    }
    setNoIndex();
    show('notfound');
  }

  function renderError(err) {
    $('#err-text').textContent = err && err.message ? err.message : 'Something went wrong while loading this lab.';
    setMeta('Error · Lab Library');
    show('error');
  }

  /* ------------------------------------------------------------------ *
   * Code rendering — one <span class="line"> per source line so line
   * numbers (CSS counters, never copied) stay aligned and sticky.
   * ------------------------------------------------------------------ */
  function buildLines(tokens) {
    var lines = [];
    var line = newLine();
    var chain = []; // open token spans in the current line

    function newLine() {
      var node = document.createElement('span');
      node.className = 'line';
      lines.push(node);
      return node;
    }
    function parent() { return chain.length ? chain[chain.length - 1] : line; }

    function text(str) {
      var parts = str.split('\n');
      for (var i = 0; i < parts.length; i++) {
        if (i > 0) {
          // A token spans multiple lines: close it here, re-open it on the next line
          line = newLine();
          var host = line;
          chain = chain.map(function (span) {
            var clone = span.cloneNode(false);
            host.appendChild(clone);
            host = clone;
            return clone;
          });
        }
        if (parts[i]) parent().appendChild(document.createTextNode(parts[i]));
      }
    }

    function walk(stream) {
      if (typeof stream === 'string') return text(stream);
      if (Array.isArray(stream)) { stream.forEach(walk); return; }
      var span = document.createElement('span');
      var cls = ['token', stream.type];
      if (stream.alias) cls = cls.concat(stream.alias);
      span.className = cls.join(' ');
      parent().appendChild(span);
      chain.push(span);
      walk(stream.content);
      chain.pop();
    }

    walk(tokens);
    return lines;
  }

  function paintCode(tokens, code) {
    var target = $('#code-body');
    var lines = buildLines(tokens);
    // A trailing newline is preserved in the copied/downloaded text,
    // but isn't shown as an extra empty numbered line.
    if (lines.length > 1 && /\n$/.test(code) && !lines[lines.length - 1].textContent) lines.pop();
    var frag = document.createDocumentFragment();
    lines.forEach(function (l) { frag.appendChild(l); });
    target.textContent = '';
    target.appendChild(frag);
    target.style.setProperty('--gutter-digits', String(Math.max(2, String(lines.length).length)));
    return lines.length;
  }

  var loadedScripts = Object.create(null);
  function loadScript(src) {
    if (loadedScripts[src]) return loadedScripts[src];
    loadedScripts[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
    return loadedScripts[src];
  }

  function loadGrammar(lang) {
    window.Prism = window.Prism || {};
    window.Prism.manual = true; // never auto-highlight the page
    var chain = loadScript(PRISM_CDN + 'prism.min.js'); // core + markup, css, clike, javascript
    lang.deps.forEach(function (dep) {
      chain = chain.then(function () { return loadScript(PRISM_CDN + 'components/prism-' + dep + '.min.js'); });
    });
    var timeout = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('Highlighter timed out')); }, 8000);
    });
    return Promise.race([chain, timeout]).then(function () {
      var grammar = window.Prism && window.Prism.languages && window.Prism.languages[lang.prism];
      if (!grammar) throw new Error('Grammar not available: ' + lang.prism);
      return grammar;
    });
  }

  function renderCode(lab) {
    var lang = C.getLanguage(lab.language);
    var count = paintCode([lab.code], lab.code); // instant plain-text paint
    $('#meta-lines').textContent = count + (count === 1 ? ' line' : ' lines');

    if (!lang.prism) return;
    var body = $('#code-body');
    body.classList.add('language-' + lang.prism);
    loadGrammar(lang).then(function (grammar) {
      if (state.lab !== lab) return;
      paintCode(window.Prism.tokenize(lab.code, grammar), lab.code);
      body.dataset.highlighted = 'true';
    }).catch(function (err) {
      // Plain text stays on screen; highlighting is an enhancement only.
      if (window.console) console.warn('[Lab Library] Syntax highlighting unavailable:', err.message);
    });
  }

  /* ------------------------------------------------------------------ *
   * Lab rendering
   * ------------------------------------------------------------------ */
  function fileName(lab) {
    var slug = lab.title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
    if (slug === 'lab-' + lab.id) slug = '';
    return 'lab-' + lab.id + (slug ? '-' + slug : '') + '.' + C.getLanguage(lab.language).ext;
  }

  function renderLab(lab) {
    state.lab = lab;
    var lang = C.getLanguage(lab.language);

    setMeta('#' + lab.id + ' ' + lab.title + ' · Lab Library',
      lab.description || lab.subject + ' — ' + lab.title);

    $('#crumb-id').textContent = '#' + lab.id;
    var badge = $('#header-lang');
    badge.textContent = lang.label;
    badge.dataset.lang = lab.language;
    badge.hidden = false;

    $('#lab-subject').textContent = lab.subject;
    $('#lab-title').textContent = lab.title;
    var desc = $('#lab-desc');
    desc.textContent = lab.description;
    desc.hidden = !lab.description;

    $('#meta-id').textContent = '#' + lab.id;
    var metaLang = $('#meta-lang');
    metaLang.textContent = lang.label;
    metaLang.dataset.lang = lab.language;
    var updated = $('#meta-updated');
    if (lab.updatedAt) {
      updated.hidden = false;
      var time = $('#meta-updated-time');
      time.textContent = C.formatDate(lab.updatedAt);
      time.setAttribute('datetime', lab.updatedAt);
    } else {
      updated.hidden = true;
    }

    $('#code-filename').textContent = fileName(lab);
    $('#code-lang').textContent = lab.language;

    // Prev / next
    var idx = state.labs.indexOf(lab);
    setPager($('#pager-prev'), state.labs[idx - 1]);
    setPager($('#pager-next'), state.labs[idx + 1]);

    renderCode(lab);
    show('lab');
  }

  function setPager(link, lab) {
    if (!lab) { link.hidden = true; return; }
    link.hidden = false;
    link.href = C.labPath(lab.id);
    link.querySelector('.pager-title').textContent = '#' + lab.id + ' ' + lab.title;
  }

  /* ------------------------------------------------------------------ *
   * Actions
   * ------------------------------------------------------------------ */
  var resetTimers = new WeakMap();
  function flash(btn, stateName, label) {
    var labelEl = btn.querySelector('.btn-label');
    if (!btn.dataset.label) btn.dataset.label = labelEl.textContent;
    btn.dataset.state = stateName;
    labelEl.textContent = label;
    clearTimeout(resetTimers.get(btn));
    resetTimers.set(btn, setTimeout(function () {
      btn.dataset.state = '';
      labelEl.textContent = btn.dataset.label;
    }, 2000));
  }

  function copyCode(btn) {
    var lab = state.lab;
    if (!lab) return;
    // lab.code is the untouched string from JSON — no line numbers, no UI text.
    C.copyText(lab.code).then(function (ok) {
      if (ok) {
        flash(btn, 'success', 'Copied!');
        C.toast('Code copied to clipboard', 'success');
      } else {
        flash(btn, 'error', 'Copy failed');
        C.toast('Your browser blocked clipboard access — select the code manually.', 'error');
        openManualCopy(lab.code, 'Copy code manually');
      }
    });
  }

  function copyLink(btn) {
    var url = C.labUrl(state.lab.id);
    C.copyText(url).then(function (ok) {
      if (ok) {
        flash(btn, 'success', 'Link copied');
        C.toast('Lab link copied: ' + url.replace(/^https?:\/\//, ''), 'success');
      } else {
        openManualCopy(url, 'Copy link manually');
      }
    });
  }

  function share(btn) {
    var lab = state.lab;
    var data = { title: '#' + lab.id + ' ' + lab.title, text: lab.subject + ' — ' + lab.title, url: C.labUrl(lab.id) };
    if (navigator.share) {
      navigator.share(data).catch(function (err) {
        if (err && err.name === 'AbortError') return; // user closed the sheet
        copyLink(btn);
      });
    } else {
      copyLink(btn);
    }
  }

  function download(btn) {
    var lab = state.lab;
    try {
      var blob = new Blob([lab.code], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = el('a', { href: url, download: fileName(lab), rel: 'noopener' });
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      flash(btn, 'success', 'Downloaded');
      C.toast('Saved ' + fileName(lab), 'success');
    } catch (e) {
      C.toast('Download failed in this browser.', 'error');
    }
  }

  /* Manual copy fallback dialog */
  function openManualCopy(text, title) {
    var dlg = $('#manual-copy');
    var ta = $('#manual-copy-text');
    $('#manual-copy-title').textContent = title;
    ta.value = text;
    dlg.hidden = false;
    document.body.classList.add('has-modal');
    requestAnimationFrame(function () {
      ta.focus();
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) { /* ignore */ }
      ta.scrollTop = 0;
    });
  }
  function closeManualCopy() {
    $('#manual-copy').hidden = true;
    document.body.classList.remove('has-modal');
  }

  function bindActions() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.dataset.action;
      if (action === 'close-manual') return closeManualCopy();
      if (action === 'retry') return location.reload();
      if (!state.lab) return;
      if (action === 'copy-code') copyCode(btn);
      else if (action === 'copy-link') copyLink(btn);
      else if (action === 'share') share(btn);
      else if (action === 'download') download(btn);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#manual-copy').hidden) closeManualCopy();
    });
    $('#manual-copy').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeManualCopy();
    });
    if (navigator.share) {
      var shareBtn = $('[data-action="share"]');
      if (shareBtn) shareBtn.hidden = false;
    }
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  function boot() {
    C.initTheme();
    bindActions();

    var route = parseRoute();
    if (route.type === 'page-not-found') return renderNotFound('page-not-found');

    show('loading');
    C.loadLabs().then(function (result) {
      state.labs = result.labs;
      if (route.type === 'invalid-id') return renderNotFound('invalid-id', route.raw);

      var lab = null;
      for (var i = 0; i < result.labs.length; i++) {
        if (result.labs[i].id === route.id) { lab = result.labs[i]; break; }
      }
      if (!lab) return renderNotFound('lab', route.id);

      // Normalise /lab/01, /lab/1/ and /lab/1.html to the canonical short URL
      if (route.canonical && history.replaceState) {
        history.replaceState(null, '', C.labPath(lab.id) + location.search + location.hash);
      }
      renderLab(lab);
    }).catch(renderError);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
