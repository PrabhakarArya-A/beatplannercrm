# Beat Detail View — Behaviour Specification

Implementation spec for the **Beat detail page** and the actions available from it: the beats
list that leads into it, the day-by-day execution flow, the five per-visit actions, and the
revise/missed handling.

Anything marked **▸ Assumed** is a decision taken to keep the spec complete. Each one is a
question outstanding; correct them and the surrounding clause changes with it.

---

## 1. Beats list

The entry point. Clicking any row opens that beat's detail page.

### 1.1 Default columns

These are the defaults, **in this order**. The order is fixed — a build must not reorder them.

| # | Column |
|---|---|
| 1 | Beat ID |
| 2 | Rep |
| 3 | Status |
| 4 | Dates |
| 5 | Visits |
| 6 | Mileage |
| 7 | Created date |

| # | Case | Expected |
|---|---|---|
| 1.1.1 | Click a row | Opens that beat's detail page |
| 1.1.2 | Beat ID cell | Rendered as a link, but the **whole row** is the hit area |
| 1.1.3 | Rep cell | Avatar then name |
| 1.1.4 | Status cell | A solid status pill — see §14.1 |
| 1.1.5 | Manage Columns | The column-settings control at the right of the header row adds or removes columns. The seven above are the default set; a user may add others |
| 1.1.6 | After adding a column | The seven defaults keep their relative order; added columns append |
| 1.1.7 | Row actions | Checkbox per row and a select-all in the header |

**▸ Assumed:** Manage Columns is the platform's stock control, so its own behaviour is out of
scope here — this document only fixes the default set and their order.

### 1.2 Beat status values

`Upcoming` · `In Progress` · `Partially Completed` · `Completed`

**▸ Assumed:** a beat becomes **Partially Completed** when its last day ends with at least one
visit Missed or Cancelled, and **Completed** only when every visit across every day was
completed. Our current build marks every finished beat Completed — this rule is new.

---

## 2. Detail page anatomy

Two columns side by side, each scrolling independently.

```
┌─ record header ─────────────────────────────────────────────────────┐
│ ←  B  BP - 003  (status)          [Zia] [Start Day 1] [Edit] [⋯] ‹ › │
│       Add Tags                                                       │
├─ tabs ──────────────────────────────────────────── Last Update ─────┤
│ ( Overview )  Timeline                                               │
├──────────────────────────────┬──────────────────────────────────────┤
│ Beat Details                 │ Route Map          View Full Map ↗   │
│  Beat Owner · Beat Summary   │                                      │
│  Beat Duration               │            [ map ]                   │
│ Visits                       │                                      │
│  ▸ Day 1 • 4 May   4 visits  │                                      │
│  ▾ Day 2 • 5 May   3 visits  │                                      │
│      Home → stops → Office   │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
```

### 2.1 Beat Details

Three fields: **Beat Owner**, **Beat Summary** (`N Visits · N km`), **Beat Duration**.

| # | Case | Expected |
|---|---|---|
| 2.1.1 | Beat Duration, short dates | `13 Apr 2026` or `4 May 2026 - 6 May 2026` |
| 2.1.2 | Beat Duration, **long dates** | `4 December 2026 - 23 December 2026` must render **in full**. The field takes the width it needs, or wraps — it never truncates or ellipses |
| 2.1.3 | Single-day beat | One date, no range |

### 2.2 Visits — days

One collapsible card per day, in order.

| # | Case | Expected |
|---|---|---|
| 2.2.1 | On load | **Day 1 is selected and expanded**, and the map draws Day 1's route |
| 2.2.2 | Click another day | It becomes selected and expands; the previous one collapses; the map redraws to the newly selected day |
| 2.2.3 | Click the selected day | It collapses **and stays selected** — the map keeps drawing it |
| 2.2.4 | Hit area | The whole card, except inside the expanded visit list |
| 2.2.5 | Scroll position | Held across selection — the column does not jump to the top |
| 2.2.6 | Day header | `Day 1 • 4 May`, then the status tag if any, then the visit tally on the right, then the clock line beneath |

