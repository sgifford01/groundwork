/**
 * GRID GRADER
 *
 * Grades a filled-in sheet by behaviour, never by comparing formula text:
 *
 *   1. Value check      - does each yellow cell match the answer key (within tolerance)?
 *   2. Hardcode check   - is it a typed number, or a formula made only of typed numbers?
 *   3. Perturbation     - change the blue inputs (all together, then one at a time),
 *                         recalculate both the student's sheet and the key, and
 *                         confirm the student's cells still match.
 *   4. Diagnosis        - a one-line explanation of what went wrong.
 *
 * Each cell is also tested "in isolation" (the student's formula dropped into an
 * otherwise-correct sheet) so one early mistake doesn't mark every later cell wrong.
 *
 * The same function grades in-app work and uploaded .xlsx files.
 */
import type { RawCellContent } from 'hyperformula';
import {
  formatValue,
  isCellError,
  type CellValue,
  type NumFormat,
  type Scalar,
} from '../engine/format';
import {
  findRefs,
  normalizeFormula,
  parseA1,
  refText,
  shiftFormula,
  toA1,
  withAnchors,
  type CellPos,
} from '../engine/refs';
import { seededRng, type Rng } from '../engine/rng';
import { roundTo, sampleRange } from '../engine/variables';
import { Workbook, unsupportedFunctionIn, type SheetData } from '../engine/workbook';
import type {
  GridItem,
  GridMistakeSpec,
  MistakeCategory,
  SheetSpec,
  TargetSpec,
  Tolerance,
  Vary,
} from '../content/schema';

/** What the student typed: sheet name -> cell -> raw text ("=B3*B4", "1200", ...). */
export type GridAttempt = Record<string, Record<string, string>>;

export type TargetStatus = 'correct' | 'upstream' | 'wrong' | 'empty';

export interface TargetResult {
  sheet: string;
  addr: string;
  /** "B7", or "Sheet!B7" when the workbook has several sheets. */
  id: string;
  status: TargetStatus;
  credit: number;
  studentRaw: string;
  studentValue: CellValue;
  keyValue: CellValue;
  modelFormula: string;
  format: NumFormat;
  checks: {
    value: boolean; // matches the key with today's inputs
    formula: boolean; // is a real formula (not a typed number)
    perturbation: boolean; // still matches after inputs change
  };
  message: string;
  category?: MistakeCategory;
}

export interface GridGradeResult {
  targets: TargetResult[];
  score: number; // 0..1
  passed: boolean;
  scenarioCount: number;
  /** Most common mistake category among wrong cells, if any. */
  mainCategory?: MistakeCategory;
}

export const DEFAULT_TOLERANCE: Tolerance = { pct: 0.001 };

// ---------------------------------------------------------------------------
// Building engine sheets from a spec
// ---------------------------------------------------------------------------

function textLiteral(s: string): string {
  // A leading apostrophe forces text, so a label like "2027" or "5%" stays a label.
  return `'${s}`;
}

function inputRaw(v: Scalar): RawCellContent {
  return typeof v === 'string' ? textLiteral(v) : v;
}

export function isLocked(sheet: SheetSpec, addr: string): boolean {
  const c = sheet.cells[addr];
  return c !== undefined && c.kind !== 'target';
}

/**
 * mode 'key'     - every target holds its model solution
 * mode 'student' - targets and scratch cells hold what the student typed
 * mode 'iso'     - targets hold the model solution, plus the student's scratch cells
 */
export function buildSheetData(
  sheets: SheetSpec[],
  mode: 'key' | 'student' | 'iso',
  attempt: GridAttempt = {},
): SheetData[] {
  return sheets.map((sheet) => {
    const cells: Record<string, RawCellContent> = {};
    for (const [addr, c] of Object.entries(sheet.cells)) {
      if (c.kind === 'label') cells[addr] = textLiteral(c.text);
      else if (c.kind === 'input') cells[addr] = inputRaw(c.value);
      else if (c.kind === 'given') cells[addr] = c.formula;
      else cells[addr] = mode === 'student' ? (attempt[sheet.name]?.[addr] ?? null) || null : c.solution;
    }
    if (mode !== 'key') {
      for (const [addr, raw] of Object.entries(attempt[sheet.name] ?? {})) {
        if (!(addr in sheet.cells) && raw !== '') cells[addr] = raw;
      }
    }
    return { name: sheet.name, cells };
  });
}

// ---------------------------------------------------------------------------
// Targets, inputs, scenarios
// ---------------------------------------------------------------------------

interface TargetRef {
  sheet: string;
  addr: string;
  id: string;
  pos: CellPos;
  spec: TargetSpec;
}

