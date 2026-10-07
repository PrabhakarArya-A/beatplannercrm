/* ============================================================
   Docs viewer

   Reads whatever .md files are sitting in /docs and lists them —
   nothing is hard-coded, so a new spec dropped in the folder shows up
   without touching this file. The folder index the static server emits
   is the source of truth; if a host serves its own index.html there
   instead, we fall back to the names we know.

   Each document's own first heading becomes its title and its first
   paragraph its summary, so the list reads as documents rather than
   filenames.
   ============================================================ */
(function () {
  const FOLDER = 'docs/';

  /* Used only when the folder cannot be listed — see loadIndex() */
  const FALLBACK = [
    'beat-detail-view-spec.md',
    'beat-engine-spec.md',
    'beat-planner-architecture.md',
    'field-rules-spec.md',
    'planner-configuration-spec.md',
    'porting-to-ui-lib.md',
    'record-filter-pagination-spec.md',
    'visit-types-spec.md',
  ];

  const $ = id => document.getElementById(id);
  const listEl  = $('dv-list');
  const docEl   = $('dv-doc');
  const headEl  = $('dv-doc-head');
  const titleEl = $('dv-doc-title');
  const metaEl  = $('dv-doc-meta');
  const rawEl   = $('dv-raw');
  const tocEl   = $('dv-toc');
  const countEl = $('dv-count');
  const filterEl = $('dv-filter');

  let docs = [];        // { file, title, summary, modified, body }
  let current = null;

  marked.setOptions({ gfm: true, breaks: false });

  /* ── Reading the folder ────────────────────────────── */
  async function loadIndex() {
    try {
      const res = await fetch(FOLDER);
      if (!res.ok) throw new Error(res.status);
      const html = await res.text();
      const links = [...new DOMParser().parseFromString(html, 'text/html')
        .querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && h.toLowerCase().endsWith('.md'))
        .map(h => decodeURIComponent(h.split('/').pop()));
      if (links.length) return [...new Set(links)].sort();
      throw new Error('no markdown in listing');
    } catch {
      return FALLBACK;
    }
  }

  /* The H1 is the title; the first real paragraph after it is the
     summary. The summary is no longer shown in the list — the list is
     titles only — but it is still worth keeping, because the filter
     searches it. Falling back to the filename keeps a malformed doc
     listed rather than hiding it. */
  function describe(file, body, modified) {
    const lines = body.split('\n');
    const h1 = lines.find(l => /^#\s+/.test(l));
    const title = h1 ? h1.replace(/^#\s+/, '').trim() : prettyName(file);

    let summary = '';
    const start = h1 ? lines.indexOf(h1) + 1 : 0;
    for (let i = start; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l || l.startsWith('#') || l.startsWith('|') || l.startsWith('---')) continue;
      summary = l.replace(/[*_`]/g, '');
      break;
    }
    return { file, title, summary, modified, body };
  }

  const prettyName = file => file
    .replace(/\.md$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/^./, c => c.toUpperCase());

  function updatedOn(header) {
    if (!header) return '';
    const d = new Date(header);
    if (isNaN(d)) return '';
    return 'Updated ' + d.toLocaleDateString('en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const escape = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── The list ──────────────────────────────────────── */
  function renderList(filter = '') {
    const q = filter.trim().toLowerCase();
    const shown = q
      ? docs.filter(d => (d.title + ' ' + d.summary + ' ' + d.file).toLowerCase().includes(q))
      : docs;

    countEl.textContent = q
      ? `${shown.length} of ${docs.length}`
      : `${docs.length} document${docs.length === 1 ? '' : 's'}`;

    if (!shown.length) {
      listEl.innerHTML = '<p class="dv-empty">No documents match that.</p>';
      return;
    }

    /* Titles only — everything else about a document is in its header
       once it is open, and the list reads faster without it */
    listEl.innerHTML = shown.map(d => `
      <button class="dv-item ${current === d.file ? 'active' : ''}" type="button" data-file="${escape(d.file)}">
        ${escape(d.title)}
      </button>`).join('');
  }

  /* ── The document ──────────────────────────────────── */
  function show(file) {
    const doc = docs.find(d => d.file === file);
    if (!doc) return;
    current = file;

    titleEl.textContent = doc.title;
    /* The filename identifies the document; when it was last touched is
       the thing anyone reading a living spec needs to see, so it carries
       the emphasis */
    const updated = updatedOn(doc.modified);
    metaEl.innerHTML =
      `<span class="dv-file">${escape(doc.file)}</span>` +
      (updated
        ? `<span class="dv-updated"><i class="ti ti-clock" aria-hidden="true"></i>${escape(updated)}</span>`
        : '');
    /* `download` saves the source rather than navigating to it, and
       naming it keeps the original filename on disk */
    rawEl.href = FOLDER + doc.file;
    rawEl.setAttribute('download', doc.file);
    headEl.hidden = false;

    /* The H1 is already in the page header, so drop it from the body */
    docEl.innerHTML = marked.parse(doc.body.replace(/^#\s+.*\n/, ''));

    buildToc();
    renderList(filterEl.value);
    docEl.scrollIntoView({ block: 'start' });
    document.querySelector('.dv-main').scrollTop = 0;
    if (location.hash.slice(1) !== file) history.replaceState(null, '', '#' + file);
  }

  /* Anchors are added here rather than by the parser, so they stay
     stable whichever renderer is in use */
  function buildToc() {
    const heads = [...docEl.querySelectorAll('h2')];
    if (!heads.length) { tocEl.innerHTML = ''; return; }

    heads.forEach((h, i) => { h.id = h.id || `s-${i}`; });
    tocEl.innerHTML =
      '<p class="dv-toc-title">On this page</p>' +
      heads.map(h => `<a href="#${h.id}" data-target="${h.id}">${escape(h.textContent)}</a>`).join('');

    /* Highlight whichever section is currently in view */
    const links = new Map([...tocEl.querySelectorAll('a')].map(a => [a.dataset.target, a]));
    if (window._dvObserver) window._dvObserver.disconnect();
    window._dvObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const link = links.get(e.target.id);
        if (link && e.isIntersecting) {
          tocEl.querySelectorAll('a.here').forEach(a => a.classList.remove('here'));
          link.classList.add('here');
        }
      });
    }, { rootMargin: '0px 0px -75% 0px' });
    heads.forEach(h => window._dvObserver.observe(h));
  }

  /* ── Events ────────────────────────────────────────── */
  listEl.addEventListener('click', e => {
    const btn = e.target.closest('.dv-item');
    if (btn) show(btn.dataset.file);
  });

  tocEl.addEventListener('click', e => {
    const a = e.target.closest('a[data-target]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.target)
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  filterEl.addEventListener('input', () => renderList(filterEl.value));

  window.addEventListener('hashchange', () => {
    const file = decodeURIComponent(location.hash.slice(1));
    if (file && file !== current) show(file);
  });

  /* ── Boot ──────────────────────────────────────────── */
  (async function init() {
    listEl.innerHTML = '<p class="dv-empty">Reading the docs folder…</p>';
    const files = await loadIndex();

    const loaded = await Promise.all(files.map(async file => {
      try {
        const res = await fetch(FOLDER + file);
        if (!res.ok) return null;
        /* Last-Modified is a safelisted response header, so the date is
           available without a second request */
        return describe(file, await res.text(), res.headers.get('Last-Modified'));
      } catch {
        return null;
      }
    }));

    docs = loaded.filter(Boolean);

    if (!docs.length) {
      countEl.textContent = '';
      listEl.innerHTML = '<p class="dv-empty">No documents found in the docs folder.</p>';
      return;
    }

    renderList();
    /* A hash means someone shared a link to one document */
    const wanted = decodeURIComponent(location.hash.slice(1));
    show(docs.some(d => d.file === wanted) ? wanted : docs[0].file);
  })();
})();