### 2.3 Day hover popover

Hovering a **collapsed** day shows a popover:

```
Day 2 • 5 May
Visit :      2 Visits
Distance :   6.2 km
```

| # | Case | Expected |
|---|---|---|
| 2.3.1 | Hover a collapsed day | Popover appears after a short delay (~300 ms) |
| 2.3.2 | Hover the expanded day | **No popover** — its content is already on screen |
| 2.3.3 | Keyboard focus on a day | Same popover, so it is not mouse-only |
| 2.3.4 | Contents | Day label, visit count, total route distance for that day |
| 2.3.5 | Move away | Dismisses immediately |

**▸ Assumed:** the inline visit tally stays in the header as well as appearing in the popover —
the popover adds distance, which the header does not carry. The frames label the popover
`Day 2 : 5 May` with a colon; use the bullet, matching the header.

### 2.4 Route map

| # | Case | Expected |
|---|---|---|
| 2.4.1 | Draws | The **selected** day's route: Home → each stop in order → Office |
| 2.4.2 | Other days | Not drawn, or drawn muted — never competing with the selected one |
| 2.4.3 | View Full Map | Opens a full-screen map that can be panned and zoomed, with the same route |
| 2.4.4 | A stop is settled | Its pin recolours immediately — see §14.3 |
| 2.4.5 | A location is adjusted | The pin moves and the route redraws for that day |

---

## 3. Day execution — Start Day / End Day

**This replaces the Start Beat / End Beat model.** There is no beat-level start or end. The rep
logs in each morning, starts that day, works its visits, and ends the day.

### 3.1 Rules

- Every day carries its own status and its own clock.
- **One day runs at a time**, and days are worked **in order** — Day 2 cannot start until Day 1 has
  ended.
- The beat's own status is derived: `Upcoming` until the first day starts, `In Progress` while any
  day is running or part-done, and `Completed` / `Partially Completed` once the last day ends
  (§1.2).

### 3.2 The action button

One button in the record header, in the slot the designs gave Start Beat. It names the day it
acts on, so nothing has to be hunted for in the list.

| State | Button |
|---|---|
| Nothing started | `Start Day 1` (primary) |
| Day 1 running | `End Day 1` (negative) |
| Day 1 ended | `Start Day 2` (primary) |
| All days ended | *hidden* |

| # | Case | Expected |
|---|---|---|
| 3.2.1 | Start Day N | Day N becomes In Progress, records its start time, auto-expands and scrolls into view |
| 3.2.2 | On start | The day's **first stop** becomes In Progress |
| 3.2.3 | End Day N | Opens the confirmation in §3.3 — it never ends immediately |
| 3.2.4 | After the last day ends | The button is hidden and the beat status settles |

### 3.3 End Day confirmation

A modal summarising the day before it is closed.

| Field | Value |
|---|---|
| `Visits Completed` | `N of M` |
| `Not Visited` | count still open |
| `Distance Covered` | sum of the legs actually driven |
| `Time on the Day` | start time → now |

A note appears **only when something is still open**:
`Note: Visits that aren't completed will be marked as missed`

| # | Case | Expected |
|---|---|---|
| 3.3.1 | Cancel | The day keeps running, unchanged |
| 3.3.2 | Confirm | The day ends; every still-open visit becomes **Missed**; the clock closes to a range |
| 3.3.3 | Everything already complete | The note is hidden |
| 3.3.4 | Escape / backdrop | Same as Cancel |

### 3.4 Running-day banner

While a day runs, a banner sits under the record header:
`Day 1 is running — started at 6:18 PM.`

Once the beat finishes: `Beat completed — 3 days logged, 9 of 9 visits done.`

---

## 4. Visit states

