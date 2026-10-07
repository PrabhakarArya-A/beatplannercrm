/* ============================================================
   Create Beat — the toolbar's Filter

   Figma: Filter Cases 5763:222731 (the button's four states) and the
   "Filter - 2.0 list" panel — 5763:222578 (one row, untouched) and
   5763:222359 (three rows, with Clear All / Apply Filter).

   It narrows the pins the map shows for the module chosen beside it, through
   FieldMap.setPinFilter(). Distribute Beat shares it: there the toolbar can
   also be on All Modules (Figma 1406:36561 / 1406:37302), and then every
   row starts with a Module field — Module, Field, Operator, Value — and a
   record is held to the rows written for its own module. Edits live in the panel until Apply Filter, which
   leaves the panel open and rests until the conditions change again. The
   panel is rebuilt from what is applied every time it opens, so closing it
   without applying simply leaves the applied filter as it was.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const asset = name => `src/cb-filter/${name}.svg`;

  const esc = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── What can be filtered on ───────────────────────── */
  /* Operators by field type. Numbers read as symbols, the way the frames
     show them ("<=", ">="); text and picklists read as words ("is"). */
  const OPS = {
    text: [
      ['is', 'is'], ['isnt', "isn't"], ['contains', 'contains'],
      ['ncontains', "doesn't contain"], ['starts', 'starts with'],
    ],
    picklist: [['is', 'is'], ['isnt', "isn't"]],
    number: [
      ['eq', '='], ['neq', '!='], ['lt', '<'], ['lte', '<='], ['gt', '>'], ['gte', '>='],
    ],
  };

  const FIELDS = [
    { key: 'name',      label: 'Name',                  type: 'text' },
    { key: 'status',    label: 'Visit Status',          type: 'picklist',
      options: ['Visited', 'Pending', 'Follow-up', 'Scheduled', 'New'] },
    { key: 'city',      label: 'City',                  type: 'picklist',
      options: ['Chennai', 'Bengaluru', 'Hyderabad', 'Coimbatore'] },
    { key: 'owner',     label: 'Record Owner',          type: 'picklist',
      options: ['Cameron Williamson', 'Priya Raman', 'Vikram Shah'] },
    { key: 'revenue',   label: 'Annual Revenue',        type: 'number' },
    { key: 'lastVisit', label: 'Days Since Last Visit', type: 'number' },
  ];

  const fieldByKey = key => FIELDS.find(f => f.key === key);

  /* The modules a row can be written for, when the toolbar is on All Modules */
  const MODULES = [...new Set((typeof CB_RECORDS !== 'undefined' ? CB_RECORDS : []).map(r => r.module))].map(m => [m, m]);

  /* Create Beat's records (create-beat-records.js) carry every field the
     panel offers; the name is the pin's label */
  const valueOf = (pin, key) => (key === 'name' ? pin.label : pin[key]);

  /* Every condition has to hold — the panel's rows are joined by AND */
  function passes(pin, c) {
    const v = valueOf(pin, c.field);
    if (v === undefined || v === null) return false;

    if (fieldByKey(c.field).type === 'number') {
      const n = Number(v), t = Number(c.value);
      switch (c.op) {
        case 'eq':  return n === t;
        case 'neq': return n !== t;
        case 'lt':  return n < t;
        case 'lte': return n <= t;
        case 'gt':  return n > t;
        case 'gte': return n >= t;
      }
      return true;
    }

    const a = String(v).toLowerCase();
    const b = String(c.value).trim().toLowerCase();
    switch (c.op) {
      case 'is':        return a === b;
      case 'isnt':      return a !== b;
      case 'contains':  return a.includes(b);
      case 'ncontains': return !a.includes(b);
      case 'starts':    return a.startsWith(b);
    }
    return true;
  }

  /* ── State ─────────────────────────────────────────── */
  const blank = () => ({ module: null, field: null, op: null, value: '' });
  const copy  = list => list.map(c => ({ ...c }));

  let applied = [];         /* the conditions in force */
  let rows    = [blank()];  /* what the panel is showing */
  const invalid = new Set();

  /* ── Elements ──────────────────────────────────────── */
  const root     = $('cbf');
  const btn      = $('cbf-btn');
  const openBtn  = $('cbf-open');
  const clearBtn = $('cbf-clear');
  const tip      = $('cbf-tip');
  const pop      = $('cbf-pop');
  const rowsEl   = $('cbf-rows');
  const cta      = $('cbf-cta');
  const applyBtn = $('cbf-apply');
  const toolbar  = document.querySelector('.cb-map-toolbar');

  /* The toolbar's module: a module key, or 'all' (Distribute Beat only) */
  let scope = root.dataset.module || 'contacts';
  const allModules = () => scope === 'all';

  /* ── Rendering ─────────────────────────────────────── */
  /* A dropdown field: the page's menu component (CbMenu) inside the Figma
     control — 3px lead-in, label, filled caret */
  function dropdownHtml({ i, kind, widthCls, label, placeholder, disabled, bad, options, current }) {
    const list = disabled ? '' : CbMenu.html({ options, selected: current });
    return `
      <div class="cb-module-wrap cbf-dd ${widthCls}" data-i="${i}" data-kind="${kind}">
        <button class="cbf-box${disabled ? ' is-disabled' : ''}${bad ? ' is-invalid' : ''}" type="button"
                aria-haspopup="listbox" aria-expanded="false"${disabled ? ' disabled' : ''}>
          <img class="cb-strip" src="${asset('field-strip')}" alt="" aria-hidden="true" />
          <span class="cbf-box-text${placeholder ? ' is-placeholder' : ''}">${esc(label)}</span>
          <span class="cbf-box-caret">
            <img src="${asset(disabled ? 'caret-disabled' : 'caret')}" alt="" aria-hidden="true" />
          </span>
        </button>${list}
      </div>`;
  }

  /* Picklists compare against a choice, so their value is a dropdown; text
     and numbers are typed. Before a field is chosen it is a disabled box. */
  function valueHtml(row, i) {
    const f = row.field && fieldByKey(row.field);
    const bad = invalid.has(i);

    if (f && f.type === 'picklist') {
      return dropdownHtml({
        i, kind: 'value', widthCls: 'cbf-w-val',
        label: row.value || 'Select', placeholder: !row.value, bad,
        options: f.options.map(o => [o, o]), current: row.value,
      });
    }

    return `
      <div class="cbf-w-val">
        <label class="cbf-box${f ? '' : ' is-disabled'}${bad ? ' is-invalid' : ''}">
          <img class="cb-strip" src="${asset('input-strip')}" alt="" aria-hidden="true" />
          <input class="cbf-input" type="text" data-i="${i}" aria-label="Value"
                 value="${esc(row.value)}"
                 ${f && f.type === 'number' ? 'inputmode="decimal"' : ''}
                 ${f ? '' : 'disabled'} />
        </label>
      </div>`;
  }

  /* − on every row once there is more than one; + on the last row only */
  function rowHtml(row, i) {
    const f   = row.field && fieldByKey(row.field);
    const ops = f ? OPS[f.type] : [];
    const op  = f ? (ops.find(o => o[0] === row.op) || ops[0]) : null;
    const many = rows.length > 1;
    const last = i === rows.length - 1;

    /* On All Modules the field waits for its module, reading "None" until then */
    const all = allModules();
    const fieldOff = all && !row.module;

    return `
      <div class="cbf-row" data-i="${i}">
        <div class="cbf-fields">
          ${all ? dropdownHtml({
            i, kind: 'module', widthCls: 'cbf-w-mod',
            label: row.module || 'Select Module', placeholder: !row.module,
            options: MODULES, current: row.module,
          }) : ''}
          ${dropdownHtml({
            i, kind: 'field', widthCls: 'cbf-w-field',
            label: f ? f.label : (fieldOff ? 'None' : 'Select Field'),
            placeholder: !f && !fieldOff, disabled: fieldOff,
            options: FIELDS.map(x => [x.key, x.label]), current: row.field,
          })}
          ${dropdownHtml({
            i, kind: 'op', widthCls: 'cbf-w-op',
            label: op ? op[1] : 'None', disabled: !f,
            options: ops, current: row.op,
          })}
          ${valueHtml(row, i)}
        </div>
        <div class="cbf-row-acts">
          ${many ? `
            <button class="cbf-act" type="button" data-act="remove" data-i="${i}" aria-label="Remove this condition">
              <img src="${asset('criteria-remove')}" alt="" aria-hidden="true" />
            </button>` : ''}
          ${last ? `
            <button class="cbf-act" type="button" data-act="add" aria-label="Add a condition">
              <img src="${asset('criteria-add')}" alt="" aria-hidden="true" />
            </button>` : ''}
        </div>
      </div>`;
  }

  /* The panel's conditions as they would be applied: rows with no field are
     unused, values are trimmed — the same shape apply() stores */
  const asConditions = list => list
    .filter(r => r.field)
    .map(r => ({ module: r.module, field: r.field, op: r.op, value: String(r.value).trim() }));

  /* Whether the panel says anything different from what is already in force.
     Apply Filter only has work to do when it does. */
  const changed = () =>
    JSON.stringify(asConditions(rows)) !== JSON.stringify(asConditions(applied));

  function syncApply() {
    applyBtn.disabled = !changed();
  }

  function render() {
    /* the four-field rows are narrower per field, as the frames size them */
    root.classList.toggle('cbf-all', allModules());
    rowsEl.innerHTML = rows.map(rowHtml).join('');
    /* Nothing chosen is nothing to apply or clear — the one-row frame
       carries no buttons at all */
    cta.hidden = !rows.some(r => r.field || r.module);
    syncApply();
  }

  /* ── Applying ──────────────────────────────────────── */
  function commit() {
    const map = window.cbMap;
    if (map) {
      /* On All Modules a record answers only to its own module's rows, and a
         module with no rows is left out — the filter names what it shows */
      const test = !applied.length ? null
        : allModules()
          ? pin => {
              const own = applied.filter(c => c.module === pin.module);
              return own.length > 0 && own.every(c => passes(pin, c));
            }
          : pin => applied.every(c => passes(pin, c));
      map.setPinFilter(test);
    }
    /* the pagination re-counts what is left */
    document.dispatchEvent(new CustomEvent('cb:filter'));
    btn.classList.toggle('is-applied', applied.length > 0);
    openBtn.setAttribute('aria-label',
      applied.length ? `Filter, ${applied.length} applied` : 'Filter');

    /* The ✕'s tooltip names how many it will lift — and doubles as its
       accessible name, the tooltip itself being hidden from assistive tech */
    const n = applied.length;
    const clearText = `Clear ${n} Filter${n === 1 ? '' : 's'}`;
    tip.textContent = clearText;
    clearBtn.setAttribute('aria-label', clearText);
  }

  /* A row with no field is simply unused. A row with a field but nothing to
     compare it to — or a number that is not one — is held back and marked,
     rather than being dropped without a word. */
  function apply() {
    invalid.clear();
    const complete = [];
    rows.forEach((r, i) => {
      if (!r.field) return;
      const v = String(r.value).trim();
      const numeric = fieldByKey(r.field).type === 'number';
      if (v !== '' && (!numeric || Number.isFinite(Number(v)))) {
        complete.push({ module: r.module, field: r.field, op: r.op, value: v });
      } else {
        invalid.add(i);
      }
    });
    if (invalid.size) { render(); return; }

    applied = complete;
    commit();
    /* The panel stays open — the map has just answered the conditions, and
       the next refinement is most likely to the ones still on show. With
       nothing now different, Apply Filter rests until something changes. */
    render();
  }

  /* ── The panel ─────────────────────────────────────── */
  function closeMenus(except) {
    rowsEl.querySelectorAll('.cbf-dd.open').forEach(dd => {
      if (dd === except) return;
      dd.classList.remove('open');
      dd.querySelector('.cbf-box').setAttribute('aria-expanded', 'false');
    });
  }

  /* Rebuilt from what is applied on every open — so unapplied edits are
     discarded by closing, without anything having to be put back */
  function openPanel() {
    rows = applied.length ? copy(applied) : [blank()];
    invalid.clear();
    render();
    pop.hidden = false;
    btn.classList.add('is-open');
    toolbar.classList.add('cbf-raised');
    openBtn.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    closeMenus();
    pop.hidden = true;
    btn.classList.remove('is-open');
    toolbar.classList.remove('cbf-raised');
    openBtn.setAttribute('aria-expanded', 'false');
  }

  function choose(li) {
    const dd = li.closest('.cbf-dd');
    const i = Number(dd.dataset.i);
    const row = rows[i];
    const val = li.dataset.value;

    if (dd.dataset.kind === 'module') {
      /* Another module's fields start the row over */
      if (row.module !== val) Object.assign(row, { module: val, field: null, op: null, value: '' });
    } else if (dd.dataset.kind === 'field') {
      /* A new field brings its own operators and starts its value afresh */
      if (row.field !== val) {
        row.field = val;
        row.op = OPS[fieldByKey(val).type][0][0];
        row.value = '';
      }
    } else if (dd.dataset.kind === 'op') {
      row.op = val;
    } else {
      row.value = val;
    }
    invalid.delete(i);
    render();
  }

  /* ── Events ────────────────────────────────────────── */
  openBtn.addEventListener('click', () => (pop.hidden ? openPanel() : closePanel()));

  /* The ✕ lifts the filter outright. With the panel shut it stays shut; with
     it open, the panel empties too — leaving the old rows on show would
     present a filter that is no longer in force. */
  clearBtn.addEventListener('click', () => {
    applied = [];
    commit();
    if (!pop.hidden) {
      rows = [blank()];
      invalid.clear();
      render();
    }
  });

  $('cbf-pop-close').addEventListener('click', closePanel);
  $('cbf-apply').addEventListener('click', apply);

  /* Clear All empties the panel and lifts the filter, and leaves the panel
     open on a single fresh row — which is the one-row frame, buttons and all
     gone, since there is nothing left to apply */
  $('cbf-clear-all').addEventListener('click', () => {
    applied = [];
    commit();
    rows = [blank()];
    invalid.clear();
    render();
  });

  rowsEl.addEventListener('click', e => {
    const act = e.target.closest('.cbf-act');
    if (act) {
      if (act.dataset.act === 'add') rows.push(blank());
      else rows.splice(Number(act.dataset.i), 1);
      invalid.clear();
      render();
      return;
    }

    const li = e.target.closest('.cbf-dd .cb-menu-opt');
    if (li) { choose(li); return; }

    const box = e.target.closest('.cbf-dd .cbf-box');
    if (box && !box.disabled) {
      const dd = box.closest('.cbf-dd');
      const open = !dd.classList.contains('open');
      closeMenus(dd);
      dd.classList.toggle('open', open);
      box.setAttribute('aria-expanded', String(open));
    }
  });

  /* Typing updates the state but not the markup — re-rendering here would
     take the caret out of the field on every key */
  rowsEl.addEventListener('input', e => {
    const input = e.target.closest('.cbf-input');
    if (!input) return;
    const i = Number(input.dataset.i);
    rows[i].value = input.value;
    if (invalid.delete(i)) input.closest('.cbf-box').classList.remove('is-invalid');
    syncApply();
  });

  /* Read against the path the click took when it happened, not the target's
     ancestors now: choosing an option or removing a row re-renders the
     panel, so the clicked node has already left the document by the time
     this runs, and .closest() would have it "outside" and close the panel. */
  document.addEventListener('click', e => {
    if (pop.hidden) return;
    const path = e.composedPath();
    const inside = cls => path.some(n => n.classList && n.classList.contains(cls));
    if (!inside('cbf-dd')) closeMenus();
    if (!path.includes(root)) closePanel();
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || pop.hidden) return;
    if (rowsEl.querySelector('.cbf-dd.open')) closeMenus();
    else closePanel();
  });

  /* Another module is another set of records; a filter built for the last
     one does not carry over */
  document.addEventListener('cb:module', e => {
    scope = e.detail;
    applied = [];
    commit();
    if (!pop.hidden) closePanel();
  });

  render();
})();
