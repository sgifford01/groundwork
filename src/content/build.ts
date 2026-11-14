/**
 * Small helpers that make grid questions quick to write.
 *
 *   A5: label('Vacancy'),  B5: input(0.05, 'pct1', [0.03, 0.08, 0.005]),
 *   B9: target('=B3*B4*12', 'usd'),
 *   ...across('C7', 4, target('=B7*(1+$B$3)', 'usd'))   // fills C7:F7, shifting references
 */
import type { NumFormat } from '../engine/format';
import { parseA1, shiftFormula, toA1 } from '../engine/refs';
import type { ItemInput } from './schema';

type GridInput = Extract<ItemInput, { type: 'grid' }>;
export type SheetInput = GridInput['workbook']['sheets'][number];
export type CellInput = SheetInput['cells'][string];
type LabelInput = Extract<CellInput, { kind: 'label' }>;
type InputInput = Extract<CellInput, { kind: 'input' }>;
type Look = { bold?: boolean; border?: 'top' | 'bottom' | 'double' };
type VaryArg = [min: number, max: number, step: number] | { choices: (number | string | boolean)[] } | false;

export function label(text: string, opts: Partial<Omit<LabelInput, 'kind' | 'text'>> = {}): CellInput {
  return { kind: 'label', text, ...opts };
}
export const title = (text: string): CellInput => label(text, { style: 'title' });
export const header = (text: string, align: 'left' | 'right' | 'center' = 'right'): CellInput =>
  label(text, { style: 'header', align });
export const note = (text: string): CellInput => label(text, { style: 'note' });
export const total = (text: string): CellInput => label(text, { style: 'total' });
export const sub = (text: string): CellInput => label(text, { indent: 1 });

/** A blue input cell. `vary` tells the grader how to change it: [min, max, step], { choices }, or false. */
export function input(value: number | string | boolean, format?: NumFormat, vary?: VaryArg, look: Look = {}): CellInput {
  const cell: InputInput = { kind: 'input', value, ...look };
  if (format) cell.format = format;
  if (vary !== undefined) {
    cell.vary = Array.isArray(vary) ? { min: vary[0], max: vary[1], step: vary[2] } : vary;
  }
  return cell;
}

/** A formula the student is given (locked). */
export function given(formula: string, format?: NumFormat, look: Look = {}): CellInput {
  return { kind: 'given', formula, ...(format ? { format } : {}), ...look };
}

/** A yellow cell the student must fill. `solution` is the model formula. */
export function target(
  solution: string,
  format?: NumFormat,
  opts: Look & { tolerance?: { pct?: number; abs?: number }; allowConstant?: boolean } = {},
): CellInput {
  return { kind: 'target', solution, ...(format ? { format } : {}), ...opts };
}

function shiftCell(cell: CellInput, dCol: number, dRow: number): CellInput {
  if (cell.kind === 'target') return { ...cell, solution: shiftFormula(cell.solution, dCol, dRow) };
  if (cell.kind === 'given') return { ...cell, formula: shiftFormula(cell.formula, dCol, dRow) };
  return { ...cell };
}

/** Repeat a cell to the right, shifting formula references like Excel's fill-right. */
export function across(
  start: string,
  count: number,
  cell: CellInput | ((i: number) => CellInput),
): Record<string, CellInput> {
  const p = parseA1(start);
  const out: Record<string, CellInput> = {};
  for (let i = 0; i < count; i++) {
    const addr = toA1({ col: p.col + i, row: p.row });
    out[addr] = typeof cell === 'function' ? cell(i) : shiftCell(cell, i, 0);
  }
  return out;
}

/** Repeat a cell downward, shifting formula references like Excel's fill-down. */
export function down(
  start: string,
  count: number,
  cell: CellInput | ((i: number) => CellInput),
): Record<string, CellInput> {
  const p = parseA1(start);
  const out: Record<string, CellInput> = {};
  for (let i = 0; i < count; i++) {
    const addr = toA1({ col: p.col, row: p.row + i });
    out[addr] = typeof cell === 'function' ? cell(i) : shiftCell(cell, 0, i);
  }
  return out;
}

