/* ============================================================
   Create Beat — dropdown menu

   Figma "Dropdown Value": 5767:1127941 (the module switcher) and
   5767:1127823 (Records per Page). They are one component: `title` is its
   only optional property, and when it is given the menu opens on a heading
   row, as Records per Page does. The filter panel's field menus are built
   from the same markup.
   ============================================================ */
const CbMenu = (() => {
  const TICK = 'src/cb-filter/dropdown-tick.svg';

  const esc = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* options: [[value, text], …]; selected: the value carrying the tick */
  function html({ id, title, options, selected }) {
    const headId = id && title ? `${id}-head` : '';
    const head = title
      ? `<p class="cb-menu-head"${headId ? ` id="${headId}"` : ''}>${esc(title)}</p>`
      : '';
    const items = options.map(([value, text]) => {
      const on = String(value) === String(selected);
      return `
        <li class="cb-menu-opt${on ? ' is-selected' : ''}" role="option"
            aria-selected="${on}" data-value="${esc(value)}">
          <span class="cb-menu-tick" aria-hidden="true"><img src="${TICK}" alt="" /></span>
          <span class="cb-menu-text">${esc(text)}</span>
        </li>`;
    }).join('');
    return `
      <div class="cb-menu">
        ${head}
        <ul class="cb-menu-list" role="listbox"${id ? ` id="${id}"` : ''}${headId ? ` aria-labelledby="${headId}"` : ''}>${items}
        </ul>
      </div>`;
  }

  function select(menu, value) {
    menu.querySelectorAll('.cb-menu-opt').forEach(li => {
      const on = li.dataset.value === String(value);
      li.classList.toggle('is-selected', on);
      li.setAttribute('aria-selected', String(on));
    });
  }

  /* Open, pick and dismiss for a menu hung from a trigger inside `wrap`.
     The wrap carries .open while the menu is down. */
  function attach(wrap, { trigger, onPick, onToggle }) {
    const menu = wrap.querySelector('.cb-menu');
    const isOpen = () => wrap.classList.contains('open');

    function toggle(open) {
      wrap.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
      if (onToggle) onToggle(open);
    }

    trigger.addEventListener('click', () => toggle(!isOpen()));
    /* A non-button trigger (role="button") still opens from the keyboard */
    if (trigger.tagName !== 'BUTTON') {
      trigger.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggle(!isOpen());
      });
    }

    menu.addEventListener('click', e => {
      const li = e.target.closest('.cb-menu-opt');
      if (!li) return;
      select(menu, li.dataset.value);
      toggle(false);
      onPick(li.dataset.value, li.querySelector('.cb-menu-text').textContent);
    });

    document.addEventListener('click', e => {
      if (isOpen() && !wrap.contains(e.target)) toggle(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen()) { toggle(false); trigger.focus(); }
    });

    return { toggle };
  }

  return { html, select, attach };
})();
