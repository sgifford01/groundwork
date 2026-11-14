/** The function catalog, the as-you-type formula help, and the Excel-compatibility fixes behind them. */
import { HyperFormula } from 'hyperformula';
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS } from '../src/content';
import { FN_CATEGORIES, FUNCTIONS, fnByName, syntaxOf } from '../src/content/functions';
import { isCellError } from '../src/engine/format';
import { acceptSuggestion, activeArgFor, analyzeFormula } from '../src/engine/formulaAssist';
import { evalFormula, UNSUPPORTED_FUNCTIONS, Workbook } from '../src/engine/workbook';

function runExample(cells: Record<string, string | number>, formula: string) {
  const sheet: Record<string, string | number> = {};
  for (const [addr, v] of Object.entries(cells)) sheet[addr] = typeof v === 'string' && !v.startsWith('=') ? `'${v}` : v;
  sheet.Z50 = formula;
  const wb = new Workbook([{ name: 'S', cells: sheet }]);
  try {
    return wb.get('S', 'Z50');
  } finally {
    wb.destroy();
  }
}

describe('function catalog', () => {
  it('has unique, upper-case names in known categories', () => {
    const seen = new Set<string>();
    for (const f of FUNCTIONS) {
      expect(f.name).toBe(f.name.toUpperCase());
      expect(seen.has(f.name), `duplicate ${f.name}`).toBe(false);
      seen.add(f.name);
      expect(FN_CATEGORIES).toContain(f.category);
      expect(f.args.length, f.name).toBeGreaterThan(0);
      if (f.repeat) expect(f.repeat, f.name).toBeLessThanOrEqual(f.args.length);
      expect(f.pitfalls.length, f.name).toBeGreaterThan(0);
      expect(JSON.stringify(f).includes('—'), `${f.name} contains an em dash`).toBe(false);
      expect(syntaxOf(f).startsWith(`${f.name}(`)).toBe(true);
    }
    expect(FUNCTIONS.length).toBeGreaterThanOrEqual(40);
  });

  it('covers the functions the curriculum names', () => {
    for (const name of ['SUM', 'ROUND', 'IF', 'AND', 'OR', 'MIN', 'MAX', 'IFERROR', 'SUMIFS', 'SUMPRODUCT', 'XLOOKUP', 'INDEX', 'MATCH', 'EDATE', 'EOMONTH', 'PMT', 'IPMT', 'PPMT', 'IRR', 'XIRR', 'NPV']) {
      expect(fnByName(name), name).toBeDefined();
    }
  });

  it('every related function exists', () => {
    for (const f of FUNCTIONS) for (const r of f.related ?? []) expect(fnByName(r), `${f.name} -> ${r}`).toBeDefined();
  });

  it('agrees with the engine about what can be evaluated', () => {
    const engine = new Set(HyperFormula.getRegisteredFunctionNames('enGB'));
    for (const f of FUNCTIONS) {
      if (f.supported === false) {
        expect(UNSUPPORTED_FUNCTIONS, f.name).toContain(f.name);
      } else {
        expect(engine.has(f.name), `${f.name} is not in the engine`).toBe(true);
        expect(f.example, `${f.name} needs an example`).toBeDefined();
      }
    }
  });

  for (const f of FUNCTIONS.filter((x) => x.example && x.supported !== false)) {
    it(`${f.name}: the example runs and uses the function`, () => {
      const ex = f.example!;
      expect(ex.formula.toUpperCase()).toContain(`${f.name}(`);
      const v = runExample(ex.cells, ex.formula);
      expect(isCellError(v), `${ex.formula} -> ${isCellError(v) ? `${v.error} ${v.message}` : ''}`).toBe(false);
      expect(v).not.toBeNull();
    });
  }

  it('generates a flashcard for every function marked with a card', () => {
    for (const f of FUNCTIONS.filter((x) => x.card)) {
      const item = ALL_ITEMS.find((i) => i.id === `l${f.card![0]}-fn-${f.name.toLowerCase()}`);
      expect(item, f.name).toBeDefined();
      expect(item!.type).toBe('flashcard');
      expect(item!.topic).toBe(f.card![1]);
    }
  });
});