interface InputRef {
  sheet: string;
  addr: string;
  base: Scalar;
  vary: Vary | undefined;
  label: string;
  /** False for inputs the random perturbation leaves alone (text, zeros, vary: false). */
  random: boolean;
}

function cellId(sheets: SheetSpec[], sheet: string, addr: string): string {
  return sheets.length > 1 ? `${sheet}!${addr}` : addr;
}

export function collectTargets(sheets: SheetSpec[]): TargetRef[] {
  const out: TargetRef[] = [];
  for (const sheet of sheets) {
    for (const [addr, c] of Object.entries(sheet.cells)) {
      if (c.kind === 'target') {
        out.push({ sheet: sheet.name, addr, id: cellId(sheets, sheet.name, addr), pos: parseA1(addr), spec: c });
      }
    }
  }
  return out.sort((a, b) =>
    a.sheet !== b.sheet ? a.sheet.localeCompare(b.sheet) : a.pos.row - b.pos.row || a.pos.col - b.pos.col,
  );
}

/** Find a human name for a cell: the nearest label to its left, else the header above it. */
export function describeCell(sheet: SheetSpec, addr: string): string {
  const p = parseA1(addr);
  let rowLabel = '';
  for (let c = p.col - 1; c >= 0; c--) {
    const cell = sheet.cells[toA1({ col: c, row: p.row })];
    if (cell?.kind === 'label' && cell.text.trim()) {
      rowLabel = cell.text.trim();
      break;
    }
  }
  let colLabel = '';
  if (p.col > 1 || !rowLabel) {
    for (let r = p.row - 1; r >= 0; r--) {
      const cell = sheet.cells[toA1({ col: p.col, row: r })];
      if (cell?.kind === 'label' && cell.style === 'header' && cell.text.trim()) {
        colLabel = cell.text.trim();
        break;
      }
    }
  }
  const name = rowLabel && colLabel ? `${rowLabel}, ${colLabel}` : rowLabel || colLabel;
  return name ? `${name} (${addr})` : addr;
}

function collectInputs(sheets: SheetSpec[]): InputRef[] {
  const out: InputRef[] = [];
  for (const sheet of sheets) {
    for (const [addr, c] of Object.entries(sheet.cells)) {
      if (c.kind !== 'input') continue;
      const random = c.vary !== false && !(c.vary === undefined && (typeof c.value !== 'number' || c.value === 0));
      out.push({ sheet: sheet.name, addr, base: c.value, vary: c.vary, label: describeCell(sheet, addr), random });
    }
  }
  return out;
}

function perturb(input: InputRef, rng: Rng): Scalar {
  const { base, vary } = input;
  if (vary && typeof vary === 'object' && 'choices' in vary) {
    const others = vary.choices.filter((c) => c !== base);
    return others.length ? others[Math.floor(rng() * others.length)] : base;
  }
  if (vary && typeof vary === 'object') {
    for (let i = 0; i < 25; i++) {
      const v = sampleRange(rng, vary.min, vary.max, vary.step);
      if (v !== base) return v;
    }
    return base;
  }
  // Automatic: move a number by roughly -30%..+40%, keeping whole numbers whole.
  const n = base as number;
  for (let i = 0; i < 25; i++) {
    const factor = 0.7 + rng() * 0.7;
    if (Math.abs(factor - 1) < 0.08) continue;
    const v = Number.isInteger(n) ? Math.round(n * factor) : Number((n * factor).toPrecision(6));
    if (v !== n) return v;
  }
  return Number.isInteger(n) ? n + 1 : roundTo(n * 1.25, 8);
}

interface Scenario {
  kind: 'base' | 'all' | 'one';
  /** input index -> value (inputs not listed keep their base value) */
  values: Map<number, Scalar>;
  inputIdx?: number;
}

const ALL_INPUT_SCENARIOS = 4;
const MAX_SINGLE_INPUT_SCENARIOS = 24;

type EdgeCases = Record<string, Scalar>[];

