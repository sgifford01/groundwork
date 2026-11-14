/**
 * Grading and helpers for the question types beyond the basic four:
 * error hunt, guided case, predict-then-check, estimate-first, ordering,
 * go/no-go and shortcut drills. No UI code in here.
 */
import type {
  CaseQItem,
  ErrorHuntItem,
  EstimateItem,
  GoNoGoItem,
  MistakeCategory,
  PredictItem,
  SheetSpec,
} from '../content/schema';
import { formatValue, parseTypedNumber, type CellValue } from '../engine/format';
import { seededRng, type Rng } from '../engine/rng';
import { renderTemplate, sampleRange, type VarValues } from '../engine/variables';
import { evalFormula, evalNumber, Workbook } from '../engine/workbook';
import {
  buildSheetData,
  gradeGrid,
  solutionAttempt,
  type GradeOptions,
  type GridAttempt,
  type GridGradeResult,
  type TargetResult,
} from './gridGrader';

// ---------------------------------------------------------------------------
// Sheet transforms
// ---------------------------------------------------------------------------

/** Every yellow cell becomes a locked formula: the finished model. */
export function solvedSheets(sheets: SheetSpec[]): SheetSpec[] {
  return sheets.map((sheet) => ({
    ...sheet,
    cells: Object.fromEntries(
      Object.entries(sheet.cells).map(([addr, c]) => [
        addr,
        c.kind === 'target'
          ? { kind: 'given' as const, formula: c.solution, format: c.format, bold: c.bold, border: c.border }
          : c,
      ]),
    ),
  }));
}

/** Give chosen yellow cells to the student as finished, locked formulas. */
export function prefillTargets(sheets: SheetSpec[], given: Set<string>): SheetSpec[] {
  return sheets.map((sheet) => ({
    ...sheet,
    cells: Object.fromEntries(
      Object.entries(sheet.cells).map(([addr, c]) => [
        addr,
        c.kind === 'target' && given.has(`${sheet.name}!${addr}`)
          ? { kind: 'given' as const, formula: c.solution, format: c.format, bold: c.bold, border: c.border }
          : c,
      ]),
    ),
  }));
}

/** Fresh numbers for the blue inputs that have an explicit range or list. */
export function randomizeSheets(sheets: SheetSpec[], rng: Rng): SheetSpec[] {
  return sheets.map((sheet) => ({
    ...sheet,
    cells: Object.fromEntries(
      Object.entries(sheet.cells).map(([addr, c]) => {
        if (c.kind !== 'input' || !c.vary) return [addr, c];
        if ('choices' in c.vary) {
          return [addr, { ...c, value: c.vary.choices[Math.floor(rng() * c.vary.choices.length)] }];
        }
        return [addr, { ...c, value: sampleRange(rng, c.vary.min, c.vary.max, c.vary.step) }];
      }),
    ),
  }));
}

// ---------------------------------------------------------------------------
// Error hunt
// ---------------------------------------------------------------------------

/** What the student is handed: the model solution everywhere, except the planted bugs. */
export function buggyAttempt(item: ErrorHuntItem): GridAttempt {
  const attempt = solutionAttempt(item.workbook.sheets);
  for (const bug of item.bugs) {
    const sheet = bug.sheet ?? item.workbook.sheets[0].name;
    attempt[sheet] = { ...attempt[sheet], ...bug.cells };
  }
  return attempt;
}

export interface BugResult {
  label: string;
  category: MistakeCategory;
  cells: string[];
  fixed: boolean;
}

export interface ErrorHuntResult {
  grid: GridGradeResult;
  bugs: BugResult[];
  /** Cells that were right when handed over and are wrong now. */
  broken: TargetResult[];
  score: number;
}

export function gradeErrorHunt(item: ErrorHuntItem, attempt: GridAttempt, opts: GradeOptions = {}): ErrorHuntResult {
  const grid = gradeGrid(
    { id: item.id, workbook: item.workbook, tolerance: item.tolerance, edgeCases: item.edgeCases, mistakes: [] },
    attempt,
    opts,
  );
  const first = item.workbook.sheets[0].name;
  const byKey = new Map(grid.targets.map((t) => [`${t.sheet}!${t.addr}`, t]));
  const bugCells = new Set<string>();
  const bugs: BugResult[] = item.bugs.map((bug) => {
    const sheet = bug.sheet ?? first;
    const cells = Object.keys(bug.cells);
    cells.forEach((c) => bugCells.add(`${sheet}!${c}`));
    return {
      label: bug.label,
      category: bug.category,
      cells,
      fixed: cells.every((c) => byKey.get(`${sheet}!${c}`)?.credit === 1),
    };
  });
  const broken = grid.targets.filter((t) => !bugCells.has(`${t.sheet}!${t.addr}`) && t.credit !== 1);
  const fixed = bugs.filter((b) => b.fixed).length;
  const score = Math.max(0, fixed - broken.length) / bugs.length;
  return { grid, bugs, broken, score };
}