describe('formula help while typing', () => {
  const at = (text: string) => analyzeFormula(text, text.length);

  it('suggests functions as a name is typed', () => {
    const a = at('=PM');
    expect(a?.kind).toBe('suggest');
    if (a?.kind === 'suggest') {
      expect(a.matches.map((m) => m.name)).toEqual(['PMT']);
      expect(a.start).toBe(1);
    }
    const s = at('=B4*SU');
    expect(s?.kind === 'suggest' && s.matches.map((m) => m.name)).toEqual(['SUM', 'SUMIFS', 'SUMPRODUCT', 'SUMIF']);
    const nested = at('=IF(B1>1,RO');
    expect(nested?.kind === 'suggest' && nested.matches.every((m) => m.name.startsWith('RO'))).toBe(true);
  });

  it('does not suggest for cell references, text, or plain typing', () => {
    expect(at('=B7')).toBeNull();
    expect(at('=B7*C12')).toBeNull();
    expect(at('Occupied')).toBeNull();
    expect(at('=IF(B1="Su')?.kind).not.toBe('suggest'); // inside quotes
    expect(at('=ZZZ')).toBeNull();
  });

  it('inserts the chosen function with an opening bracket', () => {
    expect(acceptSuggestion('=B4*SU', 6, 4, 'SUMIFS')).toEqual({ text: '=B4*SUMIFS(', caret: 11 });
    expect(acceptSuggestion('=pm+1', 3, 1, 'PMT')).toEqual({ text: '=PMT(+1', caret: 5 });
  });

  it('shows the template and tracks which argument the cursor is on', () => {
    const cases: [string, string, number][] = [
      ['=PMT(', 'PMT', 0],
      ['=PMT(B4/12,', 'PMT', 1],
      ['=PMT(B4/12,B5*12,', 'PMT', 2],
      ['=-PMT(B4/12,B5*12,B3', 'PMT', 2],
      ['=IF(AND(B1>=1.25,', 'AND', 1],
      ['=IF(AND(B1>=1.25,B2<=0.65),', 'IF', 1],
      ['=IF(B1="a,b",', 'IF', 1], // a comma inside quotes is not a separator
      ['=IRR({-1,2,3},', 'IRR', 1], // nor is one inside an array
      ['=XLOOKUP(B10,$A$4:$A$7,', 'XLOOKUP', 2],
      ['=ROUND((B1+B2)*', 'ROUND', 0], // plain brackets do not hide the function
    ];
    for (const [text, name, arg] of cases) {
      const a = at(text);
      expect(a?.kind, text).toBe('signature');
      if (a?.kind === 'signature') {
        expect(a.fn.name, text).toBe(name);
        expect(a.argIndex, text).toBe(arg);
      }
    }
    expect(at('=PMT(B4/12,B5*12,B3)')).toBeNull(); // closed: no template
    expect(at('=B4+B5')).toBeNull();
  });

  it('handles repeating arguments and too many arguments', () => {
    const sumifs = fnByName('SUMIFS')!;
    expect(sumifs.args[activeArgFor(sumifs, 0)!].name).toBe('sum_range');
    expect(sumifs.args[activeArgFor(sumifs, 3)!].name).toBe('criteria_range2');
    expect(sumifs.args[activeArgFor(sumifs, 5)!].name).toBe('criteria_range2'); // third pair repeats the pattern
    expect(sumifs.args[activeArgFor(sumifs, 6)!].name).toBe('criteria2');
    const sum = fnByName('SUM')!;
    expect(sum.args[activeArgFor(sum, 9)!].name).toBe('number2');
    expect(activeArgFor(fnByName('ROUND')!, 2)).toBeNull();
  });

  it('falls back to the template when the list is dismissed', () => {
    const text = '=IF(B1>1,RO';
    expect(analyzeFormula(text, text.length)?.kind).toBe('suggest');
    const after = analyzeFormula(text, text.length, true);
    expect(after?.kind).toBe('signature');
    if (after?.kind === 'signature') expect(after.fn.name).toBe('IF');
  });
});

describe('DATEDIF, Excel style', () => {
  it('accepts the unit in either case and counts whole units', () => {
    expect(evalFormula('=DATEDIF(DATE(2026,4,1),DATE(2029,9,1),"m")')).toBe(41);
    expect(evalFormula('=DATEDIF(DATE(2026,4,1),DATE(2029,9,1),"M")')).toBe(41);
    expect(evalFormula('=DATEDIF(DATE(2026,4,1),DATE(2029,9,1),"y")')).toBe(3);
    expect(evalFormula('=DATEDIF(DATE(2026,4,1),DATE(2029,9,1),"ym")')).toBe(5);
    expect(evalFormula('=DATEDIF(DATE(2026,4,15),DATE(2026,5,14),"m")')).toBe(0); // not a full month yet
    expect(evalFormula('=DATEDIF(DATE(2026,1,1),DATE(2026,3,1),"d")')).toBe(59);
    expect(evalFormula('=DATEDIF(DATE(2026,4,20),DATE(2026,6,5),"md")')).toBe(16);
    expect(isCellError(evalFormula('=DATEDIF(DATE(2029,1,1),DATE(2026,1,1),"m")'))).toBe(true);
  });
});
