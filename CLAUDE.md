# Groundwork: guide for Claude Code sessions

A local Vite + React + TypeScript app that teaches real estate development with spaced repetition and self-grading tasks. It began as "Pro Forma Gym", an Excel and pro forma trainer; that course is now the **core category** of a larger app with eight more categories. (The folder, the localStorage key and the backup file id still say `pro-forma-gym` on purpose.)

The owner is a real estate student, not a developer: explain changes in plain English and always finish by running `npm run validate`.

## READ THIS FIRST: the Excel & Pro Forma section is protected

The Excel & Pro Forma course (Levels 0 to 5, three capstones, the grid, the grader, its 204 questions) is finished and is the main section of the app. When working on anything else:

- **Do not edit `src/content/items/` or `src/content/topics.ts`.** No content edits, removals or restructuring.
- **Do not edit the tests that existed before the category system** (`content`, `coverage`, `grader`, `engine`, `learn`, `xlsx`, `functions`, `finance`). They must pass exactly as written.
- `ALL_ITEMS` means the core course. `ITEM_TYPE_LABELS` is its 14 types. Keep both that way.
- Shared code may be extended only additively (new optional fields and functions). If an existing test fails, the change is wrong.
- **Never risk saved progress.** It is stored under `pro-forma-gym/v1`, keyed by question id. Do not rename the key, change the stored shape without a migration, or change an existing id. If a change could affect saved progress, stop and ask the owner.

Changes to the core course itself happen only when the owner asks for them explicitly.

## The category system

Every topic is a standalone category, listed in **`src/content/categories/registry.ts`** (slug, title, tier, status, summary and bullets for the tile overlay, objectives, subtopics with target counts, `needsLegalVerification`, recommended build model). The home screen tiles, the overlay each tile opens, landing pages (`/#/c/<slug>`), per-category review queues, the Library picker and `npm run category-status` are all generated from it. A new category needs a registry entry and a folder; no per-category code.

| Category | Slug | Tier | Build with |
|---|---|---|---|
| Excel & Pro Forma Modeling | `excel-proforma` | Core | built |
| Commercial Leases & ARGUS | `argus` | Large (70) | Fable 5.2 high |
| Plan Reading & Building Program | `plan-reading` | Large (70) | Fable 5.2 high |
| Entitlements & Zoning | `entitlements` | Medium (40), legal verification | Opus 5.5 high |
| Market Analysis | `market-analysis` | Large (70) | Opus 5.5 high |
| Acquisitions & Closing | `acquisitions` | Large (70) | Opus 5.5 high |
| Debt & Capital Markets | `capital-markets` | Medium (40) | Opus 5.5 medium |
| Asset & Portfolio Management | `asset-management` | Large (70) | Opus 5.5 high |
| Construction Cost & Schedule | `construction` | Small (24) | Opus 5.5 medium |

On screen the tiers are called Core, Large, Medium and Small (`TIER_LABELS`); the ids in the registry stay `CORE`, `BIG`, `MEDIUM`, `SMALL`.

**To build a category, follow `docs/BUILDING_CATEGORIES.md`** and the category's **`src/content/categories/<slug>/BUILD_SPEC.md`** (16 sections; a ready-to-paste BUILD PROMPT is at the bottom). Each folder also holds `spec-data.ts` (worked examples, type mix and chunk plan as data: run `npm run sync-specs` after editing it or the registry) and `items.ts` (two seed questions that set the quality bar). New questions go in `items-<subtopic>.ts` files, which are picked up automatically.

Category questions use the same schema as the core, plus: `category` (stamped by `categoryItems('<slug>', [...])`), `verifiedAsOf` + `sourceUrl` for any real-world rule, `noLegalClaim` for hypothetical arithmetic in a category that needs verification, and five extra types: `judgment`, `docreview`, `plan`, `leasesim`, `plangrid`. Ids start with the slug; `topic` is a subtopic id; `level` is 1 (Foundations), 2 (Applied) or 3 (Case). Categories are not level-gated. Each concept is owned by one category (section 12 of each spec); new categories may overlap the Excel course but not each other.

**No law, fee, tax rate or market level is written from memory.** Verify at the primary source, date it and cite it, or make it an explicit hypothetical.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at http://localhost:5173 |
| `npm run validate` | Type-check, then run every test. **Run this after any content or code change.** |
| `npm test` | Tests only |
| `npm run build` | Production build |
| `npm run category-status` | Each category's tier, status and built vs. target question counts |
| `npm run sync-specs` | Re-render the generated blocks of every BUILD_SPEC.md (after editing the registry or a `spec-data.ts`) |