| State | Meaning |
|---|---|
| `Pending` | Not reached yet. **Carries no tag** — it is what every visit starts as |
| `In Progress` | The stop the rep is on |
| `Completed` | Worked |
| `Missed` | Not worked — either time lapsed (§4.2) or the day ended with it still open |
| `Cancelled` | Called off deliberately, with a reason |

Tags appear **only once the day has started**. A day still ahead lists its stops plainly.

### 4.1 Completing a visit

Clicking the **In Progress** visit row marks it Completed and hands the day on to the next stop.
Only that one row is clickable; the rest of the list is a record.

### 4.2 Missing a visit — the time rule

A visit is marked **Missed automatically** when:

> its **scheduled end time** has passed **and** a **grace period of 30 minutes** has elapsed.

| # | Case | Expected |
|---|---|---|
| 4.2.1 | Scheduled end 11:03, now 11:20 | Still In Progress — inside the grace period |
| 4.2.2 | Scheduled end 11:03, now 11:34 | **Missed** |
| 4.2.3 | The visit is completed at 11:20 | Completed — the grace period is never a penalty for finishing late |
| 4.2.4 | A visit goes Missed while the day runs | The next Pending stop becomes In Progress; the day does not stall |
| 4.2.5 | Day ends with stops still open | They become Missed immediately, grace period or not (§3.3.2) |
| 4.2.6 | Missed on a **running** day | The row shows a **`Revise`** button (§9) |
| 4.2.7 | Missed after the day has **ended** | The `Missed` tag alone. No Revise — the day is closed |

**▸ Assumed:** the grace period runs from the scheduled **end** time, not the start, and is the
same 30 minutes for every visit type.

---

## 5. Visit actions menu

A `⋯` on each visit row, revealed on hover or keyboard focus, opening:

`Cancel Visit` · `Edit Visit` · `Reschedule Visit` · `Reassign User` · `Adjust Location`

`Cancel Visit` is styled as destructive.

### 5.1 Availability by visit state

| Action | Pending | In Progress | Completed | Missed | Cancelled |
|---|:---:|:---:|:---:|:---:|:---:|
| Cancel Visit | ● | ● | — | — | — |
| Edit Visit | ● | ● | — | ● | ● |
| Reschedule Visit | ● | ● | — | ● | ● |
| Reassign User | ● | ● | — | ● | — |
| Adjust Location | ● | ● | — | — | — |

**A cancelled visit offers Edit and Reschedule only** — it can be brought back or amended, but
there is nothing left to cancel, reassign or relocate.

A **completed** visit offers nothing: it happened, and the record of it is not editable from here.

| # | Case | Expected |
|---|---|---|
| 5.1.1 | No action is available for a state | The `⋯` is **not rendered** — never an empty or all-disabled menu |
| 5.1.2 | Opening the menu | Escape and an outside click close it |
| 5.1.3 | Clicking `⋯` on the In Progress row | Opens the menu and **does not** complete the visit — the menu click must not fall through to §4.1 |
| 5.1.4 | Keyboard | The `⋯` is reachable by Tab and its items by arrow keys |

**▸ Assumed:** the whole matrix above except the Cancelled column, which you specified. In
particular: actions are available on a day that has not started as well as one that is running,
but **not on a day that has ended**, where the log is closed.

**▸ Assumed:** `Edit Visit` opens the same form as Revise Visit (§9) with every field editable,
rather than a separate dialog. No design exists for it.

---

## 6. Cancel Visit

| | |
|---|---|
| Title | `Cancel "<Visit Name>"` |
| Field | `Cancellation Reason` — textarea, **mandatory** |
| Buttons | `Not now` · `Yes, Cancel` (destructive) |