function makeScenarios(inputs: InputRef[], rng: Rng, edgeCases: EdgeCases, firstSheet: string): Scenario[] {
  const out: Scenario[] = [{ kind: 'base', values: new Map() }];
  for (const edge of edgeCases) {
    const values = new Map<number, Scalar>();
    for (const [key, value] of Object.entries(edge)) {
      const [sheet, addr] = key.includes('!') ? key.split('!') : [firstSheet, key];
      const i = inputs.findIndex((inp) => inp.sheet === sheet && inp.addr === addr);
      if (i < 0) throw new Error(`edgeCases: ${key} is not an input cell`);
      values.set(i, value);
    }
    out.push({ kind: 'all', values });
  }
  const randomIdxs = inputs.map((_, i) => i).filter((i) => inputs[i].random);
  if (randomIdxs.length === 0) return out;
  for (let k = 0; k < ALL_INPUT_SCENARIOS; k++) {
    const values = new Map<number, Scalar>();
    randomIdxs.forEach((i) => values.set(i, perturb(inputs[i], rng)));
    out.push({ kind: 'all', values });
  }
  const idxs = [...randomIdxs];
  // If there are a lot of inputs, test a random subset one at a time.
  while (idxs.length > MAX_SINGLE_INPUT_SCENARIOS) idxs.splice(Math.floor(rng() * idxs.length), 1);
  for (const i of idxs) {
    out.push({ kind: 'one', values: new Map([[i, perturb(inputs[i], rng)]]), inputIdx: i });
  }
  return out;
}

function applyScenario(wb: Workbook, inputs: InputRef[], sc: Scenario): void {
  wb.batch(() => {
    inputs.forEach((inp, i) => {
      wb.set(inp.sheet, inp.addr, inputRaw(sc.values.has(i) ? (sc.values.get(i) as Scalar) : inp.base));
    });
  });
}

// ---------------------------------------------------------------------------
// Comparing values
// ---------------------------------------------------------------------------

export function valuesMatch(student: CellValue, key: CellValue, tol: Tolerance): boolean {
  if (isCellError(key)) return isCellError(student) && student.error === key.error;
  if (typeof key === 'number') {
    if (typeof student !== 'number' || !Number.isFinite(student)) return false;
    const allowed = Math.max(tol.abs ?? 0, (tol.pct ?? 0) * Math.abs(key), 1e-9);
    return Math.abs(student - key) <= allowed;
  }
  if (typeof key === 'string') {
    return typeof student === 'string' && student.trim().toLowerCase() === key.trim().toLowerCase();
  }
  if (typeof key === 'boolean') return student === key;
  return student === null || student === '';
}

function same(a: CellValue, b: CellValue): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (isCellError(a) || isCellError(b)) return isCellError(a) && isCellError(b) && a.error === b.error;
  return a === b;
}

function scaled(v: CellValue, k: number): CellValue {
  return typeof v === 'number' ? v * k : v;
}

export const ERROR_HELP: Record<string, string> = {
  DIV_BY_ZERO: 'This divides by zero (#DIV/0!). Check which cell is in the denominator.',
  NAME: "Excel doesn't recognise a name in this formula (#NAME?). Check the function spelling.",
  REF: 'This points at a cell that does not exist (#REF!).',
  CYCLE: 'This formula refers back to itself (a circular reference).',
  VALUE: 'This mixes text and numbers, or passes a range where one cell is expected (#VALUE!).',
  NA: "The lookup didn't find a match (#N/A). Check the lookup value and the lookup range.",
  NUM: 'The result is not a valid number (#NUM!). Check the signs and sizes of the arguments.',
  ERROR: "This isn't a complete formula. Check the parentheses, commas and quotes.",
};

function numericLiterals(formula: string): number[] {
  const refs = findRefs(formula);
  let stripped = '';
  let last = 0;
  for (const r of refs) {
    stripped += formula.slice(last, r.start) + ' ';
    last = r.end;
  }
  stripped += formula.slice(last);
  stripped = stripped.replace(/"[^"]*"/g, ' ');
  const out: number[] = [];
  for (const m of stripped.matchAll(/(?<![A-Za-z_.\d])(\d+\.?\d*|\.\d+)(%?)/g)) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n)) out.push(m[2] ? n / 100 : n);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The grader
// ---------------------------------------------------------------------------

export interface GradeOptions {
  /** Changes which random input sets are used. Any number works. */
  seed?: number;
}

export type Gradeable = Pick<GridItem, 'id' | 'workbook' | 'tolerance' | 'mistakes' | 'edgeCases'>;