Node lives at `/usr/local/bin`; if `npm` is not found in a tool shell, prefix commands with `PATH=/usr/local/bin:$PATH`.

## Map of the code

```
src/
  engine/      workbook.ts (HyperFormula wrapper + Excel-compat fixes), refs.ts (A1 refs, shifting, F4),
               format.ts (number formats), variables.ts (random inputs + {templates}), rng.ts,
               formulaAssist.ts (which suggestions / argument template to show while typing)
  grading/     gridGrader.ts (sheet grading), simple.ts (numeric + multiple choice),
               advanced.ts (error hunt, guided case, predict, estimate, ordering, go/no-go, shortcuts)
               category.ts (scenario judgment, document review, plan reading), leases.ts (lease simulator),
               plangrid.ts (plan to spreadsheet: reuses gradeGrid unchanged)
  content/     schema.ts (THE question schema), topics.ts (core levels + topics), build.ts (helpers),
               functions.ts (THE function catalog), items/*.ts (the CORE questions: protected),
               index.ts (ALL_ITEMS = core; CATEGORY_ITEMS; EVERY_ITEM; itemsOfCategory)
               categories/registry.ts (THE category list), categories/index.ts (collects items*.ts automatically),
               categories/specs.ts (spec rendering), categories/<slug>/{BUILD_SPEC.md, spec-data.ts, items*.ts}
  plans/       generated drawings: model.ts, draw.ts (symbols), sets.ts (the list of plan sets);
               mfDoubleLoaded.ts (apartments, eight sheets), retailStrip.ts, officeFloor.ts, podium.ts
  leases/      engine.ts: the lease engine (rent roll + market leasing assumptions -> lease-by-lease cash flow)
  learn/       sm2.ts (spaced repetition), mastery.ts, session.ts (session builder), placement.ts, stats.ts,
               category.ts (per-category progress, due everywhere, status rows), start.ts (starts sessions; `category` option)
  store/       progress.ts (localStorage), backup.ts (export/import), session.ts
  xlsx/        taskFile.ts (write a task as .xlsx, read a completed one back)
  components/  grid/Grid.tsx (the spreadsheet), questions/* (one component per type), ItemRunner.tsx, charts.tsx,
               FormulaAssist.tsx (the as-you-type help popup, shared by the grid, the formula box and the guide)
               plan/PlanViewer.tsx (pan, zoom, measure, hotspots), leases/LeaseSimulator.tsx, questions/CategoryQuestions.tsx,
               questions/LeaseQuestion.tsx, questions/PlanGridQuestion.tsx, CategoryBits.tsx
  pages/       Home (category tiles), CategoryPage (landing page; shows Dashboard for the core), Dashboard (core),
               Practice, SessionPage, Library, Functions, Mistakes, Settings
scripts/       run.mjs (runs a TS script through Vite), category-status.ts, sync-specs.ts
docs/          BUILDING_CATEGORIES.md (the builder workflow, checklist and common mistakes)
tests/         PROTECTED: content, grader, finance (+ finance.ts), engine, learn, xlsx, coverage, functions
               category system: category-content (every category question), categories (registry, specs, sessions), plans, leases
```

## Non-negotiable content rules (core and categories)

1. **Never type an answer by hand.** Numeric answers, options and sheet solutions are formulas evaluated by the engine. Derived prompt numbers are formula variables (`{ name: 'loan', formula: '=price*ltv' }`).
2. **Never string-match formulas.** Grading is by behaviour: values, a hardcode check, and a perturbation test. Any formula that produces the right results must pass.
3. **Never change an item's `id` after it exists.** Progress is stored by id. To retire an item, delete it.
4. **Every item needs real common mistakes**, expressed as formulas where the type allows. The tests enter each one and require that it is graded wrong and labelled correctly.
5. **Run `npm run validate` and fix every failure** before saying content is done. Do not weaken a test to make content pass.
6. **Keep the coverage rules true** (tests/coverage.test.ts): at least 150 core items, all 14 core types in use, and every core topic in Levels 0 to 5 has at least one `grid` and one `errorhunt`.

## Adding questions to the core course (only when the owner asks)

For the other categories, follow `docs/BUILDING_CATEGORIES.md` instead.

