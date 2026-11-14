/**
 * The real-Excel round trip, simulated: export a task, fill in the yellow
 * cells the way Excel would store them, read the file back, grade it.
 */
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, itemById } from '../src/content';
import { SHEET_GRADED_TYPES, type ErrorHuntItem, type GridItem, type SheetGradedItem } from '../src/content/schema';
import { buggyAttempt, gradeErrorHunt } from '../src/grading/advanced';
import { collectTargets, gradeGrid, solutionAttempt } from '../src/grading/gridGrader';
import { cleanFormula, exportTask, importTask } from '../src/xlsx/taskFile';

const grids = ALL_ITEMS.filter((i): i is SheetGradedItem => SHEET_GRADED_TYPES.includes(i.type));

function grid(id: string): GridItem {
  const item = itemById(id);
  if (!item || item.type !== 'grid') throw new Error(`no grid ${id}`);
  return item;
}

/** Open an exported file and type formulas into it, as a student would in Excel. */
async function fillIn(file: ArrayBuffer, cells: Record<string, Record<string, string>>, opts: { results?: Record<string, number> } = {}) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file);
  for (const [sheet, byAddr] of Object.entries(cells)) {
    const ws = wb.getWorksheet(sheet)!;
    for (const [addr, raw] of Object.entries(byAddr)) {
      ws.getCell(addr).value = raw.startsWith('=')
        ? ({ formula: raw.slice(1), result: opts.results?.[addr] } as ExcelJS.CellValue)
        : Number.isFinite(Number(raw))
          ? Number(raw)
          : raw;
    }
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

describe('xlsx export', () => {
  it('writes inputs, given formulas, formats and yellow answer cells', async () => {
    const item = grid('l1-noi-grid-year1');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file);
    const ws = wb.getWorksheet('NOI')!;
    expect(ws.getCell('B4').value).toBe(48);
    expect(ws.getCell('B4').font?.color?.argb).toBe('FF0000FF'); // blue input
    expect(ws.getCell('B7').numFmt).toContain('%');
    expect(ws.getCell('B12').value).toBeNull(); // answer cell is empty...
    expect((ws.getCell('B12').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFFFF2CC'); // ...and yellow
    expect(ws.getCell('A12').value).toBe('Gross potential rent');
    expect(wb.getWorksheet('_pfg')!.getCell('A2').value).toBe(item.id);
    expect(wb.getWorksheet('_pfg')!.state).toBe('veryHidden');
  });

  it('includes given formulas with their values', async () => {
    const item = grid('l0-lookup-grid-market-rent');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file);
    const c16 = wb.getWorksheet('Rents')!.getCell('C16');
    expect(c16.formula).toBe('SUM(C10:C15)');
    expect(c16.result).toBe(2400 + 1950 + 3150 + 2650 + 3900 + 3300);
  });
});

describe('xlsx round trip', () => {
  for (const item of grids) {
    it(`${item.id}: the model solution, typed into the file, grades 100%`, async () => {
      const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
      const done = await fillIn(file, solutionAttempt(item.workbook.sheets));
      const imported = await importTask(done, item.workbook.sheets, item.id);
      expect(imported.warnings).toEqual([]);
      expect(imported.formulaCells).toBe(collectTargets(item.workbook.sheets).length);
      const res = gradeGrid(item, imported.attempt);
      expect(res.targets.filter((t) => t.status !== 'correct').map((t) => `${t.id}: ${t.message}`)).toEqual([]);
    });
  }

  it('grades typed-in numbers and broken links the same as in the app', async () => {
    const item = grid('l1-noi-grid-year1');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const cells = solutionAttempt(item.workbook.sheets);
    cells.NOI.B12 = '1526400'; // typed number
    cells.NOI.B13 = '=-B12*0.05'; // hardcoded vacancy
    const imported = await importTask(await fillIn(file, cells), item.workbook.sheets, item.id);
    const res = gradeGrid(item, imported.attempt);
    const by = Object.fromEntries(res.targets.map((t) => [t.addr, t]));
    expect(by.B12.category).toBe('hardcode');
    expect(by.B13.category).toBe('hardcode');
    expect(by.B13.checks.perturbation).toBe(false);
    // EGI's own formula is fine; it only inherits the hardcoded vacancy line
    expect(by.B15.status).toBe('upstream');
    expect(by.B15.credit).toBe(1);
  });

  it('reads Excel shared formulas (a formula filled right)', async () => {
    const item = grid('l0-refs-grid-rent-growth');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file);
    const ws = wb.getWorksheet('Rent')!;
    ws.getCell('B7').value = { formula: 'B4' } as ExcelJS.CellValue;
    ws.fillFormula('C7:F7', 'B7*(1+$B$3)');
    ws.fillFormula('B8:F8', 'B7*12');
    const imported = await importTask((await wb.xlsx.writeBuffer()) as ArrayBuffer, item.workbook.sheets, item.id);
    expect(imported.attempt.Rent.E7).toBe('=D7*(1+$B$3)');
    expect(gradeGrid(item, imported.attempt).passed).toBe(true);
  });

  it('strips the prefixes Excel adds to newer functions', async () => {
    expect(cleanFormula('_xlfn.XLOOKUP(B10,$A$4:$A$7,$B$4:$B$7)')).toBe('=XLOOKUP(B10,$A$4:$A$7,$B$4:$B$7)');
    expect(cleanFormula('=_xlfn._xlws.FILTER(A1:A3,B1:B3)')).toBe('=FILTER(A1:A3,B1:B3)');
    const item = grid('l0-lookup-grid-market-rent');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const cells = solutionAttempt(item.workbook.sheets);
    for (const addr of Object.keys(cells.Rents)) cells.Rents[addr] = cells.Rents[addr].replace('XLOOKUP', '_xlfn.XLOOKUP');
    const imported = await importTask(await fillIn(file, cells), item.workbook.sheets, item.id);
    expect(gradeGrid(item, imported.attempt).passed).toBe(true);
  });

  it('says clearly when a formula cannot be evaluated', async () => {
    const item = grid('l1-noi-grid-year1');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const cells = solutionAttempt(item.workbook.sheets);
    cells.NOI.B19 = '=_xlfn.LET(_xlpm.x,B17,_xlpm.x/B9)';
    const imported = await importTask(await fillIn(file, cells, { results: { B19: 28968000 } }), item.workbook.sheets, item.id);
    const warning = imported.warnings.find((w) => w.startsWith('B19'));
    expect(warning).toBeDefined();
    expect(warning).toContain('cannot evaluate LET()');
    expect(warning).toContain('Excel shows');
    const b19 = gradeGrid(item, imported.attempt).targets.find((t) => t.addr === 'B19')!;
    expect(b19.status).toBe('wrong');
    expect(b19.message).toContain('LET');
  });

  it('flags a difference between Excel\'s saved value and its own calculation', async () => {
    const item = grid('l1-noi-grid-year1');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const cells = solutionAttempt(item.workbook.sheets);
    const imported = await importTask(await fillIn(file, cells, { results: { B12: 999 } }), item.workbook.sheets, item.id);
    expect(imported.warnings.some((w) => w.startsWith('B12') && w.includes('Excel shows 999'))).toBe(true);
  });

  it('notices changed inputs and grades against the originals', async () => {
    const item = grid('l1-noi-grid-year1');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await fillIn(file, solutionAttempt(item.workbook.sheets)));
    wb.getWorksheet('NOI')!.getCell('B4').value = 60;
    const imported = await importTask((await wb.xlsx.writeBuffer()) as ArrayBuffer, item.workbook.sheets, item.id);
    expect(imported.warnings.some((w) => w.startsWith('B4') && w.includes('changed'))).toBe(true);
    expect(gradeGrid(item, imported.attempt).passed).toBe(true);
  });

  it('refuses a file that belongs to another task', async () => {
    const a = grid('l1-noi-grid-year1');
    const b = grid('l1-loan-grid-amort');
    const file = await exportTask({ id: a.id, title: a.title }, a.workbook.sheets);
    await expect(importTask(file, b.workbook.sheets, b.id)).rejects.toThrow(/different task/);
  });

  it('keeps helper cells the student added outside the yellow cells', async () => {
    const item = grid('l1-noi-grid-year1');
    const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets);
    const cells = solutionAttempt(item.workbook.sheets);
    cells.NOI.D4 = '=B4*B5';
    cells.NOI.B12 = '=D4*12';
    const imported = await importTask(await fillIn(file, cells), item.workbook.sheets, item.id);
    expect(imported.attempt.NOI.D4).toBe('=B4*B5');
    expect(gradeGrid(item, imported.attempt).passed).toBe(true);
  });
});

describe('xlsx round trip: error hunts', () => {
  const hunts = ALL_ITEMS.filter((i): i is ErrorHuntItem => i.type === 'errorhunt');
  for (const item of hunts) {
    it(`${item.id}: the buggy model survives the trip, and the fixed file scores 100%`, async () => {
      const file = await exportTask({ id: item.id, title: item.title }, item.workbook.sheets, buggyAttempt(item));
      // untouched: every bug is still there
      const untouched = await importTask(file, item.workbook.sheets, item.id);
      expect(gradeErrorHunt(item, untouched.attempt).score).toBe(0);
      expect(gradeErrorHunt(item, untouched.attempt).broken).toEqual([]);
      // fixed in "Excel"
      const done = await fillIn(file, solutionAttempt(item.workbook.sheets));
      const fixed = await importTask(done, item.workbook.sheets, item.id);
      expect(gradeErrorHunt(item, fixed.attempt).score).toBe(1);
    });
  }
});
