/* ============================================================
   Beat detail — day by day
   Figma "Detail View" frames (1963:69357, 2055:44041, 3255:124174)

   The beat is not started and ended in one go. The rep logs in each
   morning, starts that day, works its visits, and ends the day. So:

     · every day carries its own status and its own clock
     · only one day can be open for work at a time, and days are worked
       in order — Day 2 cannot start before Day 1 has ended
     · a visit is completed or missed while its day is running
     · ending a day settles whatever is left on it as missed
     · the beat's own status is derived: Upcoming until the first day
       starts, In Progress while any day is running or part-done,
       Completed once the last day ends

   The layout, the day accordion and the visit cards come from
   style-bottom-up.css; only the day-flow pieces are new.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Data ──────────────────────────────────────────── */
  /* `drive` is the planned leg out of a stop; `actualDrive` is what it really
     took, and replaces the estimate once the rep has driven it. */
  const HOME   = { title: 'Home', time: '10:45 AM',
                   drive: '8 min (1.5 km)', actualDrive: '9 min (1.6 km)',
                   addr: '721 Broadway, New York, NY 10003, USA' };
  const OFFICE = { title: 'Office', addr: '33 3rd Ave, New York, NY 10003, US' };

  /* `pins` are the day's stops on the route map */
  const DAYS = [
    {
      label: 'Day 1', date: '4 May',
      pins: [{ x: 180, y: 350 }, { x: 220, y: 450 }, { x: 320, y: 490 }, { x: 370, y: 550 }],
      visits: [
        { name: 'Alex Newman Visit',  module: 'Contacts', type: 'Order Delivery',  time: '10:53 AM to 11:03 AM', drive: '20 min (2.5 km)',
          actual: '10:55 AM to 11:06 AM', actualDrive: '22 min (2.6 km)' },
        { name: 'Jordan Smith Visit', module: 'Contacts', type: 'Gate Approval',   time: '11:30 AM to 11:45 AM', drive: '12 min (1.2 km)',
          actual: '11:33 AM to 11:49 AM', actualDrive: '14 min (1.3 km)' },
        { name: 'Taylor Smith Visit', module: 'Leads',    type: 'Shop Delivery',   time: '11:57 AM to 12:07 PM', drive: '15 min (2.5 km)',
          actual: '12:02 PM to 12:14 PM', actualDrive: '17 min (2.6 km)' },
        { name: 'Morgan Kite Visit',  module: 'Deals',    type: 'Order Approval',  time: '12:22 PM to 12:32 PM', drive: '20 min (3.2 km)',
          actual: '12:31 PM to 12:44 PM', actualDrive: '21 min (3.3 km)' },
      ],
    },
    {
      label: 'Day 2', date: '5 May',
      pins: [{ x: 370, y: 240 }, { x: 450, y: 190 }, { x: 560, y: 200 }],
      visits: [
        { name: 'Priya Raman Visit',  module: 'Contacts', type: 'Order Delivery', time: '10:15 AM to 10:30 AM', drive: '18 min (2.2 km)',
          actual: '10:18 AM to 10:34 AM', actualDrive: '19 min (2.3 km)' },
        { name: 'Vikram Shah Visit',  module: 'Accounts', type: 'Stock Check',    time: '11:00 AM to 11:20 AM', drive: '14 min (1.8 km)',
          actual: '11:04 AM to 11:26 AM', actualDrive: '15 min (1.9 km)' },
        { name: 'Nisha Kumar Visit',  module: 'Leads',    type: 'Shop Delivery',  time: '11:50 AM to 12:05 PM', drive: '22 min (3.4 km)',
          actual: '11:55 AM to 12:11 PM', actualDrive: '24 min (3.5 km)' },
      ],
    },
    {
      label: 'Day 3', date: '6 May',
      pins: [{ x: 560, y: 380 }, { x: 640, y: 470 }],
      visits: [
        { name: 'Arun Menon Visit',   module: 'Deals',    type: 'Order Approval', time: '10:30 AM to 10:50 AM', drive: '16 min (2.1 km)',
          actual: '10:34 AM to 10:56 AM', actualDrive: '18 min (2.2 km)' },
        { name: 'Divya Nair Visit',   module: 'Contacts', type: 'Gate Approval',  time: '11:25 AM to 11:40 AM', drive: '19 min (2.7 km)',
          actual: '11:29 AM to 11:46 AM', actualDrive: '20 min (2.8 km)' },
      ],
    },
  ];

  /* status: day 'pending' | 'active' | 'done' · visit 'pending' | 'done' | 'missed' */
  DAYS.forEach(day => {
    day.status = 'pending';
    day.startedAt = null;
    day.endedAt = null;
    day.visits.forEach(v => { v.status = 'pending'; });
  });

  /* Two separate things: which day is selected — highlighted, and the one
     the route map draws — and whether its visits are showing. A selected day
     can be collapsed, so the rep can see all the days at once without
     losing the one they are on. */
  let selectedDay = 0;
  let expanded = true;

  /* Which of the three arrangements is showing. Type 3 is Type 2 with the
     day's action moved onto the day itself, so it wears both classes — see
     setLayout(). Read here because where the Start / End button goes
     depends on it. */
  let layout = '1';

  /* ── Elements ──────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const daysEl   = $('bd-days');
  const statusEl = $('bd-beat-status');
  const band     = $('bd-band');
  const bandIcon = $('bd-band-icon');
  const bandText = $('bd-band-text');
  const toastEl  = $('bd-toast');
  const dayAction = $('bd-day-action');

  const escape = s => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const clock = () => new Date().toLocaleTimeString('en-US',
    { hour: 'numeric', minute: '2-digit' });

  /* ── Derived state ─────────────────────────────────── */
  const activeIndex = () => DAYS.findIndex(d => d.status === 'active');

  /* A day opens for work only when it is next in line and nothing else
     is running — the rep works the beat in order, one day at a time. */
  function canStart(index) {
    if (DAYS[index].status !== 'pending') return false;
    if (activeIndex() !== -1) return false;
    return DAYS.slice(0, index).every(d => d.status === 'done');
  }

  /* What this day offers the rep, if anything — Type 3 only, where the
     action sits on the day rather than in the record header. The order
     falls straight out of canStart(): at the outset only Day 1 can be
     started, and each later day earns its button when the one before it is
     closed. A day that is done offers nothing, and nor does one still
     waiting its turn. */
  function dayAct(i) {
    if (DAYS[i].status === 'active') {
      return { act: 'end', label: 'End', cls: 'bd-day-act-end' };
    }
    if (canStart(i)) {
      return { act: 'start', label: 'Start', cls: 'bd-day-act-start' };
    }
    return null;
  }

  /* The record's own badge — a solid pill, not the pastel tags the days and
     visits use (Figma 2383:48054 · 2055:44440 · 2055:44842) */
  function beatStatus() {
    if (DAYS.every(d => d.status === 'done')) return { label: 'Completed', cls: 'bd-done' };
    if (DAYS.some(d => d.status !== 'pending')) return { label: 'In Progress', cls: 'bd-progress' };
    return { label: 'Upcoming', cls: 'bd-upcoming' };
  }

  /* ── Rendering ─────────────────────────────────────── */
  /* Only a finished day is tagged. A day still ahead needs no tag — that is
     what every day starts out as — and a running one is already named by the
     banner at the top of the record, marked by its border and dated by the
     "Started …" clock in its own header. */
  const DAY_TAG = {
    done: { label: 'Completed', cls: 'approved' },
  };

  /* A visit the rep has not reached yet carries no tag — the tags arrive one
     at a time as the day moves through the stops. `pending` is deliberately
     absent from this map. */
  const VISIT_TAG = {
    active: { label: 'In Progress', cls: 'pending' },
    done:   { label: 'Completed',   cls: 'approved' },
    missed: { label: 'Missed',      cls: 'rejected' },
  };

  /* A day still ahead has nothing to be part-way through, so it states its
     size the way the frame does — "3 visits". The fraction only appears
     once there is progress to report. */
  function dayTally(day) {
    if (day.status === 'pending') return `${day.visits.length} visits`;
    const settled = day.visits.filter(v => v.status === 'done' || v.status === 'missed').length;
    return `${settled} / ${day.visits.length} visits`;
  }

  /* Only a day that has been worked has a clock to show */
  function dayClockHtml(day) {
    if (day.status === 'active') return `<span class="bd-day-clock">Started ${escape(day.startedAt)}</span>`;
    if (day.status === 'done') {
      return `<span class="bd-day-clock">${escape(day.startedAt)} – ${escape(day.endedAt)}</span>`;
    }
    return '';
  }

  /* ── The day's timeline ────────────────────────────── */
  /* One continuous rail from Home to Office. Every row draws its own slice
     of the line behind the circles, so consecutive rows join with no gap;
     Home starts its slice at its circle and Office ends there. The blue runs
     as far as the rep has got, grey from there on. */

  function placeHtml(place, kind, reached, edge) {
    const time = place.time
      ? `<span class="at">at</span><span class="time">${escape(place.time)}</span>` : '';
    return `
      <div class="bd-row bd-place bd-place-${kind} ${edge} ${reached ? 'reached' : ''}">
        <span class="bd-rail">
          <span class="bd-place-icon"><img src="src/loc-${kind}.svg" alt="" aria-hidden="true" /></span>
        </span>
        <div class="bd-text">
          <p class="bd-place-line"><span class="name">${place.title}</span>${time}</p>
          <p class="bd-place-addr">${place.addr}</p>
        </div>
      </div>`;
  }

  /* The leg between two stops: a rule out to the right, then the car and the
     time (Figma 3479:98007). Until the rep has driven it that time is an
     estimate, marked with a ~; once they arrive it is replaced by what the
     leg actually took, and the ~ comes off. */
  function legHtml(from, travelled) {
    if (!from || !from.drive) return '';
    const done = travelled && from.actualDrive;
    return `
      <div class="bd-row bd-leg ${travelled ? 'reached' : ''}">
        <span class="bd-leg-rule"></span>
        <img class="bd-leg-car" src="src/car.svg" alt="" aria-hidden="true" />
        <span class="bd-leg-text ${done ? 'actual' : ''}">${done ? escape(from.actualDrive) : '~ ' + escape(from.drive)}</span>
      </div>`;
  }

  /* Read-only: completing a visit is the rep's job out in the field, so this
     page reports what happened rather than offering to change it. The tick
     and cross belong to the bottom-up screen, where a manager approves.
     No card either — the stop is plain text beside the rail. */
  function visitHtml(visit, i, day, reached, isCurrent) {
    const tag = day.status === 'pending' ? null : VISIT_TAG[visit.status];
    /* Only the stop in hand answers to a click, and only while its day runs */
    const settle = day.status === 'active' && visit.status === 'active';
    /* A completed stop reports when it really happened, not when it was
       planned for; one never reached keeps its plan */
    const when = visit.status === 'done' && visit.actual ? visit.actual : visit.time;
    return `
      <div class="bd-row bd-visit ${reached ? 'reached' : ''} ${isCurrent ? 'bd-current' : ''} ${settle ? 'bd-settleable' : ''}"
           data-visit="${i}" ${settle ? 'title="Mark this visit completed"' : ''}>
        <span class="bd-rail ${visit.status === 'active' ? 'bd-pulsing' : ''}"><span class="bp-visit-num ${visit.status}">${i + 1}</span></span>
        <div class="bd-text">
          <p class="bd-visit-head">
            <span class="bd-visit-name">${escape(visit.name)}<span class="dot">&nbsp;&nbsp;•&nbsp;&nbsp;</span><span class="mod">${escape(visit.module)}</span></span>
            ${tag ? `<span class="bp-visit-tag ${tag.cls}">${tag.label}</span>` : ''}
          </p>
          <p class="bd-visit-meta">${escape(visit.type)}<span class="sep">-</span>${escape(when)}</p>
        </div>
      </div>`;
  }

  function timelineHtml(day, index) {
    /* The blue reaches the stop the rep is on, or the last one they finished */
    const current = day.visits.findIndex(v => v.status === 'active');
    const lastDone = day.visits.reduce((n, v, i) => (v.status === 'done' ? i : n), -1);
    const upto = current !== -1 ? current : lastDone;
    const allDone = day.visits.length > 0 && day.visits.every(v => v.status === 'done');
    const canAdd = index === selectedDay && day.status !== 'done';

    const rows = [placeHtml(HOME, 'home', upto >= 0, 'first')];
    day.visits.forEach((v, i) => {
      /* the leg into this stop, then the stop itself */
      rows.push(legHtml(i === 0 ? HOME : day.visits[i - 1], upto >= i));
      rows.push(visitHtml(v, i, day, upto >= i, i === upto && !allDone));
    });
    rows.push(legHtml(day.visits[day.visits.length - 1], allDone));
    if (canAdd) {
      rows.push(`
        <div class="bd-row bd-add-row">
          <span class="bd-rail">
            <span class="bp-visit-num bd-add-num"><img src="src/add-visit.svg" alt="" aria-hidden="true" /></span>
          </span>
          <div class="bd-text">
            <button class="bd-add-visit" type="button" data-act="add">Add Visit</button>
          </div>
        </div>`);
    }
    rows.push(placeHtml(OFFICE, 'office', allDone, 'last'));
    return `<div class="bd-timeline">${rows.join('')}</div>`;
  }

  function dayHtml(day, index) {
    const tag = DAY_TAG[day.status];
    const act = layout === '3' ? dayAct(index) : null;
    return `
      <div class="bp-day bd-day ${index === selectedDay ? 'selected' : ''} ${index === selectedDay && expanded ? 'expanded' : ''} ${day.status}" data-day="${index}">
        <div class="bp-day-header" aria-expanded="${index === selectedDay && expanded}">
          <span class="bd-chev"><img src="src/day-chevron.svg" alt="" aria-hidden="true" /></span>
          <span class="bd-day-title">${day.label}<span class="dot">&nbsp;&nbsp;•&nbsp;&nbsp;</span><span class="date">${escape(day.date)}</span></span>
          ${tag ? `<span class="bp-visit-tag ${tag.cls}">${tag.label}</span>` : ''}
          <span class="bd-day-count">${dayTally(day)}</span>
          ${act ? `<button class="bd-day-act ${act.cls}" type="button"
                    data-act="${act.act}" data-day="${index}"
                    aria-label="${act.label} ${day.label}">${act.label}</button>` : ''}
          ${dayClockHtml(day)}
        </div>
        <div class="bp-day-body">${timelineHtml(day, index)}</div>
      </div>`;
  }

  function renderBand() {
    const running = activeIndex();
    if (running !== -1) {
      band.hidden = false;
      band.className = 'bp-status-band bp-band-waiting';
      bandIcon.className = 'ti ti-clock-play';
      bandText.textContent =
        `${DAYS[running].label} is running — started at ${DAYS[running].startedAt}.`;
      return;
    }
    if (DAYS.every(d => d.status === 'done')) {
      band.hidden = false;
      band.className = 'bp-status-band bp-band-approved';
      bandIcon.className = 'ti ti-circle-check';
      const total = DAYS.reduce((n, d) => n + d.visits.length, 0);
      const done = DAYS.reduce((n, d) => n + d.visits.filter(v => v.status === 'done').length, 0);
      bandText.textContent = `Beat completed — ${DAYS.length} days logged, ${done} of ${total} visits done.`;
      return;
    }
    band.hidden = true;
  }

  /* The one thing the rep is here to do, in the record header in both
     layouts, named after the day it acts on so they never have to hunt
     down the row first. Only ever one day is actionable, so there is only
     ever one button. */
  function renderDayAction() {
    /* Type 3 puts it on the day row instead — and on desktop this is a
       rarely used action, so it does not also hold the record's most
       prominent slot */
    if (layout === '3') { dayAction.hidden = true; return; }
    const running = activeIndex();
    if (running !== -1) {
      dayAction.hidden = false;
      dayAction.className = 'bp-btn bd-end';
      dayAction.textContent = `End ${DAYS[running].label}`;
      dayAction.dataset.act = 'end';
      dayAction.dataset.day = running;
      return;
    }
    const next = DAYS.findIndex((d, i) => canStart(i));
    if (next === -1) { dayAction.hidden = true; return; }
    dayAction.hidden = false;
    dayAction.className = 'bp-btn primary';
    dayAction.textContent = `Start ${DAYS[next].label}`;
    dayAction.dataset.act = 'start';
    dayAction.dataset.day = next;
  }

  /* The whole list is rebuilt on every change, so the details column would
     jump back to the top each time a day is folded. Hold its scroll. */
  const scroller = daysEl.closest('.bp-details');

  function render() {
    const scrollTop = scroller ? scroller.scrollTop : 0;
    daysEl.innerHTML = DAYS.map(dayHtml).join('');
    if (scroller) scroller.scrollTop = scrollTop;
    const s = beatStatus();
    statusEl.textContent = s.label;
    statusEl.className = `bp-badge ${s.cls}`;
    renderDayAction();
    renderBand();
    if (window.bdMap) { window.bdMap._activeBeatDay = selectedDay; window.bdMap.draw(); }
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ── Actions ───────────────────────────────────────── */
  /* Completing the stop in hand hands the day on to the next one */
  function completeVisit(day, visit) {
    visit.status = 'done';
    const next = day.visits.find(v => v.status === 'pending');
    if (next) next.status = 'active';
    render();
  }

  function startDay(i) {
    DAYS[i].status = 'active';
    DAYS[i].startedAt = clock();
    DAYS[i].startedTs = Date.now();
    /* The first stop is the one the rep is on */
    if (DAYS[i].visits[0]) DAYS[i].visits[0].status = 'active';
    selectedDay = i;
    expanded = true;
    render();
    revealDay(i);
    toast(`${DAYS[i].label} started at ${DAYS[i].startedAt}.`);
  }

  function endDay(i) {
    const day = DAYS[i];
    /* Whatever was not worked today did not happen today, the stop in hand
       included */
    const left = day.visits.filter(v => v.status === 'pending' || v.status === 'active');
    left.forEach(v => { v.status = 'missed'; });
    day.status = 'done';
    day.endedAt = clock();
    /* Move the rep on to the next day they have to work */
    const next = DAYS.findIndex(d => d.status === 'pending');
    if (next !== -1) { selectedDay = next; expanded = true; }
    render();
    toast(left.length
      ? `${day.label} ended — ${left.length} visit${left.length === 1 ? '' : 's'} marked missed.`
      : `${day.label} ended at ${day.endedAt}.`);
  }

  /* Acting from the toolbar means the day the rep just opened may be far
     down the list, so bring it to them.

     Not in a related list, though: there the button is on the day row, so
     the day is already under the rep's finger — and scrollIntoView moves
     every scrollable ancestor it has, which now includes the page column,
     carrying the card's own header off the top of the screen. */
  function revealDay(i) {
    if (document.body.classList.contains('bd-in-list')) return;
    const el = daysEl.querySelector(`.bd-day[data-day="${i}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* Type 2 asks before starting, with the same confirmation Type 3 uses
     from the day row. Type 1 is the reference and still starts on the
     click, as it always did. */
  dayAction.addEventListener('click', () => {
    const i = Number(dayAction.dataset.day);
    if (dayAction.dataset.act !== 'start') openEndDay(i);
    else if (layout === '2') openStartDay(i);
    else startDay(i);
  });

  /* Distance is read off the legs: what was actually driven where we have
     it, the estimate where we do not. Both confirmations use it. */
  const kmOf = visit => {
    const m = (visit.actualDrive || visit.drive || '').match(/([\d.]+)\s*km/);
    return m ? Number(m[1]) : 0;
  };

  /* ── Start Day confirmation ────────────────────────── */
  /* The click stamps a time that stands for "the rep began work, here,
     now", and nothing afterwards can correct it — so it is asked for
     rather than taken. Ending already asked; this closes the pair. */
  const startOverlay = $('bd-start-overlay');
  let startingDay = null;

  function openStartDay(i) {
    startingDay = i;
    const day = DAYS[i];
    const planned = day.visits.reduce((n, v) => n + kmOf(v), 0);
    const first = day.visits[0];

    $('bd-start-title').textContent = `Start ${day.label} ?`;
    $('bd-start-sub').innerHTML =
      `${escape(day.label)} • ${escape(day.date)}&nbsp;&nbsp;${day.visits.length} visits planned`;
    $('bd-start-visits').textContent = String(day.visits.length);
    $('bd-start-km').textContent = `${planned.toFixed(1)} km`;
    $('bd-start-first').textContent = first ? first.name : '—';
    $('bd-start-clock').textContent = clock();

    startOverlay.hidden = false;
    $('bd-start-confirm').focus();
  }

  function closeStartDay() { startOverlay.hidden = true; startingDay = null; }

  $('bd-start-cancel').addEventListener('click', closeStartDay);
  $('bd-start-confirm').addEventListener('click', () => {
    const i = startingDay;
    closeStartDay();
    startDay(i);
  });
  startOverlay.addEventListener('click', e => {
    if (e.target === startOverlay) closeStartDay();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !startOverlay.hidden) closeStartDay();
  });

  /* ── End Day confirmation ──────────────────────────── */
  /* Ending a day is the moment the rep's log is closed, so it shows what the
     day came to before it is settled, and says what will happen to anything
     left open. */
  const endOverlay = $('bd-end-overlay');
  let endingDay = null;

  function elapsed(day) {
    if (!day.startedTs) return '—';
    const mins = Math.max(1, Math.round((Date.now() - day.startedTs) / 60000));
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
  }

  function openEndDay(i) {
    endingDay = i;
    const day = DAYS[i];
    const done = day.visits.filter(v => v.status === 'done');
    const left = day.visits.filter(v => v.status === 'pending' || v.status === 'active').length;
    /* Distance counts the legs actually driven — the ones out of a stop the
       rep reached */
    const km = done.reduce((n, v) => n + kmOf(v), 0);

    $('bd-end-title').textContent = `End ${day.label} ?`;
    $('bd-end-sub').innerHTML =
      `${escape(day.label)} • ${escape(day.date)}&nbsp;&nbsp;Started ${escape(day.startedAt)}`;
    $('bd-sum-done').textContent = `${done.length} of ${day.visits.length}`;
    $('bd-sum-left').textContent = String(left);
    $('bd-sum-km').textContent = `${km.toFixed(1)} km`;
    $('bd-sum-time').textContent = elapsed(day);
    /* The note's wording is fixed; it only appears when it can still apply */
    $('bd-end-note').hidden = left === 0;

    endOverlay.hidden = false;
    $('bd-end-confirm').focus();
  }

  function closeEndDay() { endOverlay.hidden = true; endingDay = null; }

  $('bd-end-cancel').addEventListener('click', closeEndDay);
  $('bd-end-confirm').addEventListener('click', () => {
    const i = endingDay;
    closeEndDay();
    endDay(i);
  });
  endOverlay.addEventListener('click', e => { if (e.target === endOverlay) closeEndDay(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !endOverlay.hidden) closeEndDay();
  });

  daysEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');

    if (btn && btn.dataset.act === 'add') {
      openAddVisit(Number(btn.closest('.bd-day').dataset.day));
      return;
    }

    /* Starting or ending the day from its own row. Returning here keeps the
       click off the card, which would otherwise fold the day away. */
    if (btn && (btn.dataset.act === 'start' || btn.dataset.act === 'end')) {
      const i = Number(btn.dataset.day);
      if (btn.dataset.act === 'start') openStartDay(i);
      else openEndDay(i);
      return;
    }

    /* Completing the stop in hand */
    const row = e.target.closest('.bd-settleable');
    if (row) {
      const day = DAYS[Number(row.closest('.bd-day').dataset.day)];
      completeVisit(day, day.visits[Number(row.dataset.visit)]);
      return;
    }

    /* Anywhere on the card counts, except inside the visit list — a
       collapsed card is all header, so the whole thing is the hit area */
    if (e.target.closest('.bp-day-body')) return;
    const card = e.target.closest('.bd-day');
    if (!card) return;
    const i = Number(card.dataset.day);
    /* Clicking the day already selected folds it away and leaves it
       selected; clicking another one selects and opens it */
    if (i === selectedDay) expanded = !expanded;
    else { selectedDay = i; expanded = true; }
    render();
  });

  /* ── Add Visit modal (Figma 4007:113738) ───────────── */
  const overlay = $('bd-overlay');
  const avTitle = $('bd-av-title');
  const avRecord = $('av-record');
  const avType   = $('av-type');
  const avTime   = $('av-time');
  const avDesc   = $('av-desc');
  const avStatus = $('av-status');
  const avPic    = $('av-pic');
  const avPicName = $('av-pic-name');

  /* Half-hour slots across a working day */
  const SLOTS = (() => {
    const out = [];
    for (let m = 9 * 60; m <= 17 * 60; m += 30) out.push(minutesToClock(m));
    return out;
  })();

  function minutesToClock(mins) {
    const h24 = Math.floor(mins / 60) % 24;
    const h = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h}:${String(mins % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  }

  function clockToMinutes(label) {
    const [, h, m, ap] = label.match(/(\d+):(\d+) (AM|PM)/);
    return ((Number(h) % 12) + (ap === 'PM' ? 12 : 0)) * 60 + Number(m);
  }

  let addingTo = null;   // the day index the modal is filling

  function setMsg(field, text) {
    const msg = field.parentElement.querySelector('.bd-msg');
    field.classList.toggle('invalid', Boolean(text));
    if (!msg) return;
    msg.textContent = text || '';
    msg.hidden = !text;
  }

  function openAddVisit(dayIndex) {
    addingTo = dayIndex;
    const day = DAYS[dayIndex];
    avTitle.innerHTML =
      `Add Visit for “${escape(day.label)} <span class="dot">•</span> ${escape(day.date)}”`;

    [avRecord, avType, avStatus].forEach(sel => { sel.value = ''; setMsg(sel, ''); });
    avDesc.value = '';
    avPic.value = '';
    avPicName.textContent = 'Upload your file';
    avPicName.parentElement.classList.remove('filled');
    /* The slot list depends on the visit type, so it stays shut until one
       is picked — as the frame shows it */
    avTime.innerHTML = '<option value="" selected disabled></option>';
    avTime.disabled = true;

    overlay.hidden = false;
    avRecord.focus();
  }

  function closeAddVisit() {
    overlay.hidden = true;
    addingTo = null;
  }

  avType.addEventListener('change', () => {
    setMsg(avType, '');
    /* Slots already spoken for on this day are not offered again */
    const taken = DAYS[addingTo].visits.map(v => v.time.split(' to ')[0]);
    const free = SLOTS.filter(t => !taken.includes(t));
    avTime.innerHTML = '<option value="" selected disabled>Select Visit Time</option>' +
      free.map(t => `<option>${t}</option>`).join('');
    avTime.disabled = false;
  });

  avRecord.addEventListener('change', () => setMsg(avRecord, ''));

  avPic.addEventListener('change', () => {
    const file = avPic.files[0];
    avPicName.textContent = file ? file.name : 'Upload your file';
    avPicName.parentElement.classList.toggle('filled', Boolean(file));
  });

  $('av-cancel').addEventListener('click', closeAddVisit);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeAddVisit(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) closeAddVisit();
  });

  $('av-add').addEventListener('click', () => {
    let ok = true;
    if (!avRecord.value) { setMsg(avRecord, 'Select a record.'); ok = false; }
    if (!avType.value)   { setMsg(avType, 'Select a visit type.'); ok = false; }
    if (!ok) return;

    const day = DAYS[addingTo];
    const start = avTime.value;
    /* Fifteen minutes is what the other visits on these beats run to */
    const time = start
      ? `${start} to ${minutesToClock(clockToMinutes(start) + 15)}`
      : 'Time not set';

    day.visits.push({
      name: avRecord.value,
      module: avRecord.selectedOptions[0].parentElement.label || 'Contacts',
      type: avType.value,
      time,
      drive: '',
      description: avDesc.value.trim(),
      locationStatus: avStatus.value,
      status: 'pending',
    });
    /* Keep the day in the order it will actually be worked */
    day.visits.sort((a, b) => {
      const at = a.time.match(/^\d/) ? clockToMinutes(a.time) : Infinity;
      const bt = b.time.match(/^\d/) ? clockToMinutes(b.time) : Infinity;
      return at - bt;
    });

    closeAddVisit();
    render();
    toast(`${avRecord.value} added to ${day.label}.`);
  });

  /* ── Route map ─────────────────────────────────────── */
  const BEAT_HOME   = { x: 250, y: 590 };
  const BEAT_OFFICE = { x: 700, y: 560 };

  /* Everything that makes a plain FieldMap draw *this beat*. Factored out
     because there are two of them now — the one in the card and the one in
     the full-map sheet — and they must draw the day identically. */
  function configureBeatMap(fieldMap) {
  fieldMap._beatDays      = DAYS.map(d => ({ visits: d.pins }));
  fieldMap._beatHome      = BEAT_HOME;
  fieldMap._beatOffice    = BEAT_OFFICE;
  fieldMap._activeBeatDay = 0;

  /* The canvas's backing store has to match its box, and the box changes
     for reasons no single event reports: switching layout, the card
     opening, the window or the embedding pane being dragged. Checking it
     as part of drawing keeps the two in step wherever the change came
     from, and costs two offset reads on a frame that was going to lay the
     map out anyway. */
  fieldMap.fit = function () {
    /* clientWidth, not offsetWidth: the sheet's map box carries a 1px
       border, and the canvas fills the content box inside it — measuring
       the border box made the backing store 2px bigger than the element
       and the whole map drew very slightly stretched. */
    const w = this.area.clientWidth, h = this.area.clientHeight;
    if (!w || !h || (this.canvas.width === w && this.canvas.height === h)) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    this.scale = 0.65;
    this.panX = w / 2 - 450 * this.scale;
    this.panY = h / 2 - 390 * this.scale;
    return true;
  };

  fieldMap.draw = function () {
    this.fit();
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);
    this._drawBackground(); this._drawBlocks(); this._drawWater(); this._drawRoads();
    this._drawBeatRoutes(); this._drawBeatPins();
    ctx.restore();
  };

  fieldMap._drawBeatRoutes = function () {
    const { ctx } = this;
    this._beatDays.forEach((day, i) => {
      const active = i === this._activeBeatDay;
      const pts = [this._beatHome, ...day.visits, this._beatOffice];
      ctx.save();
      ctx.strokeStyle = active ? '#6c63ff' : '#c0c7d4';
      ctx.lineWidth   = (active ? 2.5 : 1.5) / this.scale;
      ctx.globalAlpha = active ? 1 : 0.65;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (!active) ctx.setLineDash([5 / this.scale, 4 / this.scale]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    });
  };

  /* A stop the rep has settled goes green on the map too, so the day's
     progress reads the same on both sides of the screen */
  fieldMap._drawBeatPins = function () {
    const { ctx } = this;
    const ACTIVE = '#6c63ff', GREY = '#9ca3af', DONE = '#12aa67', MISSED = '#ef4444';
    const r = 11 / this.scale;
    this._beatDays.forEach((day, i) => {
      const active = i === this._activeBeatDay;
      ctx.save();
      ctx.globalAlpha = active ? 1 : 0.5;
      day.visits.forEach((p, vi) => {
        const state = DAYS[i].visits[vi] ? DAYS[i].visits[vi].status : 'pending';
        const col = state === 'done' ? DONE : state === 'missed' ? MISSED : active ? ACTIVE : GREY;
        const filled = active || (state !== 'pending' && state !== 'active');
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = filled ? col : '#ffffff'; ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5 / this.scale; ctx.stroke();
        ctx.fillStyle = filled ? '#ffffff' : col;
        ctx.font = `600 ${10 / this.scale}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(vi + 1, p.x, p.y);
      });
      ctx.restore();
    });
    this._drawSinglePin(this._beatHome.x,   this._beatHome.y,   '#10b981', 0, false);
    this._drawSinglePin(this._beatOffice.x, this._beatOffice.y, '#ef4444', 0, false);
  };

  fieldMap.resize = function () { this.fit(); this.draw(); };
  return fieldMap;
  }

  /* ── Picking a day off the map ──────────────────────── */
  /* The days a rep is not on are drawn dashed and grey behind the one they
     are. Clicking one of those routes moves the whole view onto that day —
     the timeline, the card's map and the sheet's, because all three draw
     from selectedDay. */
  function distToSegment(px, py, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const len = vx * vx + vy * vy;
    let t = len ? ((px - a.x) * vx + (py - a.y) * vy) / len : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + t * vx), py - (a.y + t * vy));
  }

  /* Which day a point landed on, or -1. Stops are tested before the lines
     between them, so a pin always wins over a route passing behind it. The
     tolerances are in screen pixels, hence the division by scale. */
  function dayAt(map, mx, my) {
    const [wx, wy] = map.screenToWorld(mx, my);
    let hit = -1, best = Infinity;

    const pinTol = 15 / map.scale;
    DAYS.forEach((day, i) => day.pins.forEach(p => {
      const d = Math.hypot(p.x - wx, p.y - wy);
      if (d <= pinTol && d < best) { best = d; hit = i; }
    }));
    if (hit !== -1) return hit;

    const lineTol = 10 / map.scale;
    DAYS.forEach((day, i) => {
      const pts = [BEAT_HOME, ...day.pins, BEAT_OFFICE];
      for (let k = 1; k < pts.length; k++) {
        const d = distToSegment(wx, wy, pts[k - 1], pts[k]);
        if (d <= lineTol && d < best) { best = d; hit = i; }
      }
    });
    return hit;
  }

  function bindDayPicking(map) {
    const at = e => {
      const r = map.canvas.getBoundingClientRect();
      return dayAt(map, e.clientX - r.left, e.clientY - r.top);
    };

    map.canvas.addEventListener('click', e => {
      if (map.didDrag) return;
      const i = at(e);
      if (i === -1 || i === selectedDay) return;
      selectedDay = i;
      expanded = true;
      render();
    });

    /* So the routes read as something you can click */
    map.canvas.addEventListener('mousemove', e => {
      if (map.isDragging) return;
      map.canvas.classList.toggle('bd-over-route', at(e) !== -1);
    });
    map.canvas.addEventListener('mouseleave', () => {
      map.canvas.classList.remove('bd-over-route');
    });
  }

  const fieldMap = configureBeatMap(new FieldMap('map-canvas', 'map-area'));
  window.bdMap = fieldMap;
  bindDayPicking(fieldMap);
  fieldMap.resize();

  /* A resized window changes the map's box too */
  window.addEventListener('resize', () => fieldMap.resize());

  /* ── Layout toggle ─────────────────────────────────── */
  /* Only the arrangement changes; every behaviour above is shared. */
  const content = $('bd-content');
  const LAYOUT_KEY = 'bd-layout';

  function setLayout(type) {
    layout = type;
    content.classList.toggle('type-1', type === '1');
    /* Type 3 is Type 2's arrangement with the day's action moved, so it
       wears type-2 as well and inherits the whole layout rather than
       copying thirty selectors */
    content.classList.toggle('type-2', type === '2' || type === '3');
    content.classList.toggle('type-3', type === '3');
    document.querySelectorAll('.bd-layout-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.layout === type));
    /* Reaches the rail and the toolbar button, both outside .bp-content */
    document.body.classList.toggle('bd-in-list', type === '2' || type === '3');
    try { localStorage.setItem(LAYOUT_KEY, type); } catch { /* private mode */ }
    render();   /* the action moves between the toolbar and the day rows */
    /* Flush the new arrangement, then fit the canvas to it */
    void content.offsetWidth;
    fieldMap.resize();
    if (window.bdMarkRail) window.bdMarkRail();   /* the column's travel changed */
  }

  document.querySelector('.bd-layout').addEventListener('click', e => {
    const btn = e.target.closest('.bd-layout-btn');
    if (btn) setLayout(btn.dataset.layout);
  });

  let savedLayout = '1';
  try { savedLayout = localStorage.getItem(LAYOUT_KEY) || '1'; } catch { /* private mode */ }
  if (!['1', '2', '3'].includes(savedLayout)) savedLayout = '1';
  setLayout(savedLayout);


  /* ── The related-list rail (Type 2) ────────────────── */
  /* The related lists carry no expand/collapse of their own — this rail is
     what moves between them. Closed on arrival; the toggle beside the tab
     pill opens it, and an item brings its card to the top of the column.
     The highlight follows the column as it scrolls, so the rail always says
     where the reader is. */
  const rail = $('bd-rlist');
  const railToggle = $('bd-rlist-toggle');
  const railItems = [...rail.querySelectorAll('.bd-rlist-item')];

  railToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('bd-rlist-open');
    railToggle.setAttribute('aria-expanded', String(open));
    railToggle.setAttribute('aria-label', `${open ? 'Hide' : 'Show'} related list`);
    /* The column just changed width, and the map canvas with it. Reading a
       layout property flushes the new width, so the canvas can be fitted
       here and now rather than from a frame that may never be scheduled. */
    void content.offsetWidth;
    fieldMap.resize();
  });

  rail.addEventListener('click', e => {
    const item = e.target.closest('.bd-rlist-item');
    if (!item) return;
    const card = $(item.dataset.target);
    if (!card) return;
    /* Relative, not card.offsetTop: the cards' offsetParent is the page,
       not the scrolling column. Assigning scrollTop rather than asking for
       behavior: 'smooth' — the column carries scroll-behavior in CSS, which
       animates where it can and lands the jump where it cannot. */
    content.scrollTop += card.getBoundingClientRect().top - content.getBoundingClientRect().top;
    /* Light the item up from the click rather than waiting for the scroll
       it causes: the glide takes a moment, and the last card can only come
       part of the way up when the column runs out of travel */
    railItems.forEach(i => i.classList.toggle('active', i === item));
  });

  /* The last card whose top has passed the top of the column is the one
     being read — except at the very bottom, where the last card may never
     reach the top and is nonetheless what the reader is looking at. */
  function markRail() {
    /* Only meaningful when there is travel to be at the end of — with
       nothing to scroll, every card is on screen and the first one leads */
    const travel = content.scrollHeight - content.clientHeight;
    const atEnd = travel > 2 && content.scrollTop >= travel - 2;
    let current = atEnd ? railItems[railItems.length - 1] : railItems[0];
    if (!atEnd) {
      const edge = content.getBoundingClientRect().top + 8;
      railItems.forEach(item => {
        const card = $(item.dataset.target);
        if (card && card.getBoundingClientRect().top <= edge) current = item;
      });
    }
    railItems.forEach(item => item.classList.toggle('active', item === current));
  }

  content.addEventListener('scroll', markRail);
  /* setLayout() is defined above this point and has to reach it */
  window.bdMarkRail = markRail;
  markRail();

  /* ── Map controls ──────────────────────────────────── */
  /* Zoom, back-to-the-day and terrain, riding on the card's own map. There
     is no separate full view: the map is large enough to work in where it
     stands, so the controls come to it. */
  const terrainBtn  = $('bd-terrain');
  const terrainMenu = $('bd-terrain-menu');

  /* The day the map answers for: the one running, else the one selected */
  const dayInView = () => (activeIndex() !== -1 ? activeIndex() : selectedDay);

  const dayPoints = i =>
    [BEAT_HOME, ...(DAYS[i] ? DAYS[i].pins : []), BEAT_OFFICE];

  /* The thumbnail previews whichever terrain is in use */
  function paintTerrain() {
    terrainBtn.style.background = FieldMap.TERRAINS[fieldMap.terrain].bg;
    terrainMenu.querySelectorAll('.bd-terrain-opt').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.terrain === fieldMap.terrain));
  }
  paintTerrain();

  /* Zoom from the middle of the canvas, which is what the buttons imply */
  const ZOOM_STEP = 1.3;
  function zoomMap(factor) {
    fieldMap.zoom(factor, fieldMap.canvas.width / 2, fieldMap.canvas.height / 2);
  }
  $('bd-map-zoom-in').addEventListener('click', () => zoomMap(ZOOM_STEP));
  $('bd-map-zoom-out').addEventListener('click', () => zoomMap(1 / ZOOM_STEP));

  /* "Current location" is the day in hand for now — where the rep actually
     is is not something this prototype knows */
  $('bd-map-locate').addEventListener('click', () => {
    const day = dayInView();
    fieldMap._activeBeatDay = day;
    fieldMap.fitBounds(dayPoints(day));
  });

  terrainBtn.addEventListener('click', () => {
    const open = terrainMenu.hidden;
    terrainMenu.hidden = !open;
    terrainBtn.setAttribute('aria-expanded', String(open));
  });

  /* Anywhere else dismisses the terrain menu */
  document.addEventListener('click', e => {
    if (terrainMenu.hidden) return;
    if (e.target.closest('#bd-terrain, #bd-terrain-menu')) return;
    terrainMenu.hidden = true;
    terrainBtn.setAttribute('aria-expanded', 'false');
  });

  terrainMenu.addEventListener('click', e => {
    const opt = e.target.closest('.bd-terrain-opt');
    if (!opt) return;
    fieldMap.setTerrain(opt.dataset.terrain);
    paintTerrain();
    terrainMenu.hidden = true;
    terrainBtn.setAttribute('aria-expanded', 'false');
  });

  document.querySelectorAll('.bp-tabs .bp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.bp-tabs .bp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  render();
});
