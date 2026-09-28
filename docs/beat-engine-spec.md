# Beat Engine — Behaviour Specification

Implementation spec for the **Beat Engine** step of Planner Configuration (step 3). Scope is this
one screen and its four dialogs. The stepper, sidebar, top bar and other wizard steps are not
covered here.

---

## 1. The step depends on the Operating Model

Beat Engine renders **two different forms** depending on what was chosen for **Operating Model**
in Planner Configuration (step 1).

| Section | Top Down | Bottom Up |
|---|:---:|:---:|
| 1. Field Sales Representative Selection | ● | ● |
| 2. Beat Caps | ● | ● |
| 3. Auto-beat creation | ● | — |
| └ Run scheduler at | ● | — |
| └ Frequency Rules | ● | — |
| └ Visit Assignment | ● | — |

**Bottom Up is rep selection and beat caps only.** In Bottom Up the reps create their own beats,
so there is nothing to generate automatically and nothing to assign — the whole Auto-beat creation
block is **absent**, not disabled and not collapsed.

| # | Case | Expected |
|---|---|---|
| 1.1 | Operating Model = Top Down | All sections render |
| 1.2 | Operating Model = Bottom Up | Only sections 1 and 2 render. No Auto-beat toggle, no scheduler, no Frequency Rules, no Visit Assignment |
| 1.3 | Model changed Top Down → Bottom Up after auto-beat was configured | The block disappears. **Warn before discarding**: tell the user the frequency and assignment rules will be lost, and let them cancel |
| 1.4 | Model changed Bottom Up → Top Down | The block appears with Auto-beat **off** and no rules |
| 1.5 | Bottom Up, valid rep + caps | Next advances — the absent sections must not be treated as incomplete |

---

## 2. Field Sales Representative Selection

**Title** `Fields Sales Representative Selection`
**Description** `Select the CRM users who will be executing the Beats created via this Beat Planner as the Field Sales representative.`

| | |
|---|---|
| Label | `Rep Selection` |
| Control | Read-only picker that opens the Select Users dialog |
| Mandatory | Yes — carries the red strip |
| Empty placeholder | `Choose Users, Groups Roles etc.,` with a person-plus icon on the right |
| Filled | Count chips — `User 6` `Group 3` `Roles 3` — with a pencil icon on the right |

| # | Case | Expected |
|---|---|---|
| 2.1 | Click anywhere on the field (empty) | Opens Select Users |
| 2.2 | Click the pencil (filled) | Opens Select Users with the current selection loaded |
| 2.3 | Chips | Show **counts by category**, not names. A category with zero selections is not shown |
| 2.4 | Press Next with nothing selected | Blocked, with a visible and announced error on the field |
| 2.5 | Keyboard | The field is focusable and opens the dialog on Enter or Space |

### 2.1 Select Users dialog

Two panes: **Available** on the left, **Selected** on the right.

**Left pane**
- A source dropdown: `Users`, `Groups`, `Roles`
- When source = Groups, a second dropdown picks the group (`Sales Group`, `Product Management`, …)
- A search box filtering the list below
- Rows: avatar, name, email

**Right pane** — grouped, each group collapsible with a count in its heading:
- `Users - 6` → chips
- `Groups - 3` → a sub-heading per group (`Sales Group - 2`, `Product Management - 1`) with chips beneath

**Footer** `Cancel` · `Done`

| # | Case | Expected |
|---|---|---|
| 2.1.1 | Hover a row not yet selected | An **Add** button appears on the right of the row |
| 2.1.2 | Hover a row already selected | Shows `✓ Added` instead. Add is not offered twice |
| 2.1.3 | Click Add | The person moves into the Selected pane under the right heading; the row switches to `✓ Added` |
| 2.1.4 | Remove a chip | The chip disappears and the left row reverts to offering Add |
| 2.1.5 | Switch source Users → Groups | The left list reloads. **The Selected pane is untouched** — selections from other sources survive |
| 2.1.6 | Search | Filters the left list only. Clearing it restores the full list; selections are unaffected |
| 2.1.7 | Search with no matches | An empty-state line in the left pane, not a blank panel |
| 2.1.8 | Same person reachable via both a User and a Group | Do not add twice. Either dedupe, or show which group already brings them in |
| 2.1.9 | Collapse a group heading | Its chips hide; the count stays visible |
| 2.1.10 | Cancel | Discards every change made in the dialog. The field keeps its previous value |
| 2.1.11 | Done with nothing selected | Allowed — it closes and leaves the field empty. The field's own validation catches it on Next (2.4) |
| 2.1.12 | Done | Writes the selection and updates the count chips |
| 2.1.13 | Escape | Same as Cancel |
| 2.1.14 | Long lists | The left pane scrolls independently of the right |

