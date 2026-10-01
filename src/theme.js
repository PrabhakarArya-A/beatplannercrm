/* ============================================================
   Light / dark theme — home page and docs viewer only

   Three states, not two. `data-theme` absent means "follow the system",
   which is the default and the one most people want; an explicit
   "light" or "dark" is a deliberate override and is remembered.

   The attribute itself is set by a tiny inline snippet in each page's
   <head> — it has to run before first paint or the wrong theme flashes.
   This file only wires up the button.
   ============================================================ */
(function () {
  const KEY = 'bp-theme';
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

  /* What the page is actually showing, whatever the stored preference */
  const showing = () => root.getAttribute('data-theme') || (systemDark() ? 'dark' : 'light');

  function paint() {
    const dark = showing() === 'dark';
    btn.innerHTML = `<i class="ti ti-${dark ? 'sun' : 'moon'}" aria-hidden="true"></i>`;
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.title = stored()
      ? `${dark ? 'Dark' : 'Light'} mode · double-click to follow the system`
      : `Following the system (${dark ? 'dark' : 'light'})`;
  }

  btn.addEventListener('click', () => {
    const next = showing() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    paint();
  });

  /* A way back to the system setting without clearing site data */
  btn.addEventListener('dblclick', () => {
    root.removeAttribute('data-theme');
    try { localStorage.removeItem(KEY); } catch { /* private mode */ }
    paint();
  });

  /* Follow the system while no explicit choice is stored */
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => { if (!stored()) paint(); });

  paint();
})();
