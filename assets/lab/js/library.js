/*!
 * Lab Library — landing page (/lab/)
 * Lists every lab in data/labs.json with search, language filter and sort.
 * Filter state is mirrored into the query string (?q=&lang=&sort=) so a
 * filtered view can be shared too.
 */
(function () {
  'use strict';

  var C = window.LabCore;
  var el = C.el;
  var $ = function (sel) { return document.querySelector(sel); };

  var labs = [];
  var search = $('#lib-search');
  var langSel = $('#lib-lang');
  var sortSel = $('#lib-sort');
  var list = $('#lib-list');

  function readParams() {
    var p = new URLSearchParams(location.search);
    search.value = p.get('q') || '';
    sortSel.value = p.get('sort') === 'desc' ? 'desc' : 'asc';
    var lang = p.get('lang');
    if (lang) langSel.value = C.normalizeLanguage(lang);
    if (langSel.selectedIndex < 0) langSel.value = '';
  }

  function writeParams() {
    var p = new URLSearchParams();
    if (search.value.trim()) p.set('q', search.value.trim());
    if (langSel.value) p.set('lang', langSel.value);
    if (sortSel.value === 'desc') p.set('sort', 'desc');
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  function normalize(s) {
    return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  }

  function matches(lab, terms) {
    if (!terms.length) return true;
    var hay = normalize('#' + lab.id + ' ' + lab.title + ' ' + lab.subject + ' ' + C.getLanguage(lab.language).label);
    return terms.every(function (t) {
      if (/^#?\d+$/.test(t)) return lab.id === parseInt(t.replace('#', ''), 10) || hay.indexOf(t) !== -1;
      return hay.indexOf(t) !== -1;
    });
  }

  function card(lab) {
    var lang = C.getLanguage(lab.language);
    return el('li', { class: 'lab-card-item' }, [
      el('a', { class: 'lab-card', href: C.labPath(lab.id) }, [
        el('span', { class: 'lab-card-id mono', text: '#' + lab.id }),
        el('span', { class: 'lab-card-body' }, [
          el('span', { class: 'lab-card-subject', text: lab.subject }),
          el('span', { class: 'lab-card-title', text: lab.title }),
          lab.description ? el('span', { class: 'lab-card-desc', text: lab.description }) : null
        ]),
        el('span', { class: 'lab-card-side' }, [
          el('span', { class: 'lang-dot', 'data-lang': lab.language, text: lang.label }),
          lab.updatedAt ? el('time', { class: 'lab-card-date', datetime: lab.updatedAt, text: C.formatDate(lab.updatedAt) }) : null
        ]),
        el('span', { class: 'lab-card-arrow', 'aria-hidden': 'true', text: '→' })
      ])
    ]);
  }

  function setState(opts) {
    var box = $('#lib-state');
    if (!opts) { box.hidden = true; return; }
    $('#lib-state-code').textContent = opts.code || '';
    $('#lib-state-title').textContent = opts.title;
    $('#lib-state-text').textContent = opts.text || '';
    var actions = $('#lib-state-actions');
    actions.textContent = '';
    (opts.actions || []).forEach(function (a) { actions.appendChild(a); });
    box.hidden = false;
  }

  function render() {
    var terms = normalize(search.value).split(/\s+/).filter(Boolean);
    var lang = langSel.value;
    var dir = sortSel.value === 'desc' ? -1 : 1;

    var shown = labs
      .filter(function (lab) { return (!lang || lab.language === lang) && matches(lab, terms); })
      .sort(function (a, b) { return (a.id - b.id) * dir; });

    list.textContent = '';
    list.removeAttribute('aria-busy');

    var total = labs.length;
    $('#lib-count').textContent = shown.length === total
      ? total + (total === 1 ? ' lab available' : ' labs available')
      : shown.length + ' of ' + total + ' labs';

    if (!total) {
      setState({
        code: '{ }',
        title: 'No labs yet',
        text: 'The library is empty. Add an entry to data/labs.json and it will appear here automatically.',
        actions: [el('a', { class: 'btn', href: '/', text: 'Back to portfolio' })]
      });
      return;
    }
    if (!shown.length) {
      var clear = el('button', { class: 'btn btn-primary', type: 'button', text: 'Clear filters' });
      clear.addEventListener('click', function () {
        search.value = ''; langSel.value = ''; update(); search.focus();
      });
      setState({ code: '0', title: 'No matching labs', text: 'Nothing matches your search. Try a different term or language.', actions: [clear] });
      return;
    }
    setState(null);

    var ul = el('ul', { class: 'lab-cards' });
    shown.forEach(function (lab) { ul.appendChild(card(lab)); });
    list.appendChild(ul);
  }

  function update() { writeParams(); render(); }

  function populateLanguages() {
    var counts = {};
    labs.forEach(function (lab) { counts[lab.language] = (counts[lab.language] || 0) + 1; });
    Object.keys(counts)
      .sort(function (a, b) { return C.getLanguage(a).label.localeCompare(C.getLanguage(b).label); })
      .forEach(function (key) {
        langSel.appendChild(el('option', { value: key, text: C.getLanguage(key).label + ' (' + counts[key] + ')' }));
      });
  }

  function boot() {
    C.initTheme();
    var debounce;
    search.addEventListener('input', function () { clearTimeout(debounce); debounce = setTimeout(update, 80); });
    langSel.addEventListener('change', update);
    sortSel.addEventListener('change', update);
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        e.preventDefault();
        search.focus();
      } else if (e.key === 'Escape' && e.target === search && search.value) {
        search.value = ''; update();
      }
    });

    C.loadLabs().then(function (result) {
      labs = result.labs;
      populateLanguages();
      readParams();
      render();
    }).catch(function (err) {
      list.textContent = '';
      list.removeAttribute('aria-busy');
      $('#lib-count').textContent = 'Unavailable';
      var retry = el('button', { class: 'btn btn-primary', type: 'button', text: 'Try again' });
      retry.addEventListener('click', function () { location.reload(); });
      setState({
        code: 'ERR',
        title: err.kind === 'network' ? 'Couldn’t load the library' : 'Library data is invalid',
        text: err.message,
        actions: [retry]
      });
    });
  }

  boot();
})();