| # | Case | Expected |
|---|---|---|
| 6.1 | Confirm with an empty reason | Blocked. Field flagged, focused, message announced |
| 6.2 | Whitespace-only reason | Treated as empty |
| 6.3 | `Not now` / Escape / backdrop | Closes with no change |
| 6.4 | Confirmed | The visit becomes `Cancelled`; toast `Visit cancelled for "<Visit Name>".` |
| 6.5 | The row afterwards | **Stays in the list** with a `Cancelled` tag, struck-through or muted, retaining its position |
| 6.6 | Numbering | Remaining stops **do not renumber** — a cancelled stop keeps its number so the day's record stays readable |
| 6.7 | The map | The pin is **removed from the route** and the day's distance recalculates |
| 6.8 | The day tally | A cancelled visit counts as settled — it is not left as outstanding work |

**▸ Assumed:** all of 6.5–6.8. No design shows the after-state. The alternative — dropping the
row entirely and renumbering — loses the audit trail, which is why I did not choose it.

---

## 7. Reschedule Visit

| | |
|---|---|
| Title | `Reschedule "<Visit Name>"` |
| Subtitle | `Pick active beat of the current rep, then set a new date and time.` |

| Field | Control | Mandatory |
|---|---|---|
| `Active Beat` | Dropdown of the **current rep's** active beats | Yes |
| `Date` | Dropdown of days within the chosen beat — `Day 2 • 29 May` | Yes |
| `Visit Type` | Dropdown | Yes |
| `Visit Time` | Dropdown | Yes |
| `Reschedule Reason` | Textarea | **Yes** |

Buttons `Cancel` · `Reschedule`

| # | Case | Expected |
|---|---|---|
| 7.1 | Field chain | `Active Beat` → `Date` → `Visit Type` → `Visit Time`. Each stays disabled until the one before it is answered |
| 7.2 | Changing Active Beat after picking a Date | Date, Visit Type and Visit Time **clear** — they belonged to the old beat |
| 7.3 | Date options | Only days inside the chosen beat's duration |
| 7.4 | Visit Time options | Only slots free on that day for that rep |
| 7.5 | Reschedule with anything empty | Blocked; first invalid field flagged, focused, announced |
| 7.6 | Confirmed | The visit leaves this day and appears on the target day; toast `Visit rescheduled to <Day> • <Date>.` |
| 7.7 | Rescheduled within the same beat | Both days' routes and distances recalculate |
| 7.8 | Rescheduled to another beat | It leaves this beat entirely and the day's route recalculates |
| 7.9 | The rep has no active beat | The Active Beat dropdown shows an empty state saying so; Reschedule stays blocked |

---

## 8. Reassign User

| | |
|---|---|
| Title | `Reassign "<Visit Name>"` |
| Subtitle | `Choose a rep with an active beat, then set the new date and time` |

| Field | Control | Mandatory |
|---|---|---|
| `Sales Rep` | Dropdown of reps **with an active beat** | Yes |
| `Active Beat` | That rep's active beats | Yes |
| `Date` | Days within the chosen beat | Yes |
| `Visit Type` | Dropdown | Yes |
| `Visit Time` | Dropdown | Yes |
| `Reassign Reason` | Textarea | **No** |

Buttons `Cancel` · `Reassign`

| # | Case | Expected |
|---|---|---|
| 8.1 | On open | Only `Sales Rep` is enabled. The other four are **disabled and empty** |
| 8.2 | Rep chosen | `Active Beat` enables. The rest stay disabled — it is a chain, one at a time |
| 8.3 | Beat chosen | `Date` enables; then `Visit Type`; then `Visit Time` |
| 8.4 | Rep changed | Everything below it **clears and re-disables** |
| 8.5 | Rep has no active beat | Not offered in the Sales Rep list at all — the subtitle says "a rep with an active beat" |
| 8.6 | Reason | Optional. Reassign is not blocked by it |
| 8.7 | Reassign with a mandatory field empty | Blocked; first invalid field flagged, focused, announced |
| 8.8 | Confirmed | The visit moves to the new rep's beat and leaves this one; toast `Visit reassigned to <Rep>.` |

**▸ Assumed:** 8.1–8.5, the chain and the empty-rep handling. The asymmetry in 8.6 — reason
optional here, mandatory to Cancel and Reschedule — is taken from the designs, where only this
field lacks the mandatory strip. Flag if that was an oversight.

