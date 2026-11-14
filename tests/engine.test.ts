import { describe, expect, it } from 'vitest';
import {
  colToLetter,
  cycleRefAt,
  findRefs,
  letterToCol,
  parseA1,
  shiftFormula,
  toA1,
} from '../src/engine/refs';
import { formatValue, normalizeCellInput, parseTypedNumber } from '../src/engine/format';
import { renderTemplate, sampleVars } from '../src/engine/variables';
import { mulberry32 } from '../src/engine/rng';
import { evalFormula, unsupportedFunctionIn } from '../src/engine/workbook';

describe('cell references', () => {
  it('converts between letters and numbers', () => {
    expect(colToLetter(0)).toBe('A');
    expect(colToLetter(25)).toBe('Z');
    expect(colToLetter(26)).toBe('AA');
    expect(letterToCol('AB')).toBe(27);
    expect(toA1(parseA1('$C$12'))).toBe('C12');
  });

  it('finds references and ignores look-alikes', () => {
    const refs = (f: string) => findRefs(f).map((r) => r.text);
    expect(refs('=B7*(1+$B$3)')).toEqual(['B7', '$B$3']);
    expect(refs('=SUM(A1:B2)+LOG10(C3)')).toEqual(['A1', 'B2', 'C3']);
    expect(refs('=IF(B4="A1 text",D4,0)')).toEqual(['B4', 'D4']);
    expect(refs('=Inputs!B2+\'Rent Roll\'!C$5')).toEqual(['B2', 'C$5']);
    expect(findRefs("='Rent Roll'!C5")[0].sheetPrefix).toBe("'Rent Roll'!");
    expect(findRefs('=Inputs!B2')[0].sheetPrefix).toBe('Inputs!');
    expect(refs('=rate2*noi')).toEqual([]);
    expect(refs('=XLOOKUP(B10,$A$4:$A$7,$B$4:$B$7)')).toEqual(['B10', '$A$4', '$A$7', '$B$4', '$B$7']);
  });

  it('shifts references the way Excel does on copy', () => {
    expect(shiftFormula('=B$2*$A5', 1, 1)).toBe('=C$2*$A6');
    expect(shiftFormula('=B7*(1+$B$3)', 3, 0)).toBe('=E7*(1+$B$3)');
    expect(shiftFormula('=SUM(C$4:C$11)', 1, 5)).toBe('=SUM(D$4:D$11)');
    expect(shiftFormula('=A1', -1, 0)).toBe('=#REF!');
    expect(shiftFormula('=IF(B4="B4",B4,0)', 0, 1)).toBe('=IF(B5="B4",B5,0)');
    expect(shiftFormula('1250', 2, 2)).toBe('1250');
  });

  it('the copy-result quiz answer agrees with shiftFormula', () => {
    expect(shiftFormula('=B$2*$A5', 1, 1)).toBe('=C$2*$A6');
  });

  it('F4 cycles A1 -> $A$1 -> A$1 -> $A1 -> A1', () => {
    let f = '=B7*(1+B3)';
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = cycleRefAt(f, f.indexOf(')'))!;
      f = r.text;
      seen.push(f);
    }
    expect(seen).toEqual(['=B7*(1+$B$3)', '=B7*(1+B$3)', '=B7*(1+$B3)', '=B7*(1+B3)']);
    expect(cycleRefAt('=1+2', 3)).toBeNull();
  });
});