---

## 3. Beat Caps

**Title** `Beat Caps` · **Description** `Set limits for each beat cycle.`

Three numeric fields, **all mandatory** (red strip), each with an info icon carrying a tooltip.

| Label | Default | Accepts | Range |
|---|---|---|---|
| `Max Days per beat` | `1` | Whole digits | 1–31 |
| `Max Visits per Day` | `1` | Whole digits | 1–50 |
| `Max upcoming Beats per Field Sales Rep` | `1` | Whole digits | 1–10 |

| # | Case | Expected |
|---|---|---|
| 3.1 | Input filtering | Digits only. Letters, symbols, decimal points and `-` never enter the field, **on paste as well as on keystroke** |
| 3.2 | Empty, press Next | Blocked, visible and announced error on the field, focus moved to it |
| 3.3 | `0`, press Next | Blocked — a cap of zero means no beats can exist |
| 3.4 | Above the range, press Next | Blocked with the limit stated in the message |
| 3.5 | Correcting a flagged field | The error clears on edit, without pressing Next again |
| 3.6 | Info icons | Explain what each cap governs. Reachable by keyboard, not hover-only |
| 3.7 | Caps and Auto-beat | The generator must honour all three. Copy under the toggle says so — keep the two consistent |

> **Label inconsistency in the designs.** One screen labels the first field `Max beat Duration`,
> the rest label it `Max Days per beat`. Build **`Max Days per beat`** — it names the unit, which
> the field needs. Flag if you disagree.

> Ranges are not stated in the designs. The values above are the intended behaviour — confirm
> before building.

---

## 4. Auto-beat creation — *Top Down only*

**Title** `Auto-beat creation` with a toggle on the same line
**Description** `Automatically generate beats for your Field Sales Representatives based on conditions and rules. Auto-Beat creation will follow the above set limits for the Beats.`

| | |
|---|---|
| Default | **Off** |

| # | Case | Expected |
|---|---|---|
| 4.1 | Off | The description shows; everything below it is **hidden**. The step ends after this section |
| 4.2 | Turn on | Run scheduler at, Frequency Rules and Visit Assignment appear, in that order |
| 4.3 | Turn off after configuring rules | **Warn before discarding.** Say what will be lost and offer a way back. Do not silently drop the rules |
| 4.4 | Off | Next is not blocked by anything inside this block — an unconfigured generator is a valid choice |

### 4.1 Run scheduler at

| | |
|---|---|
| Label | `Run scheduler at`, with an info icon |
| Control | Time dropdown |
| Default | `9:00 AM` |
| Mandatory | Yes, whenever Auto-beat is on |

| # | Case | Expected |
|---|---|---|
| 4.1.1 | Options | Fixed intervals across a 24-hour day; state the interval (e.g. every 30 min) |
| 4.1.2 | Time zone | Say which one the time is in — the org's, or the rep's. An unqualified "9:00 AM" is ambiguous for a distributed field team |
| 4.1.3 | Cleared | Blocked on Next with a visible error |

---

## 5. Frequency Rules — *Top Down, auto-beat on*

**Title** `Frequency Rules`
**Description** `Define how often records should be visited. Rules are evaluated in order, and the first match determines the visit frequency. Records with no matching rule are excluded.`

Two behaviours follow directly from that sentence and must both hold:

- **Order matters.** The first matching rule wins; later rules are not applied to the same record.
- **No match means no visit.** A record matched by nothing is excluded entirely, not given a default.

### 5.1 Add Rule control

| State | Control |
|---|---|
| No rules yet | An outlined **`Add Rule ▾`** button below the description |
| One or more rules | An **`Add Rule`** link beside the section title; the table takes the button's place |

Clicking it opens a module menu: **Accounts · Orders · Deals · Customers**. Choosing one opens the
Frequency Rules dialog for that module.

