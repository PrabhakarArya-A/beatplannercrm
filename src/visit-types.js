/* ============================================================
   Visit Types — the wizard's step 2
   Row behaviour taken from the reference frames:
     4115:774722 — initial state: one empty row, add (+) only,
                   duration prefilled, nothing checked
     4115:775129 — every row gets remove (−), the last row also gets
                   add (+); invalid fields are outlined red
   Return in the visit-type field adds the next row.

   Error outlines and the shared tooltip live in src/field-errors.js.
   Full behaviour contract: docs/visit-types-spec.md
   ============================================================ */
(function () {
  /* Duration a fresh row starts with, per the reference frames */
  const DEFAULT_DURATION = '15';

  const MESSAGES = {
    emptyName:     'Enter a visit type name.',
    emptyDuration: 'Enter a duration in minutes.',
    zeroDuration:  'Enter a duration of at least 1 minute.',
  };

  const rowsEl = document.getElementById('pc-rows');
  const bodyEl = document.querySelector('.pc-body');
  const toastEl = document.getElementById('pc-toast');

  const errors = PCErrors.create({
    scope: rowsEl,
    scroller: bodyEl,
    tip: document.getElementById('pc-tip'),
  });

  function rowHtml(row) {
    return `
      <span class="pc-cell">
        <input class="pc-field pc-name" type="text" placeholder="Visit Type"
               aria-label="Visit type name" value="${row.name}" />
      </span>
      <span class="pc-cell">
        <input class="pc-field pc-duration" type="text" inputmode="numeric"
               aria-label="Duration in minutes" value="${row.duration}" />
      </span>
      <span class="pc-cell-center"><input type="checkbox" aria-label="Image upload mandatory" ${row.image ? 'checked' : ''}></span>
      <span class="pc-cell-center"><input type="checkbox" aria-label="File upload mandatory" ${row.file ? 'checked' : ''}></span>
      <span class="pc-cell-center"><input type="checkbox" aria-label="Notes mandatory" ${row.notes ? 'checked' : ''}></span>
      <span class="pc-actions">
        <button class="pc-icon-btn remove" type="button" aria-label="Remove visit type">
          <i class="ti ti-circle-minus" aria-hidden="true"></i>
        </button>
        <button class="pc-icon-btn add" type="button" aria-label="Add visit type">
          <i class="ti ti-circle-plus" aria-hidden="true"></i>
        </button>
      </span>`;
  }

  function addRow(row, afterEl) {
    const tr = document.createElement('div');
    tr.className = 'pc-tr';
    tr.innerHTML = rowHtml(Object.assign(
      { name: '', duration: DEFAULT_DURATION, image: false, file: false, notes: false }, row
    ));
    if (afterEl) afterEl.insertAdjacentElement('afterend', tr);
    else rowsEl.appendChild(tr);
    syncActions();
    return tr;
  }

  /* Remove is hidden while a single row remains; add shows on the last row only */
  function syncActions() {
    const rows = [...rowsEl.children];
    rows.forEach((tr, i) => {
      tr.querySelector('.pc-icon-btn.remove').hidden = rows.length === 1;
      tr.querySelector('.pc-icon-btn.add').hidden = i !== rows.length - 1;
    });
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ── Events ────────────────────────────────────────── */
  rowsEl.addEventListener('click', e => {
    const btn = e.target.closest('.pc-icon-btn');
    if (!btn) return;
    if (btn.classList.contains('add')) {
      addRow().querySelector('.pc-name').focus();
    } else {
      btn.closest('.pc-tr').remove();
      syncActions();
    }
    errors.retarget();
  });

  /* Return in the visit-type field adds the next row, once this one has a name */
  rowsEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.classList.contains('pc-name')) return;
    e.preventDefault();
    const name = e.target;
    const tr = name.closest('.pc-tr');
    /* Names in the other rows, so a repeat is caught before a row is added */
    const seen = new Map([...rowsEl.children]
      .filter(other => other !== tr)
      .map(other => {
        const value = other.querySelector('.pc-name').value.trim();
        return [value.toLowerCase(), value];
      }));
    errors.clear(name);
    if (!checkName(name, seen)) { errors.retarget(); return; }
    addRow(null, tr).querySelector('.pc-name').focus();
    errors.retarget();
  });

  /* Duration takes digits only, capped at three */
  rowsEl.addEventListener('input', e => {
    if (e.target.classList.contains('pc-duration')) {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    }
  });

  /* Checks one row's name against the names already seen. True when clean. */
  function checkName(name, seen) {
    const value = name.value.trim();
    const key = value.toLowerCase();
    if (!value) { errors.set(name, MESSAGES.emptyName); return false; }
    if (seen.has(key)) {
      errors.set(name, `${seen.get(key)} already exists, so enter a different name.`);
      return false;
    }
    seen.set(key, value);
    return true;
  }

  function validate() {
    errors.clearAll();
    const seen = new Map();

    [...rowsEl.children].forEach(tr => {
      checkName(tr.querySelector('.pc-name'), seen);

      const duration = tr.querySelector('.pc-duration');
      if (!duration.value.trim()) errors.set(duration, MESSAGES.emptyDuration);
      else if (Number(duration.value) === 0) errors.set(duration, MESSAGES.zeroDuration);
    });

    return errors.showFirst();
  }

  document.getElementById('pc-next').addEventListener('click', () => {
    /* A valid step moves on with no toast. There is no Beat Engine screen
       in this prototype, so Next stays on this step once the fields are valid. */
    if (!validate()) {
      toast('The Visit Types step has missing details. Fix the highlighted fields to continue.');
    }
  });

  document.getElementById('pc-draft').addEventListener('click', () => {
    if (!validate()) return;
    toast('Visit Types saved as draft.');
  });
  document.getElementById('pc-previous').addEventListener('click', () => { window.location.href = 'planner-config.html'; });
  document.getElementById('pc-cancel').addEventListener('click', () => { window.location.href = 'index.html'; });

  /* Initial state: one empty row, duration prefilled, nothing checked */
  addRow().querySelector('.pc-name').focus();
})();
