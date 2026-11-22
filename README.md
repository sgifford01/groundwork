# Groundwork

A practice app for real estate development. **Try it: https://sgifford01.github.io/groundwork/** (free, no sign-up; your progress is saved in your own browser and never uploaded).

At its core is the **Excel & Pro Forma Modeling** course: short, mixed questions and spreadsheet tasks graded cell by cell, where only real formulas pass. Around it are eight more categories, built out one at a time.

You answer short, mixed questions. Ones you miss come back within minutes; ones you know come back days later.

**316 questions today.** Excel & Pro Forma Modeling (204, with a guide to 44 Excel functions), Plan Reading & Building Program (70, with generated, interactive architectural drawings), Entitlements & Zoning (21 so far, every legal rule checked against an official source and dated), Commercial Leases & ARGUS (11 so far, with a lease-by-lease simulator), and two sample questions in each of the other five categories.

Designed by Shane Gifford (real estate & development, UC San Diego) and built with AI coding tools (Claude Code). For learning only: nothing in it is legal, tax or investment advice. Open source under the GPL-3.0 licence (see `LICENSE`); it uses HyperFormula (GPL-3.0) to evaluate formulas.

To run it on your own computer instead, see "Start the app" below. (It was first built as "Pro Forma Gym"; the folder and the browser storage key still use that name.)

---

## Start the app

