/**
 * "Do it in real Excel": write a task out as an .xlsx file, and read a
 * completed file back in as an attempt the grid grader can grade.
 *
 * Reading keeps the student's FORMULAS (so the perturbation test can re-run
 * them) and compares Excel's cached values with this app's own calculation,
 * reporting any cell it cannot evaluate instead of failing silently.
 */
import type { Cell, Workbook as XlsxWorkbook } from 'exceljs';
import type { SheetSpec } from '../content/schema';
import { EXCEL_NUMFMT, formatValue, isCellError, type CellValue } from '../engine/format';
import { colToLetter, parseA1 } from '../engine/refs';
import { unsupportedFunctionIn, Workbook } from '../engine/workbook';
import { buildSheetData, isLocked, type GridAttempt } from '../grading/gridGrader';

const TAG_SHEET = '_pfg';
const BLUE = 'FF0000FF';
const GREEN = 'FF007A33';
const YELLOW = 'FFFFF2CC';
const EPOCH = Date.UTC(1899, 11, 30);

async function newWorkbook(): Promise<XlsxWorkbook> {
  const mod = await import('exceljs');
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;
  return new ExcelJS.Workbook();
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface TaskFileInfo {
  id: string;
  title: string;
  /** e.g. "blank", "partial": recorded in the file so the upload is graded the same way */
  variant?: string;
}

/**
 * @param sheets  the sheets as the student should see them
 * @param prefill what to put in the yellow cells (empty for a normal task; the buggy model for an error hunt)
 */
export async function exportTask(info: TaskFileInfo, sheets: SheetSpec[], prefill: GridAttempt = {}): Promise<ArrayBuffer> {
  const wb = await newWorkbook();
  wb.creator = 'Pro Forma Gym';
  wb.calcProperties.fullCalcOnLoad = true;
  // Values for the given formulas, so the file shows numbers even before Excel recalculates.
  const engine = new Workbook(buildSheetData(sheets, 'student', prefill));
  try {
    for (const sheet of sheets) {
      const ws = wb.addWorksheet(sheet.name);
      let maxCol = 0;
      for (const addr of Object.keys(sheet.cells)) maxCol = Math.max(maxCol, parseA1(addr).col);
      for (let c = 0; c <= maxCol + 2; c++) {
        const px = sheet.widths?.[colToLetter(c)] ?? 96;
        ws.getColumn(c + 1).width = Math.max(8, Math.round(px / 7));
      }
      for (const [addr, spec] of Object.entries(sheet.cells)) {
        const cell = ws.getCell(addr);
        if ('bold' in spec && spec.bold) cell.font = { ...cell.font, bold: true };
        if (spec.kind === 'label') {
          cell.value = spec.text;
          const style = spec.style ?? 'normal';
          cell.font = {
            bold: style === 'title' || style === 'header' || style === 'total' || Boolean(spec.bold),
            italic: style === 'note',
            size: style === 'title' ? 13 : 11,
          };
          cell.alignment = { horizontal: spec.align ?? 'left', indent: spec.indent ?? 0 };
          if (style === 'header') cell.border = { bottom: { style: 'thin' } };
          continue;
        }
        cell.numFmt = EXCEL_NUMFMT[spec.format ?? 'general'];
        if (spec.kind === 'input') {
          cell.value = spec.value;
          cell.font = { ...cell.font, color: { argb: BLUE } };
        } else if (spec.kind === 'given') {
          const v = engine.get(sheet.name, addr);
          cell.value = { formula: spec.formula.slice(1), result: isCellError(v) || v === null ? undefined : v } as Cell['value'];
          if (spec.formula.includes('!')) cell.font = { ...cell.font, color: { argb: GREEN } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } };
          const raw = prefill[sheet.name]?.[addr];
          if (raw) {
            if (raw.startsWith('=')) {
              const v = engine.get(sheet.name, addr);
              cell.value = { formula: raw.slice(1), result: isCellError(v) || v === null ? undefined : v } as Cell['value'];
            } else {
              const n = Number(raw);
              cell.value = raw.trim() !== '' && Number.isFinite(n) ? n : raw;
              if (typeof cell.value === 'number') cell.font = { ...cell.font, color: { argb: BLUE } };
            }
          }
        }
        if (spec.border === 'top') cell.border = { top: { style: 'thin' } };
        else if (spec.border === 'bottom') cell.border = { bottom: { style: 'thin' } };
        else if (spec.border === 'double') cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      }
      ws.views = [{ showGridLines: true }];
    }
  } finally {
    engine.destroy();
  }
  const tag = wb.addWorksheet(TAG_SHEET, { state: 'veryHidden' });
  tag.getCell('A1').value = 'pro-forma-gym';
  tag.getCell('A2').value = info.id;
  tag.getCell('A3').value = info.variant ?? '';
  tag.getCell('A4').value = info.title;
  const out = await wb.xlsx.writeBuffer();
  return out as ArrayBuffer;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ImportedTask {
  attempt: GridAttempt;
  /** Things the student should know: unevaluable formulas, changed inputs, value mismatches. */
  warnings: string[];
  variant: string;
  formulaCells: number;
}

/** Excel stores newer functions with prefixes such as _xlfn.XLOOKUP; strip them. */
export function cleanFormula(formula: string): string {
  let f = formula.trim();
  if (f.startsWith('=')) f = f.slice(1);
  f = f.replace(/_xlfn\.|_xlws\.|_xlpm\./g, '');
  if (f.startsWith('@')) f = f.slice(1); // implicit-intersection marker
  return `=${f}`;
}

function scalarOf(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  if (value instanceof Date) return Math.round((value.getTime() - EPOCH) / 86400000);
  if (typeof value === 'object') {
    const v = value as { richText?: { text: string }[]; text?: string; error?: string; result?: unknown };
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (typeof v.error === 'string') return v.error;
    if (typeof v.text === 'string') return v.text;
  }
  return String(value);
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(0.001 * Math.abs(b), 0.005);
}

export async function importTask(data: ArrayBuffer, sheets: SheetSpec[], expectedId: string): Promise<ImportedTask> {
  const wb = await newWorkbook();
  try {
    await wb.xlsx.load(data);
  } catch {
    throw new Error('That file could not be opened. Save it from Excel as an .xlsx workbook and try again.');
  }
  const warnings: string[] = [];
  const tag = wb.getWorksheet(TAG_SHEET);
  const fileId = tag ? String(scalarOf(tag.getCell('A2').value) ?? '') : '';
  const variant = tag ? String(scalarOf(tag.getCell('A3').value) ?? '') : '';
  if (!tag || tag.getCell('A1').value !== 'pro-forma-gym') {
    warnings.push('This file was not downloaded from Pro Forma Gym, so it could not be matched to a task. It is being graded against this task.');
  } else if (fileId !== expectedId) {
    const title = String(scalarOf(tag.getCell('A4').value) ?? fileId);
    throw new Error(`That file is for a different task ("${title}"). Open that task and upload it there.`);
  }

  const attempt: GridAttempt = {};
  const cached: Record<string, Record<string, string | number | boolean | null>> = {};
  let formulaCells = 0;
  let inputsChanged = false;

  for (const sheet of sheets) {
    const ws = wb.getWorksheet(sheet.name);
    if (!ws) throw new Error(`The sheet "${sheet.name}" is missing from that file. Keep the sheet names as downloaded.`);
    attempt[sheet.name] = {};
    cached[sheet.name] = {};
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const addr = cell.address.replace(/\$/g, '');
        const spec = sheet.cells[addr];
        if (isLocked(sheet, addr)) {
          if (spec?.kind === 'input') {
            const v = scalarOf(cell.value);
            const same = typeof spec.value === 'number' && typeof v === 'number' ? near(v, spec.value) : String(v) === String(spec.value);
            if (!same) {
              inputsChanged = true;
              warnings.push(`${addr}: this input was changed in your file (${String(v)}). Grading uses the original ${formatValue(spec.value, spec.format ?? 'general')}.`);
            }
          }
          return;
        }
        const formula = cell.formula;
        if (formula) {
          attempt[sheet.name][addr] = cleanFormula(formula);
          cached[sheet.name][addr] = scalarOf(cell.result);
          formulaCells++;
        } else {
          const v = scalarOf(cell.value);
          if (v === null || v === '') return;
          attempt[sheet.name][addr] = typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v);
        }
      });
    });
  }

  // Compare Excel's saved values with this app's own evaluation of the same formulas.
  const engine = new Workbook(buildSheetData(sheets, 'student', attempt));
  try {
    for (const sheet of sheets) {
      for (const [addr, raw] of Object.entries(attempt[sheet.name])) {
        if (!raw.startsWith('=')) continue;
        const mine: CellValue = engine.get(sheet.name, addr);
        const excel = cached[sheet.name][addr];
        const fn = unsupportedFunctionIn(raw);
        if (isCellError(mine)) {
          const excelSays = typeof excel === 'number' ? ` Excel shows ${excel.toLocaleString('en-US', { maximumFractionDigits: 4 })}.` : '';
          warnings.push(
            fn
              ? `${addr}: this app cannot evaluate ${fn}(), so ${raw} cannot be graded.${excelSays} Rewrite it without ${fn} to have it graded.`
              : `${addr}: this app could not evaluate ${raw} (${mine.error}${mine.message ? `: ${mine.message}` : ''}).${excelSays}`,
          );
        } else if (!inputsChanged && typeof excel === 'number' && typeof mine === 'number' && !near(mine, excel)) {
          warnings.push(
            `${addr}: Excel shows ${excel.toLocaleString('en-US', { maximumFractionDigits: 4 })} but this app calculates ${mine.toLocaleString('en-US', { maximumFractionDigits: 4 })} for ${raw}. Grading uses this app's result.`,
          );
        }
      }
    }
  } finally {
    engine.destroy();
  }

  return { attempt, warnings, variant, formulaCells };
}

/** Save bytes as a file from the browser. */
export function saveFile(data: ArrayBuffer, filename: string): void {
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

