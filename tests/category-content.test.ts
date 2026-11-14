/**
 * The same checks tests/content.test.ts and tests/grader.test.ts run on the
 * core course, applied to every question in the other categories: schema,
 * ids, templates, answer keys under random inputs, and that every listed
 * mistake is graded wrong and named. New category questions are covered
 * automatically.
 */
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, CATEGORY_ITEMS, EVERY_ITEM } from '../src/content';
import { CATEGORY_RAW_ITEMS } from '../src/content/categories';
import { categoryBySlug, categoryTopic, CORE_CATEGORY } from '../src/content/categories/registry';
import {
  ItemSchema,
  SHEET_GRADED_TYPES,
  WORKBOOK_TYPES,
  type CaseQItem,
  type DocReviewItem,
  type ErrorHuntItem,
  type EstimateItem,
  type GoNoGoItem,
  type Item,
  type JudgmentItem,
  type McqItem,
  type NumericItem,
  type OrderItem,
  type PlanQItem,
  type PredictItem,
  type SheetGradedItem,
} from '../src/content/schema';
import { formatValue, isCellError } from '../src/engine/format';
import { seededRng } from '../src/engine/rng';
import { isValidVarName, renderTemplate, sampleVars } from '../src/engine/variables';
import { evalFormula } from '../src/engine/workbook';
import { buggyAttempt, caseSheets, goNoGoTruth, gradeErrorHunt, gradeEstimate, gradeGoNoGo, gradePredict, orderScore, predictTruth } from '../src/grading/advanced';
import {
  gradeDocReview,
  gradeLocate,
  gradeMeasure,
  identifyOptions,
  JUDGMENT_SCORE,
  judgmentOptions,
  matchingElements,
  renderDocument,
} from '../src/grading/category';
import { baseKeyValues, checkAnswerKey, collectTargets, gradeGrid, solutionAttempt, type GridAttempt } from '../src/grading/gridGrader';
import { buildMcqOptions, gradeNumeric, numericAnswer } from '../src/grading/simple';
import { buildPlanSet } from '../src/plans/sets';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const GRID_SEEDS = [1, 2, 3, 4, 5];
const LEFTOVER = /\{[^}]*\}/;
const COMPUTED = /\{(=[^}|]+)(?:\|[a-z0-9]+)?\}/g;

const of = <T extends Item>(type: T['type']) => CATEGORY_ITEMS.filter((i): i is T => i.type === type);
const varsOf = (item: Item) => ('vars' in item ? item.vars : []);

function templatedTexts(item: Item): string[] {
  const out = [item.prompt];
  if (item.type === 'flashcard') out.push(item.answer, ...item.hints);
  if (item.type === 'mcq' || item.type === 'numeric') out.push(item.explanation, ...item.hints, ...('mistakes' in item ? item.mistakes.map((m) => m.label) : []));
  if (item.type === 'estimate') out.push(item.explanation, item.shortcut);
  if (item.type === 'gonogo') out.push(item.explanation, ...item.criteria.map((c) => c.note));
  if (item.type === 'judgment') out.push(item.explanation, ...item.options.flatMap((o) => [o.text, o.why]));
  if (item.type === 'docreview') out.push(item.explanation, ...item.document.lines.flatMap((l) => [l.text, ...(l.cells ?? [])]), ...item.issues.map((i) => i.label));
  return out;
}

function withCells(item: SheetGradedItem | ErrorHuntItem, cells: Record<string, string>, sheet?: string): GridAttempt {
  const attempt = solutionAttempt(item.workbook.sheets);
  const name = sheet ?? item.workbook.sheets[0].name;
  attempt[name] = { ...attempt[name], ...cells };
  return attempt;
}