| # | Case | Expected |
|---|---|---|
| 5.1.1 | Module list | Only modules mapped in Planner Configuration step 1. A module with no address mapping cannot be planned against |
| 5.1.2 | Menu open | Escape and an outside click both close it without opening the dialog |
| 5.1.3 | A module already has rules | Still selectable — several rules per module are allowed and are evaluated in order |

### 5.2 Frequency Rules dialog

**Title** `Frequency Rules for "<Module>"` — the module name in curly quotes.

**Apply this rule to** — radio, each option with an info icon:

| Option | Meaning |
|---|---|
| `Scoped Records` *(default)* | Every record inside the module's scope from step 1 |
| `Specific Records within Scoped Records` | A subset, defined by the criteria builder that appears |

**Criteria builder** (only when Specific is chosen) — numbered rows of *field · operator · value*,
`AND` between them, remove (⊖) on every row, add (⊕) on the last, and a read-only
`Criteria Pattern` with `Edit Pattern`.

**Create Visits**

| Field | Control | Mandatory |
|---|---|---|
| `Frequency` | Dropdown — Daily, Weekly, Bi-Weekly, Monthly | Yes |
| `Visit Type` | Dropdown of the types from step 2, plus a **`New Visit Type`** link pinned at the bottom | Yes |

**Footer** `Cancel` · `Done`

| # | Case | Expected |
|---|---|---|
| 5.2.1 | Open | Scoped Records selected; no criteria builder; Frequency and Visit Type empty |
| 5.2.2 | Switch to Specific | The builder appears with **one** empty row (`None` / `None` / empty) |
| 5.2.3 | Switch back to Scoped | The builder hides. Its rows are discarded, not retained invisibly |
| 5.2.4 | Done with Specific chosen and the row still empty | Blocked — flag the field and the value. An empty criteria row is not "no criteria"; that is what Scoped Records is for |
| 5.2.5 | Done with no Frequency | Blocked, field flagged |
| 5.2.6 | Done with no Visit Type | Blocked, field flagged |
| 5.2.7 | Valueless operators (`is empty`, `is not empty`) | The value input disables and clears; it is not validated |
| 5.2.8 | Criteria Pattern | Auto-generates as `( 1 and 2 … )`; regenerates when rows are added or removed |
| 5.2.9 | Edit Pattern | Unlocks the pattern for editing; toggling off restores the generated one |
| 5.2.10 | Cancel / Escape / backdrop | Close with no change to the table |
| 5.2.11 | Editing an existing rule | Same dialog, pre-filled, titled for the same module; Done updates in place rather than appending |
| 5.2.12 | `Done` disabled state | Where the design greys Done, it must still be reachable and explain why on focus — never a dead control with no reason given |

### 5.3 New Visit Type — Quick Create

Chosen from the bottom of the Visit Type dropdown. Opens **`Quick Create: Visit Type`**.

| Field | Control | Default |
|---|---|---|
| `Name` | Text, mandatory | empty |
| `Duration` | Number + `min` suffix, mandatory | `15` |
| `Mandatory fields` | Checkboxes: `Image Upload`, `File Upload`, `Notes` | none |

**Footer** `Cancel` · `Save and Associate`

| # | Case | Expected |
|---|---|---|
| 5.3.1 | Save and Associate | Creates the type **and selects it** in the Visit Type dropdown behind — that is what "Associate" means here |
| 5.3.2 | Empty name | Blocked, flagged |
| 5.3.3 | Duplicate name | Blocked, with a message naming the clash |
| 5.3.4 | Duration | Digits only, greater than zero |
| 5.3.5 | Cancel | Returns to the Frequency Rules dialog with its values intact and no type created |
| 5.3.6 | The new type | Also appears in the Visit Types step — this is the same list, not a local one |

### 5.4 Frequency Rules table

Shown once at least one rule exists. Three columns:

| Condition | Visit Type | Frequency |
|---|---|---|

Rules are **grouped by module** under a module heading row (`Accounts`, `Deals`, `Orders`), in
evaluation order.

Each rule's Condition cell shows numbered criteria lines with the operator in upper case
(`IS`, `CONTAINS`, `>`), then a `Criteria Pattern` line.

