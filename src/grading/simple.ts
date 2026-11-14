/**
 * Grading for the non-grid question types: numeric answers and multiple choice.
 * Answer keys and wrong options are formulas evaluated by the same engine the
 * grid uses, so nothing here is a typed-in number.
 */
import { formatValue, isCellError, parseTypedNumber, type NumFormat } from '../engine/format';
import { shuffle, type Rng } from '../engine/rng';
import { evalFormula, evalNumber } from '../engine/workbook';
import type { VarValues } from '../engine/variables';
import { renderTemplate } from '../engine/variables';
import type { McqItem, MistakeCategory, NumericItem, Tolerance } from '../content/schema';

export interface NumericResult {
  correct: boolean;
  /** The number we understood from what was typed (null if unreadable). */
  parsed: number | null;
  expected: number;
  expectedText: string;
  message: string;
  category?: MistakeCategory;
}

function near(x: number, target: number, tol: Tolerance): boolean {
  const allowed = Math.max(tol.abs ?? 0, (tol.pct ?? 0) * Math.abs(target), 1e-9);
  return Math.abs(x - target) <= allowed;
}

const PERCENT_FORMATS: NumFormat[] = ['pct', 'pct1', 'pct2'];

export function numericAnswer(item: NumericItem, values: VarValues): number {
  return evalNumber(item.answer, values);
}

export function gradeNumeric(item: NumericItem, values: VarValues, typed: string): NumericResult {
  const expected = numericAnswer(item, values);
  const expectedText = formatValue(expected, item.format);
  const parsed = parseTypedNumber(typed);
  if (!parsed) {
    return {
      correct: false,
      parsed: null,
      expected,
      expectedText,
      message: typed.trim() === '' ? 'No answer entered.' : "Couldn't read that as a number.",
      category: 'incomplete',
    };
  }

  // For percent answers, "5.5" means 5.5% and "0.055" is accepted too.
  const isPct = PERCENT_FORMATS.includes(item.format);
  const candidates = isPct && !parsed.hadPercent ? [parsed.value / 100, parsed.value] : [parsed.value];
  const tol = item.tolerance;
  const hit = candidates.find((c) => near(c, expected, tol));
  if (hit !== undefined) {
    return { correct: true, parsed: hit, expected, expectedText, message: '' };
  }
  const shown = candidates[0];

  for (const m of item.mistakes) {
    const v = evalFormula(m.formula, values);
    if (typeof v === 'number' && candidates.some((c) => near(c, v, tol))) {
      return {
        correct: false,
        parsed: shown,
        expected,
        expectedText,
        message: renderTemplate(m.label, values, item.vars),
        category: m.category,
      };
    }
  }

  const generic: [number, string, MistakeCategory][] = [
    [-1, 'Right size, wrong sign.', 'sign'],
    [100, 'That is 100 times too big. Check percent vs. decimal.', 'units'],
    [0.01, 'That is 100 times too small. Check percent vs. decimal.', 'units'],
    [12, 'That is 12 times too big. Check monthly vs. annual.', 'units'],
    [1 / 12, 'That is 12 times too small. Check monthly vs. annual.', 'units'],
  ];
  for (const [k, message, category] of generic) {
    if (Math.abs(expected) > 1e-9 && candidates.some((c) => near(c, expected * k, tol))) {
      return { correct: false, parsed: shown, expected, expectedText, message, category };
    }
  }

  return {
    correct: false,
    parsed: shown,
    expected,
    expectedText,
    message: 'Not a match, and not one of the usual slips. Rework it step by step.',
    category: 'arithmetic',
  };
}

export interface McqOption {
  text: string;
  correct: boolean;
  why?: string;
  category?: MistakeCategory;
}

function optionText(
  opt: { text?: string; formula?: string },
  item: McqItem,
  values: VarValues,
): string {
  if (opt.formula !== undefined) {
    const v = evalFormula(opt.formula, values);
    if (isCellError(v)) throw new Error(`Option formula ${opt.formula} in ${item.id} failed: ${v.error} ${v.message}`);
    return formatValue(v, item.format);
  }
  return renderTemplate(opt.text ?? '', values, item.vars);
}

/**
 * Build the shuffled options for one attempt. A wrong option that happens to
 * display the same as the right answer (or another option) is dropped.
 */
export function buildMcqOptions(item: McqItem, values: VarValues, rng: Rng): McqOption[] {
  const correct: McqOption = { text: optionText(item.correct, item, values), correct: true };
  const seen = new Set([correct.text]);
  const wrong: McqOption[] = [];
  for (const d of item.distractors) {
    const text = optionText(d, item, values);
    if (seen.has(text)) continue;
    seen.add(text);
    wrong.push({ text, correct: false, why: renderTemplate(d.why, values, item.vars), category: d.category });
  }
  return shuffle(rng, [correct, ...wrong]);
}
