# Building a category

This is the workflow for building any category of Groundwork from its build spec. It is written for a future Claude Code session that has no other context. Read `CLAUDE.md` first, then this file, then the category's `BUILD_SPEC.md`.

## The rule that comes before everything else

**Never modify the Excel & Pro Forma section.** It is the core of the app and it is finished. That means:

- Do not edit, move, rename or delete anything in `src/content/items/` or `src/content/topics.ts`.
- Do not change an existing question's `id`, text, numbers or answer key.
- Do not edit any test file that existed before the category system: `tests/content.test.ts`, `coverage.test.ts`, `grader.test.ts`, `engine.test.ts`, `learn.test.ts`, `xlsx.test.ts`, `functions.test.ts`, `finance.test.ts`, `finance.ts`. They must keep passing exactly as written.
- `ALL_ITEMS` (in `src/content/index.ts`) means the core course and must keep meaning that. The core has exactly 14 question types (`ITEM_TYPE_LABELS`). New types go in `ALL_TYPE_LABELS` only.
- Shared code (`src/engine`, `src/grading`, `src/learn`, `src/components`, `schema.ts`) may be EXTENDED when a spec calls for it, but only additively: new optional fields, new functions, new types. Existing behaviour must not change. If an existing test fails after your change, your change is wrong.
- Saved progress lives in the browser under the key `pro-forma-gym/v1`. Never rename the key, never change the stored shape without a migration, never change an existing question id. If a change could put the owner's saved progress at risk, **stop and ask the owner first.**

## Where things are

```
src/content/categories/
  registry.ts                 THE list of categories: slug, title, tier, status, overlay text, subtopics, targets, build model
  index.ts                    collects every category's questions and checks them against the registry (automatic)
  define.ts                   categoryItems('<slug>', [...]) helper
  specs.ts                    renders the generated blocks of every BUILD_SPEC.md
  <slug>/
    BUILD_SPEC.md             what to build (16 sections, with a BUILD PROMPT at the bottom)
    spec-data.ts              worked examples, type mix and chunk plan as data (engine-computed)
    items.ts                  the two seed questions: the quality bar
    items-<subtopic>.ts       where new questions go (any file named items*.ts is picked up automatically)
    VERIFICATION_LOG.md       only for categories that need legal verification
src/plans/                    generated drawings (plan-reading)
src/components/plan/          the plan viewer
src/components/questions/CategoryQuestions.tsx   plan, document review and scenario judgment question screens
src/grading/category.ts       grading for those three types
src/components/questions/PlanGridQuestion.tsx    the plan-to-spreadsheet screen; src/grading/plangrid.ts grades it
src/leases/engine.ts          the lease engine (tenant inputs to a lease-by-lease cash flow)
src/components/leases/        the lease simulator screen; src/grading/leases.ts grades its questions
src/learn/category.ts         per-category progress and status
tests/category-content.test.ts   every category question, every type: answer keys, mistakes, templates
tests/categories.test.ts         registry, specs, sessions, independent checks of seed answers
tests/plans.test.ts              drawing geometry vs. facts
tests/leases.test.ts             the lease engine vs. the spec's worked examples and accounting identities
```

Commands:

| Command | Use |
|---|---|
| `npm run validate` | Type-check and run every test. Run after every change. |
| `npm run category-status` | Tier, status, built vs. target for every category. |
| `npm run sync-specs` | Re-render the generated blocks of the specs after editing `registry.ts` or a `spec-data.ts`. |
| `npm run dev` | Open the app and play what you built. |

If `npm` is not found in a tool shell, prefix with `PATH=/usr/local/bin:$PATH`.

## The workflow

One chunk per session. The chunks are in section 15 of each spec.

1. **Read the spec, all of it.** Then read the seed questions in `items.ts` and play them in the app (`/#/c/<slug>`). The seeds define the expected depth, tone and rigour.
2. **Read the schema** (`src/content/schema.ts`) and the sheet helpers (`src/content/build.ts`). The comments there are the documentation. `CLAUDE.md` has the rules for each question type.
3. **Check the starting state.** `git status` must be clean. Run `npm run validate` and `npm run category-status` and note the counts.
4. **Verification first, where required.** For a category with `needsLegalVerification`, and for every row in the spec's section 11, do the look-ups before writing questions (see "Facts and laws" below).
5. **Worked example before questions.** If a question uses a formula that has no worked example in the spec, add one to `spec-data.ts` and run `npm run sync-specs`. The engine computes the result; read it and make sure it is what you expected.
6. **Build the chunk.** Create `items-<subtopic>.ts` in the category folder:

   ```ts
   import { categoryItems } from '../define';
   import { input, label, sheet, target, title } from '../../build';

   export const ITEMS = categoryItems('<slug>', [
     { id: '<slug>-<subtopic>-<type>-<short-name>', type: 'numeric', level: 1, topic: '<slug>-<subtopic>', ... },
   ]);
   ```

   Build in small batches (five or six questions), running `npm run validate` after each batch. Do not write twenty questions and then test.
