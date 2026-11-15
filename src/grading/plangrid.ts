/**
 * Grading for "plan to spreadsheet" questions (type `plangrid`). No UI code.
 *
 * A plangrid is an ordinary spreadsheet plus a drawing. Some yellow cells
 * ("takeoffs") are filled with numbers read off the drawing; the rest are
 * formulas, as in any grid.
 *
 * Nothing in the core grid grader changes. This file builds two versions of
 * the workbook for one attempt:
 *   - the KEY workbook: every takeoff cell becomes a blue input holding the
 *     correct value from the drawing. The core grader (`gradeGrid`) grades the
 *     formula cells against it. It already ignores anything typed into an input
 *     cell, so formula cells are graded as if the takeoffs were right: a wrong
 *     takeoff costs only its own cell. Because takeoff inputs are varied like
 *     any other input, a formula with a count typed into it fails the stress test.
 *   - the DISPLAY workbook: every takeoff cell becomes a yellow cell the student
 *     can type into.
 * Each takeoff is then graded on its own, like a numeric answer over the
 * drawing's facts, with its listed mistakes.
 */
import type { CellSpec, FigureSpec, NumericItem, PlanGridItem, SheetSpec, TakeoffSpec } from '../content/schema';
import { formatValue, isCellError, type CellValue } from '../engine/format';
import { seededRng } from '../engine/rng';
import { evalFormula, evalNumber, Workbook } from '../engine/workbook';
import type { PlanSet } from '../plans/model';
import { buildPlanSet, planSetDef } from '../plans/sets';
import { buildSheetData, gradeGrid, type GradeOptions, type Gradeable, type GridAttempt, type GridGradeResult, type TargetStatus } from './gridGrader';
import { gradeNumeric } from './simple';
import type { MistakeCategory } from '../content/schema';

/** A plan-to-spreadsheet question with a clock (a capstone). */
export function isTimedPlanGrid(item: PlanGridItem): item is PlanGridItem & { minutes: number; passMark: number; brief: string[] } {
  return item.minutes !== undefined && item.passMark !== undefined && item.brief !== undefined;
}

/** The drawing for one attempt: the seed picks one of the figure's parameter variants. */
export function figureFor(item: { id: string; figure: FigureSpec }, seed: number): PlanSet {
  const rng = seededRng(item.id, seed);
  const variant = item.figure.variants[Math.floor(rng() * item.figure.variants.length)];
  return buildPlanSet(item.figure.set, variant);
}

export function takeoffSheet(item: PlanGridItem, t: TakeoffSpec): string {
  return t.sheet ?? item.workbook.sheets[0].name;
}

/** The correct value of one takeoff for this drawing. */
export function takeoffValue(t: TakeoffSpec, set: PlanSet): number {
  return evalNumber(t.answer, set.facts);
}

function withTakeoffCells(item: PlanGridItem, set: PlanSet, make: (t: TakeoffSpec, value: number) => CellSpec): SheetSpec[] {
  return item.workbook.sheets.map((sheet) => {
    const cells: Record<string, CellSpec> = { ...sheet.cells };
    for (const t of item.takeoffs) {
      if (takeoffSheet(item, t) === sheet.name) cells[t.cell] = make(t, takeoffValue(t, set));
    }
    return { ...sheet, cells };
  });
}

/** Takeoff cells as blue inputs holding the right numbers: what the formula cells are graded against. */
export function keySheets(item: PlanGridItem, set: PlanSet): SheetSpec[] {
  return withTakeoffCells(item, set, (t, value) => ({ kind: 'input', value, format: t.format, ...(t.vary !== undefined ? { vary: t.vary } : {}) }));
}

/** Takeoff cells as yellow cells the student types into. (The solution is never shown by the grid.) */
export function displaySheets(item: PlanGridItem, set: PlanSet): SheetSpec[] {
  return withTakeoffCells(item, set, (t, value) => ({ kind: 'target', solution: `=${value}`, format: t.format }));
}

/** What the core grader needs, built from the key workbook. */
export function keyItem(item: PlanGridItem, set: PlanSet): Gradeable {
  return { id: item.id, workbook: { sheets: keySheets(item, set) }, tolerance: item.tolerance, mistakes: item.mistakes, edgeCases: item.edgeCases };
}

const cellId = (item: PlanGridItem, sheet: string, addr: string) => (item.workbook.sheets.length > 1 ? `${sheet}!${addr}` : addr);

export interface TakeoffResult {
  sheet: string;
  addr: string;
  id: string;
  label: string;
  status: TargetStatus;
  correct: boolean;
  raw: string;
  /** The value the cell shows (a typed number, or what a typed formula gives). */
  studentValue: CellValue;
  expected: number;
  expectedText: string;
  format: TakeoffSpec['format'];
  message: string;
  category?: MistakeCategory;
}

export interface PlanGridResult {
  /** The formula cells, graded by the core grader. */
  grid: GridGradeResult;
  takeoffs: TakeoffResult[];
  score: number;
  passed: boolean;
  mainCategory?: MistakeCategory;
}

/** The values the student's takeoff cells show, computed the way the grid computes them. */
function studentTakeoffValues(item: PlanGridItem, set: PlanSet, attempt: GridAttempt): CellValue[] {
  const wb = new Workbook(buildSheetData(displaySheets(item, set), 'student', attempt));
  try {
    return item.takeoffs.map((t) => wb.get(takeoffSheet(item, t), t.cell));
  } finally {
    wb.destroy();
  }
}

