/**
 * Thin wrapper around HyperFormula. Everything that evaluates a formula
 * (the grid, the grader, answer keys, the tests) goes through here, so the
 * app has exactly one definition of "what does this formula equal".
 */
import {
  CellError as HfCellError,
  ErrorType,
  FunctionArgumentType,
  FunctionPlugin,
  HyperFormula,
  type ConfigParams,
  type RawCellContent,
} from 'hyperformula';
import { isCellError, serialToDate, type CellError, type CellValue, type Scalar } from './format';
import { parseA1, toA1 } from './refs';

export const HF_CONFIG: Partial<ConfigParams> = {
  licenseKey: 'gpl-v3',
  useArrayArithmetic: true, // lets =SUM(A1:A5*B1:B5) work like Excel 365
  evaluateNullToZero: true, // a reference to an empty cell counts as 0, as in Excel
  ignoreWhiteSpace: 'any',
  currencySymbol: ['$'],
  dateFormats: ['MM/DD/YYYY', 'MM/DD/YY', 'YYYY-MM-DD'],
  precisionRounding: 12,
};

/**
 * Excel lets INDEX take a single position on a one-row range, as in
 * =INDEX(B6:D6, 2) for "the second cell across". The engine's own INDEX reads
 * that 2 as a row number and fails, so this replaces it with Excel's behaviour.
 */