export function gradeGrid(item: Gradeable, attempt: GridAttempt, opts: GradeOptions = {}): GridGradeResult {
  const sheets = item.workbook.sheets;
  const targets = collectTargets(sheets);
  const inputs = collectInputs(sheets);
  const rng = seededRng(item.id, opts.seed ?? 1);
  const scenarios = makeScenarios(inputs, rng, item.edgeCases ?? [], sheets[0].name);

  const tolOf = (t: TargetRef): Tolerance =>
    t.spec.tolerance ?? (t.spec.format === 'date' ? { abs: 0.5 } : (item.tolerance ?? DEFAULT_TOLERANCE));
  const rawOf = (t: TargetRef): string => (attempt[t.sheet]?.[t.addr] ?? '').trim();
  const raws = targets.map(rawOf);

  const key = new Workbook(buildSheetData(sheets, 'key'));
  const stu = new Workbook(buildSheetData(sheets, 'student', attempt));
  const iso = new Workbook(buildSheetData(sheets, 'iso', attempt));

  try {
    // values[scenario][target]
    const keyVals: CellValue[][] = [];
    const stuVals: CellValue[][] = [];
    const isoVals: CellValue[][] = [];

    const isoAt = (t: TargetRef, raw: string): CellValue => {
      iso.set(t.sheet, t.addr, raw === '' ? null : raw);
      const v = iso.get(t.sheet, t.addr);
      iso.set(t.sheet, t.addr, t.spec.solution);
      return v;
    };

    for (const sc of scenarios) {
      applyScenario(key, inputs, sc);
      applyScenario(stu, inputs, sc);
      applyScenario(iso, inputs, sc);
      keyVals.push(targets.map((t) => key.get(t.sheet, t.addr)));
      stuVals.push(targets.map((t) => stu.get(t.sheet, t.addr)));
      isoVals.push(targets.map((t, i) => isoAt(t, raws[i])));
    }

    /** Evaluate any candidate formula at one target, in isolation, in every scenario. */
    const evalIsolated = (ti: number, formula: string, only?: number[]): CellValue[] => {
      const t = targets[ti];
      const idxs = only ?? scenarios.map((_, i) => i);
      return idxs.map((si) => {
        applyScenario(iso, inputs, scenarios[si]);
        return isoAt(t, formula);
      });
    };

    const column = (vals: CellValue[][], ti: number): CellValue[] => vals.map((row) => row[ti]);
    const allMatch = (a: CellValue[], b: CellValue[], tol: Tolerance): boolean =>
      a.every((v, i) => valuesMatch(v, b[i], tol));
    const differsSomewhere = (a: CellValue[], b: CellValue[], tol: Tolerance): boolean =>
      a.some((v, i) => !valuesMatch(v, b[i], tol));

    // Put the student sheet back on base inputs for the hardcode check.
    applyScenario(stu, inputs, scenarios[0]);

    // ---- pass 1: status of every target ----------------------------------
    const integrated = targets.map((t, ti) => allMatch(column(stuVals, ti), column(keyVals, ti), tolOf(t)));
    const isolated = targets.map((t, ti) => allMatch(column(isoVals, ti), column(keyVals, ti), tolOf(t)));
    const typedConstant = targets.map((_, ti) => raws[ti] !== '' && !raws[ti].startsWith('='));
    const constantFormula = targets.map(
      (t, ti) =>
        raws[ti].startsWith('=') &&
        !isCellError(stuVals[0][ti]) && // a broken formula is an error, not a hardcode
        !stu.hasPrecedents(t.sheet, t.addr),
    );
    const hardcoded = targets.map((_, ti) => typedConstant[ti] || constantFormula[ti]);
    const okFormula = targets.map((_, ti) => !hardcoded[ti] && raws[ti] !== '' && (integrated[ti] || isolated[ti]));

    // ---- diagnosis helpers -----------------------------------------------
    type Diagnosis = { message: string; category: MistakeCategory };

    const declaredMistake = (ti: number): Diagnosis | null => {
      const t = targets[ti];
      const mine = column(isoVals, ti);
      for (const m of item.mistakes as GridMistakeSpec[]) {
        if ((m.sheet ?? sheets[0].name) !== t.sheet) continue;
        const wrong = m.cells[t.addr];
        if (!wrong) continue;
        const theirs = evalIsolated(ti, wrong);
        // A fingerprint must match exactly, in every scenario. (Using the grading
        // tolerance here would confuse mistakes that land close to each other.)
        if (mine.every((v, i) => same(v, theirs[i]))) return { message: m.label, category: m.category };
      }
      return null;
    };

    /** Which axes of a reference (or range) to flip between relative and absolute. */
    type Toggle = { col: boolean; row: boolean };
    const fixCache = new Map<number, Map<number, Toggle>[]>();

    /**
     * Was this wrong cell filled from a correct cell? If so, search for the
     * smallest change of $ anchors in the source that would make it right here.
     * This finds anchoring mistakes by testing repairs, not by reading text.
     */
    /**
     * True when the target sits on the same row or column as the source and every
     * cell between them holds the same formula shifted along: a real fill-right or fill-down.
     */
    const isContiguousFill = (s: TargetRef, t: TargetRef, rawS: string): boolean => {
      const dCol = t.pos.col - s.pos.col;
      const dRow = t.pos.row - s.pos.row;
      if (dCol !== 0 && dRow !== 0) return false;
      const steps = Math.abs(dCol) + Math.abs(dRow);
      const stepCol = Math.sign(dCol);
      const stepRow = Math.sign(dRow);
      for (let k = 1; k < steps; k++) {
        const addr = toA1({ col: s.pos.col + stepCol * k, row: s.pos.row + stepRow * k });
        const between = (attempt[t.sheet]?.[addr] ?? '').trim();
        if (normalizeFormula(between) !== normalizeFormula(shiftFormula(rawS, stepCol * k, stepRow * k))) return false;
      }
      return true;
    };

    const fillAnchoring = (ti: number, mode: 'fill' | 'any'): Diagnosis | null => {
      const t = targets[ti];
      const rawT = raws[ti];
      if (!rawT.startsWith('=')) return null;
      const normT = normalizeFormula(rawT);
      const keyCol = column(keyVals, ti);
      const tol = tolOf(t);
      const quick = scenarios.length > 2 ? [0, 1] : undefined;
      const dist = (s: TargetRef) => Math.abs(s.pos.col - t.pos.col) + Math.abs(s.pos.row - t.pos.row);

      const sources = targets
        .map((s, si) => ({ s, si }))
        .filter(({ s, si }) => si !== ti && s.sheet === t.sheet && okFormula[si] && raws[si].startsWith('='))
        .sort((a, b) => dist(a.s) - dist(b.s));

      for (const { s, si } of sources) {
        const dCol = t.pos.col - s.pos.col;
        const dRow = t.pos.row - s.pos.row;
        const rawS = raws[si];
        if (normalizeFormula(shiftFormula(rawS, dCol, dRow)) !== normT) continue;
        if (mode === 'fill' && !isContiguousFill(s, t, rawS)) continue;
        const refs = findRefs(rawS);

        // A range such as A4:A7 is re-anchored as one unit.
        const units: number[][] = [];
        refs.forEach((r, i) => {
          const prev = refs[i - 1];
          if (prev && rawS.slice(prev.end, r.start) === ':') units[units.length - 1].push(i);
          else units.push([i]);
        });
        if (units.length === 0 || units.length > 8) continue;

        const toggles: Toggle[] = [];
        if (dCol !== 0) toggles.push({ col: true, row: false });
        if (dRow !== 0) toggles.push({ col: false, row: true });
        if (dCol !== 0 && dRow !== 0) toggles.push({ col: true, row: true });

        const variants: Map<number, Toggle>[] = [...(fixCache.get(si) ?? [])];
        const n = units.length;
        for (let i = 0; i < n; i++) for (const a of toggles) variants.push(new Map([[i, a]]));
        for (let i = 0; i < n; i++)
          for (let j = i + 1; j < n; j++)
            for (const a of toggles) for (const b of toggles) variants.push(new Map([[i, a], [j, b]]));
        if (n <= 4) {
          for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++)
              for (let k = j + 1; k < n; k++)
                for (const a of toggles)
                  for (const b of toggles)
                    for (const c of toggles) variants.push(new Map([[i, a], [j, b], [k, c]]));
        }

        const anchorsFor = (variant: Map<number, Toggle>) => {
          const changes = new Map<number, { colAbs: boolean; rowAbs: boolean }>();
          for (const [u, tg] of variant) {
            for (const i of units[u]) {
              const r = refs[i];
              changes.set(i, { colAbs: tg.col ? !r.colAbs : r.colAbs, rowAbs: tg.row ? !r.rowAbs : r.rowAbs });
            }
          }
          return changes;
        };

        for (const variant of variants.slice(0, 400)) {
          const changes = anchorsFor(variant);
          const candidate = shiftFormula(withAnchors(rawS, changes), dCol, dRow);
          if (quick && !allMatch(evalIsolated(ti, candidate, quick), quick.map((q) => keyCol[q]), tol)) continue;
          if (!allMatch(evalIsolated(ti, candidate), keyCol, tol)) continue;

          fixCache.set(si, [variant]);
          const dir =
            dRow === 0 ? (dCol > 0 ? 'right' : 'left') : dCol === 0 ? (dRow > 0 ? 'down' : 'up') : 'across the table';
          const parts = [...variant.entries()].map(([u, tg]) => {
            const idxs = units[u];
            const before = idxs.map((i) => refs[i].text).join(':');
            const after = idxs
              .map((i) => {
                const a = changes.get(i)!;
                return refText(refs[i].col, refs[i].row, a.colAbs, a.rowAbs);
              })
              .join(':');
            return { before, after, r: refs[idxs[0]], tg };
          });

          if (parts.length === 1) {
            const { before, after, r, tg } = parts[0];
            const drifted = shiftFormula(`=${before}`, dCol, dRow).slice(1);
            const addedCol = tg.col && !r.colAbs;
            const addedRow = tg.row && !r.rowAbs;
            const removedCol = tg.col && r.colAbs;
            const removedRow = tg.row && r.rowAbs;
            if ((addedCol && removedRow) || (addedRow && removedCol)) {
              const wrongAxis = removedRow ? 'row' : 'column';
              const rightAxis = removedRow ? 'column' : 'row';
              return {
                category: 'reference',
                message: `You anchored the ${wrongAxis} instead of the ${rightAxis}: ${before} should be ${after}.`,
              };
            }
            if (addedCol || addedRow) {
              // e.g. filled right with B$3: the row is locked but the column still moved.
              const lockedWrongAxis = (addedCol && !addedRow && r.rowAbs) || (addedRow && !addedCol && r.colAbs);
              if (lockedWrongAxis) {
                const wrongAxis = r.rowAbs ? 'row' : 'column';
                const rightAxis = r.rowAbs ? 'column' : 'row';
                return {
                  category: 'reference',
                  message: `You anchored the ${wrongAxis} instead of the ${rightAxis}: ${before} drifted to ${drifted} when filled ${dir}. Use ${after}.`,
                };
              }
              return {
                category: 'reference',
                message: `${before} drifted to ${drifted} when ${s.addr} was filled ${dir}. Lock it with F4: write ${after} in ${s.addr}, then fill again.`,
              };
            }
            return {
              category: 'reference',
              message: `${before} is locked with $, so this cell still reads the same cells as ${s.addr}. Use ${after} so it moves when filled ${dir}.`,
            };
          }
          const list = parts.map((p) => `${p.before} → ${p.after}`).join(', ');
          return {
            category: 'reference',
            message: `Fix the $ anchors in ${s.addr} (${list}), then fill ${dir} again.`,
          };
        }
      }
      return null;
    };

    const genericFingerprint = (ti: number): Diagnosis | null => {
      const t = targets[ti];
      const tol = tolOf(t);
      const mine = column(isoVals, ti);
      const keyCol = column(keyVals, ti);
      if (!keyCol.some((v) => typeof v === 'number' && Math.abs(v) > 1e-9)) return null;
      const is = (k: number) => allMatch(mine, keyCol.map((v) => scaled(v, k)), tol);
      if (is(-1)) return { category: 'sign', message: 'Right size, wrong sign. Flip the positive/negative.' };
      if (is(100)) return { category: 'units', message: 'This is 100 times too big. Check percent vs. decimal.' };
      if (is(0.01)) return { category: 'units', message: 'This is 100 times too small. Check percent vs. decimal.' };
      if (is(12)) return { category: 'units', message: 'This is 12 times too big. Check monthly vs. annual.' };
      if (is(1 / 12)) return { category: 'units', message: 'This is 12 times too small. Check monthly vs. annual.' };

      // Does it match the neighbouring period's answer instead?
      const neighbours: { ni: number; where: string }[] = [];
      targets.forEach((n, ni) => {
        if (ni === ti || n.sheet !== t.sheet) return;
        if (n.pos.row === t.pos.row && Math.abs(n.pos.col - t.pos.col) === 1) {
          neighbours.push({ ni, where: n.pos.col < t.pos.col ? 'previous column' : 'next column' });
        } else if (n.pos.col === t.pos.col && Math.abs(n.pos.row - t.pos.row) === 1) {
          neighbours.push({ ni, where: n.pos.row < t.pos.row ? 'row above' : 'row below' });
        }
      });
      for (const { ni, where } of neighbours) {
        const theirs = column(keyVals, ni);
        if (differsSomewhere(theirs, keyCol, tol) && allMatch(mine, theirs, tol)) {
          return {
            category: 'timing',
            message: `This gives the answer for the ${where} (${targets[ni].addr}). You are off by one period or row.`,
          };
        }
      }
      return null;
    };

    /** Fine today, but returns an error once the inputs move (e.g. a divide-by-zero). */
    const errorWhenInputsChange = (ti: number): Diagnosis | null => {
      for (let si = 1; si < scenarios.length; si++) {
        const mine = isoVals[si][ti];
        if (isCellError(mine) && !isCellError(keyVals[si][ti])) {
          return {
            category: 'function',
            message: `Works with today's inputs but returns ${mine.error} when they change. Guard it (for example with IFERROR) or check the ranges.`,
          };
        }
      }
      return null;
    };

    const sensitivity = (ti: number): Diagnosis | null => {
      const t = targets[ti];
      const tol = tolOf(t);
      const raw = raws[ti];
      const ignored: InputRef[] = [];
      const extra: InputRef[] = [];
      const wrongAmount: InputRef[] = [];
      scenarios.forEach((sc, si) => {
        if (sc.kind !== 'one' || sc.inputIdx === undefined) return;
        const inp = inputs[sc.inputIdx];
        const keyMoved = !same(keyVals[si][ti], keyVals[0][ti]);
        const mineMoved = !same(isoVals[si][ti], isoVals[0][ti]);
        if (keyMoved && !mineMoved) ignored.push(inp);
        else if (!keyMoved && mineMoved) extra.push(inp);
        else if (keyMoved && mineMoved && !valuesMatch(isoVals[si][ti], keyVals[si][ti], tol)) wrongAmount.push(inp);
      });

      if (ignored.length) {
        const inp = ignored[0];
        const literals = numericLiterals(raw);
        const typed = typeof inp.base === 'number' && literals.some((n) => same(n, inp.base));
        if (typed) {
          return {
            category: 'hardcode',
            message: `${formatValue(inp.base)} is typed into the formula. Link to ${inp.label} instead so it updates.`,
          };
        }
        return {
          category: 'reference',
          message: `Doesn't change when ${inp.label} changes. That input is missing, or the formula points at the wrong cell.`,
        };
      }
      if (extra.length) {
        return {
          category: 'reference',
          message: `Changes when ${extra[0].label} changes, but this line shouldn't depend on it.`,
        };
      }
      if (wrongAmount.length) {
        return {
          category: 'arithmetic',
          message: `Reacts to ${wrongAmount[0].label}, but by the wrong amount. Check how that input enters the formula.`,
        };
      }
      return null;
    };

    // ---- pass 2: build results ---------------------------------------------
    const results: TargetResult[] = targets.map((t, ti): TargetResult => {
      const raw = raws[ti];
      const tol = tolOf(t);
      const format: NumFormat = t.spec.format ?? 'general';
      const keyValue = keyVals[0][ti];
      const studentValue = stuVals[0][ti];
      const valueOk = raw !== '' && valuesMatch(studentValue, keyValue, tol);
      const baseResult = {
        sheet: t.sheet,
        addr: t.addr,
        id: t.id,
        studentRaw: raw,
        studentValue,
        keyValue,
        modelFormula: t.spec.solution,
        format,
      };

      if (raw === '') {
        return {
          ...baseResult,
          status: 'empty',
          credit: 0,
          checks: { value: false, formula: false, perturbation: false },
          message: 'Nothing entered yet.',
          category: 'incomplete',
        };
      }

      if (hardcoded[ti]) {
        const message = typedConstant[ti]
          ? valueOk
            ? "Right number, but it's typed in. Use a formula so it updates when the inputs change."
            : 'This is a typed number, and not the right one. Build it with a formula that links to the inputs.'
          : 'This formula only contains typed numbers. Link to the input cells instead.';
        return {
          ...baseResult,
          status: 'wrong',
          credit: 0,
          checks: { value: valueOk, formula: false, perturbation: integrated[ti] },
          message,
          category: 'hardcode',
        };
      }

      if (integrated[ti]) {
        return {
          ...baseResult,
          status: 'correct',
          credit: 1,
          checks: { value: true, formula: true, perturbation: true },
          message: '',
        };
      }

      if (isolated[ti]) {
        return {
          ...baseResult,
          status: 'upstream',
          credit: 1,
          checks: { value: valueOk, formula: true, perturbation: true },
          message: 'Your formula is right. The value is off only because a cell it depends on is wrong.',
        };
      }

      // Wrong: work out why. Most specific and best-proven explanations first.
      const isoBase = isoVals[0][ti];
      const shown = isCellError(studentValue) ? studentValue : isCellError(isoBase) ? isoBase : null;
      const unsupported = shown ? unsupportedFunctionIn(raw) : null;
      const errorHelp = (): Diagnosis | null =>
        shown ? { category: 'function', message: ERROR_HELP[shown.type] ?? `The formula returns ${shown.error}.` } : null;
      let diag: Diagnosis | null = unsupported
        ? {
            category: 'function',
            message: `This app can't evaluate ${unsupported}(), so this cell can't be graded here. Try an equivalent without ${unsupported}.`,
          }
        : null;
      diag =
        diag ??
        fillAnchoring(ti, 'fill') ?? // a real fill-right/fill-down, proven by the $ change that repairs it
        errorHelp() ??
        declaredMistake(ti) ??
        fillAnchoring(ti, 'any') ?? // a formula copied from elsewhere (e.g. across a two-way table)
        genericFingerprint(ti) ??
        errorWhenInputsChange(ti) ??
        sensitivity(ti);
      if (!diag) {
        const isoOkAtBase = valuesMatch(isoBase, keyValue, tol);
        diag = isoOkAtBase
          ? {
              category: 'reference',
              message: "Matches with today's inputs but breaks when they change. Look for a typed number or a wrong link.",
            }
          : {
              category: 'arithmetic',
              message: `Expected about ${formatValue(keyValue, format)}; your formula gives ${formatValue(isoBase, format)}.`,
            };
      }
      return {
        ...baseResult,
        status: 'wrong',
        credit: 0,
        checks: {
          value: valueOk,
          formula: true,
          perturbation: false,
        },
        message: diag.message,
        category: diag.category,
      };
    });

    const score = results.length ? results.reduce((s, r) => s + r.credit, 0) / results.length : 0;
    const counts = new Map<MistakeCategory, number>();
    for (const r of results) {
      if ((r.status === 'wrong' || r.status === 'empty') && r.category) {
        counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
      }
    }
    // Prefer a real mistake type over "left blank" when both are present.
    const ranked = [...counts.entries()].sort(
      (a, b) => Number(a[0] === 'incomplete') - Number(b[0] === 'incomplete') || b[1] - a[1],
    );

    return {
      targets: results,
      score,
      passed: results.length > 0 && results.every((r) => r.credit === 1),
      scenarioCount: scenarios.length,
      mainCategory: ranked[0]?.[0],
    };
  } finally {
    key.destroy();
    stu.destroy();
    iso.destroy();
  }
}

