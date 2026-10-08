/* ============================================================
   Beats list + Pending Assignments
   Figma 189:14294 · 194:32308 · 210:9984 · 244:12676 · 210:10491

   The flow, end to end:
     1. A band at the top of the Beats list says how many visits the
        planner could not place. Clicking its link opens the panel.
     2. The panel lists one card per unassigned visit: what it is, when
        it is due, and why it could not be placed automatically.
     3. Picking a Rep opens the Beat select — the beats offered are that
        rep's — and answering both arms Assign.
     4. Assigning drops the card, decrements both counts and offers Undo
        for as long as the message box is up.
     5. Filter narrows the list by date, related record or reason. The
        heading keeps counting everything pending, not the filtered set.
   ============================================================ */
(function () {

  /* ── Data ──────────────────────────────────────────── */
  const BEATS = [
    { id: 'BP-001', rep: 'Savannah Nguyen',   status: 'Upcoming',            dates: '12 May - 15 May', visits: 6, mileage: '42.1 km', created: '31/02/2026' },
    { id: 'BP-002', rep: 'Kathryn Murphy',    status: 'Upcoming',            dates: '5 May - 7 May',   visits: 2, mileage: '18.7 km', created: '08/09/2026' },
    { id: 'BP-003', rep: 'Cameron Williamson', status: 'Upcoming',           dates: '4 May - 5 May',   visits: 6, mileage: '75.6 km', created: '06/07/2026' },
    { id: 'BP-004', rep: 'Cody Fisher',       status: 'Partially Completed', dates: '7 Apr - 9 Apr',   visits: 4, mileage: '25.5 km', created: '13/01/2026' },
    { id: 'BP-005', rep: 'Cameron Williamson', status: 'Completed',          dates: '8 Apr - 15 Apr',  visits: 8, mileage: '31.4 km', created: '24/12/2026' },
    { id: 'BP-006', rep: 'Devon Lane',        status: 'In Progress',         dates: '13 Apr',          visits: 3, mileage: '51.9 km', created: '19/10/2026' },
    { id: 'BP-007', rep: 'Jenny Wilson',      status: 'Completed',           dates: '12 May - 14 May', visits: 3, mileage: '9.3 km',  created: '30/04/2026' },
    { id: 'BP-008', rep: 'Annette Black',     status: 'In Progress',         dates: '14 Apr - 16 Apr', visits: 2, mileage: '68.2 km', created: '15/05/2026' },
  ];

  const REPS = [...new Set(BEATS.map(b => b.rep))];

  /* Card warnings name the limit, then the next step. The short label stays
     the filter value. */
  const REASON_COPY = {
    'Beat capacity reached': 'Beat capacity reached. Assign to another rep or day.',
    'Maximum distance reached': 'Maximum distance reached. Assign to another rep or day.',
  };

  const PILL = {
    'Upcoming': 'upcoming',
    'Partially Completed': 'partial',
    'Completed': 'completed',
    'In Progress': 'progress',
  };

  /* The visits the planner could not place, and why. The line under a
     card's title is the visit type and its frequency — the same types the
     Visit Types step of the wizard defines, never the visit's own name. */
  const PENDING = [
    {
      title: "Reliance - T Nagar's Visit", iso: '2026-05-24', visitType: 'Sales Visit', frequency: 'Weekly',
      reasons: ['Beat capacity reached'],
    },
    {
      title: "Metro Wholesale - Ambattur's Visit", iso: '2026-05-12', visitType: 'Product Demo', frequency: 'Monthly',
      reasons: ['Beat capacity reached', 'Maximum distance reached'],
    },
    {
      title: "Apollo Pharmacy - Velachery's Visit", iso: '2026-05-12', visitType: 'Sales Visit', frequency: 'Bi-Weekly',
      reasons: ['Beat capacity reached'],
    },
    {
      title: "Dr. Ramesh Dermatology's Visit", iso: '2026-05-05', visitType: 'Relationship Check-in', frequency: 'Monthly',
      reasons: ['Beat capacity reached'],
    },
  ];

  /* Working copy — each row carries the rep and beat chosen so far */
  let rows = PENDING.map((p, i) => ({ ...p, key: i, rep: '', beat: '' }));

  /* What the last Assign removed, so Undo can put it back where it was */
  let undoable = null;

  /* Dismissing the band is the rep's decision — an Undo must not undo it */
  let bandDismissed = false;

  const filters = { date: '', related: '', reason: '' };

  /* ── Elements ──────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  const band      = $('pa-band');
  const bandCount = $('pa-band-count');
  const panel     = $('pa-panel');
  const scrim     = $('pa-scrim');
  const panelSub  = $('pa-panel-sub');
  const cardsEl   = $('pa-cards');
  const filterBtn = $('pa-filter-btn');
  const filtersEl = $('pa-filters');
  const msgEl     = $('pa-msg');

  const escape = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const initials = name => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  /* '2026-05-24' → '24 May 2026'. Parsed as parts rather than by Date, so
     the day never shifts with the viewer's time zone. */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function longDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  }

  function optionsHtml(values, selected, placeholder) {
    return `<option value="" ${selected ? '' : 'selected'} disabled>${escape(placeholder)}</option>` +
      values.map(v =>
        `<option value="${escape(v)}" ${v === selected ? 'selected' : ''}>${escape(v)}</option>`).join('');
  }

  /* ── Beats table ───────────────────────────────────── */
  $('pa-beat-rows').innerHTML = BEATS.map(b => `
    <div class="pa-tr pa-beat-row">
      <span class="pa-check"><input type="checkbox" aria-label="Select ${escape(b.id)}" /></span>
      <span class="pa-beat-id">${escape(b.id)}</span>
      <span class="pa-rep">
        <span class="pa-avatar" aria-hidden="true">${escape(initials(b.rep))}</span>
        <span class="pa-rep-name">${escape(b.rep)}</span>
      </span>
      <span><span class="pa-pill ${PILL[b.status]}">${escape(b.status)}</span></span>
      <span>${escape(b.dates)}</span>
      <span>${b.visits}</span>
      <span>${escape(b.mileage)}</span>
      <span>${escape(b.created)}</span>
    </div>`).join('');

  /* ── Panel ─────────────────────────────────────────── */
  function visible() {
    return rows.filter(r =>
      (!filters.date    || r.iso === filters.date) &&
      (!filters.related || r.visitType === filters.related) &&
      (!filters.reason  || r.reasons.includes(filters.reason)));
  }

  function cardHtml(row) {
    /* A beat can only be offered once its rep is known */
    const beats = row.rep ? BEATS.filter(b => b.rep === row.rep) : [];
    const beatLabels = beats.map(b => `${b.id} • ${b.dates}`);
    const ready = Boolean(row.rep && row.beat);
    return `
      <article class="pa-card" data-key="${row.key}">
        <div class="pa-card-head">
          <div class="pa-card-top">
            <h3 class="pa-card-title">${escape(row.title)}</h3>
            <span class="pa-card-date">${escape(longDate(row.iso))}</span>
          </div>
          <p class="pa-card-sub">${escape(row.visitType)} • ${escape(row.frequency)}</p>
        </div>

        <div class="pa-notes">
          ${row.reasons.map(reason => `
            <span class="pa-note">
              <img src="src/pa-warn-line.svg" alt="" aria-hidden="true" />
              <span>${escape(REASON_COPY[reason] || reason)}</span>
            </span>`).join('')}
        </div>

        <div class="pa-card-fields">
          <div class="pa-field-row">
            <label for="pa-rep-${row.key}">Rep</label>
            <select class="pc-field pa-rep-select" id="pa-rep-${row.key}">
              ${optionsHtml(REPS, row.rep, 'Select Rep')}
            </select>
          </div>
          <div class="pa-field-row">
            <label for="pa-beat-${row.key}">Beat</label>
            <select class="pc-field pa-beat-select" id="pa-beat-${row.key}" ${row.rep ? '' : 'disabled'}>
              ${optionsHtml(beatLabels, row.beat, 'Select Beat')}
            </select>
          </div>
        </div>

        <button class="pa-resolve" type="button" ${ready ? '' : 'disabled'}>Assign</button>
      </article>`;
  }

  function renderCards() {
    const list = visible();
    /* One quiet line, the way the rest of the product states an empty list */
    cardsEl.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : `<p class="pa-empty">${rows.length
           ? 'No visits match these filters.'
           : 'No visits pending assignment.'}</p>`;
  }

  function renderCounts() {
    const n = rows.length;
    panelSub.textContent = n
      ? `${plural(n, 'visit')} waiting to be assigned`
      : 'No visits pending assignment';
    bandCount.textContent = `${plural(n, 'visit')} pending assignment.`;
    /* Nothing pending, nothing to announce */
    band.hidden = !n || bandDismissed;
  }

  function render() { renderCards(); renderCounts(); }

  /* ── Open / close ──────────────────────────────────── */
  function openPanel() {
    scrim.hidden = false;
    panel.classList.add('show');
    panel.setAttribute('aria-hidden', 'false');
    $('pa-close').focus();
  }

  function closePanel() {
    scrim.hidden = true;
    panel.classList.remove('show');
    panel.setAttribute('aria-hidden', 'true');
  }

  $('pa-band-link').addEventListener('click', openPanel);
  $('pa-band-close').addEventListener('click', () => {
    bandDismissed = true;
    band.hidden = true;
  });
  $('pa-close').addEventListener('click', closePanel);
  scrim.addEventListener('click', closePanel);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('show')) closePanel();
  });

  /* ── Card interaction ──────────────────────────────── */
  cardsEl.addEventListener('change', e => {
    const card = e.target.closest('.pa-card');
    if (!card) return;
    const row = rows.find(r => r.key === Number(card.dataset.key));

    if (e.target.classList.contains('pa-rep-select')) {
      row.rep = e.target.value;
      /* A beat belongs to one rep, so the old pick cannot survive */
      row.beat = '';
      renderCards();
    } else if (e.target.classList.contains('pa-beat-select')) {
      row.beat = e.target.value;
      card.querySelector('.pa-resolve').disabled = !(row.rep && row.beat);
    }
  });

  cardsEl.addEventListener('click', e => {
    if (!e.target.classList.contains('pa-resolve')) return;
    const card = e.target.closest('.pa-card');
    const key = Number(card.dataset.key);
    const index = rows.findIndex(r => r.key === key);
    const row = rows[index];
    undoable = { index, row };
    rows.splice(index, 1);
    render();
    showMessage(row);
  });

  /* ── Message box with Undo ─────────────────────────── */
  let msgTimer = null;

  function showMessage(row) {
    const beatId = String(row.beat).split(' • ')[0];
    $('pa-msg-label').textContent =
      `${row.title} assigned to ${row.rep} in ${beatId}.`;
    msgEl.hidden = false;
    clearTimeout(msgTimer);
    /* Undo lives exactly as long as the message does */
    msgTimer = setTimeout(hideMessage, 6000);
  }

  function hideMessage() {
    msgEl.hidden = true;
    undoable = null;
  }

  $('pa-msg-close').addEventListener('click', hideMessage);

  $('pa-msg-undo').addEventListener('click', () => {
    if (!undoable) return;
    rows.splice(undoable.index, 0, undoable.row);
    hideMessage();
    render();
  });

  /* ── Filters ───────────────────────────────────────── */
  const dateBtn    = $('pa-f-date');
  const dateText   = $('pa-f-date-text');
  const dateNative = $('pa-f-date-native');

  const unique = pick => [...new Set(rows.flatMap(pick))];

  /* Both selects are rebuilt from what is actually left in the list, so a
     filter can never offer a value that would return nothing. */
  function fillFilters() {
    [['pa-f-related', unique(r => [r.visitType])],
     ['pa-f-reason',  unique(r => r.reasons)]].forEach(([id, values]) => {
      const el = $(id);
      const current = filters[id.replace('pa-f-', '')];
      el.innerHTML = optionsHtml(values, current, el.dataset.label);
      el.nextElementSibling.hidden = !current;
    });
    syncDateField();
  }

  function syncDateField() {
    const set = Boolean(filters.date);
    dateText.textContent = set ? longDate(filters.date) : 'Visit Date';
    dateBtn.classList.toggle('placeholder', !set);
    dateNative.nextElementSibling.hidden = !set;
  }

  function syncFilterBtn() {
    filterBtn.classList.toggle('filtered', Object.values(filters).some(Boolean));
  }

  function applyFilters() {
    syncFilterBtn();
    renderCards();
  }

  function clearFilter(key) {
    filters[key] = '';
    if (key === 'date') { dateNative.value = ''; syncDateField(); }
    else {
      const el = $(`pa-f-${key}`);
      el.value = '';
      el.nextElementSibling.hidden = true;
    }
    applyFilters();
  }

  /* The picker belongs to the transparent input, which is what the calendar
     anchors to; the button is only what the rep sees. */
  dateBtn.addEventListener('click', () => {
    if (typeof dateNative.showPicker === 'function') dateNative.showPicker();
    else dateNative.focus();
  });

  dateNative.addEventListener('change', () => {
    filters.date = dateNative.value;
    syncDateField();
    applyFilters();
  });

  filterBtn.addEventListener('click', e => {
    /* The ✕ inside the button clears rather than collapses */
    if (e.target.id === 'pa-filter-clear') {
      Object.keys(filters).forEach(clearFilter);
      return;
    }
    const open = filtersEl.hidden;
    filtersEl.hidden = !open;
    filterBtn.classList.toggle('on', open);
    filterBtn.setAttribute('aria-expanded', String(open));
    if (open) fillFilters();
  });

  filtersEl.addEventListener('change', e => {
    if (!e.target.matches('select.pa-filter')) return;
    filters[e.target.id.replace('pa-f-', '')] = e.target.value;
    e.target.nextElementSibling.hidden = !e.target.value;
    applyFilters();
  });

  filtersEl.addEventListener('click', e => {
    const btn = e.target.closest('.pa-filter-x');
    if (btn) clearFilter(btn.dataset.key);
  });

  render();
})();