---

## 9. Revise Visit

Reached from the **`Revise`** button on a Missed visit, while its day is still running (§4.2.6).
It is an inline button on the row, not a menu item.

| Field | Control | Editable |
|---|---|---|
| `Module & Record` | Read-only | **No** |
| `Visit Type` | Read-only | **No** |
| `Visit Time` | Dropdown | **Yes** |
| `Description` | Textarea | Yes |
| `Visit Location Pic` | File upload | Yes |
| `Location Status` | Dropdown | Yes |

Buttons `Cancel` · `Save`

> **The only thing being rescheduled is the time, and it must stay within the same day.** Module,
> record and visit type are fixed — this is the same visit, given another slot today.

| # | Case | Expected |
|---|---|---|
| 9.1 | Module & Record, Visit Type | Rendered read-only and clearly non-editable, not as disabled dropdowns the user will try to open |
| 9.2 | Visit Time options | **Only slots within the same day**, and only ones still free. A later day is not offered |
| 9.3 | No slot left today | Say so in the dropdown's empty state, and point to Reschedule for another day |
| 9.4 | Save with no time chosen | Blocked, flagged |
| 9.5 | Saved | The visit returns to `In Progress` at the new slot; the day's tally and route update |
| 9.6 | Toast | `Visit Revised Successfully.` **with an `Undo`** (§13.2) |
| 9.7 | Cancel / Escape / backdrop | Closes with no change; the visit stays Missed |

> **Deviation from the designs, resolved on instruction.** The design renders Visit Type as an
> active, mandatory dropdown. Per your answer, **only Visit Time is editable** — Visit Type is
> locked along with Module & Record.

---

## 10. Adjust Location

Moves a stop's pin on the map. Chosen from the visit's `⋯` menu.

### 10.1 The flow

1. **Arm.** The visit's existing pin is **removed** from the map, and a banner appears at the top
   of the record: `Click on Map to adjust Location`, with a dismiss ✕.
2. **Aim.** The cursor becomes a **red pointer** over the map.
3. **Click.** The point is validated (§10.2).
4. **Confirm.** A popover opens at the point (§10.3).
5. **Commit.** Toast, pin placed, route redrawn.

| # | Case | Expected |
|---|---|---|
| 10.1.1 | While armed | The rest of the page stays usable, but the map is in pick mode |
| 10.1.2 | Banner ✕ or Escape | Cancels the whole operation and **restores the original pin** |
| 10.1.3 | Only one visit at a time | Arming a second visit cancels the first |

### 10.2 The range rule

A candidate point is valid when, **with the pin moved there, the day's recalculated total route
distance stays within the beat's maximum distance** — the `Max mileage per day` cap set in Field
Rules.

So the constraint is not a radius around the old pin. It is the **whole day's route** measured
again with the new point in place.

| # | Case | Expected |
|---|---|---|
| 10.2.1 | Recalculated total ≤ the cap | The point is accepted; the popover opens |
| 10.2.2 | Recalculated total > the cap | **The point is refused.** Nothing is placed |
| 10.2.3 | On refusal | Say why, naming both numbers — e.g. `That point would take Day 2 to 63.4 km, over the 50 km limit.` Silence is not acceptable |
| 10.2.4 | The cap is not set | Accept any point; do not invent a limit |
| 10.2.5 | Feedback speed | Validate on click. If recalculation is slow, show a pending state rather than appearing to ignore the click |

**▸ Assumed:** 10.2.3's wording, and that the cap compared against is `Max mileage per day` for
the **selected day** rather than a whole-beat total.

### 10.3 The confirmation popover

Anchored at the chosen point:

```
Adjust Location for <Visit Name>
13.1045, 80.29600
Thiru. Vika. Rd, Chennai
Pincode: 600028
                        [ Cancel ]  [ Confirm ]
```