| # | Case | Expected |
|---|---|---|
| 5.4.1 | Scope = Scoped Records | The Condition cell reads `All Records` |
| 5.4.2 | More than two criteria | Collapsed to the first two with a **`See More`** link; expanded shows all with **`See Less`** |
| 5.4.3 | Row hover / focus | A drag handle and a `⋯` menu appear at the row's left |
| 5.4.4 | `⋯` menu | `Edit` and `Remove` |
| 5.4.5 | Remove | Deletes that rule. Confirm first — a rule can hold a lot of work |
| 5.4.6 | Drag handle | Reorders rules **within a module**. Because first match wins, order is meaningful and must be reorderable |
| 5.4.7 | Reordering across modules | Not permitted — a rule belongs to its module |
| 5.4.8 | Keyboard reordering | Provide an alternative to drag (e.g. move up/down in the `⋯` menu). Drag alone fails keyboard users |
| 5.4.9 | Removing the last rule of a module | The module heading goes too |
| 5.4.10 | Removing the last rule overall | The table disappears and the `Add Rule ▾` button returns |

> **Table layout differs across the designs.** Some screens use two columns
> (`Condition` | `Create`, with frequency and visit type merged into one cell); others use three
> (`Condition` | `Visit Type` | `Frequency`). Build the **three-column** version — it is sortable,
> scannable and does not bury two values in one cell.

---

## 6. Visit Assignment — *Top Down, auto-beat on*

**Title** `Visit Assignment`
**Description** `By default, Assignment for the Visit records will be done based on Route intelligence powered by Routeiq.`

So the **default needs no configuration**. Everything in this section is an override.

### 6.1 Conditional Rules toggle

| | |
|---|---|
| Label | `Conditional Rules` |
| Default | **Off** |
| Description | `If enabled, users will have an additional layer of rules based on CRM, Which will be used to assign users based on criteria` |

When on, three things appear: a mode radio, an `Add Rule ▾` control, and a note banner.

**Note banner** — `Note: Except for the records assigned via conditional rules the other records will be assigned based on Route intelligence to create an optimised beat.`

> Some screens render this as `Note: Note: Except for…`. Ship **one** `Note:`.

### 6.2 Mode: Assignment Rule vs Skill matching

A radio pair. `Assignment Rule` is the default.

| # | Case | Expected |
|---|---|---|
| 6.2.1 | The two modes | Mutually exclusive, and they **build different rules** — the dialog and the table change with the mode |
| 6.2.2 | Switching mode with rules already defined | **Warn before discarding.** The rule shapes are not interchangeable. Either keep each mode's rules separately and swap the view, or say clearly that switching clears them |

### 6.3 Assignment Rules dialog — *Assignment Rule mode*

**Title** `Assignment Rules for "<Module>"`

**Apply this rule to** — `Scoped Records` *(default)* / `Specific Records within Scoped Records`.
When Specific, a criteria builder appears under the caption `If the below conditions matches,`.

**Assign Record to** — radio:

| Option | Control |
|---|---|
| `Category` *(default)* | A type dropdown (`Users`, `Groups`, `Roles`) and a multi-select that fills with chips |
| `Users matching certain conditions` | A second criteria builder — *user field · operator · value*, e.g. `City is Chennai` AND `Street is MG Road`, with its own Criteria Pattern |

| # | Case | Expected |
|---|---|---|
| 6.3.1 | Open | Scoped Records + Category, `Users` type, nothing selected, **Done disabled** |
| 6.3.2 | Done enables | Only once the assignment target is answered — chips selected, or the condition rows complete |
| 6.3.3 | Category type switched (Users → Groups) | The multi-select reloads and **clears** — a user id is not a group id. Do not carry chips across |
| 6.3.4 | Switching Category ↔ conditions | The other side's input is discarded; do not submit both |
| 6.3.5 | Assignment targets nobody | Blocked — an assignment rule that resolves to no one silently drops records |
| 6.3.6 | Users matching conditions resolves to nobody at run time | Fall back to Route intelligence and log it. Do not leave visits unassigned |
| 6.3.7 | Cancel / Escape / backdrop | Close with no change |

### 6.4 Assignment Rules dialog — *Skill matching mode*

**Assign Record to** is a **field-mapping table**, not a picker:

| `Users Field` | | `<Module> Field` |
|---|---|---|
| `Skills` | `IS` | `Required Skills` |
| `City` | `IS` | `City` |

Numbered rows with `AND`, remove/add, and a `Criteria Pattern` with `Edit Pattern`.

