# Record Filter, Pagination & Records per Page — Behaviour Specification

Implementation spec for the **map toolbar** shared by **Create Beat** and **Distribute Beat**: the
module menu, the record **Filter**, **pagination** and **Records per Page**. It covers what both
pages share, where they differ, and every case a build has to handle.

Anything marked **▸ Assumed** is a decision taken to keep the spec complete. Each one is a
question outstanding; correct them and the surrounding clause changes with it.

Reference build: `create-beat.html`, `distribute-beat.html`; logic in `src/cb-toolbar.js`
(module menu, pagination, Records per Page), `src/create-beat-filter.js` (Filter),
`src/cb-menu.js` (the dropdown menu) and `src/distribute-beat.js` (Distribute's record picking).

---

## 1. At a glance

### 1.1 What is the same

| Area | Behaviour on both pages |
|---|---|
| Toolbar layout | Module menu · Filter on the left; pagination · Records per Page on the right. 1000 × 50 bar, 16px side padding |
| Filter button | Same four states (Default, Hover, Opened, Applied), same ✕ and "Clear n Filters" tooltip |
| Filter panel | Same header, rows, − / +, Clear All / Apply Filter, validation and open/close rules |
| Fields & operators | Same field list and operators (§5.3) |
| Pagination | Same "x to y" range, same arrows, same reset rules |
| Records per Page | Same options (10 · 20 · 30 · 40 · 50), same default (50), same page-keeping rule |
| Menus | Module menu and Records per Page are the **same dropdown menu component** (§3) |
| Order of narrowing | Module → Filter → page (§2) |

### 1.2 What is different

| Area | Create Beat | Distribute Beat |
|---|---|---|
| Module menu options | Leads · Contacts · Deals · Vendors | **All Modules** · Leads · Contacts · Deals · Vendors |
| Default module | Contacts | **All Modules** |
| Filter row | Field · Operator · Value | Single module: same as Create. **All Modules: Module · Field · Operator · Value** (§6) |
| Row widths | 180 · 106 · 220 | Single module: 180 · 106 · 220. All Modules: 138 · 111 · 106 · 145 |
| How rows combine | Every row must hold (AND) | Single module: AND. All Modules: each record answers only to **its own module's rows** (§6.3) |
| Records per Page icon | `icon/ richtext/ bullets` | `icon/ configure settings` |
| Map pins | Module-coloured; display only | Figma Map-Pin, **Unselected / Selected**; click to pick a record (§9) |
| Left panel | Beats Information (Assign Rep, Beat Duration) | Beat Details (Distribution Name, Beat Duration, picked records) |
| Primary action | Save | Continue |

**▸ Assumed:** the two Records per Page icons are what each page's Figma frame shows. If they are
meant to be one icon, take one and use it on both.

---

## 2. Order of narrowing

The map — and the pagination count — is always the result of three steps, in this order:

```
all records
  └─ 1. Module menu   (one module, or every module on All Modules)
       └─ 2. Filter   (the applied conditions, if any)
            └─ 3. Page (Records per Page at a time)
```

| # | Case | Expected |
|---|---|---|
| 2.1 | Filter applied | Pagination counts only what passes the filter, and pages through that |
| 2.2 | Records per Page changed | Changes only step 3; the module and filter stay |
| 2.3 | Module changed | Step 1 changes, the filter is cleared (§5.10), the page goes back to 1 |
| 2.4 | Pins on the map | Exactly the records on the current page — never more than Records per Page |

---

## 3. Dropdown menu component

Figma "Dropdown Value" — `5767:1127941` (module) and `5767:1127823` (Records per Page).
**One component**, not two. Its only optional property is **`title`**: when given, the menu
opens on a heading row. The module menu has no title; Records per Page has `Records per Page`.
The Filter panel's dropdowns (Module, Field, Operator, picklist Value) use the same component
without a title.

### 3.1 Spec

| Part | Spec |
|---|---|
| Menu | Width 223 (grows to fit longer labels), white, 1px `#CED0E1`, radius 6, shadow `0 2px 8px rgba(0,0,0,.15)`, 6px top/bottom padding |
| Heading (title only) | 13px Semibold `#202123`, padding 10 / 10 / 6, 32px tall, one line, ellipsis |
| Option row | 32px tall, 6px inset from the menu edge, padding 8 / 10, radius 5, 14px Regular `#313949` |
| Tick slot | 9 × 6, then a 6px gap — every row keeps the slot, so labels line up (text starts 25px into the row) |
| Selected option | Tick shown, label Semibold, background `#F2F5FE` |
| Hover | Background `#F2F5FE`. While the pointer is on another row, the selected row drops its background — only one row is ever highlighted |
| Position | Hangs straight off the trigger's bottom edge, **no gap**. Left-aligned to the trigger; Records per Page is right-aligned to its icon |
| Sizes to check | Module menu 223 × 140. Records per Page 223 × 204 |

### 3.2 Behaviour

| # | Case | Expected |
|---|---|---|
| 3.2.1 | Click the trigger | Opens; trigger shows its open state (`aria-expanded="true"`) |
| 3.2.2 | Click the trigger again | Closes |
| 3.2.3 | Pick an option | It becomes the selected one, the menu closes, the page reacts |
| 3.2.4 | Click outside | Closes, nothing changes |
| 3.2.5 | Escape | Closes and returns focus to the trigger |
| 3.2.6 | Keyboard on a non-button trigger | Enter or Space opens / closes |
| 3.2.7 | One open at a time | Opening one toolbar menu closes the other |
| 3.2.8 | Above the map | An open menu sits above the map's floating controls |

---

## 4. Module menu

Figma Dropdown, 34px tall, 3px lead-in, label, filled caret; it hugs its label.

| # | Case | Expected |
|---|---|---|
| 4.1 | Create Beat options | Leads · Contacts · Deals · Vendors; Contacts selected on load |
| 4.2 | Distribute Beat options | All Modules · Leads · Contacts · Deals · Vendors; All Modules selected on load |
| 4.3 | Pick a module | Trigger label changes to it; map shows only that module's records |
| 4.4 | Pick All Modules (Distribute) | Map shows every module's records |
| 4.5 | Any module change | Applied filter is cleared and the panel closes (§5.10); page goes back to 1 (§7.3) |
| 4.6 | Same module picked again | Treated as a change — the filter is cleared |
| 4.7 | Open state | Border `#5767F6`, caret rotates 180° |

**▸ Assumed:** 4.6 — re-picking the current module clears the filter too. A build may skip the
reset when the module did not change.

---

## 5. Filter

Figma: button `5763:222731`; panel "Filter - 2.0 list" `5763:222578` (one row) and
`5763:222359` (three rows). All Modules rows: `1406:36561`, `1406:37302`.

### 5.1 Filter button

One control, 34px tall, with two hit areas: the **body** (icon + "Filter") opens the panel; the
**✕** appears only once a filter is applied and lifts it.

| State | Look |
|---|---|
| Default | White, 1px `#C0C8E2` |
| Hover (not open, not applied) | `#F2F3FA`, edge `#E6EAF5` |
| Opened | `#F2F3FA`, no visible edge |
| Applied | `#F2F3FA`, edge `#E6EAF5`; dot on the filter icon; ✕ shown on the right (button 94px wide) |
| Applied + Opened | Opened look, **✕ still shown** |
| ✕ hover / focus | ✕ area `#FFE8EA`, ✕ turns red `#F63648`; tooltip shows. The button does **not** change size |

| # | Case | Expected |
|---|---|---|
| 5.1.1 | Click the body | Opens the panel; click again closes it |
| 5.1.2 | ✕ tooltip | `Clear 1 Filter` / `Clear n Filters` — n is the number of applied conditions. Dark `#101523`, white 13px Medium, sits just under the ✕ |
| 5.1.3 | Click ✕ (panel closed) | Filter lifted, panel stays closed, map and pagination update |
| 5.1.4 | Click ✕ (panel open) | Filter lifted and the panel empties to one blank row |
| 5.1.5 | Click the tooltip | Same as clicking ✕ — it is part of the ✕ hit area |
| 5.1.6 | Accessible names | Body: `Filter` / `Filter, n applied`. ✕: the tooltip text |

### 5.2 Panel

Hangs from the button's bottom-left. Header **Filter by** with a close ✕ on the right.

| Part | Spec |
|---|---|
| Panel | White, 1px `#C0C8E2`, radius 8, card shadow, padding 15 / 15 / 20, 15px between header and rows and between rows |
| Header | "Filter by", close icon 24 × 24 |
| Row | The fields with 10px gaps, then 15px, then − / + (16px icons, 10px apart) |
| CTA | Right-aligned under the last row: **Clear All** (default button) and **Apply Filter** (primary), 16px apart |
| Sizes to check | Create, one row: 591 × 108. Create, three rows: 617 × 262. All Modules, one row: 595 × 108. All Modules, three rows: 621 × 262 |

| # | Case | Expected |
|---|---|---|
| 5.2.1 | Open, nothing applied | One blank row, **no CTA** |
| 5.2.2 | Open, filter applied | Rows rebuilt from the **applied** conditions |
| 5.2.3 | First field chosen in any row | CTA appears |
| 5.2.4 | + | Adds a blank row under the last |
| 5.2.5 | − | Removes that row. Shown on every row once there are two or more |
| 5.2.6 | + placement | Only on the last row |
| 5.2.7 | Close ✕ / outside click / Escape | Panel closes. **Unapplied edits are discarded** — reopening shows what is applied |
| 5.2.8 | Escape while a field's menu is open | Closes only that menu; a second Escape closes the panel |
| 5.2.9 | Click outside a field menu but inside the panel | Closes the field menu, panel stays |
| 5.2.10 | Only one field menu open | Opening one closes any other |
| 5.2.11 | Above the map | Panel sits above the map's floating controls |

### 5.3 Fields and operators

| Field | Type | Value control |
|---|---|---|
| Name | Text | Input |
| Visit Status | Picklist: Visited, Pending, Follow-up, Scheduled, New | Dropdown |
| City | Picklist: Chennai, Bengaluru, Hyderabad, Coimbatore | Dropdown |
| Record Owner | Picklist: Cameron Williamson, Priya Raman, Vikram Shah | Dropdown |
| Annual Revenue | Number | Input (decimal keypad) |
| Days Since Last Visit | Number | Input (decimal keypad) |

| Type | Operators (first is the default) |
|---|---|
| Text | is · isn't · contains · doesn't contain · starts with |
| Picklist | is · isn't |
| Number | = · != · < · <= · > · >= |

Text comparisons ignore case and surrounding spaces.

**▸ Assumed:** the field list is prototype data. A build takes the module's real fields; the
type → operator mapping above stays.

### 5.4 A row's fields

| # | Case | Expected |
|---|---|---|
| 5.4.1 | Blank row | Field: placeholder `Select Field`. Operator: disabled, reads `None`. Value: disabled, empty |
| 5.4.2 | Choose a field | Operator enables with that type's default; Value enables (input or dropdown by type) |
| 5.4.3 | Change to another field | Operator resets to the new type's default; Value empties |
| 5.4.4 | Choose the same field again | Nothing resets |
| 5.4.5 | Picklist value | Dropdown, placeholder `Select` |
| 5.4.6 | Typing a value | Updates as you type; focus stays in the input |
| 5.4.7 | Disabled look | Fill `#F5F6F8`, edge `#D2D9F1`, grey caret |

### 5.5 Apply Filter

| # | Case | Expected |
|---|---|---|
| 5.5.1 | Rows with no field | Ignored — they are unused, not errors |
| 5.5.2 | Field chosen, value empty | Not applied; that value box turns red `#FF5D5A` |
| 5.5.3 | Number field, value not a number | Not applied; marked red |
| 5.5.4 | Any row marked | **Nothing** is applied — the whole set waits until every used row is complete |
| 5.5.5 | Editing a marked value | Its red clears as soon as it changes |
| 5.5.6 | All used rows complete | Conditions applied; map and pagination update; button goes to Applied |
| 5.5.7 | After applying | **The panel stays open** |
| 5.5.8 | Apply Filter enabled | Only when the panel differs from what is applied. Disabled right after applying, and on open |
| 5.5.9 | Disabled look | `#ADB3EE`, no shadow, not-allowed cursor |
| 5.5.10 | Compared values | Trimmed values and unused rows ignored — adding a blank row or a trailing space does not enable Apply |

### 5.6 Clear All

| # | Case | Expected |
|---|---|---|
| 5.6.1 | Click | Applied filter lifted, panel stays open on **one blank row**, CTA disappears |
| 5.6.2 | Map / pagination | Back to the unfiltered set, page 1 |

### 5.7 Combining rows (single module)

Every applied row must hold for a record to show (**AND**). There is no OR.

### 5.8 No results

| # | Case | Expected |
|---|---|---|
| 5.8.1 | Filter matches nothing | Map shows no pins; range reads `0 to 0`; both arrows disabled |

**▸ Assumed:** no empty-state message on the map. A build may add one.

### 5.9 Filter and pages

Applying, changing or clearing a filter always goes back to **page 1** (§7.3).

### 5.10 Filter and module change

Changing the toolbar module clears the applied filter, closes the panel and returns the button
to Default. A filter written for one module never carries to another.

---

## 6. Filter on All Modules (Distribute Beat only)

### 6.1 Row layout

| # | Case | Expected |
|---|---|---|
| 6.1.1 | Row fields | **Module · Field · Operator · Value** — 138 · 111 · 106 · 145 |
| 6.1.2 | Blank row | Module: placeholder `Select Module`. Field, Operator, Value: disabled, Field and Operator read `None` |
| 6.1.3 | Module options | Leads · Contacts · Deals · Vendors |
| 6.1.4 | Choose a module | Field enables with placeholder `Select Field`; Operator and Value stay disabled until a field is chosen |
| 6.1.5 | Change the module | Field, Operator and Value reset |
| 6.1.6 | CTA | Appears once any row has a module |
| 6.1.7 | Row with module but no field | Unused — ignored on apply, not marked |

### 6.2 Switching between layouts

| # | Case | Expected |
|---|---|---|
| 6.2.1 | All Modules → a module | Filter cleared (§5.10); the panel now shows the three-field row at Create's widths |
| 6.2.2 | A module → All Modules | Filter cleared; the panel shows the four-field row |

### 6.3 How rows combine

Each record answers **only to the rows for its own module**:

- a record shows when its module has at least one applied row **and** all of that module's rows hold;
- a module with **no** rows shows **none** of its records — the filter names what it shows.

Example (Figma `1406:37302`): `Deals · MRR <= 10000`, `Orders · Amount >= 5000`,
`Accounts · Source is Referral` shows the Deals under 10000 MRR, the Orders over 5000 and the
Referral Accounts — and nothing from any other module.

| # | Case | Expected |
|---|---|---|
| 6.3.1 | Two rows, same module | Both must hold (AND within the module) |
| 6.3.2 | Rows for two modules | Records of either module that pass their own rows |
| 6.3.3 | A module not in any row | Hidden while the filter is applied |
| 6.3.4 | Clear the filter | Every module's records return |

**▸ Assumed:** 6.3.3 — modules without a row are hidden rather than shown unfiltered.

---

## 7. Pagination

Figma: Back-Arrow · `1 to 50` · Right-Arrow, 24px arrows, numbers Bold 13px, "to" Medium
label-grey.

### 7.1 Range text

| # | Case | Expected |
|---|---|---|
| 7.1.1 | Format | `first to last` of the records on the current page |
| 7.1.2 | First page, 200 records, 50 per page | `1 to 50` |
| 7.1.3 | Second page | `51 to 100` |
| 7.1.4 | Last, partial page | Ends at the total, e.g. 62 records → page 2 reads `51 to 62` |
| 7.1.5 | Fewer than a page | `1 to 25` for 25 records |
| 7.1.6 | No records | `0 to 0` |
| 7.1.7 | Total | Not shown |

**▸ Assumed:** 7.1.7 — the frames show no total ("of N"). A build may add it.

### 7.2 Arrows

| # | Case | Expected |
|---|---|---|
| 7.2.1 | Previous | Goes back one page; disabled on page 1 |
| 7.2.2 | Next | Goes forward one page; disabled on the last page |
| 7.2.3 | Single page | Both disabled |
| 7.2.4 | Disabled look | Figma "Disable" variant (grey `#CCD2DB`), default cursor, no hover fill |
| 7.2.5 | Disabled Next | Figma has no disabled Next, so the disabled Back is used, mirrored |
| 7.2.6 | Hover (enabled) | Round `#F1F0F7` fill |

### 7.3 When the page resets

| # | Change | Page after |
|---|---|---|
| 7.3.1 | Module changed | 1 |
| 7.3.2 | Filter applied, changed, cleared (✕ or Clear All) | 1 |
| 7.3.3 | Records per Page changed | The page holding the **first record that was on show** (§8.3) |
| 7.3.4 | Records picked or removed (Distribute) | Unchanged |

---

## 8. Records per Page

Opened from the 32px icon at the toolbar's right edge. A titled menu (§3), right-aligned to the
icon.

| # | Case | Expected |
|---|---|---|
| 8.1 | Options | 10 · 20 · 30 · 40 · 50 — **50 is the limit**: the map loads at most 50 records a page |
| 8.2 | Default | 50, ticked |
| 8.3 | Pick a size | Page becomes the one containing the first record that was on show. Example: Vendors page 4 at 50 (`151 to 200`) → pick 30 → `151 to 180` |
| 8.4 | Range text | Updates straight away |
| 8.5 | Icon tooltip / accessible name | `Records per Page: n` |
| 8.6 | Icon hover / open | `#F1F0F7` fill |
| 8.7 | Across module and filter changes | The chosen size is kept |

**▸ Assumed:** 8.7 — the size is kept for the session on that page, not saved per user.

---

## 9. Map pins

| # | Case | Create Beat | Distribute Beat |
|---|---|---|---|
| 9.1 | Pin look | Module colour (Contacts green, Deals amber, Leads blue, Vendors pink) | Figma Map-Pin `3192:90647` / `3192:90775`, 24 × 34.3 |
| 9.2 | Unselected | — | White fill, `#5464F2` outline, 12px `#5464F2` dot |
| 9.3 | Selected | — | `#C35BF4` fill, 14px ring of 2px white |
| 9.4 | Click a pin | Nothing | Picks the record (adds it to the list); click again to remove it |
| 9.5 | Pointer over a pin | Default | Pointer cursor |
| 9.6 | Drag the map | Pans; never picks | Pans; a drag that ends on a pin does not pick it |

---

## 10. Distribute Beat — picked records and the filter

| # | Case | Expected |
|---|---|---|
| 10.1 | Picked records and the filter | Picks are **kept** when a filter hides their pins — they stay in the list |
| 10.2 | Picked records and pages | Picks are kept across pages; a picked record shows Selected whenever its pin is on the page |
| 10.3 | Picked records and module change | Picks are kept |
| 10.4 | List | `N Records selected` with **Clear**; each row: name, module, visit type (default Order Delivery), ✕ |
| 10.5 | Apply to all | Sets one visit type on every picked record |
| 10.6 | Clear | Removes every pick; the section hides; pins return to Unselected |
| 10.7 | Continue | Enabled with a Distribution Name, a valid start date (end empty or not before start) and at least one pick |

**▸ Assumed:** 10.1–10.3 — picks persist through filter, page and module changes. Confirm whether
a module change should instead drop picks from other modules.

---

## 11. Prototype data

Generated from a fixed seed so every load is the same. Enough to need pages at 50 a page.

| Module | Records | Pages at 50 |
|---|---|---|
| Leads | 100 | 2 |
| Contacts | 50 | 1 |
| Deals | 25 | 1 |
| Vendors | 200 | 4 |
| All Modules (Distribute) | 375 | 8 |

---

## 12. Accessibility

| # | Case | Expected |
|---|---|---|
| 12.1 | Menus | Trigger `aria-haspopup="listbox"` and `aria-expanded`; list `role="listbox"`, options `role="option"` with `aria-selected`; a titled menu is labelled by its heading |
| 12.2 | Filter body | `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls` the panel |
| 12.3 | Panel | `role="dialog"`, labelled by "Filter by" |
| 12.4 | − / + / ✕ | Named: "Remove this condition", "Add a condition", "Clear n Filters" |
| 12.5 | Pagination arrows | "Previous page" / "Next page", `disabled` at the ends |
| 12.6 | Focus | Escape returns focus to the control that opened the menu |

---

## 13. Open questions

1. Should both pages use one Records per Page icon (§1.2)?
2. Re-picking the current module — clear the filter or not (§4.6)?
3. All Modules — hide modules with no rows, or show them unfiltered (§6.3.3)?
4. Show a total ("of N") beside the range (§7.1.7)?
5. Empty-state message when a filter matches nothing (§5.8)?
6. Distribute — keep picks from other modules after a module change (§10.3)?