describe('number formats', () => {
  it('shows negatives in parentheses', () => {
    expect(formatValue(1250000, 'usd')).toBe('$1,250,000');
    expect(formatValue(-1250000, 'usd')).toBe('($1,250,000)');
    expect(formatValue(0.055, 'pct1')).toBe('5.5%');
    expect(formatValue(-0.055, 'pct1')).toBe('(5.5%)');
    expect(formatValue(1.4532, 'mult')).toBe('1.45x');
    expect(formatValue(46081, 'date')).toBe('2/28/2026');
    expect(formatValue({ error: '#DIV/0!', type: 'DIV_BY_ZERO', message: '' }, 'usd')).toBe('#DIV/0!');
  });

  it('reads typed numbers', () => {
    expect(parseTypedNumber('$1,250,000')?.value).toBe(1250000);
    expect(parseTypedNumber('5.5%')?.value).toBeCloseTo(0.055);
    expect(parseTypedNumber('1.45x')?.value).toBe(1.45);
    expect(parseTypedNumber('(250)')?.value).toBe(-250);
    expect(parseTypedNumber('1.2m')?.value).toBe(1200000);
    expect(parseTypedNumber('850k')?.value).toBe(850000);
    expect(parseTypedNumber('abc')).toBeNull();
  });

  it('tidies typed cell input', () => {
    expect(normalizeCellInput('1,250,000')).toBe('1250000');
    expect(normalizeCellInput('(500)')).toBe('-500');
    expect(normalizeCellInput('+B2*3')).toBe('=+B2*3');
    expect(normalizeCellInput('=SUM(A1:A3)')).toBe('=SUM(A1:A3)');
    expect(normalizeCellInput('Occupied')).toBe('Occupied');
    expect(normalizeCellInput('5%')).toBe('5%');
  });
});

describe('formula evaluation over named values', () => {
  it('evaluates with variables', () => {
    expect(evalFormula('=noi/cap', { noi: 500000, cap: 0.05 })).toBeCloseTo(10000000);
    expect(evalFormula('=IF(units>10,"big","small")', { units: 48 })).toBe('big');
    // variables from a previous call must not leak
    const leaked = evalFormula('=noi', {});
    expect(typeof leaked).toBe('object');
  });

  it('renders templates', () => {
    const vars = [
      { name: 'noi', min: 500000, max: 500000, step: 1, format: 'usd' as const },
      { name: 'cap', min: 0.05, max: 0.05, step: 0.01, format: 'pct2' as const },
    ];
    const values = sampleVars(vars, mulberry32(1));
    expect(renderTemplate('NOI {noi} at {cap} is {=noi/cap|usd}.', values, vars)).toBe(
      'NOI $500,000 at 5.00% is $10,000,000.',
    );
  });

  it('flags functions the engine cannot evaluate', () => {
    expect(unsupportedFunctionIn('=LET(x,B1,x*2)')).toBe('LET');
    expect(unsupportedFunctionIn('=SUM(B1:B3)')).toBeNull();
    expect(unsupportedFunctionIn('=OUTLET(B1)')).toBeNull();
  });
});

describe('Excel-style INDEX', () => {
  it('takes a single position on a one-row range, like Excel', async () => {
    const { Workbook } = await import('../src/engine/workbook');
    const wb = new Workbook([
      {
        name: 'S',
        cells: {
          A1: "'Downside", B1: "'Base", C1: "'Upside", D1: 2,
          A2: 2500, B2: 2700, C2: 2850,
          A3: '=INDEX(A2:C2,D1)', B3: '=INDEX(A2:C2,1,3)', C3: '=INDEX(A1:C1,D1)', D3: '=INDEX(A1:A2,2)',
          A4: '=INDEX(A1:C2,2,2)', B4: '=INDEX(A2:C2,4)', C4: '=INDEX(A2:C2,MATCH("Upside",A1:C1,0))',
        },
      },
    ]);
    expect(wb.get('S', 'A3')).toBe(2700);
    expect(wb.get('S', 'B3')).toBe(2850);
    expect(wb.get('S', 'C3')).toBe('Base');
    expect(wb.get('S', 'D3')).toBe(2500);
    expect(wb.get('S', 'A4')).toBe(2700);
    expect(wb.get('S', 'B4')).toMatchObject({ error: '#REF!' });
    expect(wb.get('S', 'C4')).toBe(2850);
    wb.set('S', 'D1', 3);
    expect(wb.get('S', 'A3')).toBe(2850); // recalculates when the position changes
    expect(wb.hasPrecedents('S', 'A3')).toBe(true);
    wb.destroy();
  });
});