| # | Case | Expected |
|---|---|---|
| 6.4.1 | Open | One row of `None` / `None` / empty. **Done disabled** |
| 6.4.2 | Done enables | Once at least one complete row exists |
| 6.4.3 | Type compatibility | A user field may only be matched against a module field of a compatible type. Offer only compatible fields rather than accepting a mismatch |
| 6.4.4 | Duplicate pairs | Do not allow the same user field to be mapped twice in one rule |
| 6.4.5 | The column heading | Names the module — `Orders Field`, `Deals Field` — not a generic label |

### 6.5 Assignment table

Two columns: **Condition** | **Assign to**, grouped by module.

The Assign to cell varies by what the rule chose:

| Rule | Cell shows |
|---|---|
| Category → Users | `Users` then avatar chips |
| Category → Group | `Group` then the group chip |
| Users matching conditions | Numbered `Users · <field> IS <value>` lines with a Criteria Pattern |
| Skill matching | Numbered `Users <field> IS <Module> <field>` pairs |

| # | Case | Expected |
|---|---|---|
| 6.5.1 | Scope = Scoped Records | Condition cell reads `All Records` |
| 6.5.2 | Many chips | Truncate with `and 99+ more`; the full list is reachable on click or hover |
| 6.5.3 | Long condition lists | `See More` / `See Less`, as the Frequency table |
| 6.5.4 | Row hover / focus | Drag handle and `⋯` with `Edit` and `Remove` |
| 6.5.5 | Order | Reorderable within a module, and it matters — say in the UI whether first match wins here too, as the Frequency section does |
| 6.5.6 | Remove | Confirm first |

---

## 7. Validation and feedback

One rule across the step: **a blocked Next always says why.**

On Next, if anything is invalid:

1. The field takes an **error border**.
2. A **message** appears with the field.
3. **Focus moves** to the first invalid field — expanding any collapsed section needed to reach it.
4. The message is **announced** (`role="alert"` or a live region).
5. The wizard **stays on Beat Engine**.

Validated on Next:

| Field | Condition |
|---|---|
| Rep Selection | At least one user, group or role |
| Max Days per beat | Present, in range |
| Max Visits per Day | Present, in range |
| Max upcoming Beats per Field Sales Rep | Present, in range |
| Run scheduler at | Present — *only when Auto-beat is on* |

**Not** blocking: having zero Frequency Rules or zero Assignment Rules. Both are optional layers.
If zero frequency rules means no beats will ever generate, say so inline where the user can see it
— do not block Next over it.

---

## 8. Persistence and footer

| # | Case | Expected |
|---|---|---|
| 8.1 | Leave the step and return | **Everything is retained** — rep selection, all three caps, the toggle, the scheduler time, every frequency rule and every assignment rule, including their order |
| 8.2 | Footer | `Previous` on the left; `Cancel`, `Save as Draft`, `Next` on the right, in that order |
| 8.3 | Save as Draft | Saves and stays on the step |
| 8.4 | Previous | Returns to Visit Types, retaining this step's values |
| 8.5 | Next, all valid | Advances to Field Rules |
| 8.6 | Unsaved dialog work + browser back / Cancel | Warn before discarding |

---

## 9. UX guidelines

These are the judgement calls the designs imply but do not spell out. Hold to them.

1. **Progressive disclosure, not greying.** Auto-beat's children and the criteria builders appear
   when they become relevant and are absent otherwise. Avoid the state where a control is visible
   but unusable with no explanation.
2. **Never discard work silently.** Turning off Auto-beat, switching Operating Model, switching
   assignment mode and changing a Category type all destroy configuration. Each needs a warning
   that names what is lost.
3. **Never present a dead control.** Where Done is disabled, the reason must be discoverable —
   a tooltip on focus, or inline errors on click. Preferred: keep the button live and validate on
   click, as Planner Configuration does.
4. **Order is meaning.** Frequency rules are first-match-wins. The list must therefore be
   reorderable, visibly ordered, and reorderable **without a mouse**.
5. **Destructive actions confirm.** Removing a rule discards a criteria set; removing the last
   rule of a module discards the group.
6. **Counts, not crowds.** Rep Selection shows `User 6`, not six names. Assignment chips truncate
   with `and 99+ more`. Give a way to see the full list.
7. **Empty states explain.** No frequency rules should read as a sentence about what that means
   for generation, not a bare empty table.
8. **One vocabulary.** A module is named the same way everywhere — section, dialog title, table
   heading. Dialog titles quote it: `Frequency Rules for "Accounts"`.