| # | Case | Expected |
|---|---|---|
| 10.3.1 | Coordinates | Shown **immediately** — they are known from the click |
| 10.3.2 | Address | Reverse-geocoded, so it arrives later. Show a loading state in its place, not a blank gap |
| 10.3.3 | Confirm while the address is still loading | Allowed — the coordinates are the authority, the address is a courtesy |
| 10.3.4 | Address lookup fails | Show the coordinates and a short failure line. Confirm stays available |
| 10.3.5 | An info tooltip on the popover | Remains available until the operation completes (§10.4) |
| 10.3.6 | Cancel | Closes the popover, stays armed, original pin still withheld |

**▸ Assumed:** 10.3.3 and 10.3.4.

### 10.4 Committing

| # | Case | Expected |
|---|---|---|
| 10.4.1 | Confirm | Toast `Location Adjusted Successfully for "<Visit Name>"` |
| 10.4.2 | The map | The new pin is placed, and **that day's route redraws and re-highlights** as the selected day |
| 10.4.3 | Beat Summary | The distance figure updates |
| 10.4.4 | The banner and the red cursor | Both clear |

*(The design spells the toast "Sucessfully". Ship it spelled correctly.)*

---

## 11. Edit Visit

**▸ Assumed in full — no design exists.** Opens the Revise Visit form (§9) with every field
editable, including Module & Record and Visit Type, and with no same-day constraint on the time.
Saving updates the visit in place and raises a toast.

---

## 12. Record header

```
←  [B]  BP - 003  (status)        [Zia] [Start Day N] [Edit] [⋯]  ‹ ›
        Add Tags
```

| Element | Behaviour |
|---|---|
| ← | Back to the beats list |
| Status pill | §14.1 |
| Add Tags | Standard CRM tagging |
| Zia | Standard |
| Start/End Day | §3.2 |
| Edit | Edits the beat record |
| ⋯ | §12.1 |
| ‹ › | Previous / next beat in the list, keeping this page's layout and the Overview tab |

### 12.1 Beat overflow menu

`Optimise Beat` · `Print Preview` · `Export` · `Clone` · `Share` · `Delete`

**▸ Assumed:** everything in this menu except the presence of the items. In particular
**`Optimise Beat`** — it presumably reorders the selected day's stops for the shortest route and
redraws, which would need its own confirmation since it discards the rep's ordering. Out of scope
until specified.

### 12.2 Tabs

`Overview` (default) · `Timeline`

**▸ Assumed:** Timeline content is **out of scope**. It appears in every design but is never
shown. The tab must exist and be selectable.

### 12.3 Last Update

`Last Update : 07:00 AM` at the right of the tabs row.

**▸ Assumed:** it reflects the last time the beat record changed — by an action on this page or
by the auto-beat scheduler. Confirm what sets it.

---

## 13. Toasts and undo

### 13.1 Presentation

Toasts appear **top centre, in the record header strip** — not at the bottom of the page. Light
success treatment: a green tick, the message, an optional action, and a dismiss ✕.

| # | Case | Expected |
|---|---|---|
| 13.1.1 | Every successful action raises one | Cancel, Edit, Reschedule, Reassign, Adjust Location, Revise, Start Day, End Day |
| 13.1.2 | Content | Names what happened **and to which visit** — `Location Adjusted Successfully for "Jordan Smith Visit"`, not `Saved` |
| 13.1.3 | Dismiss | The ✕, and an automatic timeout |
| 13.1.4 | Announcement | `role="status"`, announced politely |
| 13.1.5 | A second action while one is showing | The new toast replaces the old; they do not stack |

### 13.2 Undo

| Action | Undo |
|---|---|
| Revise Visit | **Yes** |
| Cancel Visit | **Yes** ▸ Assumed |
| Everything else | No |

| # | Case | Expected |
|---|---|---|
| 13.2.1 | Undo lives exactly as long as its toast | Once the toast goes, the action is final |
| 13.2.2 | Undo | Restores the previous state completely — status, position, tally, route |
| 13.2.3 | Undo after another action | Not offered. Only the most recent undoable action can be undone |

