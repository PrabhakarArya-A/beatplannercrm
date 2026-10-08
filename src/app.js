document.addEventListener('DOMContentLoaded', () => {

  /* ── Map ── */
  const fieldMap = new FieldMap('map-canvas', 'map-area');

  /* Resize pointer.png to 20×42 and apply as cursor */
  const _ptrImg = new Image();
  _ptrImg.onload = () => {
    const _c = document.createElement('canvas');
    _c.width = 10; _c.height = 21;
    _c.getContext('2d').drawImage(_ptrImg, 0, 0, 10, 21);
    const _s = document.createElement('style');
    _s.textContent = `#map-canvas.pick-mode { cursor: url("${_c.toDataURL()}") 5 20, crosshair !important; }`;
    document.head.appendChild(_s);
  };
  _ptrImg.src = 'src/pointer.svg';

  /* ── Zoom Buttons ── */
  document.getElementById('zoom-in').addEventListener('click', () => {
    fieldMap.zoom(1.25, fieldMap.canvas.width / 2, fieldMap.canvas.height / 2);
  });
  document.getElementById('zoom-out').addEventListener('click', () => {
    fieldMap.zoom(0.8, fieldMap.canvas.width / 2, fieldMap.canvas.height / 2);
  });

  /* ── Tooltip ── */
  const tooltip = document.getElementById('tooltip');
  document.getElementById('map-canvas').addEventListener('mousemove', e => {
    if (fieldMap.pickMode) { tooltip.style.display = 'none'; return; }
    const rect = e.target.getBoundingClientRect();
    const pin  = fieldMap.pinAtScreen(e.clientX - rect.left, e.clientY - rect.top);
    if (pin) {
      tooltip.style.display = 'block';
      tooltip.style.left    = (e.clientX - rect.left + 14) + 'px';
      tooltip.style.top     = (e.clientY - rect.top  - 38) + 'px';
      tooltip.innerHTML     = `<strong>${pin.label}</strong><br><span class="tooltip-meta">${pin.module} &middot; ${pin.status}</span>`;
    } else {
      tooltip.style.display = 'none';
    }
  });
  document.getElementById('map-canvas').addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });

  /* ── Module Multi-Select Panel (map topbar) ── */
  const moduleSelect     = document.getElementById('module-select');
  const moduleLabel      = document.getElementById('module-label');
  const modulePanel      = document.getElementById('module-panel');
  const moduleClearBtn   = document.getElementById('module-clear-btn');
  const modulePanelClose = document.getElementById('module-panel-close');
  const moduleChecklist  = document.getElementById('module-checklist');

  const ALL_MODULES = ['contacts', 'accounts', 'deals', 'leads'];

  function getCheckedModules() {
    return [...moduleChecklist.querySelectorAll('input[type=checkbox]')]
      .filter(cb => cb.checked).map(cb => cb.value);
  }

  /* Field View's label (non-map.html) lists the picked modules; Day Mode
     keeps the older "Modules(n)" label, having no .ms-names in its markup */
  const moduleNames   = moduleLabel.querySelector('.ms-names');
  const moduleMore    = moduleLabel.querySelector('.ms-more');
  const moduleTrigger = document.getElementById('module-trigger');
  const moduleTip     = document.getElementById('module-tip');
  let moduleCut = false;   /* the label is not showing every picked name */
  const LABEL_MAX = 220;   /* the dropdown's widest, caret and padding included */

  const moduleName = cb => cb.closest('label').textContent.trim();

  /* Comma list in the panel's order. Once it outgrows the dropdown, the
     names that would not show at all fold into "& n more" and the last one
     that does show is cut with an ellipsis. */
  function renderModuleNames(names) {
    moduleMore.hidden = true;
    moduleCut = false;
    moduleNames.textContent = names.length ? names.join(', ') : 'All Modules';
    if (names.length < 2) return;

    /* room for the names: the cap, less the trigger's strip and caret and
       the label's own padding */
    const ls = getComputedStyle(moduleLabel);
    const chrome = moduleTrigger.getBoundingClientRect().width - moduleLabel.getBoundingClientRect().width
      + parseFloat(ls.paddingLeft) + parseFloat(ls.paddingRight);
    const room = LABEL_MAX - chrome;
    const ctx = renderModuleNames.ctx || (renderModuleNames.ctx = document.createElement('canvas').getContext('2d'));
    ctx.font = getComputedStyle(moduleNames).font;
    const w = t => ctx.measureText(t).width;
    if (w(names.join(', ')) <= room) return;
    moduleCut = true;

    /* A name counts as shown when at least its first letter and the
       ellipsis fit. Settle n against the width "& n more" takes. */
    let hidden = 0;
    for (let pass = 0; pass < 4; pass++) {
      let moreW = 0;
      if (hidden) {
        moduleMore.textContent = `& ${hidden} More`;
        moduleMore.hidden = false;
        moreW = moduleMore.getBoundingClientRect().width
          + parseFloat(getComputedStyle(moduleMore).marginLeft);
      }
      const avail = room - moreW;
      let shown = 0;
      names.forEach((name, i) => {
        const before = names.slice(0, i).join(', ') + (i ? ', ' : '');
        if (w(before + name[0] + '…') <= avail) shown = i + 1;
      });
      const next = names.length - Math.max(shown, 1);
      if (next === hidden) break;
      hidden = next;
    }

    moduleMore.hidden = hidden === 0;
    moduleMore.textContent = `& ${hidden} More`;
    moduleNames.textContent = names.slice(0, names.length - hidden).join(', ');
  }

  function updateModuleLabel() {
    const boxes = [...moduleChecklist.querySelectorAll('input[type=checkbox]')].filter(cb => cb.checked);
    const checked = boxes.map(cb => cb.value);
    if (moduleNames) {
      renderModuleNames(boxes.map(moduleName));
      moduleTip.querySelector('ul').innerHTML = boxes
        .map(cb => `<li>${moduleName(cb).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</li>`)
        .join('');
      if (!moduleCut) hideModuleTip();
    } else {
      moduleLabel.textContent = checked.length ? `Modules(${checked.length})` : 'All Modules';
    }
    moduleSelect.classList.toggle('active-filter', checked.length > 0);
    moduleClearBtn.style.visibility = checked.length ? 'visible' : 'hidden';
    fieldMap.setModules(checked);
  }

  /* Hovering a cut-short label lists every picked module (Figma
     5877:1037925). It waits a moment before showing, so passing over the
     dropdown does not flash it, and it opens in one fixed spot — where
     the frame puts it, 86px in — rather than following the pointer. */
  const TIP_DELAY = 500;
  let tipTimer = null;

  function hideModuleTip() {
    clearTimeout(tipTimer);
    if (moduleTip) moduleTip.hidden = true;
  }

  if (moduleTip) {
    moduleTrigger.addEventListener('mouseenter', () => {
      if (!moduleCut || moduleSelect.classList.contains('open')) return;
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => {
        if (moduleCut && !moduleSelect.classList.contains('open')) moduleTip.hidden = false;
      }, TIP_DELAY);
    });
    moduleTrigger.addEventListener('mouseleave', hideModuleTip);
  }

  function setModuleOpen(open) {
    /* the panel covers where the tooltip would be */
    if (open) hideModuleTip();
    moduleSelect.classList.toggle('open', open);
    moduleSelect.setAttribute('aria-expanded', open);
    if (moduleTrigger) moduleTrigger.setAttribute('aria-expanded', open);
  }

  moduleSelect.addEventListener('click', e => {
    if (e.target.closest('.module-panel')) return;
    e.stopPropagation();
    closeAllDropdowns(moduleSelect);
    setModuleOpen(!moduleSelect.classList.contains('open'));
  });

  moduleChecklist.addEventListener('change', () => updateModuleLabel());

  moduleClearBtn.addEventListener('click', e => {
    e.stopPropagation();
    moduleChecklist.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    updateModuleLabel();
    setModuleOpen(false);
  });

  modulePanelClose.addEventListener('click', e => {
    e.stopPropagation();
    setModuleOpen(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !moduleSelect.classList.contains('open')) return;
    setModuleOpen(false);
    if (moduleTrigger) moduleTrigger.focus();
  });

  modulePanel.addEventListener('click', e => e.stopPropagation());

  /* ── Sidebar Navigation ── */
  document.querySelectorAll('.nav-item[data-route]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  /* ── Search ── */
  const searchInput = document.querySelector('.bp-search input, .search-bar input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        fieldMap.setModule(moduleLabel.textContent === 'All Modules' ? 'all' : moduleLabel.textContent.toLowerCase());
        return;
      }
      fieldMap._visiblePinsOverride = PINS.filter(p =>
        p.label.toLowerCase().includes(query) ||
        p.module.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query)
      );
      fieldMap.draw();
    });
  }

  /* ── Keyboard shortcuts ── */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Escape') { closeSheet(); closeModal(); }
    if (e.key === '+' || e.key === '=') fieldMap.zoom(1.2, fieldMap.canvas.width / 2, fieldMap.canvas.height / 2);
    if (e.key === '-') fieldMap.zoom(0.83, fieldMap.canvas.width / 2, fieldMap.canvas.height / 2);
  });

  /* ── Close all open dropdowns ── */
  function closeAllDropdowns(except) {
    [moduleSelect, nmModuleSel, nmStatusSel].forEach(el => {
      if (el && el !== except) el.classList.remove('open');
    });
    if (except !== moduleSelect) setModuleOpen(false);
  }
  document.addEventListener('click', () => closeAllDropdowns(null));

  /* V1 is the only version now (V1/V2 toggle removed). */
  const activeVersion = 'v1';

  /* ════════════════════════════════════════════
     Non Mappable Records Sheet
  ════════════════════════════════════════════ */
  const sheet       = document.getElementById('nm-sheet');
  const openBtn     = document.getElementById('non-mappable-btn');
  const closeBtn    = document.getElementById('nm-close');
  const nmList      = document.getElementById('nm-list');
  const nmModuleSel = document.getElementById('nm-module-select');
  const nmModuleDD  = document.getElementById('nm-module-dropdown');
  const nmModuleLbl = document.getElementById('nm-module-label');
  const nmStatusSel = document.getElementById('nm-status-select');
  const nmStatusDD  = document.getElementById('nm-status-dropdown');
  const nmStatusLbl = document.getElementById('nm-status-label');
  const mapTopbar   = document.querySelector('.map-topbar');

  /* V2 sheet elements */
  const sheetV2       = document.getElementById('nm-sheet-v2');
  const closeBtnV2    = document.getElementById('nm-close-v2');
  const nmListV2      = document.getElementById('nm-list-v2');
  const nmV2Count     = document.getElementById('nm-v2-count');
  const nmTabsBar     = document.getElementById('nm-tabs-bar');
  let nmV2ActiveStatus = 'all';

  let nmActiveModule = 'contacts';
  let nmActiveStatus = 'all';

  const STATUS_LABELS = {
    empty:   'Empty Address',
    invalid: 'Invalid Address',
    credits: 'Record Credits Exhausted',
    queued:  'Queued Address Conversions',
    failed:  'Address Conversion Failed',
  };

  const MODULE_COLORS_MAP = {
    contacts: '#10b981',
    accounts: '#8b5cf6',
    deals:    '#f59e0b',
    leads:    '#3b82f6',
  };

  function openSheet() {
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    mapTopbar.style.display = 'none';
    renderNmList();
  }

  function closeSheet() {
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    mapTopbar.style.display = '';
  }

  function renderNmList() {
    const filtered = NON_MAPPABLE.filter(r =>
      r.module === nmActiveModule &&
      (nmActiveStatus === 'all' || r.addressStatus === nmActiveStatus)
    );

    if (filtered.length === 0) {
      nmList.innerHTML = '<li style="padding:20px 14px;text-align:center;font-size:12px;color:#9ca3af">No records found</li>';
      return;
    }

    nmList.innerHTML = filtered.map(r => {
      const idx = NON_MAPPABLE.indexOf(r);
      return `
        <li class="nm-list-item">
          <div class="nm-list-item-info">
            <div class="nm-list-item-name" title="${r.name}">${r.name}</div>
            <div class="nm-list-item-status">${STATUS_LABELS[r.addressStatus] || r.addressStatus}</div>
          </div>
          <div class="nm-list-item-actions">
            <button class="nm-action-btn edit-btn" data-index="${idx}" title="Edit record" aria-label="Edit ${r.name}">
              <i class="ti ti-pencil" aria-hidden="true"></i>
            </button>
            <button class="nm-action-btn locate-btn" data-index="${idx}" title="Pick on map" aria-label="Pick location for ${r.name}">
              <i class="ti ti-map-pin" aria-hidden="true"></i>
            </button>
          </div>
        </li>`;
    }).join('');

    nmList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openModal(parseInt(btn.dataset.index));
      });
    });

    nmList.querySelectorAll('.locate-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        enterPickMode(parseInt(btn.dataset.index));
      });
    });
  }

  /* ── V2 Sheet Functions ── */
  function openSheetV2() {
    updateV2TabCounts();
    renderNmListV2();
    sheetV2.classList.add('open');
    sheetV2.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    mapTopbar.style.display = 'none';
  }

  function closeSheetV2() {
    sheetV2.classList.remove('open');
    sheetV2.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    mapTopbar.style.display = '';
  }

  function updateV2TabCounts() {
    const counts = {};
    NON_MAPPABLE.forEach(r => {
      counts[r.addressStatus] = (counts[r.addressStatus] || 0) + 1;
    });
    nmV2Count.textContent = NON_MAPPABLE.length;
    nmTabsBar.querySelectorAll('.nm-tab[data-status]').forEach(tab => {
      const s = tab.dataset.status;
      if (s === 'all') return;
      const el = tab.querySelector('.nm-tab-count');
      if (el) el.textContent = counts[s] || 0;
    });
  }

  function renderNmListV2() {
    const filtered = nmV2ActiveStatus === 'all'
      ? NON_MAPPABLE
      : NON_MAPPABLE.filter(r => r.addressStatus === nmV2ActiveStatus);

    if (filtered.length === 0) {
      nmListV2.innerHTML = '<li style="padding:20px 14px;text-align:center;font-size:12px;color:#9ca3af">No records found</li>';
      return;
    }

    nmListV2.innerHTML = filtered.map(r => {
      const idx = NON_MAPPABLE.indexOf(r);
      const modColor = MODULE_COLORS_MAP[r.module] || '#9ca3af';
      const modName  = r.module.charAt(0).toUpperCase() + r.module.slice(1);
      const statusLabel = STATUS_LABELS[r.addressStatus] || r.addressStatus;
      return `
        <li class="nm-list-item">
          <div class="nm-list-item-info">
            <div class="nm-list-item-name" title="${r.name}">${r.name}</div>
            <div class="nm-list-item-status">${modName} &bull; ${statusLabel}</div>
          </div>
          <div class="nm-list-item-actions">
            <button class="nm-action-btn edit-btn" data-index="${idx}" title="Edit record" aria-label="Edit ${r.name}">
              <i class="ti ti-pencil" aria-hidden="true"></i>
            </button>
            <button class="nm-action-btn locate-btn" data-index="${idx}" title="Pick on map" aria-label="Pick location for ${r.name}">
              <i class="ti ti-map-pin" aria-hidden="true"></i>
            </button>
          </div>
        </li>`;
    }).join('');

    nmListV2.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openModal(parseInt(btn.dataset.index));
      });
    });
    nmListV2.querySelectorAll('.locate-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        enterPickMode(parseInt(btn.dataset.index));
      });
    });
  }

  nmTabsBar.addEventListener('click', e => {
    const tab = e.target.closest('.nm-tab');
    if (!tab) return;
    nmTabsBar.querySelectorAll('.nm-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    nmV2ActiveStatus = tab.dataset.status;
    renderNmListV2();
  });

  closeBtnV2.addEventListener('click', e => { e.stopPropagation(); closeSheetV2(); });
  sheetV2.addEventListener('click', e => e.stopPropagation());

  openBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (activeVersion === 'v2') {
      sheetV2.classList.contains('open') ? closeSheetV2() : openSheetV2();
    } else {
      sheet.classList.contains('open') ? closeSheet() : openSheet();
    }
  });
  closeBtn.addEventListener('click', e => { e.stopPropagation(); closeSheet(); });

  nmModuleSel.addEventListener('click', e => {
    e.stopPropagation();
    closeAllDropdowns(nmModuleSel);
    nmModuleSel.classList.toggle('open');
  });
  nmModuleDD.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    e.stopPropagation();
    nmModuleDD.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
    li.classList.add('selected');
    nmModuleLbl.textContent = li.textContent.trim();
    nmActiveModule = li.dataset.value;
    nmModuleSel.classList.remove('open');
    renderNmList();
  });

  nmStatusSel.addEventListener('click', e => {
    e.stopPropagation();
    closeAllDropdowns(nmStatusSel);
    nmStatusSel.classList.toggle('open');
  });
  nmStatusDD.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    e.stopPropagation();
    nmStatusDD.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
    li.classList.add('selected');
    nmStatusLbl.textContent = li.textContent;
    nmActiveStatus = li.dataset.value;
    nmStatusSel.classList.remove('open');
    renderNmList();
  });

  sheet.addEventListener('click', e => e.stopPropagation());

  /* ════════════════════════════════════════════
     Pick Location Mode
  ════════════════════════════════════════════ */
  const pickBanner      = document.getElementById('pick-banner');
  const pickBannerClose = document.getElementById('pick-banner-close');
  const pickConfirmEl   = document.getElementById('pick-confirm');
  const pickConfirmName = document.getElementById('pick-confirm-name');
  const pickCancelBtn   = document.getElementById('pick-cancel-btn');
  const pickConfirmBtn  = document.getElementById('pick-confirm-btn');
  const mapCanvas       = document.getElementById('map-canvas');

  let pickRecordIndex   = null;
  let pendingPickCoords = null;

  function enterPickMode(index) {
    pickRecordIndex   = index;
    pendingPickCoords = null;

    closeSheet();
    closeSheetV2();
    mapTopbar.style.display = 'none';
    pickBanner.classList.add('visible');
    pickBanner.setAttribute('aria-hidden', 'false');
    fieldMap.enterPickMode();
  }

  function exitPickMode() {
    pickRecordIndex   = null;
    pendingPickCoords = null;

    pickBanner.classList.remove('visible');
    pickConfirmEl.classList.remove('visible');
    pickBanner.setAttribute('aria-hidden', 'true');
    pickConfirmEl.setAttribute('aria-hidden', 'true');
    mapCanvas.style.cursor = '';

    fieldMap.exitPickMode();
    if (activeVersion === 'v2') openSheetV2();
    else openSheet();
  }

  /* PIN_H_SCREEN: constant screen-pixel height of a pin (same as _drawSinglePin) */
  const PIN_H_SCREEN = 28 * (35 / 24);

  function positionPickConfirm(wx, wy) {
    const [sx, sy] = fieldMap.worldToScreen(wx, wy);
    /* sy is the pin tip. Circle centre is 23/35 of pin height above the tip. */
    const circleY = sy - (23 / 35) * PIN_H_SCREEN;
    const mapW    = mapCanvas.offsetWidth;
    const mapH    = mapCanvas.offsetHeight;
    const popupW  = Math.min(340, mapW - 16);
    const GAP     = 10;

    let left   = sx - popupW / 2;
    left = Math.max(8, Math.min(mapW - popupW - 8, left));

    /* Place popup bottom edge above the circle centre */
    let bottom = mapH - circleY + GAP;
    /* If popup would clip the top edge, flip it below the pin tip */
    const popupH = pickConfirmEl.offsetHeight || 130;
    if (mapH - bottom - popupH < 8) {
      bottom = mapH - sy - GAP - popupH;
    }
    bottom = Math.max(8, bottom);

    pickConfirmEl.style.left   = left + 'px';
    pickConfirmEl.style.bottom = bottom + 'px';
    pickConfirmEl.style.top    = 'auto';
  }

  /* Click on canvas while in pick mode → place/update preview pin.
     Clicking again while confirm is visible updates the pin without cancelling. */
  mapCanvas.addEventListener('click', e => {
    if (!fieldMap.pickMode) return;

    const rect = mapCanvas.getBoundingClientRect();
    const [wx, wy] = fieldMap.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    pendingPickCoords = { wx, wy };
    fieldMap.setPreviewPin(wx, wy);

    const LAT_MAX = 13.15, LAT_MIN = 12.85;
    const LNG_MIN = 80.15, LNG_MAX = 80.35;
    const lat = (LAT_MAX - (wy - 40) / 560 * (LAT_MAX - LAT_MIN)).toFixed(5);
    const lng = ((wx - 50) / 700 * (LNG_MAX - LNG_MIN) + LNG_MIN).toFixed(5);

    pickConfirmName.textContent = NON_MAPPABLE[pickRecordIndex].name;
    document.getElementById('pick-confirm-coords').textContent  = `${lat}, ${lng}`;
    document.getElementById('pick-confirm-street').textContent  = 'Fetching address…';
    document.getElementById('pick-confirm-pincode').textContent = '';
    positionPickConfirm(wx, wy);

    pickConfirmEl.classList.add('visible');
    pickConfirmEl.setAttribute('aria-hidden', 'false');

    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        const a = data.address || {};
        const street  = [a.road, a.suburb, a.city || a.town || a.village].filter(Boolean).join(', ');
        const pincode = a.postcode || '';
        document.getElementById('pick-confirm-street').textContent  = street  || 'Street unavailable';
        document.getElementById('pick-confirm-pincode').textContent = pincode ? `Pincode: ${pincode}` : '';
      })
      .catch(() => {
        document.getElementById('pick-confirm-street').textContent = 'Address unavailable';
      });
  });

  /* Confirm → plot pin, remove record, exit mode */
  pickConfirmBtn.addEventListener('click', () => {
    if (pendingPickCoords === null || pickRecordIndex === null) return;

    const record = NON_MAPPABLE[pickRecordIndex];
    const { wx, wy } = pendingPickCoords;
    const color  = MODULE_COLORS_MAP[record.module] || '#10b981';
    const newPin = {
      x:      Math.round(wx),
      y:      Math.round(wy),
      color,
      label:  record.name,
      module: record.module.charAt(0).toUpperCase() + record.module.slice(1),
      status: 'Mapped',
    };

    PINS.push(newPin);
    NON_MAPPABLE.splice(pickRecordIndex, 1);

    const savedName = record.name;

    exitPickMode();
    fieldMap.startPinBounce(newPin);
    updateModuleCounts();

    showToast(`Location updated for ${savedName}.`);
  });

  /* Cancel confirm → hide popup, clear preview pin, restore pointer cursor */
  pickCancelBtn.addEventListener('click', () => {
    fieldMap.clearPreviewPin();
    pendingPickCoords = null;
    pickConfirmEl.classList.remove('visible');
    pickConfirmEl.setAttribute('aria-hidden', 'true');
    mapCanvas.style.cursor = '';
  });

  /* Close banner → exit pick mode entirely */
  pickBannerClose.addEventListener('click', () => exitPickMode());

  /* ════════════════════════════════════════════
     Address Update Modal
  ════════════════════════════════════════════ */
  const overlay        = document.getElementById('modal-overlay');
  const modalRecordName = document.getElementById('modal-record-name');
  const modalCancelBtn = document.getElementById('modal-cancel');
  const modalSaveBtn   = document.getElementById('modal-save');
  const modalClearBtn  = document.getElementById('modal-clear-btn');

  let activeRecordIndex = null;

  function openModal(index) {
    const record = NON_MAPPABLE[index];
    activeRecordIndex = index;
    modalRecordName.textContent = record.name;

    document.getElementById('field-flat').value    = '';
    document.getElementById('field-street').value  = '';
    document.getElementById('field-city').value    = '';
    document.getElementById('field-zip').value     = '';
    document.getElementById('field-lat').value     = '';
    document.getElementById('field-lng').value     = '';
    document.getElementById('field-country').value = 'India';
    document.getElementById('field-state').value   = 'Tamilnadu';

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.getElementById('field-flat').focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    activeRecordIndex = null;
  }

  modalClearBtn.addEventListener('click', () => {
    document.getElementById('field-flat').value   = '';
    document.getElementById('field-street').value = '';
    document.getElementById('field-city').value   = '';
    document.getElementById('field-zip').value    = '';
    document.getElementById('field-lat').value    = '';
    document.getElementById('field-lng').value    = '';
  });

  modalCancelBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  modalSaveBtn.addEventListener('click', () => {
    if (activeRecordIndex === null) return;

    const flat   = document.getElementById('field-flat').value.trim();
    const street = document.getElementById('field-street').value.trim();
    const city   = document.getElementById('field-city').value.trim();
    const zip    = document.getElementById('field-zip').value.trim();
    const latVal = document.getElementById('field-lat').value.trim();
    const lngVal = document.getElementById('field-lng').value.trim();

    if (!flat && !street && !city && !zip && !latVal && !lngVal) {
      showToast('Enter an address or coordinates before saving.', 'error');
      return;
    }

    const record = NON_MAPPABLE[activeRecordIndex];
    const lat    = parseFloat(latVal);
    const lng    = parseFloat(lngVal);

    /* Convert real-world coords to canvas coords (rough bounding box of Chennai area) */
    const LAT_MAX = 13.15, LAT_MIN = 12.85;
    const LNG_MIN = 80.15, LNG_MAX = 80.35;
    let px, py;
    if (!isNaN(lat) && !isNaN(lng)) {
      px = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 700 + 50;
      py = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 560 + 40;
    } else {
      px = 150 + Math.random() * 500;
      py = 100 + Math.random() * 400;
    }

    /* Add new pin to map and trigger bounce animation */
    const color  = MODULE_COLORS_MAP[record.module] || '#10b981';
    const newPin = {
      x:      Math.round(px),
      y:      Math.round(py),
      color,
      label:  record.name,
      module: record.module.charAt(0).toUpperCase() + record.module.slice(1),
      status: 'Mapped',
    };
    PINS.push(newPin);
    fieldMap.startPinBounce(newPin);

    const savedName = record.name;

    /* Remove from NON_MAPPABLE and re-render list */
    NON_MAPPABLE.splice(activeRecordIndex, 1);
    closeModal();
    updateModuleCounts();
    if (activeVersion === 'v2') renderNmListV2();
    else renderNmList();

    /* Show toast */
    showToast(`Location updated for ${savedName}.`);
  });

  /* ── Update module dropdown counts after removal ── */
  function updateModuleCounts() {
    const counts = { contacts: 0, accounts: 0, deals: 0, leads: 0 };
    NON_MAPPABLE.forEach(r => { if (counts[r.module] !== undefined) counts[r.module]++; });

    const labels = { contacts: 'Contacts', accounts: 'Accounts', deals: 'Deals', leads: 'Leads' };
    document.querySelectorAll('#nm-module-dropdown li').forEach(li => {
      const mod = li.dataset.value;
      if (labels[mod] !== undefined) {
        const dot  = li.querySelector('.mod-dot');
        li.textContent = `${labels[mod]} (${counts[mod]})`;
        if (dot) li.prepend(dot);
      }
    });

    /* Sync the visible label if it shows the active module */
    const activeLi = document.querySelector(`#nm-module-dropdown li[data-value="${nmActiveModule}"]`);
    if (activeLi) nmModuleLbl.textContent = activeLi.textContent.trim();

    /* Keep V2 tab counts current */
    updateV2TabCounts();
  }

  /* ── Toast ── */
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' toast-error' : ''}`;
    const icon = type === 'error' ? 'ti-alert-circle' : 'ti-check';
    toast.innerHTML = `
      <span class="toast-icon"><i class="ti ${icon}" aria-hidden="true"></i></span>
      <span>${message}</span>
      <button class="toast-close" aria-label="Dismiss"><i class="ti ti-x" aria-hidden="true"></i></button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
    toastContainer.appendChild(toast);

    /* Auto-dismiss after 4 seconds */
    setTimeout(() => dismissToast(toast), 4000);
  }

  function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

});