9. **The default is the safe path.** Route intelligence assigns visits with no configuration at
   all. Conditional Rules is an override, and the note banner must keep saying so.

---

## 10. Accessibility

| # | Requirement |
|---|---|
| 10.1 | Every toggle has an accessible name tied to its visible label, and reports `aria-checked` in both states |
| 10.2 | Every control shows a visible focus indicator — WCAG 2.4.7 |
| 10.3 | The three cap inputs and the scheduler have programmatic labels, not adjacent text nodes |
| 10.4 | Radio groups (`Apply this rule to`, `Assign Record to`, mode) are real `radiogroup`s with arrow-key navigation |
| 10.5 | Section titles are real headings at one consistent level |
| 10.6 | Info icons are keyboard reachable; their content is not hover-only |
| 10.7 | Dialogs are `role="dialog" aria-modal="true"`, labelled by their title, trap focus, and return focus to the control that opened them on close |
| 10.8 | Row `⋯` menus are keyboard operable and their items are reachable in sequence |
| 10.9 | Drag-to-reorder has a keyboard equivalent (10.4 of the UX guidelines) |
| 10.10 | A blocked Next is announced, not only shown |
| 10.11 | `See More` / `See Less` state the row they expand, so they are distinguishable out of context |

---

## 11. Acceptance checklist

**Operating model**
- [ ] Top Down shows all sections
- [ ] Bottom Up shows rep selection and beat caps only
- [ ] Switching to Bottom Up warns before discarding auto-beat configuration
- [ ] Bottom Up advances on Next with only rep + caps filled

**Rep selection**
- [ ] Empty field opens Select Users; filled field opens it via the pencil
- [ ] Field shows counts by category, not names
- [ ] Add appears on hover; already-added rows show `✓ Added`
- [ ] Switching source keeps the Selected pane intact
- [ ] Search filters only the left pane
- [ ] Cancel discards; Done commits
- [ ] Empty selection blocks Next with a visible, announced error

**Beat caps**
- [ ] All three reject letters, symbols and decimals, on paste as well as typing
- [ ] Empty and `0` both block Next with a message
- [ ] Out-of-range blocks Next and states the limit
- [ ] Info tooltips are keyboard reachable

**Auto-beat**
- [ ] Off by default; children hidden
- [ ] Turning off after configuring warns first
- [ ] Scheduler defaults to 9:00 AM and states its time zone
- [ ] Scheduler is validated only while Auto-beat is on

**Frequency rules**
- [ ] `Add Rule ▾` button when empty; `Add Rule` link once rules exist
- [ ] Module menu lists only modules mapped in step 1
- [ ] Specific scope opens one empty criteria row
- [ ] Done blocked on empty criteria, missing Frequency, missing Visit Type
- [ ] Valueless operators disable and clear the value
- [ ] New Visit Type creates **and selects** the type, and it appears in step 2
- [ ] Table is three columns, grouped by module
- [ ] `See More` / `See Less` past two criteria
- [ ] Rows reorder within a module, by mouse **and** by keyboard
- [ ] Remove confirms

**Visit assignment**
- [ ] Conditional Rules off by default
- [ ] Note banner reads a single `Note:`
- [ ] Switching mode warns before discarding
- [ ] Category: switching type clears the chips
- [ ] Done stays disabled until the target is answered, and says why
- [ ] Skill matching offers only type-compatible field pairs
- [ ] Table truncates long chip lists with `and 99+ more`

**Across the step**
- [ ] Every value survives leaving and returning
- [ ] Footer reads Previous | Cancel · Save as Draft · Next
- [ ] A blocked Next always shows a border, a message, moves focus and announces

---

## 12. Open questions

Not defined by the designs. Confirm before building.

1. **Beat cap ranges** — this document proposes 1–31, 1–50, 1–10.
2. **Scheduler interval and time zone** — which intervals, and whose clock.
3. **Frequency options** — the designs show Weekly, Monthly, Bi-Weekly. Is Daily offered? Is a
   custom interval needed?
4. **Several rules per module** — allowed, and evaluated in order? This document assumes yes.
5. **Zero frequency rules with Auto-beat on** — warn, or block? This document warns.
6. **Assignment rule order** — does first match win, as it does for frequency? If so the UI should
   say it in both places.
7. **Skill matching operators** — the designs only show `IS`. Are others needed?
8. **Do the two assignment modes share storage** — does switching discard, or keep both sets?