**▸ Assumed:** that Cancel is undoable. It is the most destructive of the five and the easiest to
do by mistake, which is why I extended it. Reschedule, Reassign and Adjust Location move work
between beats or recompute routes, so they are better reversed by repeating the action.

---

## 14. Colour system

**▸ Derived from the designs, per your instruction — please correct.** Hexes marked *(confirm)*
were read from the designs rather than taken from a token.

### 14.1 Beat status pill — record header and list

Solid pill, white text, 13px medium, radius 30, with a darker 1px outline.

| Status | Fill | Border |
|---|---|---|
| Upcoming | `#6865f1` | `#4341cc` |
| In Progress | `#d48714` | `#9b6310` |
| Completed | `#12aa67` | `#198254` |
| Partially Completed | *(confirm)* | *(confirm)* |

### 14.2 Visit tag

Pale pill, 13px medium, radius 100, padding 2 × 8.

| State | Fill | Text |
|---|---|---|
| Pending | *no tag* | — |
| In Progress | `#fff3e0` | `#f57c00` |
| Completed | `#ddf8ec` | `#009653` |
| Missed | `#fee2e2` | `#ef4444` |
| Cancelled | *(confirm — grey family)* | *(confirm)* |

### 14.3 Map pins

| Stop | Colour |
|---|---|
| Home | green `#12aa67` teardrop |
| Office | red `#f14949` teardrop |
| Completed stop | green, numbered |
| In Progress stop | amber, numbered and emphasised |
| Pending stop, selected day | amber, numbered |
| Missed stop | amber, numbered *(confirm — it must read differently from Pending)* |
| Cancelled stop | removed from the route |
| Stops on other days | muted grey |
| Rep's current position | a distinct red position marker — **not** a numbered stop pin |

> The one real conflict with our build: we currently use **red for missed stops**, while the
> designs use red for the **rep's position marker**. Red cannot mean both. The table above frees
> red for the position marker and leaves Missed amber — which then needs something to separate it
> from Pending. Flag your preference.

### 14.4 Rail circle — the visit list

28px circle, white fill, the stop number inside.

| State | Border | Number |
|---|---|---|
| Not reached | grey `#c3c9d6` | base `#313949` |
| Reached / Completed | link blue `#5464f2` | base `#313949` |
| In Progress | link blue + a 3px `#abb3ff` halo that pulses | base |
| Missed | grey `#c3c9d6` | label grey `#616e88` |
| Cancelled | *(confirm)* | *(confirm)* |

### 14.5 Progress line

The rail runs unbroken from the Home pin to the Office pin.

| Segment | Colour | Weight |
|---|---|---|
| Travelled — up to and including the current stop | link blue `#5464f2` | **1.5px** |
| Ahead | grey `#c3c9d6` | 1px |

Both weights stay centred on the circle column, so the line does not step where they meet.

---

## 15. Expenses and Visits detail pages

Both use the **platform's stock record detail layout** for a custom module — a Related List
sidebar, Overview/Timeline tabs, a field grid, Notes and Connected Records. They share nothing
with the Beat detail page beyond the record header.

**Out of scope for this document.** Nothing bespoke is required; the field sets come from the
module definitions.

---

## 16. Accessibility

| # | Requirement |
|---|---|
| 16.1 | Day cards are keyboard-operable and expose their expanded state |
| 16.2 | The day hover popover also appears on keyboard focus |
| 16.3 | Every `⋯` menu is keyboard reachable, and its items navigable by arrow key |
| 16.4 | Dialogs are `role="dialog" aria-modal="true"`, labelled by their title, trap focus, and return focus to the control that opened them |
| 16.5 | Invalid fields carry `aria-invalid` and their message is announced |
| 16.6 | Toasts are announced politely; an Undo inside one is reachable before the toast times out |
| 16.7 | Map pick mode has a keyboard path, or an explicit statement that it is pointer-only with an alternative route to the same outcome |
| 16.8 | Every control has a visible focus indicator |
| 16.9 | Status is never carried by colour alone — every coloured pin and tag has a text or shape equivalent |
| 16.10 | The pulsing halo is suppressed under `prefers-reduced-motion`, leaving a static ring |

