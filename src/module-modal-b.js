/* ============================================================
   Module & Address Mapping — layout B
   The dialog behind "Add Module" and the table's edit action. Reads and
   writes the page's module rows through window.PCModules.

   How it is put together, and why:

   1. Progressive reveal instead of greying. Module comes first; the
      rest appears once it is answered, so there is no state where a
      control is visible but unusable and no empty-state prompt to
      explain one.
   2. Address parts in a plain single column, without the decorative
      arrow between label and field.
   3. Required carries the product's red strip on the field, as
      everywhere else in the app.
   4. Divided sections rather than one flat stack. A radio group gets a
      heading above it; a single input keeps the right-aligned label the
      rest of the app uses.
   5. A fixed header and footer with only the body scrolling, so the
      buttons stay put however tall the criteria list grows.
   6. The primary button stays enabled and reports what is missing on
      click, rather than going dead and leaving the reason unsaid.

   Labels stay right-aligned in a column, matching the rest of the app.
   Spacing and type are inherited from Figma 4979:803081.
   ============================================================ */
(function () {
  const api = window.PCModules;
  if (!api) return;

  const { MODULES, ADDRESS_FIELDS, ADDRESS_PARTS, CRITERIA_FIELDS,
          OPERATORS, VALUELESS, MESSAGES, ADDRESS_TYPE_LABEL } = api.constants;
  const { fillSelect, escape, toast } = api.helpers;

  /* The label column is as wide as that type's longest label, so the arrows
     and fields line up down the column. "Full Address" plus its info icon
     needs more room than "Pincode". Figma 4968:800495. */
  const MAP_LABEL_W = { structured: 54, unstructured: 100 };

  const overlay = document.getElementById('mb-overlay');
  const modalEl = overlay.querySelector('.mb-modal');
  const bodyEl = document.getElementById('mb-body');   // render target
  const scrollEl = overlay.querySelector('.mb-body');  // what actually scrolls
  const saveBtn = document.getElementById('mb-save');

  /* Header and footer carry a shadow only while content is scrolled behind
     them, so a dialog that fits shows no divider at all. */
  function syncShadows() {
    const atTop = scrollEl.scrollTop <= 0;
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1;
    modalEl.classList.toggle('scrolled', !atTop);
    modalEl.classList.toggle('more-below', !atBottom);
  }

  scrollEl.addEventListener('scroll', syncShadows);
  window.addEventListener('resize', syncShadows);

  /* The dialog can grow, so errors sit inline under their field */
  const errors = PCErrors.create({ scope: overlay, inline: true });

  /* Everything the dialog knows, re-rendered from here */
  let draft = null;
  let editingIndex = null;   // null while adding, the row index while editing

  const blank = () => ({
    module: '', addressType: 'unstructured', fields: {},
    scope: 'all', criteria: [{ field: '', op: 'is', value: '' }],
    pattern: '',
  });

  const patternOf = n => n ? '(' + Array.from({ length: n }, (_, i) => i + 1).join(' and ') + ')' : '';

  /* ── Markup ────────────────────────────────────────── */
  const selectHtml = (cls, attrs = '') =>
    `<select class="pc-field ${cls}" ${attrs}></select>`;

  /* label on the left, right-aligned; control and any help text stacked
     on the right so the help lines up under what it explains. Required is
     shown by the field's red strip, so the label carries no marker. */
  const fieldHtml = ({ label, control, help, hint }) => `
    <div class="mb-field">
      <span class="mb-label">${label}</span>
      <div class="mb-control pc-field-cell">
        ${control}
        ${help ? `<p class="mb-help">${escape(help)}</p>` : ''}
        ${hint ? `<p class="mb-hint">${escape(hint)}</p>` : ''}
      </div>
    </div>`;

  function addressSectionHtml() {
    const parts = ADDRESS_PARTS[draft.addressType];
    const radios = `
      <div class="mb-radios">
        <label class="mb-radio">
          <input type="radio" name="mb-addr-type" value="unstructured"
                 ${draft.addressType === 'unstructured' ? 'checked' : ''}>
          ${ADDRESS_TYPE_LABEL.unstructured}
        </label>
        <label class="mb-radio">
          <input type="radio" name="mb-addr-type" value="structured"
                 ${draft.addressType === 'structured' ? 'checked' : ''}>
          ${ADDRESS_TYPE_LABEL.structured}
        </label>
      </div>`;
    return `
      <section class="mb-section">
        <h3 class="mb-group-head">Address Type</h3>
        ${radios}
        <div class="mb-grid" style="--mb-map-label-w:${MAP_LABEL_W[draft.addressType]}px">
          ${parts.map(part => `
            <div class="mb-map-row">
              <span class="mb-label">${part.label}</span>
              <img class="mb-map-arrow" src="src/map-arrow.svg" alt="maps to" />
              <div class="mb-control pc-field-cell">
                ${selectHtml(`mb-map${part.required ? ' mandatory' : ''}`,
                             `data-part="${part.key}" aria-label="${part.label} field"`)}
                ${part.hint ? `<p class="mb-hint">${escape(part.hint)}</p>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </section>`;
  }

  function criteriaHtml() {
    return draft.criteria.map((c, i) => `
      <div class="pc-crit-row" data-i="${i}">
        <span class="pc-crit-index">
          <span class="pc-crit-badge">${i + 1}</span>
          <span class="pc-crit-join"><span>AND</span></span>
        </span>
        <span class="pc-crit-fields">
          <span class="pc-field-cell attr">${selectHtml('pc-crit-attr', 'aria-label="Criteria field"')}</span>
          <span class="pc-field-cell op">${selectHtml('pc-crit-op', 'aria-label="Criteria operator"')}</span>
          <span class="pc-field-cell val"><input class="pc-field pc-crit-val" type="text"
                 aria-label="Criteria value" value="${escape(c.value)}"
                 ${VALUELESS.has(c.op) ? 'disabled' : ''} /></span>
        </span>
        <span class="pc-crit-actions">
          <button class="pc-icon-btn remove" type="button" aria-label="Remove criteria"
                  ${draft.criteria.length === 1 ? 'hidden' : ''}>
            <i class="ti ti-circle-minus" aria-hidden="true"></i>
          </button>
          <button class="pc-icon-btn add" type="button" aria-label="Add criteria"
                  ${i !== draft.criteria.length - 1 ? 'hidden' : ''}>
            <i class="ti ti-circle-plus" aria-hidden="true"></i>
          </button>
        </span>
      </div>`).join('');
  }

  function recordsSectionHtml() {
    const specific = draft.scope === 'specific';
    const radios = `
      <div class="mb-radios">
        <label class="mb-radio">
          <input type="radio" name="mb-scope" value="all" ${specific ? '' : 'checked'}> All records
        </label>
        <label class="mb-radio">
          <input type="radio" name="mb-scope" value="specific" ${specific ? 'checked' : ''}>
          Specific records
        </label>
      </div>`;
    return `
      <section class="mb-section mb-scope">
        <h3 class="mb-group-head">Which records</h3>
        ${radios}
        ${specific ? `
          <div class="mb-criteria">
            <!-- wrapper so :last-child drops the trailing AND connector -->
            <div class="mb-crit-rows">${criteriaHtml()}</div>
            <div class="pc-crit-pattern">
              <span class="pc-crit-pattern-label">
                Criteria Pattern
                <i class="ti ti-help-circle" aria-hidden="true" title="How the criteria combine"></i>
              </span>
              <span class="pc-crit-pattern-value">
                <input class="pc-field mb-pattern" aria-label="Criteria pattern"
                       value="${escape(draft.pattern || patternOf(draft.criteria.length))}" readonly />
                <button class="pc-link-btn mb-edit-pattern" type="button">Edit Pattern</button>
              </span>
            </div>
          </div>` : ''}
      </section>`;
  }

  /* A module mapped by another row is offered but not selectable, and says
     why — better than accepting the choice and then rejecting it. The row
     being edited keeps its own module available. */
  /* Only the modules still going spare. A module another row already maps
     is left out of the list rather than shown greyed — there is nothing to
     decide about it. The row being edited keeps its own module, since
     takenModules() skips that row. */
  function fillModuleSelect(el) {
    const taken = api.takenModules(editingIndex);
    const available = MODULES.filter(m => !taken.includes(m));
    fillSelect(el, available, draft.module, 'Select Module');
  }

  /* A CRM field can feed only one part of the address, so whatever the other
     parts already use is left out of this one's list. Its own current value
     stays, or it could not show what it is set to. */
  function fillMapSelect(sel) {
    const key = sel.dataset.part;
    const part = ADDRESS_PARTS[draft.addressType].find(p => p.key === key);
    const takenElsewhere = Object.entries(draft.fields)
      .filter(([k, v]) => k !== key && v)
      .map(([, v]) => v);
    const available = (part.fields || ADDRESS_FIELDS)
      .filter(f => !takenElsewhere.includes(f));
    fillSelect(sel, available, draft.fields[key], 'Select Field');
  }

  /* Choosing one narrows what the others can offer */
  function refreshMapSelects(except) {
    bodyEl.querySelectorAll('.mb-map').forEach(sel => {
      if (sel !== except) fillMapSelect(sel);
    });
  }

  function render() {
    bodyEl.innerHTML = `
      <section class="mb-section">
        ${fieldHtml({
          label: 'Module',
          control: selectHtml('mb-module mandatory', 'id="mb-module"'),
        })}
      </section>
      ${draft.module ? addressSectionHtml() + recordsSectionHtml() : ''}`;

    fillModuleSelect(bodyEl.querySelector('.mb-module'));

    bodyEl.querySelectorAll('.mb-map').forEach(fillMapSelect);

    bodyEl.querySelectorAll('.pc-crit-row').forEach(row => {
      const c = draft.criteria[Number(row.dataset.i)];
      fillSelect(row.querySelector('.pc-crit-attr'), CRITERIA_FIELDS, c.field, 'Select Field');
      fillSelect(row.querySelector('.pc-crit-op'), OPERATORS, c.op, 'is');
    });

    syncShadows();
  }

  /* ── Events ────────────────────────────────────────── */
  bodyEl.addEventListener('change', e => {
    const t = e.target;
    if (t.classList.contains('mb-module')) {
      draft.module = t.value;
      errors.clearAll();
      return render();
    }
    if (t.name === 'mb-addr-type') {
      draft.addressType = t.value;
      draft.fields = {};              // the two types draw on different field kinds
      errors.clearAll();
      return render();
    }
    if (t.name === 'mb-scope') {
      draft.scope = t.value;
      errors.clearAll();
      return render();
    }
    if (t.classList.contains('mb-map')) {
      draft.fields[t.dataset.part] = t.value;
      refreshMapSelects(t);   // skip the one just used, so it keeps focus
      return;
    }
    if (t.classList.contains('pc-crit-attr')) critOf(t).field = t.value;
    if (t.classList.contains('pc-crit-op')) {
      const c = critOf(t);
      c.op = t.value;
      if (VALUELESS.has(c.op)) c.value = '';
      return render();
    }
  });

  bodyEl.addEventListener('input', e => {
    const t = e.target;
    if (t.classList.contains('pc-crit-val')) critOf(t).value = t.value;
    if (t.classList.contains('mb-pattern')) draft.pattern = t.value;
  });

  bodyEl.addEventListener('click', e => {
    const btn = e.target.closest('.pc-icon-btn, .mb-edit-pattern');
    if (!btn) return;
    if (btn.classList.contains('mb-edit-pattern')) {
      const input = bodyEl.querySelector('.mb-pattern');
      input.readOnly = !input.readOnly;
      if (input.readOnly) { draft.pattern = ''; render(); } else input.focus();
      return;
    }
    const i = Number(btn.closest('.pc-crit-row').dataset.i);
    if (btn.classList.contains('add')) draft.criteria.push({ field: '', op: 'is', value: '' });
    else draft.criteria.splice(i, 1);
    if (!draft.pattern) draft.pattern = '';
    render();
    errors.retarget();
  });

  const critOf = el => draft.criteria[Number(el.closest('.pc-crit-row').dataset.i)];

  /* ── Open / close / save ───────────────────────────── */
  function open(index = null) {
    editingIndex = index;
    const existing = index === null ? null : api.get(index);
    draft = existing
      ? {
          module: existing.module,
          addressType: existing.addressType,
          fields: { ...existing.fields },
          scope: existing.scope,
          criteria: existing.criteria.length
            ? existing.criteria.map(c => ({ ...c }))
            : [{ field: '', op: 'is', value: '' }],
          pattern: existing.pattern || '',
        }
      : blank();

    /* The title says which of the two this is; the button just confirms */
    document.getElementById('mb-title').textContent =
      `${existing ? 'Edit' : 'Add'} Module and Address Mapping`;

    errors.clearAll();
    render();
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    scrollEl.scrollTop = 0;
    syncShadows();
    bodyEl.querySelector('.mb-module').focus();
  }

  function close() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    errors.clearAll();
    editingIndex = null;
  }

  function validate() {
    errors.clearAll();
    const q = sel => bodyEl.querySelector(sel);

    if (!draft.module) errors.set(q('.mb-module'), MESSAGES.module);

    if (draft.module) {
      ADDRESS_PARTS[draft.addressType].forEach(part => {
        if (!part.required) return;
        const field = q(`.mb-map[data-part="${part.key}"]`);
        if (!field || field.value) return;
        const message = draft.addressType === 'unstructured'
          ? MESSAGES.fullAddress
          : `Select a field for ${part.label}.`;
        errors.set(field, message);
      });

      if (draft.scope === 'specific') {
        bodyEl.querySelectorAll('.pc-crit-row').forEach(row => {
          const c = draft.criteria[Number(row.dataset.i)];
          if (!c.field) errors.set(row.querySelector('.pc-crit-attr'), MESSAGES.criteria);
          if (!VALUELESS.has(c.op) && !c.value.trim()) {
            errors.set(row.querySelector('.pc-crit-val'), MESSAGES.criteria);
          }
        });
      }
    }

    return errors.showFirst();
  }

  saveBtn.addEventListener('click', () => {
    if (!validate()) return;
    const row = {
      module: draft.module,
      addressType: draft.addressType,
      fields: Object.fromEntries(Object.entries(draft.fields).filter(([, v]) => v)),
      scope: draft.scope,
      criteria: draft.scope === 'specific' ? draft.criteria : [],
      pattern: draft.pattern || patternOf(draft.criteria.length),
    };
    const editing = editingIndex !== null;
    if (editing) api.update(editingIndex, row); else api.add(row);
    const name = draft.module;
    close();
    toast(`${name} module ${editing ? 'updated' : 'added'}.`);
  });

  document.getElementById('mb-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) close();
  });

  document.getElementById('pc-add-module-btn').addEventListener('click', () => open(null));
  document.getElementById('pc-add-module-link').addEventListener('click', () => open(null));

  /* The table's edit button reopens this dialog on that row */
  window.PCModuleModal = { open };
})();
