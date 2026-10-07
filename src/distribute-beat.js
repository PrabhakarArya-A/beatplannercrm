/* ============================================================
   Distribute Beat

   Figma: 1384:56699 (nothing picked yet), 1406:36561 and 1406:37302
   (records picked, Filter on All Modules). The toolbar, Filter and
   Records per Page are Create Beat's own (cb-toolbar.js,
   create-beat-filter.js); this file adds what is Distribute's alone —
   picking records off the map, the list of them with a visit type
   each, and the beat's name and duration.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const VISIT_TYPES = ['Order Delivery', 'Order Approval', 'Gate Approval', 'Shop Delivery', 'Stock Check'];
  const visitOptions = VISIT_TYPES.map(t => [t, t]);

  /* ── Map ── */
  const fieldMap = new FieldMap('map-canvas', 'map-area');
  fieldMap._visiblePinsOverride = CB_RECORDS;
  fieldMap.resize();
  /* The toolbar's Filter narrows the same map — see create-beat-filter.js */
  window.cbMap = fieldMap;

  $('zoom-in').addEventListener('click', () =>
    fieldMap.zoom(1.25, fieldMap.canvas.width / 2, fieldMap.canvas.height / 2));
  $('zoom-out').addEventListener('click', () =>
    fieldMap.zoom(0.8, fieldMap.canvas.width / 2, fieldMap.canvas.height / 2));

  CbToolbar.init(fieldMap, {
    modules: [['all', 'All Modules'], ['leads', 'Leads'], ['contacts', 'Contacts'],
              ['deals', 'Deals'], ['vendors', 'Vendors']],
    selected: 'all',
  });

  /* ── Picked records ── */
  /* record → its visit type, in the order they were picked */
  const picked = new Map();

  /* Figma Map-Pin, Unselected / Selected: the Bg asset with the circle
     drawn over it — a 12px #5464F2 dot, or a 14px ring of 2px white */
  const pinImg = src => {
    const img = new Image();
    img.onload = () => fieldMap.draw();
    img.src = src;
    return img;
  };
  const PIN = { off: pinImg('src/distribute/pin.svg'), on: pinImg('src/distribute/pin-selected.svg') };
  const PIN_W = 24, PIN_H = 34.2857;

  fieldMap.setPinRenderer((ctx, pin, { x, tipY, scale }) => {
    const on = picked.has(pin);
    const w = PIN_W / scale, h = PIN_H / scale;
    const top = tipY - h;
    const img = on ? PIN.on : PIN.off;
    if (img.complete) ctx.drawImage(img, x - w / 2, top, w, h);

    ctx.beginPath();
    ctx.arc(x, top + 12 / scale, 6 / scale, 0, Math.PI * 2);
    if (on) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#5464f2';
      ctx.fill();
    }
  });

  const canvas = fieldMap.canvas;
  const pinAt = e => {
    const r = canvas.getBoundingClientRect();
    return fieldMap.pinAtScreen(e.clientX - r.left, e.clientY - r.top);
  };

  /* A pin picks its record, and picks it back out */
  canvas.addEventListener('click', e => {
    if (fieldMap.didDrag) return;
    const pin = pinAt(e);
    if (!pin) return;
    if (picked.has(pin)) picked.delete(pin);
    else picked.set(pin, VISIT_TYPES[0]);
    renderPicked();
  });
  canvas.addEventListener('mousemove', e => {
    canvas.classList.toggle('db-over-pin', !fieldMap.isDragging && !!pinAt(e));
  });

  const listEl = $('db-list');

  function rowHtml(pin, type, i) {
    return `
      <li class="db-rec" data-i="${i}">
        <div class="db-rec-main">
          <div class="db-rec-text">
            <p class="db-rec-name" title="${esc(pin.label)}">${esc(pin.label)}</p>
            <p class="db-rec-mod">${esc(pin.module)}</p>
          </div>
          <div class="cb-module-wrap db-vt">
            <button class="db-small-dd" type="button" aria-haspopup="listbox" aria-expanded="false"
                    aria-label="Visit type for ${esc(pin.label)}: ${esc(type)}">
              <img class="db-small-strip" src="src/distribute/small-strip.svg" alt="" aria-hidden="true" />
              <span class="db-small-text">${esc(type)}</span>
              <span class="db-small-caret"><img src="src/cb-filter/caret.svg" alt="" aria-hidden="true" /></span>
            </button>
            ${CbMenu.html({ options: visitOptions, selected: type })}
          </div>
        </div>
        <button class="db-rec-remove" type="button" aria-label="Remove ${esc(pin.label)}">
          <span><img src="src/distribute/close-small.svg" alt="" aria-hidden="true" /></span>
        </button>
      </li>`;
  }

  function renderPicked() {
    const list = [...picked];
    const n = list.length;
    $('db-selected').hidden = n === 0;
    $('db-count').textContent = `${n} Record${n === 1 ? '' : 's'} selected`;
    listEl.innerHTML = list.map(([pin, type], i) => rowHtml(pin, type, i)).join('');
    fieldMap.draw();
    refreshContinue();
  }

  const pinAtRow = el => [...picked.keys()][Number(el.closest('.db-rec').dataset.i)];

  function closeRowMenus(except) {
    listEl.querySelectorAll('.db-vt.open').forEach(w => {
      if (w === except) return;
      w.classList.remove('open');
      w.querySelector('.db-small-dd').setAttribute('aria-expanded', 'false');
    });
  }

  listEl.addEventListener('click', e => {
    const remove = e.target.closest('.db-rec-remove');
    if (remove) { picked.delete(pinAtRow(remove)); renderPicked(); return; }

    const opt = e.target.closest('.db-vt .cb-menu-opt');
    if (opt) { picked.set(pinAtRow(opt), opt.dataset.value); renderPicked(); return; }

    const dd = e.target.closest('.db-small-dd');
    if (dd) {
      const wrap = dd.parentElement;
      const open = !wrap.classList.contains('open');
      closeRowMenus(wrap);
      wrap.classList.toggle('open', open);
      dd.setAttribute('aria-expanded', String(open));
    }
  });

  /* Read from the click's path: picking re-renders the list, so the clicked
     option has left the document by the time this runs */
  document.addEventListener('click', e => {
    if (!e.composedPath().some(n => n.classList && n.classList.contains('db-vt'))) closeRowMenus();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeRowMenus();
  });

  $('db-clear').addEventListener('click', () => { picked.clear(); renderPicked(); });

  /* Apply to all: one visit type for every picked record */
  const applyWrap = $('db-apply-wrap');
  applyWrap.insertAdjacentHTML('beforeend', CbMenu.html({ options: visitOptions }));
  CbMenu.attach(applyWrap, {
    trigger: $('db-apply'),
    onPick(type) {
      picked.forEach((_, pin) => picked.set(pin, type));
      renderPicked();
    },
  });

  /* ── Name and duration ── */
  const nameIn  = $('db-name');
  const startIn = $('db-start');
  const endIn   = $('db-end');

  /* DD/MM/YYYY, slashes added as the digits go in */
  const parseDate = v => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (!m) return null;
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null;
  };

  [startIn, endIn].forEach(input => {
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '').slice(0, 8);
      input.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
      input.closest('.db-input').classList.remove('is-invalid');
      refreshContinue();
    });
    /* Marked only once the field is left, not while it is being typed */
    input.addEventListener('blur', () => {
      const bad = input.value !== '' && !dateOk(input);
      input.closest('.db-input').classList.toggle('is-invalid', bad);
    });
  });
  nameIn.addEventListener('input', refreshContinue);

  /* The end may be left empty for a one-day beat, and may not come first */
  function dateOk(input) {
    const start = parseDate(startIn.value);
    if (input === startIn) return !!start;
    const end = parseDate(endIn.value);
    return !!end && (!start || end >= start);
  }

  const continueBtn = $('db-continue');
  function refreshContinue() {
    const ok = nameIn.value.trim() !== ''
      && dateOk(startIn)
      && (endIn.value === '' || dateOk(endIn))
      && picked.size > 0;
    continueBtn.disabled = !ok;
    continueBtn.classList.toggle('enabled', ok);
  }

  $('cb-cancel').addEventListener('click', () => { window.location.href = 'index.html'; });

  renderPicked();
});