---

## 17. Acceptance checklist

**List and entry**
- [ ] Seven default columns in the specified order
- [ ] Clicking a row opens that beat's detail page
- [ ] Manage Columns adds columns without disturbing the default order

**Detail page**
- [ ] Day 1 selected and expanded on load, its route drawn
- [ ] Clicking another day selects, expands and redraws
- [ ] Clicking the selected day collapses it but keeps it selected
- [ ] Scroll position held across selection
- [ ] Long Beat Duration renders in full, no truncation
- [ ] Hover popover on collapsed days shows count and distance
- [ ] View Full Map opens a navigable map

**Day flow**
- [ ] `Start Day 1` → `End Day 1` → `Start Day 2` → … → hidden
- [ ] Day 2 cannot start before Day 1 ends
- [ ] Starting a day puts its first stop In Progress
- [ ] End Day always confirms, with the four summary figures
- [ ] Confirming marks open visits Missed

**Visit states**
- [ ] No tags before the day starts
- [ ] Clicking the In Progress row completes it and advances
- [ ] A visit goes Missed 30 min after its scheduled end
- [ ] Missed on a running day shows `Revise`; Missed after the day ended does not

**Actions**
- [ ] The `⋯` matches the availability matrix, and is absent when nothing applies
- [ ] Clicking `⋯` on the In Progress row does not complete the visit
- [ ] Cancel requires a reason; the row stays with a `Cancelled` tag; the pin leaves the route
- [ ] Reschedule chains Beat → Date → Type → Time, and clears downstream on change
- [ ] Reassign requires a rep first; reason optional
- [ ] Revise locks Module & Record and Visit Type; only Visit Time is editable, same day only
- [ ] Every action raises a toast naming the visit

**Adjust Location**
- [ ] Arming removes the pin, shows the banner and the red cursor
- [ ] A point within the recalculated distance cap is accepted
- [ ] A point over the cap is refused, with both numbers named
- [ ] Coordinates show immediately; the address loads after
- [ ] Confirm redraws that day's route and updates the distance
- [ ] Escape restores the original pin

**Colour**
- [ ] Status pills, visit tags, pins, rail circles and progress line all follow §14
- [ ] Red is the rep's position marker, not a missed stop
- [ ] Nothing depends on colour alone

---

## 18. Open items

Answered and built in: the Revise lock (§9), the Adjust Location range rule (§10.2), the 30-minute
missed rule (§4.2), the Cancelled action set (§5.1), and the derived colour system (§14).

Still outstanding — every one is marked **▸ Assumed** at its clause:

1. **Partially Completed** — when exactly does a beat land there rather than Completed? (§1.2)
2. **Action availability** for Pending / In Progress / Missed, and whether actions survive a day
   that has ended (§5.1)
3. **Cancelled after-state** — row retained, numbering, pin removal (§6.5–6.8)
4. **Reassign reason optional** while Cancel and Reschedule require one — intended? (§8.6)
5. **Edit Visit** — no design; currently specified as an unrestricted Revise (§11)
6. **Undo on Cancel** — extended beyond the designs (§13.2)
7. **Missed vs Pending pin colour** — both amber in the derivation; they need separating (§14.3)
8. **Cancelled colours** for tag and rail circle (§14.2, §14.4)
9. **Partially Completed pill colours** (§14.1)
10. **Optimise Beat** behaviour (§12.1)
11. **Timeline tab** — confirmed out of scope? (§12.2)
12. **Last Update** — what sets it (§12.3)
13. **Grace period** — 30 min from scheduled *end*, uniform across visit types? (§4.2)
