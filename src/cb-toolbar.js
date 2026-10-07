/* ============================================================
   Map toolbar — Create Beat and Distribute Beat

   The module menu, the pagination and Records per Page, around one
   FieldMap. Both menus are the one CbMenu component; Records per Page is
   the titled one. The Filter beside the module menu lives in
   create-beat-filter.js and talks to this through two events:
   'cb:module' (sent from here) and 'cb:filter' (sent from there).
   ============================================================ */
const CbToolbar = {
  /* modules: [[key, text], …]; 'all' as a key shows every module */
  init(fieldMap, { modules, selected }) {
    const $ = id => document.getElementById(id);
    const toolbar = document.querySelector('.cb-map-toolbar');

    const showModule = key => fieldMap.setModules(key === 'all' ? [] : [key]);

    /* ── Module ── */
    const modWrap = $('cb-module-wrap');
    modWrap.insertAdjacentHTML('beforeend', CbMenu.html({ id: 'cb-module-list', options: modules, selected }));
    CbMenu.attach(modWrap, {
      trigger: $('cb-module-select'),
      onPick(module, text) {
        $('cb-module-label').textContent = text;
        /* the filter built for the last module does not carry over */
        document.dispatchEvent(new CustomEvent('cb:module', { detail: module }));
        showModule(module);
        page = 0;
        renderPage();
      },
    });

    /* ── Pagination ── */
    /* The map shows one page of the module's records — what the Filter
       leaves, `perPage` at a time. The map loads at most 50 records a
       page, so Records per Page stops there. */
    const prevBtn = $('cb-prev');
    const nextBtn = $('cb-next');
    let page = 0;
    let perPage = 50;

    function setArrow(btn, enabled, img) {
      btn.disabled = !enabled;
      btn.querySelector('img').src = `src/cb-filter/${enabled ? img : 'arrow-back-disabled'}.svg`;
    }

    function renderPage() {
      const total = fieldMap.matchingPins().length;
      const pages = Math.max(1, Math.ceil(total / perPage));
      page = Math.min(page, pages - 1);
      fieldMap.setPageWindow(page * perPage, perPage);
      $('cb-page-from').textContent = total ? page * perPage + 1 : 0;
      $('cb-page-to').textContent   = Math.min(total, (page + 1) * perPage);
      setArrow(prevBtn, page > 0, 'arrow-back');
      setArrow(nextBtn, page < pages - 1, 'arrow-next');
      /* Figma has no disabled Next, so it is the disabled Back, mirrored */
      nextBtn.classList.toggle('is-mirrored', nextBtn.disabled);
    }

    prevBtn.addEventListener('click', () => { page--; renderPage(); });
    nextBtn.addEventListener('click', () => { page++; renderPage(); });
    /* A filter applied or lifted starts again from the first page */
    document.addEventListener('cb:filter', () => { page = 0; renderPage(); });

    /* ── Records per Page ── */
    const ppWrap = $('cb-perpage');
    const ppBtn  = $('cb-settings');
    ppWrap.insertAdjacentHTML('beforeend', CbMenu.html({
      id: 'cb-perpage-list',
      title: 'Records per Page',
      options: [10, 20, 30, 40, 50].map(n => [n, n]),
      selected: perPage,
    }));
    CbMenu.attach(ppWrap, {
      trigger: ppBtn,
      onPick(size) {
        /* stay on the page holding the first record now on show */
        const first = page * perPage;
        perPage = Number(size);
        page = Math.floor(first / perPage);
        renderPage();
        ppBtn.setAttribute('aria-label', `Records per Page: ${size}`);
        ppBtn.title = `Records per Page: ${size}`;
      },
      /* above the map's own controls while it is down */
      onToggle: open => toolbar.classList.toggle('cb-pp-open', open),
    });

    showModule(selected);
    renderPage();
    return { renderPage };
  },
};