// ---------------------------------------------------------------------------
// Guided case: worked example -> partly filled -> blank
// ---------------------------------------------------------------------------

export type CaseStage = 'worked' | 'partial' | 'blank';

export const CASE_STAGE_LABELS: Record<CaseStage, string> = {
  worked: 'Worked example',
  partial: 'Partly filled',
  blank: 'Blank sheet',
};

/** Scaffolding fades with experience: first time worked, second time half, then blank. */
export function caseStageFor(timesSeen: number): CaseStage {
  if (timesSeen <= 0) return 'worked';
  if (timesSeen === 1) return 'partial';
  return 'blank';
}

function stepCellKeys(item: CaseQItem, stepIdx: number): string[] {
  const step = item.steps[stepIdx];
  const sheet = step.sheet ?? item.workbook.sheets[0].name;
  return step.cells.map((c) => `${sheet}!${c}`);
}

/** Which steps the student does at each stage (the others are filled in for them). */
export function studentSteps(item: CaseQItem, stage: CaseStage): number[] {
  const all = item.steps.map((_, i) => i);
  if (stage === 'blank') return all;
  if (stage === 'worked') return [];
  return all.filter((i) => i % 2 === 1); // partly filled: every second step is theirs
}

export function caseSheets(item: CaseQItem, stage: CaseStage): SheetSpec[] {
  const mine = new Set(studentSteps(item, stage));
  const given = new Set<string>();
  item.steps.forEach((_, i) => {
    if (!mine.has(i)) stepCellKeys(item, i).forEach((k) => given.add(k));
  });
  return prefillTargets(item.workbook.sheets, given);
}

// ---------------------------------------------------------------------------
// Predict, then check
// ---------------------------------------------------------------------------

export type Direction = 'up' | 'down' | 'none';

export interface PredictTruth {
  sheets: SheetSpec[]; // with this attempt's input values
  shockedSheets: SheetSpec[];
  base: number;
  shocked: number;
  /** % change (measure 'pct') or change in the output's own units (measure 'abs'). */
  change: number;
  direction: Direction;
  inputBefore: number;
  inputAfter: number;
}

function readNumber(sheets: SheetSpec[], sheet: string, cell: string): number {
  const wb = new Workbook(buildSheetData(sheets, 'key'));
  try {
    const v = wb.get(sheet, cell);
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`Predict output ${sheet}!${cell} is not a number (${formatValue(v as CellValue)})`);
    }
    return v;
  } finally {
    wb.destroy();
  }
}

export function predictTruth(item: PredictItem, seed: number): PredictTruth {
  const first = item.workbook.sheets[0].name;
  const sheets = randomizeSheets(item.workbook.sheets, seededRng(item.id, seed));
  const shockSheet = item.shock.sheet ?? first;
  const cell = sheets.find((s) => s.name === shockSheet)?.cells[item.shock.cell];
  if (!cell || cell.kind !== 'input' || typeof cell.value !== 'number') {
    throw new Error(`${item.id}: shock cell ${shockSheet}!${item.shock.cell} must be a numeric input`);
  }
  const inputBefore = cell.value;
  const inputAfter =
    item.shock.set !== undefined
      ? item.shock.set
      : item.shock.mult !== undefined
        ? inputBefore * item.shock.mult
        : inputBefore + (item.shock.add ?? 0);
  const shockedSheets = sheets.map((s) =>
    s.name === shockSheet ? { ...s, cells: { ...s.cells, [item.shock.cell]: { ...cell, value: inputAfter } } } : s,
  );
  const outSheet = item.output.sheet ?? first;
  const base = readNumber(sheets, outSheet, item.output.cell);
  const shocked = readNumber(shockedSheets, outSheet, item.output.cell);
  const moved = Math.abs(shocked - base) > 1e-9 * Math.max(1, Math.abs(base));
  const change = item.measure === 'pct' ? (base === 0 ? 0 : shocked / base - 1) : shocked - base;
  return {
    sheets,
    shockedSheets,
    base,
    shocked,
    change,
    direction: !moved ? 'none' : shocked > base ? 'up' : 'down',
    inputBefore,
    inputAfter,
  };
}