7. **Validate.** Fix every failure by fixing the content. Never weaken, skip or delete a test.
8. **Play it.** Open the app and attempt at least one question of each type you added, once correctly and once with a listed mistake, to confirm the feedback reads well. For sheet tasks, type a listed mistake and check the message names it.
9. **Update status.** In `registry.ts`: `planned` → `in-progress` when the first chunk lands; `built` when the target is reached. Run `npm run sync-specs` (it must report no surprises) and `npm run category-status`.
10. **Commit.** One commit per chunk: `<slug>: chunk <N>`.
11. **Report** to the owner in plain English: counts by subtopic and type, what was verified and when, what could not be verified, and what the next chunk is.

## Rules for every question

These restate `CLAUDE.md` for categories. The tests enforce most of them.

- **Ids.** `<slug>-<subtopic>-<type>-<short-name>`, lowercase with dashes. Never change one after it is committed.
- **Topic and level.** `topic` is one of the category's subtopic ids from the registry; `level` equals that subtopic's level (1 Foundations, 2 Applied, 3 Case).
- **Every number is computed.** Answers, options and sheet solutions are formulas. Numbers in prompts and documents come from variables (`{rent|usd}`, `{=noi/cap|usd}`). Never type a result.
- **Never string-match.** Grading is by behaviour.
- **Real mistakes.** Every numeric, estimate, measure and sheet question lists the wrong formulas students actually use, each with a one- or two-sentence label that states the fix and a category. The tests enter each mistake and require that it is graded wrong and named.
- **Edge cases.** Any sheet with `MIN`, `MAX`, `IF`, rounding or a lookup needs `edgeCases` that put inputs on both sides of the threshold. This is the usual fix for "mistake is graded correct".
- **Illustrative data.** Market figures, costs and rates are invented and say "illustrative" (or "hypothetical") in the prompt. Use San Diego place names as settings only.
- **Ownership.** Each concept is owned by one category (section 12 of each spec). Other categories may mention it in a sentence but must not build questions on it. New categories may overlap the Excel course freely, and must teach whatever Excel they need in their own hints.
- **Style.** Plain English, British spelling, no em dashes, labels of one or two sentences. Hints go nudge → concept → partial formula.

## The question types available

All 14 core types (see `CLAUDE.md`), plus five built for categories:

| Type | What the student does | Key fields | Scoring |
|---|---|---|---|
| `judgment` | Chooses the best response to a scenario | `options[{ text, rating: 'best' \| 'acceptable' \| 'poor', why, category? }]` (3 to 5, exactly one `best`), `explanation`, optional `vars` | best 1, acceptable 0.5, poor 0. Every option's `why` is shown afterwards. |
| `docreview` | Flags the lines of a document that contain a problem | `document { kind, title, columns?, lines[{ id, text, cells?, heading? }] }`, `issues[{ lines, label, category }]` (1 to 5), `vars`, `explanation`; optional `figure { set, variants[], sheet }` shows a drawing above the document, and the text can then use the drawing's facts | (issues found - wrong flags) / issues, floor 0. Needs at least as many clean lines as issues. Headings and totals cannot be flagged. |
| `plan` | Clicks, measures or names something on a generated drawing (four plan sets: apartments, retail, office, podium), or says which sheet to open | `plan { set, variants[], sheet }`, `task` of kind `locate` (targets, decoys, `pick`, `onSheet`), `measure` (answer formula over plan facts, mistakes, tool), `identify` (highlight, correct, distractors) or `navigate` (correctSheet, distractorSheets) | right or wrong; measure tasks use a tolerance; a multi-pick locate scores (right - wrong) / picks |
| `leasesim` | Reads, corrects or predicts with the lease-by-lease simulator | `scenario`, `variants`, `editable`, `task` of kind `read` (answer formula over report facts, mistakes), `configure` (target inputs, checks) or `shock` (change, output, band, trap) | read: right or wrong; configure: share of checked report lines that match; shock: half for direction, full with the size |
| `plangrid` | Reads numbers off a drawing into a spreadsheet, then builds formulas on them | everything a `grid` has, plus `figure { set, variants[], sheet }` and `takeoffs[{ cell, label, answer, mistakes }]` (1 to 8; `answer` is a formula over the plan's facts); `minutes` + `passMark` + `brief` make it a timed capstone | each takeoff is checked against the drawing; formula cells get the full grid grading as if every takeoff were right, so a miscount costs only its own cell. Every cell counts equally |

A spec may ask for a NEW type (for example `leasesim` in the ARGUS spec). Follow "Adding a new question type" in `CLAUDE.md`, add the label to `ALL_TYPE_LABELS` only, and add a section for the type to `tests/category-content.test.ts` modelled on the `plan` section.

## Facts and laws

- **Nothing about current law, fees, taxes or market levels is written from memory.**
- For each such statement, open the **primary source** (the statute or code text, or the agency's own page). Summaries, news and AI answers are not sources.
- Put `verifiedAsOf: 'YYYY-MM-DD'` (the day you checked) and `sourceUrl` on the question. The app shows both under the question. Write the rule into the prompt with its date ("as of November 2026").
- In a category with `needsLegalVerification: true`, every question must have those two fields, or `noLegalClaim: true` (pure arithmetic on invented standards, with "hypothetical" in the prompt). The loader rejects anything else.
- Keep a `VERIFICATION_LOG.md` in the category folder: rule, source URL, section, date, short paraphrase, question ids.
- If you cannot verify something, do not write the question. Say so in your report.

## Quality checklist (run through it before committing)

- [ ] `npm run validate` passes. No test was weakened, skipped or deleted. No pre-existing test file was edited.
- [ ] `git diff --stat` shows no changes under `src/content/items/` or to `src/content/topics.ts`.
- [ ] Counts match the chunk: `npm run category-status`, and each subtopic is at or under its target.
- [ ] Every new question was opened in the app at least once; one of each type was answered right and wrong.
- [ ] Every number in every prompt, option, document and explanation comes from a variable or formula.
- [ ] Every prompt with market, cost or rate figures says "illustrative"; every invented standard says "hypothetical".
- [ ] Every statement of law or official fact has `verifiedAsOf` and `sourceUrl`, and is in the verification log.
- [ ] No two questions in the category test the same thing with the same framing; titles are unique.
- [ ] Nothing is built on a concept another category owns.
- [ ] Sheet tasks: `edgeCases` cover each threshold; every listed mistake is named by the grader; anchoring slips are not listed as mistakes.
- [ ] `registry.ts` status is right; `npm run sync-specs` reports nothing unexpected.
- [ ] The commit message is `<slug>: chunk <N>`.

## Common builder mistakes

| Mistake | What happens | Do this instead |
|---|---|---|
| Typing an answer or a number in an explanation | It goes stale the moment inputs are randomised; reviewers cannot trust it | `{=formula|format}` in text; formulas for keys |
| Two mistakes that give the same number for some random draw | Test fails: "mistake not recognised" | Tighten the variable ranges, merge the mistakes, or drop one |
| A mistake that equals the right answer for some draw | Test fails: "mistake is graded correct" | Add an edge case or change ranges so they always differ by more than the tolerance |
| A `MAX(0, ...)` mistake that only differs when inputs cross zero | Looks fine in the base case, fails under the stress test, or is never detected | Add an `edgeCases` entry that crosses the threshold |
| Variable names with digits or one letter (`cap2`, `n`) | Schema error | Lowercase letters and underscores, two or more characters |
| Listing a `$`-anchoring slip as a mistake | The grader already diagnoses anchoring; the labels conflict | Leave it out (it is fine as an error-hunt bug) |
| Document review with too few clean lines | Test fails; flagging everything would score | At least as many clean, flaggable lines as issues, and make the clean lines plausible suspects |
| Judgment options where two are equally good | Students are marked down arbitrarily | Exactly one `best`; make `acceptable` genuinely second-best and say why |
| Plan question whose label gives the answer away | No learning | Check every piece of text on the sheet (room labels, notes, project name, cover subtitle) against the question. The viewer hides element names until graded; it cannot hide text you drew |
| Asking for a plan number that is not a fact | Answer cannot be keyed | Add the fact to the generator and cross-check it against geometry in `tests/plans.test.ts` |
| Stating a rule "everyone knows" without checking | The app teaches something false or out of date | Verify, date and cite it, or make it a hypothetical |
| Building past the subtopic target | Test fails; the category drifts from its spec | Stop at the target. If the spec is wrong, change the registry and spec together and run `npm run sync-specs` |
| Editing the registry or `spec-data.ts` without syncing | Test fails: spec out of date | `npm run sync-specs` |
| "Fixing" a failing pre-existing test by editing it | Breaks the protection rule | Revert; fix your own change |
| One giant commit | Hard to review or roll back | One chunk, one commit |

## Recommended build order

The owner asked (2026-11-14) for the hardest work to be done first, while the Fable model is available. So the order below is by how much a session needs the strongest model, not by ease. One row is one session. Check `npm run category-status` before starting: skip any row that is already done.

### Phase A: needs Fable 5.2 at high effort

| Step | Session | Why it is here |
|---|---|---|
| 1 (done 2026-11-14) | `argus` chunk 4: lease engine, simulator component, `leasesim` type, 9 questions | The only part of Commercial Leases that needs new engineering. Done first, it unblocks the whole 70-question category for any model. It does not depend on ARGUS chunks 1 to 3 |
| 2 (done 2026-11-15) | `plan-reading` chunk 1: viewer extensions, site plan and section sheets, 19 questions | Every later plan-reading chunk builds on these viewer features |
| 3 (done 2026-11-15) | `plan-reading` chunk 2: roof plan, elevation and ceiling plan sheets, 18 questions | New drawing generators |
| 4 (done 2026-11-15) | `plan-reading` chunk 3: retail, office and mixed-use podium plan sets, 12 questions | The largest drawing-generation job in the app |
| 5 (done 2026-11-15) | `plan-reading` chunk 4: the plan-to-spreadsheet type (`plangrid`), 18 questions | Built as its own type on top of the unchanged grid grader, so the core sheet types were not touched |
| 6 (done 2026-11-15) | `plan-reading` chunk 5: ground floor and typical floor for the podium set, a timer on `plangrid`, the capstone and the accessibility pass, 1 question | Finished the category (70 of 70, status `built`) |

### Phase B: better with Fable, workable with Opus 5.5 at high effort

| Step | Session | Why it is here |
|---|---|---|
| 7 (done 2026-11-15) | `entitlements` chunk 1: verification log, zoning, approvals, CEQA, 19 questions | Every rule must be checked against official sources; careful reading matters more than speed. The spec's section 11 now says what worked, including how to read the City of San Diego's PDFs for step 8 |
| 8 | `entitlements` chunk 2: state housing laws, local rules, risk, mini-case, 19 questions | Same |
| 9 | `argus` chunk 1: rent rolls and base rent, 16 questions | Content only, once step 1 is done |
| 10 | `argus` chunk 2: recoveries and concessions, 18 questions | |
| 11 | `argus` chunk 3: market leasing assumptions and vacancy, 18 questions | |
| 12 | `argus` chunk 5: reports and capstone, 7 questions | Uses the engine from step 1 |

### Phase C: Opus 5.5 (the effort each spec names)

| Step | Sessions | Model |
|---|---|---|
| 13 to 16 | `acquisitions` chunks 1 to 4 (21, 18, 15, 14 questions) | Opus 5.5 high |
| 17 to 20 | `market-analysis` chunks 1 to 4 (18, 19, 19, 12) | Opus 5.5 high |
| 21 to 24 | `asset-management` chunks 1 to 4 (18, 17, 17, 16) | Opus 5.5 high |
| 25 to 26 | `capital-markets` chunks 1 and 2 (21, 17) | Opus 5.5 medium |
| 27 | `construction` chunk 1 (22) | Opus 5.5 medium |

If Fable time runs short, protect steps 1 to 5 in that order: they are the ones a weaker model is most likely to get wrong. Phases B and C can go in any order; categories do not depend on each other.

## Hints are shown exactly as written

Question screens do not fill in `{placeholders}` in hints, so a hint must not contain one (a test enforces this). Put numbers that change with the inputs in the explanation instead, or describe the step in words.