/** Fill a block (cols x rows) from one formula cell, shifting in both directions. */
export function block(start: string, cols: number, rows: number, cell: CellInput): Record<string, CellInput> {
  const p = parseA1(start);
  const out: Record<string, CellInput> = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out[toA1({ col: p.col + c, row: p.row + r })] = shiftCell(cell, c, r);
  return out;
}

/** For `mistakes`: the wrong formula as it would look after being filled right/down. */
export function fill(
  start: string,
  count: number,
  formula: string,
  dir: 'right' | 'down' = 'right',
): Record<string, string> {
  const p = parseA1(start);
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    const addr = dir === 'right' ? toA1({ col: p.col + i, row: p.row }) : toA1({ col: p.col, row: p.row + i });
    out[addr] = dir === 'right' ? shiftFormula(formula, i, 0) : shiftFormula(formula, 0, i);
  }
  return out;
}

/** For `mistakes`: a wrong formula filled across a block. */
export function fillBlock(start: string, cols: number, rows: number, formula: string): Record<string, string> {
  const p = parseA1(start);
  const out: Record<string, string> = {};
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) out[toA1({ col: p.col + c, row: p.row + r })] = shiftFormula(formula, c, r);
  return out;
}

export function sheet(name: string, cells: Record<string, CellInput>, widths?: Record<string, number>): SheetInput {
  return widths ? { name, widths, cells } : { name, cells };
}

/** Typed helper so content files get autocomplete and type errors. */
export function defineItems(items: ItemInput[]): ItemInput[] {
  return items;
}

type AnyWorkbook = GridInput['workbook'];
/** The type of a grid item's `mistakes` list, for mistakes shared between items. */
export type MistakeList = GridInput['mistakes'];

/** Reuse the workbook of an existing sheet-based item (so a grid build and its error hunt share one model). */
export function workbookOf(items: ItemInput[], id: string): AnyWorkbook {
  const item = items.find((i) => i.id === id);
  if (!item || !('workbook' in item)) throw new Error(`workbookOf: no sheet-based item "${id}"`);
  return item.workbook as AnyWorkbook;
}

/** The finished model: every yellow cell becomes a locked formula. Use it for predict-then-check items. */
export function solved(workbook: AnyWorkbook): AnyWorkbook {
  return {
    sheets: workbook.sheets.map((sh) => ({
      ...sh,
      cells: Object.fromEntries(
        Object.entries(sh.cells).map(([addr, c]) => [
          addr,
          c.kind === 'target'
            ? ({ kind: 'given', formula: c.solution, ...(c.format ? { format: c.format } : {}), ...(c.bold ? { bold: c.bold } : {}), ...(c.border ? { border: c.border } : {}) } as CellInput)
            : c,
        ]),
      ),
    })),
  };
}

/** Reuse the common-mistakes list of an existing grid item (for a timed version of the same model). */
export function mistakesOf(items: ItemInput[], id: string): GridInput['mistakes'] {
  const item = items.find((i) => i.id === id);
  if (!item || !('mistakes' in item) || !('workbook' in item)) throw new Error(`mistakesOf: no grid item "${id}"`);
  return item.mistakes as GridInput['mistakes'];
}

/** Reuse the edge cases of an existing grid item. */
export function edgeCasesOf(items: ItemInput[], id: string): NonNullable<GridInput['edgeCases']> {
  const item = items.find((i) => i.id === id);
  if (!item || !('workbook' in item)) throw new Error(`edgeCasesOf: no sheet-based item "${id}"`);
  return ('edgeCases' in item && item.edgeCases ? item.edgeCases : []) as NonNullable<GridInput['edgeCases']>;
}