export interface PredictGrade {
  directionRight: boolean;
  sizeRight: boolean;
  score: number;
}

/** `size` is the student's estimate of how big the change is, as a positive number. */
export function gradePredict(item: PredictItem, truth: PredictTruth, direction: Direction, size: number | null): PredictGrade {
  const directionRight = direction === truth.direction;
  if (truth.direction === 'none') return { directionRight, sizeRight: directionRight, score: directionRight ? 1 : 0 };
  const actual = Math.abs(truth.change);
  const sizeRight = directionRight && size !== null && Math.abs(Math.abs(size) - actual) <= item.band * actual;
  return { directionRight, sizeRight, score: (directionRight ? 0.5 : 0) + (sizeRight ? 0.5 : 0) };
}

// ---------------------------------------------------------------------------
// Estimate first
// ---------------------------------------------------------------------------

export interface EstimateGrade {
  expected: number;
  expectedText: string;
  ballparkValue: number | null;
  ballparkRight: boolean;
  exactValue: number | null;
  exactRight: boolean;
  score: number;
  message: string;
  category?: MistakeCategory;
}

const PERCENT = ['pct', 'pct1', 'pct2'];

function readTyped(item: EstimateItem, typed: string, expected: number): number | null {
  const p = parseTypedNumber(typed);
  if (!p) return null;
  // For percent answers "5.5" means 5.5%; pick whichever reading is closer.
  if (PERCENT.includes(item.format) && !p.hadPercent) {
    const asPercent = p.value / 100;
    return Math.abs(asPercent - expected) <= Math.abs(p.value - expected) ? asPercent : p.value;
  }
  return p.value;
}