/** The model answers, as a ready-made attempt (used by tests and "show solution"). */
export function solutionAttempt(sheets: SheetSpec[]): GridAttempt {
  const out: GridAttempt = {};
  for (const sheet of sheets) {
    out[sheet.name] = {};
    for (const [addr, c] of Object.entries(sheet.cells)) {
      if (c.kind === 'target') out[sheet.name][addr] = c.solution;
    }
  }
  return out;
}

export interface KeyProblem {
  cell: string;
  problem: string;
}

/**
 * Sanity-check a task's own answer key: every target must produce a clean
 * value on the base inputs and on every perturbed input set, and every target
 * must react to at least one input (otherwise the perturbation test proves nothing).
 */
export function checkAnswerKey(item: Gradeable, seed = 1): KeyProblem[] {
  const sheets = item.workbook.sheets;
  const targets = collectTargets(sheets);
  const inputs = collectInputs(sheets);
  const scenarios = makeScenarios(inputs, seededRng(item.id, seed), item.edgeCases ?? [], sheets[0].name);
  const key = new Workbook(buildSheetData(sheets, 'key'));
  const problems: KeyProblem[] = [];
  try {
    const moved = targets.map(() => false);
    let baseVals: CellValue[] = [];
    scenarios.forEach((sc, si) => {
      applyScenario(key, inputs, sc);
      const vals = targets.map((t) => key.get(t.sheet, t.addr));
      if (si === 0) baseVals = vals;
      vals.forEach((v, ti) => {
        if (isCellError(v)) {
          problems.push({ cell: targets[ti].id, problem: `key returns ${v.error} (${v.message}) in scenario ${si}` });
        } else if (v === null) {
          problems.push({ cell: targets[ti].id, problem: `key is empty in scenario ${si}` });
        } else if (typeof v === 'number' && !Number.isFinite(v)) {
          problems.push({ cell: targets[ti].id, problem: `key is not finite in scenario ${si}` });
        }
        if (si > 0 && !same(v, baseVals[ti])) moved[ti] = true;
      });
    });
    targets.forEach((t, ti) => {
      if (!moved[ti] && !t.spec.allowConstant) {
        problems.push({ cell: t.id, problem: 'never changes when inputs change (give an input a `vary` range, or mark allowConstant)' });
      }
    });
  } finally {
    key.destroy();
  }
  return problems;
}

/** The answer key's value in every target cell, with the base inputs. */
export function baseKeyValues(sheets: SheetSpec[]): Record<string, Record<string, CellValue>> {
  const key = new Workbook(buildSheetData(sheets, 'key'));
  try {
    const out: Record<string, Record<string, CellValue>> = {};
    for (const t of collectTargets(sheets)) {
      (out[t.sheet] ??= {})[t.addr] = key.get(t.sheet, t.addr);
    }
    return out;
  } finally {
    key.destroy();
  }
}