You need Node.js 22 or newer (already installed on Shane's Mac). Open the **Terminal** app and paste these two lines, pressing Return after each:

```bash
cd "$HOME/Desktop/Claude App/pro-forma-gym"
```

```bash
npm install && npm run dev
```

The first run takes a minute while it downloads the app's building blocks. When you see a line like `Local: http://localhost:5173/`, open that address in Chrome or Safari.

- **To stop the app:** click the Terminal window and press `Ctrl+C`.
- **To start it again later:** run the same two lines. (`npm install` is quick the second time.)
- **Leave the Terminal window open** while you practice. Closing it stops the app.

Your progress is saved in the browser you use. Use the same browser each time, or move progress with Export/Import (see below).

---

## A 2-week practice plan (20 to 30 minutes a day)

Every day: open the Excel & Pro Forma page from Home, clear your **due reviews first**, then do the day's focus. Stop when the time is up, even mid-topic. Short and daily beats long and occasional.

| Day | Focus | What to do |
|---|---|---|
| 1 | Find your level | Read "New to formulas? Start here" at the top of the Functions page. Take the placement quiz (about 10 minutes), then a 10-minute Smart mix. |
| 2 | Anchoring | Library → "Grow a rent across five years" and "Value matrix with mixed references". Then the "moving and selecting" shortcut drill. |
| 3 | Core Excel | 20-minute Smart mix. Do the rent roll grid and one write-the-formula question. Look up IF, MAX and SUMIFS in the Functions guide and edit each "Try it" box. |
| 4 | Auditing | Two Level 0 error hunts, then a "Flashcards only" session. |
| 5 | NOI and value | Guided case "From rent roll to loan" (worked example). Then the Year 1 NOI grid. |
| 6 | Loans | Amortization schedule grid. Then the monthly-payment calculation and the first-payment-interest question. |
| 7 | Review day | "Drill my mistakes" for 20 minutes. Finish with the 5-minute NOI sprint. |
| 8 | Loan sizing | The guided case again (it comes back partly filled), then "Size a loan three ways". |
| 9 | Cash flows | Level 2: five-year operating cash flow grid, then the exit value grid. |
| 10 | Returns | Guided case "Acquisition pro forma" (worked example), then the "IRR, multiple, NPV and profit" grid. |
| 11 | Real Excel | Download one Level 2 grid as .xlsx, build it in Excel, upload it. Then the 10-minute cash flow sprint. |
| 12 | Development budget | Level 3: budget and sources grid, then the two go/no-go questions. |
| 13 | Development returns | Draw schedule grid, then the guided case "Development pro forma" (worked example). |
| 14 | First capstone | "ADU infill" case study (25 minutes, timed). Then read your Excel & Pro Forma dashboard: weakest topics, most common mistake type, and the confidence chart. |

After two weeks: keep the daily reviews going, work through Levels 4 and 5, and take the other two capstones (35 and 45 minutes) under test conditions.

---

## Using the app

| Page | What it is for |
|---|---|
| **Home** | One tile per category, with the Excel & Pro Forma course featured at the top. Click a tile and an overlay tells you what the category covers, how big it is and how far along it is, with a button to go on to its page. **Mixed review** runs the reviews that are due across every category in one session. |
| **A category page** (click a tile) | What the category is, what you will be able to do, its subtopics, how much is built and how well you know it. The Excel & Pro Forma page is the full dashboard: streak, reviews due, mastery by topic, accuracy trend, most common mistake types and a confidence-versus-accuracy chart. |
| **Practice** | Build a session: pick a category (or all of them), then 10, 20 or 45 minutes. Choose Smart mix, due reviews, weakest topics, new material, a drill of your mistakes, or flashcards only. |
| **Library** | Every question. Pick a category at the top. The core course is listed by level and topic and can be filtered by type or status. Open any question and retry it with new numbers. |
| **Functions** | A guide to the 44 Excel functions that matter for real estate models: what each does, how to write it, a live example, and a box to try your own version. Start with the primer at the top if formulas are new to you. |
| **Mistakes** | Your mistake journal: every answer that was not fully right, your answer, the right answer, and what went wrong. One click drills them. |
| **Settings** | Profile (Mac or Windows, Excel version), placement quiz, light or dark mode, backup, reset. |

### The 14 question types

| Type | What you do |
|---|---|
| Flashcard | Recall, flip, rate yourself Again / Hard / Good / Easy. |
| Multiple choice | Every wrong option is a real misconception, and picking one tells you which. |
| Calculation | Type a number. Inputs change every attempt. |
| Write the formula | Type the formula for one cell of a small sheet. |
| Grid build | Fill the yellow cells of a model. |
| Guided case | Build a full pro forma in steps. First time it is a worked example, second time every other step is yours, after that the sheet is blank. |
| Error hunt | A finished model with 1 to 4 planted bugs. Find them and fix them in place. |
| Predict, then check | Before an input changes, predict which way the result moves and by roughly how much. |
| Estimate first | Give a ballpark in your head, then the exact answer. |
| Put in order | Drag lines into the right sequence (or use the arrows). |
| Explain why | Write two or three sentences, then grade yourself against a checklist. |
| Go / no-go | Judge each investment test, then make the call. |
| Shortcut drill | Press the real keys for each action, against a clock. |
| Timed challenge | A grid build against the clock with no hints. The capstones are this type. |

### Before you see the answer

- **Confidence.** You lock in an answer by saying how sure you are. The Excel & Pro Forma dashboard then shows whether you are as right as you feel.
- **Hints.** A ladder: a nudge, then the concept, then a partial formula, then the full solution. Each hint lowers the credit for that attempt (75%, 50%, 25%); seeing the solution earns none.

### The curriculum

| Level | Topics | Questions |
|---|---|---|
| 0 Excel fundamentals | Anchoring, core functions, SUMIFS and SUMPRODUCT, lookups, dates, model hygiene | 53 |
| 1 Real estate math | NOI and value, leverage metrics, loan math, loan sizing | 46 |
| 2 Acquisition pro forma | Operating cash flow, exit value, levered vs. unlevered, returns | 36 |
| 3 Development pro forma | Budget, draws and construction interest, lease-up, development returns, rental vs. for-sale | 36 |
| 4 Equity waterfalls | Pref and return of capital, promote tiers | 14 |
| 5 Sensitivity and presentation | Data tables, scenarios, check cells, summary page | 16 |
| Capstone | Garden-style multifamily acquisition, 120-unit mid-rise development, ADU infill | 3 |

A level opens when the ones before it reach 80% mastery. You can also jump ahead from the Excel & Pro Forma page, the Library or Settings.

---

## The spreadsheet

It behaves like Excel wherever a browser allows.

**Colours**

| Looks like | Means |
|---|---|
| Yellow cell | Yours to fill in |
| Grey cell | Locked |
| White empty cell | Free scratch space (helper formulas are allowed) |
| Blue text | A typed number (an input or a hardcode) |
| Black text | A formula |
| Green text | A formula that links to another sheet |

**Keys**

| Key | What it does |
|---|---|
| Arrow keys | Move. Hold Shift to select a range. |
| Enter / Tab | Finish typing and move down / right |
| F2, or Ctrl+U | Edit the cell (double-click works too) |
| Esc | Cancel what you are typing |
| F4 | While typing a formula, cycle the `$` anchors on the reference at the cursor: `B2` → `$B$2` → `B$2` → `$B2` |
| Arrows or a click, right after `=`, `+`, `(` or `,` | Point at a cell to insert its reference |
| Ctrl+R / Ctrl+D | Fill right / fill down across the selection. References shift the way they do in Excel. |
| Cmd+C, Cmd+V | Copy and paste, with references shifting |
| Cmd+Z | Undo |
| Delete | Clear the selected cells |
| Ctrl+` | Show formulas instead of values |

**Mac notes**

- On a MacBook, press **fn+F4** (and fn+F2) unless you have turned on "Use F1, F2, etc. as standard function keys" in System Settings. The **$** button beside the formula bar does the same job as F4.
- In real Excel for Mac, **Cmd+T** also toggles anchors. A web browser reserves Cmd+T for "new tab", so the app uses F4. For the same reason, a few shortcuts in the drills appear as multiple choice instead of a key press.

### Help while you type a formula

It works the way Excel's does, in every spreadsheet, in the write-the-formula box, and in the Functions guide.

1. Type `=` and the first letters of a function, for example `=PM`. A list of matching functions appears with a one-line description of each.
2. Press **Tab** to insert the highlighted one (use ↑ and ↓ to choose, Esc to hide the list). You get `=PMT(` with the cursor inside the brackets.
3. The **template** appears: `PMT(rate, nper, pv, [fv], [type])`. The argument you are on is underlined, with a plain-English note on what to put there. It moves along as you type each comma.
4. Square brackets mean an argument is optional. A link in the popup opens that function in the guide.

### How a grid is graded

Each yellow cell gets three checks:

1. **Value.** Does it match the answer key with today's numbers?
2. **Formula.** Is it a real formula, not a typed number?
3. **Stress test.** The app quietly changes the blue inputs, several at once and then one at a time, and recalculates both your sheet and the answer key. Your cell has to keep matching.

Any formula that behaves correctly passes. The app never compares the text of your formula with a "right" formula.

When a cell is wrong you get a one-line reason, for example "B3 drifted to C3 when C7 was filled right. Lock it with F4." If one early mistake makes later cells show the wrong value, those later cells are marked **Formula OK** and still earn credit.

Your first check is the one that counts toward your review schedule. After that you can fix cells and check again as often as you like.

### Do it in real Excel

Every spreadsheet task has a **Do it in real Excel** panel under the grid.

1. **Download .xlsx.** The file has the inputs in blue, the given formulas, and the answer cells in yellow.
2. Build it in Excel and save.
3. **Upload completed .xlsx.** The app reads your formulas and grades them exactly as it would in the browser, including the stress test.

Things to know:

- Keep the sheet names and the layout as downloaded. Extra helper cells are fine.
- If a formula uses a function the app cannot evaluate, it tells you which cell and why. It does not fail silently.
- If Excel's saved value differs from what the app calculates for the same formula, it tells you that too.
- If you change a blue input, grading still uses the original inputs and tells you so.

---

## Back up or move your progress

**Settings → Export progress** saves one file with your profile, review schedule and answer log. **Import progress** loads that file back, replacing what is in the browser. Use it to keep a backup or to move to another browser or computer.

## Using it on a phone

The app lives on your Mac, so your phone has to reach it over the same Wi-Fi:

1. Start it with `npm run dev -- --host` instead of `npm run dev`.
2. Terminal prints a "Network" address such as `http://192.168.1.20:5173/`. Open that on your phone.

On a small screen the Practice page leaves out spreadsheet tasks and shortcut drills by default. "Flashcards only" is the lightest option. Progress on the phone is separate from progress on the Mac; Export/Import moves it.

---

## The categories

| Category | Size | Status |
|---|---|---|
| **Excel & Pro Forma Modeling** (core) | 204 questions | Ready |
| Commercial Leases & ARGUS | about 70 | In progress (11 questions, including the lease simulator) |
| Plan Reading & Building Program | 70 questions | Ready (with a 35-minute case study at the end) |
| Entitlements & Zoning | about 40 | In progress (21 of 40: zoning, approvals and CEQA; every legal point dated and linked to its source) |
| Market Analysis | about 70 | Coming soon (2 samples) |
| Acquisitions & Closing | about 70 | Coming soon (2 samples) |
| Debt & Capital Markets | about 40 | Coming soon (2 samples) |
| Asset & Portfolio Management | about 70 | Coming soon (2 samples) |
| Construction Cost & Schedule | about 24 | Coming soon (2 samples) |

To see where things stand at any time:

```bash
npm run category-status
```

Five kinds of question exist only in the new categories:

- **Plan reading.** A drawing you can pan, zoom and measure. You answer by clicking on it, measuring it or naming what is highlighted. Drawings are generated by the app; none is copied from a real project. It also works from the keyboard: Tab moves through the drawing, Enter picks, Escape leaves it, and "List elements" lists everything you can click.
- **Plan to spreadsheet.** A drawing above a spreadsheet. You read numbers off the drawing (unit counts, areas, stalls) into the first cells, then build the formulas. A miscount costs only that cell, not every formula built on it.
- **Document review.** A document (an operating statement, a pay application, a project data table) where you flag the lines that have a problem. A wrong flag cancels a right one. Some come with the drawings to check the document against.
- **Scenario judgment.** A situation and several responses. One is best, some are workable, some are poor, and every one is explained afterwards.
- **Lease simulator.** A small building's rent roll and leasing assumptions, run lease by lease. You read the cash flow, set it up, or predict what a change does.

Every category keeps its own review queue and its own mastery bar. Your progress in the Excel & Pro Forma course is untouched by any of this.

Each category page (the Excel course included) has a **Next up** box: it shows how many questions you have solved and opens the first one you have not, in the order the category is meant to be learned (topic by topic, and within a topic, cards and quick questions before sheet builds). After you answer any question, **Next question →** sits to the right of the try-again button and follows the same order. The try-again button says "with new numbers" (or "with a new drawing") only when the numbers really change.

### Building out a category

Each category has a build spec: `src/content/categories/<name>/BUILD_SPEC.md`. At the bottom of each spec is a **BUILD PROMPT**. To build a category, open this folder in Claude Code, start a new session with the model the prompt names, and paste the prompt (it builds one chunk of about 15 to 25 questions per session). `docs/BUILDING_CATEGORIES.md` is the instruction manual those sessions follow.

Suggested order (hardest first, while the strongest model is available): the lease simulator for Commercial Leases & ARGUS, then Plan Reading, then Entitlements, then the rest of Commercial Leases; after that Acquisitions, Market Analysis, Asset & Portfolio Management, Debt & Capital Markets and Construction. The session-by-session plan is at the end of `docs/BUILDING_CATEGORIES.md`.

---

## Checking the content

```bash
npm run validate
```

This checks every question file and runs the automated tests (well over 1,000 of them). The tests:

- run every spreadsheet task's model solution through the grader and require 100%
- enter every listed "common mistake" and require that it is marked wrong and named correctly
- check that every planted bug in an error hunt is really wrong, and that fixing it scores full credit
- re-check each task with randomised inputs
- compare PMT, IPMT, PPMT, PV, NPV, IRR, XNPV and XIRR against separately written implementations
- write every spreadsheet task to an .xlsx file, read it back and grade it
- run the live example of every function in the guide
- enforce the curriculum rules: 150+ questions, and a grid build and an error hunt in every topic
- run the same checks on every question in the new categories, check the generated drawings against their own dimensions, and confirm that every number in a build spec was computed by the app

If it ends with "passed", the content is sound.

## Adding questions

Open this folder in Claude Code and ask in plain English, for example "add 15 DSCR problems" or "make a new case study on a student-housing deal near UCSD". The file `CLAUDE.md` tells Claude the question format and the rules, and `npm run validate` confirms the new content works.

---

## Things this app cannot do

- **Evaluate LET, LAMBDA, INDIRECT, XMATCH, AVERAGEIFS or AGGREGATE.** The formula engine does not support them. A cell using one is marked "can't be graded here", with the reason.
- **Run Excel's Data Table feature or iterative (circular) calculation.** Level 5 teaches Data Tables with step-by-step instructions and has you build the same tables by hand. The mid-rise capstone teaches the algebraic way around the construction-interest circle.
- **Capture every shortcut.** The browser keeps a few key combinations for itself (Cmd+T, Cmd+Shift+T, Ctrl+PageDown and similar). Those appear as multiple choice in the drills.

## If something goes wrong

| Problem | Fix |
|---|---|
| `command not found: npm` | Close Terminal, open it again, and retry. If it persists, reinstall Node.js from nodejs.org. |
| The address will not open | Check Terminal is still running the app. If it printed a different number than 5173, use that address. |
| The page looks broken after an update | Stop the app (`Ctrl+C`), run `npm install && npm run dev` again, and reload the page. |
| An uploaded .xlsx is refused | Check it is the file for that task, saved as .xlsx, with the sheet names unchanged. |
| I want a clean slate | Settings → Erase all progress. |

## Licence note

Groundwork is published under the GPL-3.0 licence (the full text is in `LICENSE`), because the formula engine it uses, HyperFormula, is licensed to it under GPL-3.0. Anyone may use, study and share the code under the same terms.

## The public website

The site at https://sgifford01.github.io/groundwork/ is published by GitHub Pages from the `main` branch of https://github.com/sgifford01/groundwork. Every change pushed to `main` is rebuilt and republished automatically (`.github/workflows/deploy.yml`); the Actions tab on GitHub shows each run. Visitors' progress is stored in their own browser, so nothing personal is collected.