export function gradeEstimate(item: EstimateItem, values: VarValues, ballparkTyped: string, exactTyped: string): EstimateGrade {
  const expected = evalNumber(item.answer, values);
  const expectedText = formatValue(expected, item.format);
  const ballparkValue = readTyped(item, ballparkTyped, expected);
  const exactValue = readTyped(item, exactTyped, expected);
  const within = (x: number | null, frac: number, abs = 0) =>
    x !== null && Math.abs(x - expected) <= Math.max(frac * Math.abs(expected), abs, 1e-9);
  const ballparkRight = within(ballparkValue, item.ballpark);
  const exactRight = within(exactValue, item.tolerance.pct ?? 0, item.tolerance.abs ?? 0);

  let message = '';
  let category: MistakeCategory | undefined;
  if (!exactRight && exactValue !== null) {
    for (const m of item.mistakes) {
      const v = evalFormula(m.formula, values);
      if (typeof v === 'number' && Math.abs(exactValue - v) <= Math.max(0.005 * Math.abs(v), 1e-9)) {
        message = renderTemplate(m.label, values, item.vars);
        category = m.category;
        break;
      }
    }
    if (!message) {
      message = 'Not a match, and not one of the usual slips.';
      category = 'arithmetic';
    }
  } else if (!exactRight) {
    message = 'No exact answer entered.';
    category = 'incomplete';
  } else if (!ballparkRight) {
    message = 'The exact answer is right, but the ballpark was off. The quick sanity check is the habit to build.';
    category = 'arithmetic';
  }
  return {
    expected,
    expectedText,
    ballparkValue,
    ballparkRight,
    exactValue,
    exactRight,
    score: (ballparkRight ? 0.4 : 0) + (exactRight ? 0.6 : 0),
    message,
    category,
  };
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/** Share of the lines that are in a correct relative order (longest common subsequence). */
export function orderScore(correct: string[], given: string[]): number {
  const n = correct.length;
  const m = given.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = correct[i - 1] === given[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return n === 0 ? 0 : dp[n][m] / n;
}

// ---------------------------------------------------------------------------
// Go / no-go
// ---------------------------------------------------------------------------

export interface GoNoGoTruth {
  metrics: { label: string; text: string }[];
  criteria: { label: string; pass: boolean; note: string }[];
  go: boolean;
}

export function goNoGoTruth(item: GoNoGoItem, values: VarValues): GoNoGoTruth {
  const metrics = item.metrics.map((m) => ({ label: m.label, text: formatValue(evalFormula(m.value, values), m.format) }));
  const criteria = item.criteria.map((c) => {
    const v = evalFormula(c.pass, values);
    if (typeof v !== 'boolean') throw new Error(`${item.id}: criterion "${c.label}" must evaluate to TRUE or FALSE`);
    return { label: c.label, pass: v, note: renderTemplate(c.note, values, item.vars) };
  });
  return { metrics, criteria, go: criteria.every((c) => c.pass) };
}

/** Half the credit is for the call, half for judging each test correctly. */
export function gradeGoNoGo(truth: GoNoGoTruth, call: boolean, marks: boolean[]): number {
  const right = truth.criteria.filter((c, i) => marks[i] === c.pass).length;
  return (call === truth.go ? 0.5 : 0) + 0.5 * (right / truth.criteria.length);
}

// ---------------------------------------------------------------------------
// Shortcut drills
// ---------------------------------------------------------------------------

export interface Combo {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  /** lower-case key name: "r", "f2", "=", "enter", "up" ... */
  key: string;
}

const KEY_CODES: Record<string, string> = {
  '=': 'Equal',
  '-': 'Minus',
  '`': 'Backquote',
  ';': 'Semicolon',
  "'": 'Quote',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  space: 'Space',
  enter: 'Enter',
  tab: 'Tab',
  esc: 'Escape',
  delete: 'Delete',
  backspace: 'Backspace',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

export function isSequence(text: string): boolean {
  return text.includes(',') && !/\+,$/.test(text);
}

/** "Cmd+Shift+L" -> { meta, shift, key: "l" }. Sequences ("Alt,H,O,I") return null. */
export function parseCombo(text: string): Combo | null {
  if (isSequence(text)) return null;
  const parts = text.split('+').map((p) => p.trim());
  // "Ctrl++" style: a trailing empty part means the "+" key itself
  const keyPart = parts[parts.length - 1] === '' ? '+' : parts[parts.length - 1];
  const mods = parts.slice(0, parts[parts.length - 1] === '' ? -2 : -1).map((m) => m.toLowerCase());
  return {
    ctrl: mods.includes('ctrl') || mods.includes('control'),
    meta: mods.includes('cmd') || mods.includes('command') || mods.includes('win'),
    alt: mods.includes('alt') || mods.includes('option') || mods.includes('opt'),
    shift: mods.includes('shift'),
    key: keyPart.toLowerCase(),
  };
}

export function codeFor(key: string): string | null {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  if (/^f([1-9]|1[0-2])$/.test(key)) return key.toUpperCase();
  return KEY_CODES[key] ?? null;
}

export interface KeyPress {
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function matchesCombo(e: KeyPress, combo: Combo): boolean {
  return (
    e.code === codeFor(combo.key) &&
    e.ctrlKey === combo.ctrl &&
    e.metaKey === combo.meta &&
    e.altKey === combo.alt &&
    e.shiftKey === combo.shift
  );
}

/** Combos a web page can never receive because the browser or the system takes them first. */
const RESERVED: Record<'mac' | 'win', string[]> = {
  mac: ['cmd+t', 'cmd+w', 'cmd+n', 'cmd+q', 'cmd+tab', 'cmd+space', 'cmd+h', 'cmd+m', 'cmd+shift+t', 'cmd+shift+n', 'ctrl+up', 'ctrl+down', 'ctrl+left', 'ctrl+right'],
  win: ['ctrl+t', 'ctrl+w', 'ctrl+n', 'ctrl+shift+t', 'ctrl+shift+n', 'ctrl+tab', 'ctrl+pageup', 'ctrl+pagedown', 'alt+f4', 'alt+tab', 'f11', 'ctrl+f4'],
};

/** Can the drill listen for the real key press, or must it fall back to multiple choice? */
export function isCapturable(text: string, os: 'mac' | 'win'): boolean {
  const combo = parseCombo(text);
  if (!combo || codeFor(combo.key) === null) return false;
  const norm = text.toLowerCase().replace(/\s+/g, '').replace('command', 'cmd').replace('control', 'ctrl');
  return !RESERVED[os].includes(norm);
}

