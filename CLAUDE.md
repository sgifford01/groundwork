# Pro Forma Gym: guide for Claude Code sessions

A local Vite + React + TypeScript app that teaches Excel and real estate pro forma modeling with spaced repetition and self-grading spreadsheet tasks. The owner is a real estate student, not a developer: explain changes in plain English and always finish by running `npm run validate`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at http://localhost:5173 |
| `npm run validate` | Type-check, then run every test. **Run this after any content or code change.** |
| `npm test` | Tests only |
| `npm run build` | Production build |

Node lives at `/usr/local/bin`; if `npm` is not found in a tool shell, prefix commands with `PATH=/usr/local/bin:$PATH`.

## Map of the code

```
src/
  engine/      workbook.ts (HyperFormula wrapper + Excel-compat fixes), refs.ts (A1 refs, shifting, F4),
               format.ts (number formats), variables.ts (random inputs + {templates}), rng.ts,
               formulaAssist.ts (which suggestions / argument template to show while typing)
  grading/     gridGrader.ts (sheet grading), simple.ts (numeric + multiple choice),
               advanced.ts (error hunt, guided case, predict, estimate, ordering, go/no-go, shortcuts)
  content/     schema.ts (THE question schema), topics.ts (levels + topics), build.ts (helpers),
               functions.ts (THE function catalog), items/*.ts (the questions), index.ts (collects and validates them)
  learn/       sm2.ts (spaced repetition), mastery.ts, session.ts (session builder), placement.ts, stats.ts
  store/       progress.ts (localStorage), backup.ts (export/import), session.ts
  xlsx/        taskFile.ts (write a task as .xlsx, read a completed one back)
  components/  grid/Grid.tsx (the spreadsheet), questions/* (one component per type), ItemRunner.tsx, charts.tsx,
               FormulaAssist.tsx (the as-you-type help popup, shared by the grid, the formula box and the guide)
  pages/       Dashboard, Practice, SessionPage, Library, Functions, Mistakes, Settings
tests/         content, grader, finance (+ finance.ts), engine, learn, xlsx, coverage, functions
```

## Non-negotiable content rules

1. **Never type an answer by hand.** Numeric answers, options and sheet solutions are formulas evaluated by the engine. Derived prompt numbers are formula variables (`{ name: 'loan', formula: '=price*ltv' }`).
2. **Never string-match formulas.** Grading is by behaviour: values, a hardcode check, and a perturbation test. Any formula that produces the right results must pass.
3. **Never change an item's `id` after it exists.** Progress is stored by id. To retire an item, delete it.
4. **Every item needs real common mistakes**, expressed as formulas where the type allows. The tests enter each one and require that it is graded wrong and labelled correctly.
5. **Run `npm run validate` and fix every failure** before saying content is done. Do not weaken a test to make content pass.
6. **Keep the coverage rules true** (tests/coverage.test.ts): at least 150 items, all 14 types in use, and every topic in Levels 0 to 5 has at least one `grid` and one `errorhunt`.

## Adding questions

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

## Adding a new question type

Extend the union in `content/schema.ts` (and `ITEM_TYPE_LABELS`), add grading in `grading/`, add a component in `components/questions/`, route it in `ItemRunner.tsx`, decide whether it belongs in `DESKTOP_ONLY_TYPES` and in the placement quiz's quick types, and add tests in `tests/content.test.ts` (plus `tests/grader.test.ts` and `tests/xlsx.test.ts` if it uses a sheet).

## Status

Built: all 14 question types; the grid with full grading and Excel-style function help while typing; .xlsx download and upload; the Functions guide (44 functions); SM-2, confidence and the hint ladder; mastery and unlocks; placement quiz; session builder; dashboard with calibration; mistake journal; export/import; 204 items across Levels 0 to 5 and three capstones (19 of them generated function flashcards).

Multi-sheet tasks work (sheet tabs, green cross-sheet links, `sheet:` on a mistake, `Sheet!B7` keys in edge cases); `l5-present-grid-summary-page` is the one example so far. Put the sheet with the yellow cells first. Pointing at a cell on another tab with the mouse is not supported: cross-sheet references are typed.

Ideas not built: more multi-sheet tasks; AVERAGEIFS and XMATCH support; a monthly IRR-hurdle waterfall with several tiers; more capstones (student housing near UCSD, retail, industrial).