1. Pick the topic id from `src/content/topics.ts` (add a topic there only if none fits; a new topic needs a grid build and an error hunt).
2. Add the item to the matching file in `src/content/items/` (or create a file and register it in `src/content/index.ts`).
3. Follow `src/content/schema.ts`. It is the documentation; read the comments there.
4. Run `npm run validate`.

### Fields every item has

`id` (lowercase-with-dashes, starting `l<level>-`, or `cap-` for capstones), `type`, `level`, `topic`, `title`, `prompt`, `tags`, `estMinutes`, `hints` (0 to 3: nudge, concept, partial formula; "show the solution" is automatic), `requires`.

### Templates

Prompts, explanations and labels of the non-sheet types may contain `{name}`, `{name|usd}` and `{=noi/cap|usd}`.

Formats: `general int num1 num2 usd usd2 pct pct1 pct2 mult date text`. Negatives render in parentheses.

Variable names: lowercase letters and underscores only, at least two characters, no digits (`exit_cap`, not `cap2`).

### The 14 types

| Type | Key fields | Notes |
|---|---|---|
| `flashcard` | `answer` | Self-rated. |
| `mcq` | `correct`, `distractors[{text or formula, why, category}]`, `format` | Options must never collide after formatting. |
| `numeric` | `vars`, `answer`, `format`, `tolerance`, `mistakes[{formula, label, category}]` | No mistake may equal the answer for any random draw. |
| `estimate` | as numeric, plus `ballpark` (fraction) and `shortcut` (the mental-math route) | Scored 40% ballpark, 60% exact. |
| `order` | `lines` (in the CORRECT order), `trap`, `explanation` | 3 to 10 distinct lines. |
| `explain` | `rubric` (2 to 6 points), `model`, `trap` | Self-graded against the rubric. |
| `gonogo` | `vars`, `metrics[{label, value, format}]`, `criteria[{label, pass, note}]` | Go only if every `pass` formula is TRUE. Both outcomes must occur across random draws. |
| `shortcut` | `drills[{action, mac, win}]`, `seconds` | Keys like `Ctrl+R`, `Cmd+Shift+L`, `F2`, `Alt+=`. At least half must be capturable per OS (see `RESERVED` in grading/advanced.ts). |
| `grid` | `workbook`, `mistakes`, `edgeCases`, `tolerance` | The base sheet-graded type. |
| `formula` | as grid, with **exactly one** target | Student types one formula into a box. |
| `timed` | as grid, plus `minutes`, `passMark`, `brief` | No hints. Capstones are `timed` at level 6. |
| `case` | as grid, plus `steps[{title, text, cells}]` | Steps must cover every target exactly once. Stage fades by attempts: worked → every other step → blank. |
| `errorhunt` | `workbook`, `bugs[{label, category, cells}]` (1 to 4), `edgeCases` | Every target is shown solved except the bug cells. |
| `predict` | `workbook` (no targets), `output`, `shock {cell, add or mult or set}`, `measure`, `band`, `trap` | Direction must be the same for every random draw. |

### Sheets: the helpers in `src/content/build.ts`

```ts
sheet('NOI', {
  A1: title('Year 1 NOI'),
  A4: label('Units'),                 B4: input(48, 'int', [24, 120, 4]),     // blue input; [min, max, step] for the stress test
  A12: label('Gross potential rent'), B12: target('=B4*B5*12', 'usd'),         // yellow; the model solution
  ...across('C7', 4, target('=B7*(1+$B$3)', 'usd')),                           // fill right, references shift
  ...down('E4', 4, target('=IF(B4="Occupied",D4,0)', 'usd')),                  // fill down
  ...block('B4', 5, 5, target('=$A4/B$3', 'usd')),                             // fill a table
}, { A: 250, B: 130 })                                                          // column widths in px
```

- Cell kinds: `label` / `title` / `header` / `total` / `sub` / `note`, `input` (blue), `given` (locked formula), `target` (yellow).
- `fill(start, n, formula, 'right'|'down')` and `fillBlock(...)` build the `cells` of a mistake or bug as the wrong formula would look after being filled.
- **Reuse models.** Define a workbook once as a `const` and share it between the grid build, the error hunt, the timed sprint and the predict items. Across files use `workbookOf(ITEMS, id)`, `mistakesOf(ITEMS, id)`, `edgeCasesOf(ITEMS, id)`. `solved(workbook)` turns every target into a given formula, for `predict` items. Type shared mistake lists as `MistakeList`.

How the grader stress-tests inputs:

- `input(value, format, [min, max, step])` or `{ choices: [...] }`: sampled from that range. Keep ranges tight enough that the model stays sane (no negative equity, IRR still solvable).
- No third argument: numbers move roughly -30% to +40%. Text inputs and zeros are left alone unless given a range.
- `false`: never changed (month counters, dates used as headers, a scenario toggle that edge cases exercise instead).
- `edgeCases: [{ B4: 'Vacant', D7: 2800 }]`: input sets that are **always** tested. Use them for threshold logic (IF, MIN, MAX, IFERROR, lookups, toggles). If a "mistake is graded correct" or "bug is not detectably wrong" test fails, the usual fix is an edge case that exposes it.
- `target(..., { allowConstant: true })`: for a cell whose value legitimately never changes (a check cell that is always 0). It must still be a formula.

Tolerance defaults to 0.1% for sheets. Tighten to `{ abs: 1 }` where a subtle bug lands close (interest on the wrong balance). Date cells are always exact.

Mistake and bug rules for sheets:

- List only cells where the wrong formula genuinely differs from the solution in some tested scenario. If it coincides in its first cell, start the `fill` one cell later.
- Do **not** list plain `$`-anchoring slips as `mistakes`. The grader finds those itself by searching for the anchor change that repairs the cell. (They are fine as error-hunt `bugs`.)
- Two mistakes with identical behaviour cannot both be listed: merge them into one label.
- Avoid mistake formulas that return an error value; the generic error message wins over the label.
- Error-hunt bugs must not overlap, and every bug cell must be a `target`.

## The function catalog (`src/content/functions.ts`)

One entry per Excel function the course teaches. The same entries drive three things, so edit the catalog and nothing else:

- the **help while typing** (suggestion list and argument template) in every formula box
- the **Functions guide** page (explanation, live example, "Try it", pitfalls, practice links)
- the **function flashcards** (`items/function-cards.ts` generates one per entry that has `card: [level, topic]`)

To add a function: add an entry with `name`, `category`, `summary`, `detail`, `args` (name + plain-English description, `optional` where it applies), `repeat` (how many trailing arguments repeat: 1 for SUM, 2 for SUMIFS pairs), an `example` (a tiny `cells` sheet, a `formula`, and a `note` in words), `realEstate`, and `pitfalls`. Rules the tests enforce:

- The example formula must use the function and must evaluate without an error. Never type the result into the `note`: the page computes it.
- A function the engine cannot evaluate gets `supported: false`, no example, and must be listed in `UNSUPPORTED_FUNCTIONS` in engine/workbook.ts.
- `related` names must exist in the catalog.
- Practice links on the guide come from item `tags`: tag a question with the function name (e.g. `'SUMIFS'`) to list it there.

## Writing conventions

- **Numbers:** realistic, illustrative San Diego / Southern California figures. Name real neighbourhoods.
- **Signs:** in pro formas, deductions are negative so lines sum; say so in the prompt. In loan schedules everything is positive; say so.
- **Labels, `why`, `trap`:** one or two plain sentences that state the fix. "A cap rate applies to NOI, not EGI. Operating expenses must come off first."
- **Mistake categories:** `hardcode reference sign timing units wrong-base double-count omitted function concept arithmetic incomplete`.
- **Hints** go nudge → concept or function → partial formula. Never put the full answer in hints 1 or 2.
- **`estMinutes`:** flashcard 0.5, mcq 1 to 2, numeric / estimate / formula 1 to 3, order 1 to 1.5, explain 3, grid 3 to 10, error hunt 4 to 6, case 10 to 18, timed = minutes + 1.
- No em dashes in question text (a test enforces it). The content uses British spelling ("colour", "annualise").

### The category-only types

