/**
 * Checks every question file: schema, ids, templates, answer keys under
 * random inputs, and that every "common mistake" really gives a wrong answer.
 */
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, RAW_ITEMS } from '../src/content';
import {
  ItemSchema,
  WORKBOOK_TYPES,
  type EstimateItem,
  type GoNoGoItem,
  type Item,
  type McqItem,
  type NumericItem,
  type OrderItem,
  type PredictItem,
  type ShortcutItem,
} from '../src/content/schema';
import { TOPICS } from '../src/content/topics';
import { formatValue } from '../src/engine/format';
import { seededRng } from '../src/engine/rng';
import { isValidVarName, renderTemplate, sampleVars } from '../src/engine/variables';
import { evalFormula } from '../src/engine/workbook';
import {
  codeFor,
  goNoGoTruth,
  gradeEstimate,
  gradeGoNoGo,
  gradePredict,
  isCapturable,
  isSequence,
  orderScore,
  parseCombo,
  predictTruth,
} from '../src/grading/advanced';
import { collectTargets } from '../src/grading/gridGrader';
import { buildMcqOptions, gradeNumeric, numericAnswer } from '../src/grading/simple';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const LEFTOVER = /\{[^}]*\}/; // an unfilled {placeholder}
const COMPUTED = /\{(=[^}|]+)(?:\|[a-z0-9]+)?\}/g; // {=formula|format}

function varsOf(item: Item) {
  return 'vars' in item ? item.vars : [];
}

/** Text that is run through the template engine. */
function templatedTexts(item: Item): string[] {
  const out = [item.prompt];
  if (item.type === 'flashcard') out.push(item.answer, ...item.hints);
  if (item.type === 'mcq' || item.type === 'numeric') out.push(item.explanation, ...item.hints);
  if (item.type === 'estimate') out.push(item.explanation, item.shortcut);
  if (item.type === 'gonogo') out.push(item.explanation, ...item.criteria.map((c) => c.note));
  return out;
}

const of = <T extends Item>(type: T['type']) => ALL_ITEMS.filter((i): i is T => i.type === type);