function gradeTakeoff(item: PlanGridItem, t: TakeoffSpec, set: PlanSet, raw: string, shown: CellValue): TakeoffResult {
  const sheet = takeoffSheet(item, t);
  const expected = takeoffValue(t, set);
  const base = {
    sheet,
    addr: t.cell,
    id: cellId(item, sheet, t.cell),
    label: t.label,
    raw,
    studentValue: shown,
    expected,
    expectedText: formatValue(expected, t.format),
    format: t.format,
  };
  if (raw.trim() === '') return { ...base, status: 'empty', correct: false, message: 'Not filled in.', category: 'incomplete' };
  if (isCellError(shown) || (raw.trim().startsWith('=') && typeof shown !== 'number')) {
    return { ...base, status: 'wrong', correct: false, message: 'That entry does not give a number.', category: 'function' };
  }
  // A typed number is graded as typed (so "36" and "3,600" read the way the student meant them);
  // a formula is graded by the number it gives.
  const text = raw.trim().startsWith('=') ? String(shown) : raw;
  const pseudo = { id: item.id, type: 'numeric', vars: [], answer: t.answer, format: t.format, tolerance: t.tolerance, mistakes: t.mistakes } as unknown as NumericItem;
  const res = gradeNumeric(pseudo, set.facts, text);
  if (res.correct) return { ...base, status: 'correct', correct: true, message: '' };
  return { ...base, status: 'wrong', correct: false, message: res.message, category: res.category };
}

export function gradePlanGrid(item: PlanGridItem, set: PlanSet, attempt: GridAttempt, opts: GradeOptions = {}): PlanGridResult {
  // The core grader ignores input cells in the attempt, but take the takeoffs out anyway so its "scratch cell" logic never sees them.
  const formulas: GridAttempt = {};
  for (const [sheet, cells] of Object.entries(attempt)) {
    formulas[sheet] = Object.fromEntries(Object.entries(cells).filter(([addr]) => !item.takeoffs.some((t) => takeoffSheet(item, t) === sheet && t.cell === addr)));
  }
  const grid = gradeGrid(keyItem(item, set), formulas, opts);
  const shown = studentTakeoffValues(item, set, attempt);
  const takeoffs = item.takeoffs.map((t, i) => gradeTakeoff(item, t, set, attempt[takeoffSheet(item, t)]?.[t.cell] ?? '', shown[i]));
  const credit = grid.targets.reduce((n, t) => n + t.credit, 0) + takeoffs.filter((t) => t.correct).length;
  const total = grid.targets.length + takeoffs.length;
  const score = total === 0 ? 0 : credit / total;
  const firstWrongTakeoff = takeoffs.find((t) => !t.correct);
  return { grid, takeoffs, score, passed: score >= 0.999, mainCategory: grid.mainCategory ?? firstWrongTakeoff?.category };
}

/** The model attempt: every formula cell's solution plus every takeoff typed as a number. */
export function modelAttempt(item: PlanGridItem, set: PlanSet, solution: GridAttempt): GridAttempt {
  const out: GridAttempt = Object.fromEntries(Object.entries(solution).map(([k, v]) => [k, { ...v }]));
  for (const t of item.takeoffs) {
    const sheet = takeoffSheet(item, t);
    out[sheet] = { ...(out[sheet] ?? {}), [t.cell]: String(takeoffValue(t, set)) };
  }
  return out;
}

/** Everything that can be wrong with a plangrid beyond the schema. Empty = fine. */
export function planGridProblems(item: PlanGridItem): string[] {
  const problems: string[] = [];
  if (!planSetDef(item.figure.set)) return [`unknown plan set "${item.figure.set}"`];
  const timedFields = [item.minutes, item.passMark, item.brief].filter((v) => v !== undefined).length;
  if (timedFields !== 0 && timedFields !== 3) problems.push('a timed plan-to-spreadsheet question needs all of minutes, passMark and brief (or none of them)');
  if (timedFields === 3 && item.hints.length > 0) problems.push('a timed question shows no hints: leave hints empty');
  const names = item.workbook.sheets.map((s) => s.name);
  const seen = new Set<string>();
  for (const t of item.takeoffs) {
    const sheet = takeoffSheet(item, t);
    const key = `${sheet}!${t.cell}`;
    if (!names.includes(sheet)) problems.push(`takeoff ${t.cell} names a sheet "${sheet}" that is not in the workbook`);
    else if (item.workbook.sheets.find((s) => s.name === sheet)!.cells[t.cell]) problems.push(`takeoff ${key} is also a cell of the workbook: leave it out of the workbook`);
    if (seen.has(key)) problems.push(`two takeoffs share the cell ${key}`);
    seen.add(key);
  }
  for (const variant of item.figure.variants) {
    let set: PlanSet;
    try {
      set = buildPlanSet(item.figure.set, variant);
    } catch (e) {
      problems.push(e instanceof Error ? e.message : String(e));
      continue;
    }
    if (!set.sheets.some((s) => s.id === item.figure.sheet)) problems.push(`plan set has no sheet "${item.figure.sheet}"`);
    for (const t of item.takeoffs) {
      const v = evalFormula(t.answer, set.facts);
      if (typeof v !== 'number' || !Number.isFinite(v)) problems.push(`takeoff ${t.cell}: ${t.answer} is not a number for ${JSON.stringify(variant)}`);
    }
  }
  return problems;
}