| Type | Key fields | Notes |
|---|---|---|
| `judgment` | `options[{ text, rating, why, category? }]` (3 to 5), `explanation`, optional `vars` | Exactly one `best` (1.0); `acceptable` scores 0.5; `poor` 0. Every `why` is shown after grading. |
| `docreview` | `document { kind, title, columns?, lines[{ id, text, cells?, heading? }] }`, `issues[{ lines, label, category }]`, `vars`, optional `figure { set, variants, sheet }` | Score = (issues found - wrong flags) / issues. At least as many clean flaggable lines as issues. Text takes `{templates}`. With a `figure`, the drawing is shown above the document and its facts can be used in the text and in `vars` formulas. |
| `plan` | `plan { set, variants, sheet }`, `task` (`locate` / `measure` / `identify` / `navigate`), `explanation` | Answers are formulas over the plan's `facts`. Every variant must be inside the plan set's limits. Text takes `{fact_name|format}`. `locate` takes `pick` (several clicks) and `onSheet`; `measure` has an `area` tool. Element ids repeat between sheets, so clicks are keyed `"<sheet>/<id>"`. |
| `leasesim` | `scenario`, `variants`, `editable`, `task` (`read` / `configure` / `shock`), `explanation` | The lease-by-lease simulator. Answers are formulas over the report's facts (`noi_year_three`). Inputs are addressed by path (`mla.tiNew`, `tenants.suite-200.baseRent`). Graded in `grading/leases.ts`; the engine is `src/leases/engine.ts`. |
| `plangrid` | everything a `grid` has, plus `figure { set, variants, sheet }` and `takeoffs[{ cell, label, answer, format, tolerance, vary?, mistakes }]` (1 to 8) | Plan to spreadsheet: a drawing above a sheet. Takeoff cells are typed from the drawing and checked against `answer` (a formula over the plan's facts); counts use `tolerance: { abs: 0.4 }`. Formula cells are graded by the unchanged `gradeGrid` with every takeoff set to the right number, so a miscount costs only its own cell. Graded in `grading/plangrid.ts`. No .xlsx round trip. |

Grading for the first three is in `grading/category.ts`. All five are in `ALL_TYPE_LABELS` (use that map for display) and never in `ITEM_TYPE_LABELS`.

## Engine facts (HyperFormula 3.x, wrapped in `engine/workbook.ts`)

- Supported and cross-checked in tests: PMT, IPMT, PPMT, PV, FV, NPV, IRR, XNPV, XIRR, plus XLOOKUP, INDEX/MATCH, VLOOKUP, SUMIFS, COUNTIF, SUMPRODUCT, CHOOSE, EDATE, EOMONTH, IFERROR, ROUND/ROUNDUP, MIN/MAX.
- **Not supported:** LET, LAMBDA, INDIRECT, XMATCH, AVERAGEIFS, AGGREGATE, Excel Data Tables, iterative (circular) calculation. Never use them in a solution. A student formula using one gets a clear "can't be graded here" message (`UNSUPPORTED_FUNCTIONS`).
- Excel-compatibility fixes already in place: bare `TRUE` / `FALSE` are defined as names; empty cells count as 0; **`INDEX(row_range, n)` is overridden** to behave like Excel (the engine's own INDEX reads `n` as a row number); **`DATEDIF` is overridden** so the unit works in either case (`"m"` or `"M"`). If you find another place where a valid Excel formula fails, fix it the same way, in `workbook.ts`, with a test in `tests/engine.test.ts`.
- Dates are serial numbers. Create them with `dateToSerial(2026, 3, 15)` and give the cell the `date` format.
- Labels and text inputs are stored with a leading apostrophe so "2027" or "5%" stay text.
- Inline arrays work in formulas over variables: `=IRR({-equity,cash,cash,cash+sale})`.

## How sheet grading works (do not break this)

`gradeGrid` in `src/grading/gridGrader.ts`:

1. Builds three engine sheets: the key, the student's sheet, and an "isolated" sheet (the key plus the student's scratch cells).
2. Runs scenarios: base inputs, every `edgeCases` set, four random all-input sets, then one-input-at-a-time changes.
3. A cell is `correct` if the student's sheet matches the key in every scenario; `upstream` (full credit) if the cell's formula is right when dropped into the otherwise-correct sheet; else `wrong`.
4. Typed numbers and formulas with no cell references are `wrong` with category `hardcode`, even when today's value matches.
5. Diagnosis order for a wrong cell: unsupported function → anchoring repair for a genuine fill-right/fill-down → error value → declared mistake (exact match in every scenario) → anchoring repair for a formula copied from elsewhere → sign / ×100 / ×12 / neighbouring-period patterns → error only when inputs change → which input it ignores → fallback.

`gradeErrorHunt` (grading/advanced.ts) runs `gradeGrid` and scores (bugs fixed − good cells broken) ÷ bugs. Guided cases grade only the cells the student owns at that stage (`caseSheets`). Uploaded .xlsx files go through `importTask` and then the same graders, so keep graders free of UI code.

## Learning engine

- SM-2 in `learn/sm2.ts`. Misses return in about 10 minutes; successes go 1 day, 6 days, then × ease. Hints cap credit at 75 / 50 / 25%; viewing the solution earns 0.
- Mastery per topic is the average over all its items, unseen items counting as 0. A level unlocks at 80% mastery of the levels before it, or via `settings.manualLevel` (set by the placement quiz or by hand).
- Sessions (`learn/session.ts`) fill a time box and interleave topics and types. `DESKTOP_ONLY_TYPES` in schema.ts lists what "cards and quick questions only" leaves out.
- All progress is one localStorage key, `pro-forma-gym/v1` (`store/progress.ts`). If the stored shape changes, bump the persist `version` and add a migration; never silently drop a user's progress.
- Categories: every category has its own review queue (`dueItems(itemsOfCategory(slug), ...)`) and mastery (`categoryStats`). `startSession({ ..., category })` takes a slug or `'all'`; left out it means the core course. "Mixed review" on the home screen is a due-only session across `'all'`. Only the core course is level-gated.

## Adding a new question type

A type for a category goes in `ALL_TYPE_LABELS` (never `ITEM_TYPE_LABELS`, which is the core's 14) and gets its checks in `tests/category-content.test.ts`. Otherwise the steps are the same:

Extend the union in `content/schema.ts` (and the label map), add grading in `grading/`, add a component in `components/questions/`, route it in `ItemRunner.tsx`, decide whether it belongs in `DESKTOP_ONLY_TYPES` and in the placement quiz's quick types, and add tests in `tests/content.test.ts` (plus `tests/grader.test.ts` and `tests/xlsx.test.ts` if it uses a sheet).

## Status

**Core course (built):** all 14 question types; the grid with full grading and Excel-style function help while typing; .xlsx download and upload; the Functions guide (44 functions); SM-2, confidence and the hint ladder; mastery and unlocks; placement quiz; session builder; dashboard with calibration; mistake journal; export/import; 204 items across Levels 0 to 5 and three capstones (19 of them generated function flashcards).

Multi-sheet tasks work (sheet tabs, green cross-sheet links, `sheet:` on a mistake, `Sheet!B7` keys in edge cases); `l5-present-grid-summary-page` is the one example so far. Put the sheet with the yellow cells first. Pointing at a cell on another tab with the mouse is not supported: cross-sheet references are typed.

**Category system (built 2026-11-14):** registry; home screen tiles that open a description overlay when clicked; landing pages; per-category review and mastery; mixed review; the `judgment`, `docreview` and `plan` types; a minimal plan viewer with one plan set (`mf-double-loaded`: cover, floor plan, enlarged unit plan); a BUILD_SPEC and two seed questions for each of the eight new categories (16 seeds); builder docs; `category-status` and `sync-specs`.

**ARGUS chunk 4 (built 2026-11-14, first by design):** the lease engine, the lease simulator, the `leasesim` type and 9 questions. The build order is at the end of `docs/BUILDING_CATEGORIES.md`.

**Plan Reading chunk 1 (built 2026-11-15):** `navigate` tasks, multi-select and cross-sheet `locate`, an area ruler, revision and section marks, a site plan (C-101) and a building section (A-301), and 19 questions (plan set organisation and symbols). Sheets were renumbered to the discipline + sheet-type convention (the floor plan is A-102).

**Plan Reading chunk 2 (built 2026-11-15):** roof plan (A-103), south elevation (A-201) and unit reflected ceiling plan (A-402), and 18 questions (drawing types, scales and measuring). Plan Reading is at 39 of 70.

**Plan Reading chunk 3 (built 2026-11-15):** plan sets for a row of shops, an office floor and a mixed-use podium (parking level and section), and 12 questions on reading building types. Plan Reading is at 51 of 70. Category hints are shown exactly as written, so they must not contain `{placeholders}` (tested).

**Plan Reading chunk 4 (built 2026-11-15):** the `plangrid` type (plan to spreadsheet), drawings on document reviews (`figure`), a `stairs` parameter on the apartment set (one stair: a dead-end corridor to spot), an area schedule on the office floor, and 18 questions (building program math and plan to pro forma). The core grid types were not changed: `plangrid` is a separate type that reuses the grid grader. Plan Reading is at 69 of 70; chunk 5 (the capstone) is next, and section 13.3 of its spec lists what it needs.

**Not built yet:** most of the content of the eight categories. Run `npm run category-status` for the current counts, and keep each category's `status` in the registry up to date (`planned` → `in-progress` → `built`).

Ideas for the core course, not built: more multi-sheet tasks; AVERAGEIFS and XMATCH support; a monthly IRR-hurdle waterfall with several tiers; more capstones (student housing near UCSD, retail).
