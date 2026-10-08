/* ============================================================
   Planner Configuration — the wizard's step 1
   Figma 75:6766 (empty) / 2022:73607 (modules added)
          1995:72270 → 2022:73059 (Module & Address Mapping modal)

   Three things get configured here:
     1. Planner name
     2. Operating model — Top Down or Bottom Up, single choice
     3. Modules & address mapping — the table of mapped modules

   The Add / Edit dialog lives in src/module-modal-b.js and reaches this
   page's rows through the window.PCModules API at the foot of this file.
   ============================================================ */
(function () {
  const MODULES = ['Contacts', 'Accounts', 'Deals', 'Leads'];

  /* Single-line CRM fields, one per address part */
  const ADDRESS_FIELDS = [
    'Billing Street', 'Billing City', 'Billing State', 'Billing Country', 'Billing Code',
    'Shipping Street', 'Shipping City', 'Shipping State', 'Shipping Country', 'Shipping Code',
    'Mailing Address', 'Office Address',
  ];

  /* Multiline fields — the whole address sits in one of these and is parsed
     downstream to plot the record, so only multiline fields can be mapped. */
  const MULTILINE_FIELDS = [
    'Billing Address', 'Shipping Address', 'Mailing Address', 'Other Address', 'Address Description',
  ];

  /* How the module stores its address, and what each way asks to be mapped.
     Street, City and State are mandatory when it is spread across fields;
     Country and Pincode are not. The single-field form maps one multiline
     field holding the whole address. */
  const ADDRESS_TYPE_LABEL = {
    structured: 'Map Address Fields',
    unstructured: 'Map Address Section',
  };

  const ADDRESS_PARTS = {
    structured: [
      { key: 'street',  label: 'Street',  required: true },
      { key: 'city',    label: 'City',    required: true },
      { key: 'state',   label: 'State',   required: true },
      { key: 'pincode', label: 'Pincode', required: true },
      { key: 'country', label: 'Country', required: false },
    ],
    unstructured: [
      {
        key: 'full',
        label: 'Full Address',
        required: true,
        fields: MULTILINE_FIELDS,
        /* One line under the field, instruction and example together. Kept
           inside the ~57 characters that fit the 390px column on one line. */
        hint: 'Whole address in one field, e.g. 12 MG Road, Bengaluru',
      },
    ],
  };

  const CRITERIA_FIELDS = ['Division', 'Status', 'Contact Owner', 'Account Owner', 'Priority', 'Lead Status'];
  const OPERATORS = ['is', 'is not', 'contains', 'starts with', 'is empty', 'is not empty'];

  /* Operators that stand alone — no value to type or validate */
  const VALUELESS = new Set(['is empty', 'is not empty']);

  const MESSAGES = {
    module: 'Select a module.',
    fullAddress: 'Select the field that holds the full address.',
    criteria: 'Add at least one condition for specific records.',
  };

  const modulesEl = document.getElementById('pc-modules');
  const modRowsEl = document.getElementById('pc-mod-rows');
  const nextBtn = document.getElementById('pc-next');
  const toastEl = document.getElementById('pc-toast');

  /* The mapped modules.
     Each row: { module, addressType, fields{part:crmField}, scope, criteria[] } */
  let rows = [];
  let editingIndex = null;   // null while adding, the row index while editing

  /* ── Small helpers ─────────────────────────────────── */
  const option = (value, selected) =>
    `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`;

  const placeholder = (label, selected) =>
    `<option value="" ${selected ? '' : 'selected'} disabled>${label}</option>`;

  function fillSelect(el, values, selected, label) {
    el.innerHTML = placeholder(label, selected) + values.map(v => option(v, selected)).join('');
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  const escape = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── 2. Operating model ────────────────────────────── */
  document.querySelectorAll('.pc-model').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.pc-model').forEach(other =>
        other.setAttribute('aria-pressed', String(other === card)));
    });
  });

  /* ── 3. The modules table ──────────────────────────── */
  const OPERATOR_LABEL = op => op.toUpperCase();

  /* Just the fields feeding the map. Which part each one fills, and whether
     the address is spread or combined, is settled inside the dialog. */
  function addressHtml(row) {
    const fields = ADDRESS_PARTS[row.addressType]
      .filter(part => row.fields[part.key])
      .map(part => row.fields[part.key]);
    return `<span class="pc-addr-fields">${escape(fields.join(', '))}</span>`;
  }

  function summaryHtml(row) {
    if (row.scope !== 'specific' || !row.criteria.length) {
      return '<span class="pc-mod-cell">All records</span>';
    }
    const lines = row.criteria.map((c, i) => `
      <span class="pc-summary-line">
        <span class="pc-summary-idx">${i + 1}</span>
        <span>${escape(c.field)}</span>
        <span class="pc-summary-op">${escape(OPERATOR_LABEL(c.op))}</span>
        <span>${escape(c.value)}</span>
      </span>`).join('');
    const pattern = row.criteria.length > 1
      ? `<span class="pc-summary-pattern">
           <span class="label">Criteria Pattern</span>
           <span>${escape(row.pattern || '')}</span>
         </span>`
      : '';
    return `<span class="pc-summary">${lines}${pattern}</span>`;
  }

  function renderModules() {
    modRowsEl.innerHTML = rows.map((row, i) => `
      <div class="pc-mod-tr pc-mod-row" data-index="${i}">
        <span class="pc-mod-actions">
          <button class="pc-mod-act" type="button" data-act="delete" aria-label="Remove module">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>
          <button class="pc-mod-act" type="button" data-act="edit" aria-label="Edit mapping">
            <i class="ti ti-pencil" aria-hidden="true"></i>
          </button>
        </span>
        <span class="pc-mod-cell">${escape(row.module)}</span>
        <span>${addressHtml(row)}</span>
        <span>${summaryHtml(row)}</span>
      </div>`).join('');

    const any = rows.length > 0;
    const allMapped = rows.length >= MODULES.length;
    modulesEl.hidden = !any;
    /* Add Module moves up beside the heading once the table is there, and
       goes altogether once every module is spoken for */
    document.getElementById('pc-add-module-btn').hidden = any;
    document.getElementById('pc-add-module-link').hidden = !any || allMapped;
    nextBtn.disabled = !any;
  }

  modRowsEl.addEventListener('click', e => {
    const btn = e.target.closest('.pc-mod-act');
    if (!btn) return;
    const index = Number(btn.closest('.pc-mod-row').dataset.index);
    if (btn.dataset.act === 'delete') openRemove(index);
    else PCModuleModal.open(index);
  });

  /* PC-19 / PC-20: removing a mapped module asks first, then confirms. */
  const removeOverlay = document.getElementById('pc-remove-overlay');
  let removingIndex = null;

  function openRemove(index) {
    removingIndex = index;
    document.getElementById('pc-remove-title').textContent =
      `Remove the ${rows[index].module} module?`;
    removeOverlay.classList.add('show');
    removeOverlay.setAttribute('aria-hidden', 'false');
    document.getElementById('pc-remove-confirm').focus();
  }

  function closeRemove() {
    removingIndex = null;
    removeOverlay.classList.remove('show');
    removeOverlay.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('pc-remove-cancel').addEventListener('click', closeRemove);
  removeOverlay.addEventListener('click', e => { if (e.target === removeOverlay) closeRemove(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && removeOverlay.classList.contains('show')) closeRemove();
  });
  document.getElementById('pc-remove-confirm').addEventListener('click', () => {
    if (removingIndex === null) return;
    const name = rows[removingIndex].module;
    rows.splice(removingIndex, 1);
    closeRemove();
    renderModules();
    toast(`${name} module removed.`);
  });

  /* ── Footer ────────────────────────────────────────── */
  function plannerNameMissing() {
    const name = document.getElementById('pc-planner-name');
    if (name.value.trim()) return false;
    name.focus();
    toast('Enter a planner name.');
    return true;
  }

  nextBtn.addEventListener('click', () => {
    if (plannerNameMissing()) return;
    window.location.href = 'visit-types.html';
  });

  document.getElementById('pc-draft').addEventListener('click', () => {
    if (plannerNameMissing()) return;
    toast('Planner Configuration saved as draft.');
  });
  document.getElementById('pc-cancel').addEventListener('click', () => { window.location.href = 'index.html'; });

  renderModules();

  /* Layout B drives the same table through this, so both variants stay
     one source of truth. See src/module-modal-b.js. */
  window.PCModules = {
    add(row) { rows.push(row); renderModules(); },
    update(index, row) { rows[index] = row; renderModules(); },
    get: index => rows[index],
    /* Modules spoken for by some other row, so the dialog can grey them out
       rather than let one be picked and then rejected */
    takenModules: ignoreIndex =>
      rows.filter((_, i) => i !== ignoreIndex).map(r => r.module),
    constants: {
      MODULES, ADDRESS_FIELDS, ADDRESS_PARTS, CRITERIA_FIELDS,
      OPERATORS, VALUELESS, MESSAGES, ADDRESS_TYPE_LABEL,
    },
    helpers: { fillSelect, escape, toast },
  };
})();