describe('content: schema and bookkeeping', () => {
  it('every item matches the schema', () => {
    for (const raw of RAW_ITEMS) {
      const result = ItemSchema.safeParse(raw);
      const id = (raw as { id?: string }).id;
      expect(result.success, `${id}: ${result.success ? '' : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });

  it('ids are unique', () => {
    const seen = new Set<string>();
    for (const item of ALL_ITEMS) {
      expect(seen.has(item.id), `duplicate id ${item.id}`).toBe(false);
      seen.add(item.id);
    }
  });

  it('each item sits in a topic of its own level, and its id starts with the level', () => {
    for (const item of ALL_ITEMS) {
      const topic = TOPICS.find((t) => t.id === item.topic)!;
      expect(topic.level, `${item.id} level`).toBe(item.level);
      const prefix = item.level === 6 ? 'cap-' : `l${item.level}-`;
      expect(item.id.startsWith(prefix), `${item.id} should start with ${prefix}`).toBe(true);
    }
  });

  it('variable names are safe for the formula engine', () => {
    for (const item of ALL_ITEMS) {
      for (const v of varsOf(item)) expect(isValidVarName(v.name), `${item.id}: bad variable name "${v.name}"`).toBe(true);
    }
  });

  it('every item has tags, a time estimate and text free of em dashes', () => {
    for (const item of ALL_ITEMS) {
      expect(item.tags.length, item.id).toBeGreaterThan(0);
      expect(item.estMinutes, item.id).toBeGreaterThan(0);
      expect(JSON.stringify(item).includes('—'), `${item.id} contains an em dash`).toBe(false);
    }
  });

  it('single-sheet tasks keep their targets on the first sheet when helpers assume it', () => {
    for (const item of ALL_ITEMS) {
      if (!WORKBOOK_TYPES.includes(item.type) || !('workbook' in item)) continue;
      const names = item.workbook.sheets.map((s) => s.name);
      expect(new Set(names).size, `${item.id}: duplicate sheet names`).toBe(names.length);
      if (item.type === 'formula') expect(collectTargets(item.workbook.sheets).length, `${item.id}: needs exactly one target`).toBe(1);
      if (item.type === 'predict') expect(collectTargets(item.workbook.sheets).length, `${item.id}: predict models have no targets`).toBe(0);
    }
  });
});

describe('content: prompts and explanations render cleanly', () => {
  for (const item of ALL_ITEMS) {
    it(item.id, () => {
      for (const seed of SEEDS.slice(0, 8)) {
        const values = sampleVars(varsOf(item), seededRng(item.id, seed));
        for (const text of templatedTexts(item)) {
          for (const m of text.matchAll(COMPUTED)) {
            const v = evalFormula(m[1], values);
            expect(typeof v === 'object' && v !== null, `${item.id} seed ${seed}: ${m[1]} is an error`).toBe(false);
          }
          const rendered = renderTemplate(text, values, varsOf(item));
          expect(LEFTOVER.test(rendered), `${item.id} seed ${seed}: "${rendered}"`).toBe(false);
        }
      }
    });
  }
});

describe('content: numeric answer keys', () => {
  for (const item of of<NumericItem>('numeric')) {
    it(item.id, () => {
      for (const seed of SEEDS) {
        const values = sampleVars(item.vars, seededRng(item.id, seed));
        const answer = numericAnswer(item, values);
        expect(Number.isFinite(answer), `${item.id} seed ${seed}`).toBe(true);

        // Typing the formatted answer must be graded correct...
        const typed = formatValue(answer, item.format);
        const right = gradeNumeric(item, values, typed);
        // (display rounding can exceed a tight tolerance, so also try full precision)
        const exact = gradeNumeric(item, values, String(answer));
        expect(right.correct || exact.correct, `${item.id} seed ${seed}: "${typed}" not accepted`).toBe(true);
        expect(exact.correct, `${item.id} seed ${seed}: exact answer rejected`).toBe(true);

        // ...and every listed mistake must be wrong, and recognised by name.
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

describe('content: multiple-choice options', () => {
  for (const item of of<McqItem>('mcq')) {
    it(item.id, () => {
      for (const seed of SEEDS) {
        const rng = seededRng(item.id, seed);
        const values = sampleVars(item.vars, rng);
        const options = buildMcqOptions(item, values, rng);
        expect(options.filter((o) => o.correct).length).toBe(1);
        expect(options.length, `${item.id} seed ${seed}: options collapsed to ${options.length}`).toBe(
          item.distractors.length + 1,
        );
        expect(new Set(options.map((o) => o.text)).size).toBe(options.length);
        for (const o of options) expect(LEFTOVER.test(o.text), `${item.id}: "${o.text}"`).toBe(false);
      }
    });
  }
});

describe('content: estimate-first', () => {
  for (const item of of<EstimateItem>('estimate')) {
    it(item.id, () => {
      for (const seed of SEEDS) {
        const values = sampleVars(item.vars, seededRng(item.id, seed));
        const exact = gradeEstimate(item, values, '0', '0').expected;
        expect(Number.isFinite(exact) && exact !== 0, `${item.id} seed ${seed}`).toBe(true);
        const good = gradeEstimate(item, values, String(exact * (1 + item.ballpark * 0.8)), String(exact));
        expect(good.ballparkRight && good.exactRight, `${item.id} seed ${seed}: right answers rejected`).toBe(true);
        expect(good.score).toBe(1);
        const bad = gradeEstimate(item, values, String(exact * (1 + item.ballpark * 1.6)), String(exact * 1.4));
        expect(bad.ballparkRight || bad.exactRight, `${item.id} seed ${seed}`).toBe(false);
        for (const m of item.mistakes) {
          const v = evalFormula(m.formula, values);
          expect(typeof v, `${item.id}: mistake ${m.formula}`).toBe('number');
          const res = gradeEstimate(item, values, String(exact), String(v));
          expect(res.exactRight, `${item.id} seed ${seed}: mistake ${m.formula} is graded correct`).toBe(false);
          expect(res.category, `${item.id} seed ${seed}: mistake ${m.formula} not recognised`).toBe(m.category);
        }
      }
    });
  }
});

describe('content: predict-then-check', () => {
  for (const item of of<PredictItem>('predict')) {
    it(item.id, () => {
      const directions = new Set<string>();
      for (const seed of SEEDS.slice(0, 20)) {
        const t = predictTruth(item, seed);
        expect(Number.isFinite(t.base) && Number.isFinite(t.shocked), `${item.id} seed ${seed}`).toBe(true);
        expect(t.inputAfter, `${item.id}: the shock must change the input`).not.toBe(t.inputBefore);
        directions.add(t.direction);
        // the true answer scores 1; the opposite direction scores 0
        expect(gradePredict(item, t, t.direction, Math.abs(t.change)).score).toBe(1);
        const opposite = t.direction === 'up' ? 'down' : 'up';
        expect(gradePredict(item, t, opposite, Math.abs(t.change)).score).toBe(0);
        if (t.direction !== 'none') {
          expect(gradePredict(item, t, t.direction, Math.abs(t.change) * (1 + item.band * 2.5)).score).toBe(0.5);
        }
      }
      // the explanation names one direction, so it has to hold for every set of inputs
      expect([...directions], `${item.id}: direction depends on the inputs`).toHaveLength(1);
    });
  }
});

describe('content: go / no-go', () => {
  for (const item of of<GoNoGoItem>('gonogo')) {
    it(item.id, () => {
      const calls = new Set<boolean>();
      for (const seed of Array.from({ length: 60 }, (_, i) => i + 1)) {
        const values = sampleVars(item.vars, seededRng(item.id, seed));
        const t = goNoGoTruth(item, values);
        calls.add(t.go);
        for (const m of t.metrics) expect(m.text.startsWith('#'), `${item.id}: metric ${m.label} is an error`).toBe(false);
        for (const c of t.criteria) expect(LEFTOVER.test(c.note), `${item.id}: "${c.note}"`).toBe(false);
        expect(gradeGoNoGo(t, t.go, t.criteria.map((c) => c.pass))).toBe(1);
        expect(gradeGoNoGo(t, !t.go, t.criteria.map((c) => !c.pass))).toBe(0);
      }
      expect(calls.size, `${item.id}: every random draw gives the same call`).toBe(2);
    });
  }
});

describe('content: ordering and shortcut drills', () => {
  for (const item of of<OrderItem>('order')) {
    it(item.id, () => {
      expect(new Set(item.lines).size, 'lines must be distinct').toBe(item.lines.length);
      expect(orderScore(item.lines, item.lines)).toBe(1);
      expect(orderScore(item.lines, [...item.lines].reverse())).toBeLessThan(0.5);
    });
  }
  for (const item of of<ShortcutItem>('shortcut')) {
    it(item.id, () => {
      expect(new Set(item.drills.map((d) => d.action)).size).toBe(item.drills.length);
      for (const os of ['mac', 'win'] as const) {
        const combos = item.drills.map((d) => d[os]);
        expect(new Set(combos).size, `${item.id}: two ${os} drills share a shortcut`).toBe(combos.length);
        for (const c of combos) {
          if (isSequence(c)) continue;
          const parsed = parseCombo(c);
          expect(parsed, `${item.id}: cannot read "${c}"`).not.toBeNull();
          expect(codeFor(parsed!.key), `${item.id}: unknown key in "${c}"`).not.toBeNull();
        }
        // a drill with no pressable keys would be all multiple choice
        expect(combos.filter((c) => isCapturable(c, os)).length, `${item.id} (${os})`).toBeGreaterThanOrEqual(combos.length / 2);
      }
    });
  }
});