class ExcelCompatPlugin extends FunctionPlugin {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  index(ast: any, state: any) {
    return this.runFunction(
      ast.args,
      state,
      this.metadata('INDEX'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (range: any, first: number, second?: number | null) => {
        const height: number = range.height();
        const width: number = range.width();
        let row = first;
        let col = second;
        if (ast.args.length < 3 || col === undefined || col === null) {
          if (height === 1 && width > 1) {
            row = 1;
            col = first;
          } else col = 1;
        }
        row = Math.trunc(row);
        col = Math.trunc(col as number);
        if (row < 1 || col < 1 || row > height || col > width) return new HfCellError(ErrorType.REF);
        return range.data[row - 1][col - 1];
      },
    );
  }
}
/** Whole years / months / days between two dates, the way Excel's DATEDIF counts them. */
function dateDif(start: number, end: number, unit: string): number | null {
  const s0 = Math.floor(start);
  const e0 = Math.floor(end);
  if (e0 < s0) return null;
  const a = serialToDate(s0);
  const b = serialToDate(e0);
  const [ya, ma, da] = [a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()];
  const [yb, mb, db] = [b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()];
  let months = (yb - ya) * 12 + (mb - ma);
  if (db < da) months -= 1;
  switch (unit.toUpperCase()) {
    case 'Y':
      return Math.floor(months / 12);
    case 'M':
      return months;
    case 'D':
      return e0 - s0;
    case 'YM':
      return months % 12;
    case 'MD': {
      if (db >= da) return db - da;
      const daysInPrevMonth = new Date(Date.UTC(yb, mb, 0)).getUTCDate();
      return daysInPrevMonth - da + db;
    }
    case 'YD': {
      let anchor = Date.UTC(yb, ma, da);
      if (anchor > b.getTime()) anchor = Date.UTC(yb - 1, ma, da);
      return Math.round((b.getTime() - anchor) / 86400000);
    }
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(ExcelCompatPlugin.prototype as any).datedif = function (this: any, ast: any, state: any) {
  return this.runFunction(ast.args, state, this.metadata('DATEDIF'), (start: number, end: number, unit: string) => {
    const out = dateDif(start, end, String(unit));
    return out === null ? new HfCellError(ErrorType.NUM) : out;
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(ExcelCompatPlugin as any).implementedFunctions = {
  // Excel accepts the unit in either case ("m" or "M"); the engine's own DATEDIF does not.
  DATEDIF: {
    method: 'datedif',
    parameters: [
      { argumentType: FunctionArgumentType.NUMBER },
      { argumentType: FunctionArgumentType.NUMBER },
      { argumentType: FunctionArgumentType.STRING },
    ],
  },
  INDEX: {
    method: 'index',
    parameters: [
      { argumentType: FunctionArgumentType.RANGE },
      { argumentType: FunctionArgumentType.NUMBER },
      { argumentType: FunctionArgumentType.NUMBER, optionalArg: true },
    ],
  },
};
HyperFormula.registerFunctionPlugin(ExcelCompatPlugin, { enGB: { INDEX: 'INDEX', DATEDIF: 'DATEDIF' } });

/**
 * The engine has TRUE() and FALSE() functions but not the bare words Excel
 * accepts, as in =VLOOKUP(A1,B:C,2,FALSE). Defining them as names fixes that.
 */
function addExcelLiterals(hf: HyperFormula): void {
  hf.addNamedExpression('TRUE', '=TRUE()');
  hf.addNamedExpression('FALSE', '=FALSE()');
}

/** Excel functions people may type that this engine cannot evaluate. */
export const UNSUPPORTED_FUNCTIONS = ['LET', 'LAMBDA', 'INDIRECT', 'AGGREGATE', 'XMATCH', 'AVERAGEIFS', 'TABLE'];

export function normalizeValue(v: unknown): CellValue {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'object' && 'type' in (v as object) && 'value' in (v as object)) {
    const e = v as { type: string; value: string; message?: string };
    return { error: String(e.value), type: String(e.type), message: e.message ?? '' } satisfies CellError;
  }
  return String(v);
}

export interface SheetData {
  name: string;
  cells: Record<string, RawCellContent>;
}

function toRows(cells: Record<string, RawCellContent>): RawCellContent[][] {
  let maxRow = 0;
  let maxCol = 0;
  const parsed = Object.entries(cells).map(([a1, raw]) => {
    const p = parseA1(a1);
    maxRow = Math.max(maxRow, p.row);
    maxCol = Math.max(maxCol, p.col);
    return { p, raw };
  });
  const rows: RawCellContent[][] = Array.from({ length: maxRow + 1 }, () =>
    Array.from({ length: maxCol + 1 }, () => null),
  );
  for (const { p, raw } of parsed) rows[p.row][p.col] = raw;
  return rows;
}

export class Workbook {
  readonly hf: HyperFormula;
  readonly sheetNames: string[];

  constructor(sheets: SheetData[]) {
    const data: Record<string, RawCellContent[][]> = {};
    for (const s of sheets) data[s.name] = toRows(s.cells);
    this.hf = HyperFormula.buildFromSheets(data, HF_CONFIG);
    addExcelLiterals(this.hf);
    this.sheetNames = sheets.map((s) => s.name);
  }

  private sheetId(sheet: string): number {
    const id = this.hf.getSheetId(sheet);
    if (id === undefined) throw new Error(`No sheet named "${sheet}"`);
    return id;
  }

  private addr(sheet: string, a1: string) {
    const p = parseA1(a1);
    return { sheet: this.sheetId(sheet), col: p.col, row: p.row };
  }

  set(sheet: string, a1: string, raw: RawCellContent): void {
    this.hf.setCellContents(this.addr(sheet, a1), [[raw]]);
  }

  batch(fn: () => void): void {
    this.hf.batch(fn);
  }

  get(sheet: string, a1: string): CellValue {
    return normalizeValue(this.hf.getCellValue(this.addr(sheet, a1)));
  }

  /** "NUMBER_PERCENT", "NUMBER_DATE", "NUMBER_CURRENCY", ... used to pick a display format. */
  detailedType(sheet: string, a1: string): string {
    return String(this.hf.getCellValueDetailedType(this.addr(sheet, a1)));
  }

  /** True when the cell's formula refers to at least one other cell. */
  hasPrecedents(sheet: string, a1: string): boolean {
    return this.precedentCells(sheet, a1).length > 0;
  }

  /** Every single cell this cell's formula reads directly (ranges expanded). */
  precedentCells(sheet: string, a1: string): { sheet: string; addr: string }[] {
    const out: { sheet: string; addr: string }[] = [];
    let deps: ReturnType<HyperFormula['getCellPrecedents']>;
    try {
      deps = this.hf.getCellPrecedents(this.addr(sheet, a1));
    } catch {
      return out;
    }
    for (const d of deps) {
      // Names such as TRUE/FALSE live on an internal sheet; they are not cells.
      const sheetId = 'start' in d ? d.start.sheet : d.sheet;
      if (this.hf.getSheetName(sheetId) === undefined) continue;
      if ('start' in d) {
        const name = this.hf.getSheetName(d.start.sheet) ?? sheet;
        for (let r = d.start.row; r <= Math.min(d.end.row, d.start.row + 500); r++)
          for (let c = d.start.col; c <= Math.min(d.end.col, d.start.col + 100); c++)
            out.push({ sheet: name, addr: toA1({ col: c, row: r }) });
      } else {
        out.push({ sheet: this.hf.getSheetName(d.sheet) ?? sheet, addr: toA1({ col: d.col, row: d.row }) });
      }
    }
    return out;
  }

  destroy(): void {
    this.hf.destroy();
  }
}

// ---------------------------------------------------------------------------
// Evaluating a formula over named values, e.g. "=noi/cap" with { noi, cap }.
// Used for numeric answers, multiple-choice options and worked explanations.
// ---------------------------------------------------------------------------

let calc: HyperFormula | null = null;
let calcNames = new Set<string>();

function calculator(): HyperFormula {
  if (!calc) {
    calc = HyperFormula.buildFromSheets({ Calc: [[null]] }, HF_CONFIG);
    addExcelLiterals(calc);
    calcNames = new Set();
  }
  return calc;
}

export function evalFormula(formula: string, vars: Record<string, Scalar> = {}): CellValue {
  const hf = calculator();
  const f = formula.startsWith('=') ? formula : `=${formula}`;
  hf.batch(() => {
    for (const name of [...calcNames]) {
      if (!(name in vars)) {
        hf.removeNamedExpression(name);
        calcNames.delete(name);
      }
    }
    for (const [name, value] of Object.entries(vars)) {
      const raw: RawCellContent =
        typeof value === 'string' ? `="${value.replace(/"/g, '""')}"` : value;
      if (calcNames.has(name)) hf.changeNamedExpression(name, raw);
      else {
        hf.addNamedExpression(name, raw);
        calcNames.add(name);
      }
    }
  });
  const out = hf.calculateFormula(f, 0);
  const v = Array.isArray(out) ? (Array.isArray(out[0]) ? out[0][0] : out[0]) : out;
  return normalizeValue(v);
}

/** Like evalFormula, but throws unless the result is a finite number. */
export function evalNumber(formula: string, vars: Record<string, Scalar> = {}): number {
  const v = evalFormula(formula, vars);
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    const shown = isCellError(v) ? `${v.error} ${v.message}` : String(v);
    throw new Error(`Formula ${formula} did not produce a number (got ${shown})`);
  }
  return v;
}

/** If the formula uses a function this engine can't evaluate, return its name. */
export function unsupportedFunctionIn(formula: string): string | null {
  const upper = formula.toUpperCase();
  for (const fn of UNSUPPORTED_FUNCTIONS) {
    if (new RegExp(`(^|[^A-Z0-9_.])${fn}\\s*\\(`).test(upper)) return fn;
  }
  return null;
}