describe('category content: schema and bookkeeping', () => {
  it('every question matches the schema', () => {
    for (const raw of CATEGORY_RAW_ITEMS) {
      const result = ItemSchema.safeParse(raw);
      expect(result.success, `${(raw as { id?: string }).id}: ${result.success ? '' : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });

  it('ids are unique across the whole app, and none collides with the core course', () => {
    expect(new Set(EVERY_ITEM.map((i) => i.id)).size).toBe(EVERY_ITEM.length);
    const core = new Set(ALL_ITEMS.map((i) => i.id));
    for (const item of CATEGORY_ITEMS) expect(core.has(item.id), item.id).toBe(false);
  });

  it('each question sits in a subtopic of its own category and level, and its id starts with the category', () => {
    for (const item of CATEGORY_ITEMS) {
      expect(item.category, item.id).not.toBe(CORE_CATEGORY);
      expect(categoryBySlug(item.category), `${item.id}: unknown category`).toBeDefined();
      const topic = categoryTopic(item.topic);
      expect(topic?.category, `${item.id}: topic ${item.topic}`).toBe(item.category);
      expect(topic?.level, `${item.id} level`).toBe(item.level);
      expect(item.id.startsWith(`${item.category}-`), `${item.id} should start with ${item.category}-`).toBe(true);
    }
  });

  it('the core course is untouched by the category system', () => {
    for (const item of ALL_ITEMS) expect(item.category, item.id).toBe(CORE_CATEGORY);
    expect(ALL_ITEMS.some((i) => ['judgment', 'docreview', 'plan'].includes(i.type))).toBe(false);
  });

  it('categories that need legal verification carry a date and a source, or declare no legal claim', () => {
    for (const item of CATEGORY_ITEMS) {
      if (!categoryBySlug(item.category)!.needsLegalVerification) continue;
      const verified = Boolean(item.verifiedAsOf && item.sourceUrl);
      expect(verified || item.noLegalClaim === true, `${item.id}: needs verifiedAsOf + sourceUrl, or noLegalClaim`).toBe(true);
      expect(verified && item.noLegalClaim === true, `${item.id}: cannot be both verified and noLegalClaim`).toBe(false);
    }
  });

  it('a source and a verification date always come together', () => {
    for (const item of CATEGORY_ITEMS) expect(Boolean(item.verifiedAsOf), item.id).toBe(Boolean(item.sourceUrl));
  });

  it('variable names are safe, and every question has tags, a time estimate and no em dashes', () => {
    for (const item of CATEGORY_ITEMS) {
      for (const v of varsOf(item)) expect(isValidVarName(v.name), `${item.id}: bad variable name "${v.name}"`).toBe(true);
      expect(item.tags.length, item.id).toBeGreaterThan(0);
      expect(item.estMinutes, item.id).toBeGreaterThan(0);
      expect(JSON.stringify(item).includes('—'), `${item.id} contains an em dash`).toBe(false);
    }
  });

  it('titles are not duplicated within a category', () => {
    const seen = new Set<string>();
    for (const item of CATEGORY_ITEMS) {
      const key = `${item.category}|${item.title.toLowerCase()}`;
      expect(seen.has(key), `duplicate title "${item.title}"`).toBe(false);
      seen.add(key);
    }
  });

  it('sheet tasks have unique sheet names and the right number of answer cells', () => {
    for (const item of CATEGORY_ITEMS) {
      if (!WORKBOOK_TYPES.includes(item.type) || !('workbook' in item)) continue;
      const names = item.workbook.sheets.map((s) => s.name);
      expect(new Set(names).size, `${item.id}: duplicate sheet names`).toBe(names.length);
      if (item.type === 'formula') expect(collectTargets(item.workbook.sheets).length, item.id).toBe(1);
      if (item.type === 'predict') expect(collectTargets(item.workbook.sheets).length, item.id).toBe(0);
    }
  });
});

describe('category content: text renders cleanly', () => {
  for (const item of CATEGORY_ITEMS) {
    if (item.type === 'plan') continue; // plan prompts use the plan's facts; checked below
    it(item.id, () => {
      for (const seed of SEEDS.slice(0, 8)) {
        const values = sampleVars(varsOf(item), seededRng(item.id, seed));
        for (const text of templatedTexts(item)) {
          for (const m of text.matchAll(COMPUTED)) {
            const v = evalFormula(m[1], values);
            expect(isCellError(v), `${item.id} seed ${seed}: ${m[1]} is an error`).toBe(false);
          }
          expect(LEFTOVER.test(renderTemplate(text, values, varsOf(item))), `${item.id} seed ${seed}: "${text}"`).toBe(false);
        }
      }
    });
  }
});

describe('category content: numeric answer keys', () => {
  it('runs once per question of these types (an empty list is fine)', () => expect(true).toBe(true));
  for (const item of of<NumericItem>('numeric')) {
    it(item.id, () => {
      for (const seed of SEEDS) {
        const values = sampleVars(item.vars, seededRng(item.id, seed));
        const answer = numericAnswer(item, values);
        expect(Number.isFinite(answer), `${item.id} seed ${seed}`).toBe(true);
        const typed = gradeNumeric(item, values, formatValue(answer, item.format));
        const exact = gradeNumeric(item, values, String(answer));
        expect(exact.correct, `${item.id} seed ${seed}: exact answer rejected`).toBe(true);
        expect(typed.correct, `${item.id} seed ${seed}: the answer as displayed is rejected`).toBe(true);
        for (const m of item.mistakes) {
          const v = evalFormula(m.formula, values);
          expect(typeof v, `${item.id}: mistake ${m.formula}`).toBe('number');
          const res = gradeNumeric(item, values, String(v));
          expect(res.correct, `${item.id} seed ${seed}: mistake ${m.formula} is graded correct`).toBe(false);
          expect(res.category, `${item.id} seed ${seed}: mistake ${m.formula} not recognised`).toBe(m.category);
        }
        expect(gradeNumeric(item, values, '').correct).toBe(false);
        expect(gradeNumeric(item, values, String(answer * 2.5)).correct).toBe(false);
      }
    });
  }
});

describe('category content: multiple choice', () => {
  it('runs once per question of these types (an empty list is fine)', () => expect(true).toBe(true));
  for (const item of of<McqItem>('mcq')) {
    it(item.id, () => {
      for (const seed of SEEDS) {
        const rng = seededRng(item.id, seed);
        const values = sampleVars(item.vars, rng);
        const options = buildMcqOptions(item, values, rng);
        expect(options.filter((o) => o.correct).length).toBe(1);
        expect(options.length, `${item.id} seed ${seed}: options collapsed`).toBe(item.distractors.length + 1);
        expect(new Set(options.map((o) => o.text)).size).toBe(options.length);
        for (const o of options) expect(LEFTOVER.test(o.text), `${item.id}: "${o.text}"`).toBe(false);
      }
    });
  }
});

describe('category content: estimate, predict, go/no-go, ordering', () => {
  it('runs once per question of these types (an empty list is fine)', () => expect(true).toBe(true));
  for (const item of of<EstimateItem>('estimate')) {
    it(item.id, () => {
      for (const seed of SEEDS) {
        const values = sampleVars(item.vars, seededRng(item.id, seed));
        const exact = gradeEstimate(item, values, '0', '0').expected;
        expect(Number.isFinite(exact) && exact !== 0, `${item.id} seed ${seed}`).toBe(true);
        expect(gradeEstimate(item, values, String(exact * (1 + item.ballpark * 0.8)), String(exact)).score).toBe(1);
        for (const m of item.mistakes) {
          const v = evalFormula(m.formula, values);
          const res = gradeEstimate(item, values, String(exact), String(v));
          expect(res.exactRight, `${item.id} seed ${seed}: mistake ${m.formula} is graded correct`).toBe(false);
          expect(res.category, `${item.id} seed ${seed}: mistake ${m.formula}`).toBe(m.category);
        }
      }
    });
  }
  for (const item of of<PredictItem>('predict')) {
    it(item.id, () => {
      const directions = new Set<string>();
      for (const seed of SEEDS.slice(0, 20)) {
        const t = predictTruth(item, seed);
        expect(Number.isFinite(t.base) && Number.isFinite(t.shocked), `${item.id} seed ${seed}`).toBe(true);
        directions.add(t.direction);
        expect(gradePredict(item, t, t.direction, Math.abs(t.change)).score).toBe(1);
      }
      expect([...directions], `${item.id}: direction depends on the inputs`).toHaveLength(1);
    });
  }
  for (const item of of<GoNoGoItem>('gonogo')) {
    it(item.id, () => {
      const calls = new Set<boolean>();
      for (const seed of Array.from({ length: 60 }, (_, i) => i + 1)) {
        const t = goNoGoTruth(item, sampleVars(item.vars, seededRng(item.id, seed)));
        calls.add(t.go);
        expect(gradeGoNoGo(t, t.go, t.criteria.map((c) => c.pass))).toBe(1);
      }
      expect(calls.size, `${item.id}: every random draw gives the same call`).toBe(2);
    });
  }
  for (const item of of<OrderItem>('order')) {
    it(item.id, () => {
      expect(new Set(item.lines).size).toBe(item.lines.length);
      expect(orderScore(item.lines, item.lines)).toBe(1);
    });
  }
});

describe('category content: scenario judgment', () => {
  it('runs once per question of these types (an empty list is fine)', () => expect(true).toBe(true));
  for (const item of of<JudgmentItem>('judgment')) {
    it(item.id, () => {
      expect(item.options.filter((o) => o.rating === 'best').length, 'exactly one best option').toBe(1);
      expect(item.options.some((o) => o.rating === 'poor'), 'at least one poor option').toBe(true);
      for (const seed of SEEDS) {
        const rng = seededRng(item.id, seed);
        const values = sampleVars(item.vars, rng);
        const options = judgmentOptions(item, values, rng);
        expect(new Set(options.map((o) => o.text)).size, 'options must read differently').toBe(options.length);
        for (const o of options) {
          expect(LEFTOVER.test(o.text + o.why), `${item.id}: "${o.text}"`).toBe(false);
          expect(JUDGMENT_SCORE[o.rating]).toBe(o.rating === 'best' ? 1 : o.rating === 'acceptable' ? 0.5 : 0);
        }
      }
    });
  }
});

describe('category content: document review', () => {
  it('runs once per question of these types (an empty list is fine)', () => expect(true).toBe(true));
  for (const item of of<DocReviewItem>('docreview')) {
    it(item.id, () => {
      const flaggable = item.document.lines.filter((l) => !l.heading).map((l) => l.id);
      const issueLines = item.issues.flatMap((i) => i.lines);
      expect(flaggable.length - issueLines.length, 'needs clean lines as well as problems').toBeGreaterThanOrEqual(item.issues.length);

      expect(gradeDocReview(item, item.issues.map((i) => i.lines[0])).score).toBe(1);
      expect(gradeDocReview(item, []).score).toBe(0);
      // flagging everything must not pay
      expect(gradeDocReview(item, flaggable).score).toBeLessThan(0.5);
      const one = gradeDocReview(item, [item.issues[0].lines[0]]);
      expect(one.score).toBeCloseTo(1 / item.issues.length);
      const clean = flaggable.find((id) => !issueLines.includes(id))!;
      expect(gradeDocReview(item, [...item.issues.map((i) => i.lines[0]), clean]).score).toBeLessThan(1);

      for (const seed of SEEDS.slice(0, 10)) {
        const doc = renderDocument(item, seed);
        for (const l of doc.lines) expect(LEFTOVER.test([l.text, ...l.cells].join(' ')), `${item.id} line ${l.id}`).toBe(false);
        for (const i of doc.issues) expect(LEFTOVER.test(i.label), `${item.id}: "${i.label}"`).toBe(false);
      }
    });
  }
});

describe('category content: plan reading', () => {
  it('runs once per question of these types (an empty list is fine)', () => expect(true).toBe(true));
  for (const item of of<PlanQItem>('plan')) {
    describe(item.id, () => {
      const sets = item.plan.variants.map((v) => buildPlanSet(item.plan.set, v));

      it('prompt and explanation render from the plan facts for every variant', () => {
        for (const set of sets) {
          for (const text of [item.prompt, item.explanation, ...item.hints]) {
            for (const m of text.matchAll(COMPUTED)) expect(isCellError(evalFormula(m[1], set.facts)), `${m[1]}`).toBe(false);
            expect(LEFTOVER.test(renderTemplate(text, set.facts, [])), text).toBe(false);
          }
        }
      });

      if (item.task.kind === 'locate') {
        const task = item.task;
        it('has a clickable target on the starting sheet, and wrong clicks are graded wrong', () => {
          for (const set of sets) {
            const targets = matchingElements(set, task.targets);
            expect(targets.length, 'no clickable element matches the targets').toBeGreaterThan(0);
            const start = set.sheets.find((s) => s.id === item.plan.sheet)!;
            expect(targets.some((t) => start.elements.includes(t)), 'a target must be on the starting sheet').toBe(true);
            for (const t of targets) expect(gradeLocate(item, set, t.id).correct).toBe(true);
            expect(gradeLocate(item, set, null).correct).toBe(false);
            const targetIds = new Set(targets.map((t) => t.id));
            const others = start.elements.filter((e) => e.hit && !targetIds.has(e.id));
            expect(others.length, 'needs clickable wrong answers').toBeGreaterThan(3);
            for (const e of others) expect(gradeLocate(item, set, e.id).correct, e.id).toBe(false);
            for (const d of task.decoys) {
              const hit = matchingElements(set, [d.match]);
              expect(hit.length, `decoy "${d.match}" matches nothing clickable`).toBeGreaterThan(0);
              const res = gradeLocate(item, set, hit[0].id);
              expect(res.correct).toBe(false);
              expect(res.message).toBe(d.why);
            }
          }
        });
      }

      if (item.task.kind === 'measure') {
        const task = item.task;
        it('answer key is finite, accepted as displayed, and every mistake is caught by name', () => {
          for (const set of sets) {
            const answer = evalFormula(task.answer, set.facts);
            expect(typeof answer === 'number' && Number.isFinite(answer), `answer for ${JSON.stringify(set.params)}`).toBe(true);
            expect(gradeMeasure(item, set, String(answer)).correct).toBe(true);
            expect(gradeMeasure(item, set, formatValue(answer as number, task.format)).correct, 'the answer as displayed').toBe(true);
            expect(gradeMeasure(item, set, '').correct).toBe(false);
            for (const m of task.mistakes) {
              const v = evalFormula(m.formula, set.facts);
              expect(typeof v, `mistake ${m.formula}`).toBe('number');
              const res = gradeMeasure(item, set, String(v));
              expect(res.correct, `mistake ${m.formula} is graded correct`).toBe(false);
              expect(res.category, `mistake ${m.formula} not recognised`).toBe(m.category);
            }
          }
        });
      }

      if (item.task.kind === 'identify') {
        const task = item.task;
        it('highlights something real and offers distinct options', () => {
          for (const set of sets) expect(matchingElements(set, [task.highlight]).length).toBeGreaterThan(0);
          const options = identifyOptions(item, seededRng(item.id, 1));
          expect(options.filter((o) => o.correct).length).toBe(1);
          expect(new Set(options.map((o) => o.text)).size).toBe(options.length);
        });
      }
    });
  }
});

describe('category content: every sheet task', () => {
  it('runs once per question of these types (an empty list is fine)', () => expect(true).toBe(true));
  const grids = CATEGORY_ITEMS.filter((i): i is SheetGradedItem => SHEET_GRADED_TYPES.includes(i.type));
  for (const item of grids) {
    describe(item.id, () => {
      it('answer key is clean under random inputs', () => {
        for (const seed of GRID_SEEDS) expect(checkAnswerKey(item, seed), `seed ${seed}`).toEqual([]);
      });

      it('model solution scores 100% and a blank sheet scores 0', () => {
        for (const seed of GRID_SEEDS) {
          const res = gradeGrid(item, solutionAttempt(item.workbook.sheets), { seed });
          expect(res.targets.filter((t) => t.status !== 'correct').map((t) => `${t.id}: ${t.message}`), `seed ${seed}`).toEqual([]);
          expect(res.score).toBe(1);
        }
        expect(gradeGrid(item, {}).score).toBe(0);
      });

      it('typing the right numbers is caught as hardcoding', () => {
        const values = baseKeyValues(item.workbook.sheets);
        const attempt: GridAttempt = {};
        for (const [sheet, cells] of Object.entries(values)) {
          attempt[sheet] = {};
          for (const [addr, v] of Object.entries(cells)) attempt[sheet][addr] = String(v);
        }
        for (const r of gradeGrid(item, attempt).targets) {
          expect(r.status, r.id).toBe('wrong');
          expect(r.category, r.id).toBe('hardcode');
        }
      });

      item.mistakes.forEach((m, mi) => {
        it(`mistake ${mi + 1} is caught and named: ${m.label.slice(0, 50)}`, () => {
          for (const seed of GRID_SEEDS) {
            const res = gradeGrid(item, withCells(item, m.cells, m.sheet), { seed });
            for (const addr of Object.keys(m.cells)) {
              const r = res.targets.find((t) => t.addr === addr && t.sheet === (m.sheet ?? item.workbook.sheets[0].name));
              expect(r, `${addr} is not a target`).toBeDefined();
              expect(r!.status, `seed ${seed} ${addr} (${m.cells[addr]})`).toBe('wrong');
              expect(r!.message, `seed ${seed} ${addr}`).toBe(m.label);
              expect(r!.category).toBe(m.category);
            }
            for (const r of res.targets) {
              if (!(r.addr in m.cells)) expect(['correct', 'upstream'], `seed ${seed} ${r.id}`).toContain(r.status);
            }
          }
        });
      });
    });
  }

  for (const item of of<ErrorHuntItem>('errorhunt')) {
    describe(item.id, () => {
      const first = item.workbook.sheets[0].name;
      it('every planted bug is really wrong, nothing else is, and fixing them scores 100%', () => {
        for (const seed of GRID_SEEDS) {
          expect(checkAnswerKey({ ...item, mistakes: [] }, seed)).toEqual([]);
          const res = gradeErrorHunt(item, buggyAttempt(item), { seed });
          expect(res.score).toBe(0);
          expect(res.broken.map((t) => t.id)).toEqual([]);
          for (const bug of item.bugs) {
            for (const addr of Object.keys(bug.cells)) {
              const t = res.grid.targets.find((x) => x.sheet === (bug.sheet ?? first) && x.addr === addr);
              expect(t?.status, `seed ${seed} ${addr} is not detectably wrong`).toBe('wrong');
            }
          }
        }
        expect(gradeErrorHunt(item, solutionAttempt(item.workbook.sheets)).score).toBe(1);
      });
    });
  }

  for (const item of of<CaseQItem>('case')) {
    it(`${item.id}: steps cover every answer cell exactly once`, () => {
      const first = item.workbook.sheets[0].name;
      const targets = collectTargets(item.workbook.sheets).map((t) => `${t.sheet}!${t.addr}`).sort();
      expect(item.steps.flatMap((s) => s.cells.map((c) => `${s.sheet ?? first}!${c}`)).sort()).toEqual(targets);
      expect(collectTargets(caseSheets(item, 'worked')).length).toBe(0);
    });
  }
});
