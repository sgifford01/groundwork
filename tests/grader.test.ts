/**
 * Runs every grid task through the grader:
 *   - the answer key itself must be clean under random inputs
 *   - the model solution must score 100%
 *   - a blank sheet, and typed-in numbers, must fail
 *   - every listed mistake must be marked wrong AND named correctly
 * plus targeted checks of the diagnosis logic.
 */
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, itemById } from '../src/content';
import { SHEET_GRADED_TYPES, type CaseQItem, type ErrorHuntItem, type GridItem, type SheetGradedItem } from '../src/content/schema';
import { buggyAttempt, caseSheets, gradeErrorHunt, studentSteps } from '../src/grading/advanced';
import { fill, fillBlock } from '../src/content/build';
import { isCellError } from '../src/engine/format';
import {
  baseKeyValues,
  checkAnswerKey,
  collectTargets,
  gradeGrid,
  solutionAttempt,
  type GridAttempt,
} from '../src/grading/gridGrader';

// every item whose answer is a filled-in sheet: grid builds, write-the-formula, guided cases, timed challenges
const grids = ALL_ITEMS.filter((i): i is SheetGradedItem => SHEET_GRADED_TYPES.includes(i.type));
const SEEDS = [1, 2, 3, 4, 5];

function withCells(item: SheetGradedItem | ErrorHuntItem, cells: Record<string, string>, sheet?: string): GridAttempt {
  const attempt = solutionAttempt(item.workbook.sheets);
  const name = sheet ?? item.workbook.sheets[0].name;
  attempt[name] = { ...attempt[name], ...cells };
  return attempt;
}

function grid(id: string): GridItem {
  const item = itemById(id);
  if (!item || item.type !== 'grid') throw new Error(`no grid item ${id}`);
  return item;
}

describe('every grid task', () => {
  it('there is at least one', () => {
    expect(grids.length).toBeGreaterThanOrEqual(8);
  });

  for (const item of grids) {
    describe(item.id, () => {
      it('answer key is clean under random inputs', () => {
        for (const seed of SEEDS) expect(checkAnswerKey(item, seed), `seed ${seed}`).toEqual([]);
      });

      it('model solution scores 100%', () => {
        for (const seed of SEEDS) {
          const res = gradeGrid(item, solutionAttempt(item.workbook.sheets), { seed });
          const bad = res.targets.filter((t) => t.status !== 'correct').map((t) => `${t.id}: ${t.message}`);
          expect(bad, `seed ${seed}`).toEqual([]);
          expect(res.passed).toBe(true);
          expect(res.score).toBe(1);
        }
      });

      it('a blank sheet scores 0', () => {
        const res = gradeGrid(item, {});
        expect(res.score).toBe(0);
        expect(res.targets.every((t) => t.status === 'empty')).toBe(true);
      });

      it('typing the right numbers is caught as hardcoding', () => {
        const values = baseKeyValues(item.workbook.sheets);
        const attempt: GridAttempt = {};
        for (const [sheet, cells] of Object.entries(values)) {
          attempt[sheet] = {};
          for (const [addr, v] of Object.entries(cells)) {
            expect(isCellError(v)).toBe(false);
            attempt[sheet][addr] = String(v);
          }
        }
        const res = gradeGrid(item, attempt);
        for (const r of res.targets) {
          expect(r.status, r.id).toBe('wrong');
          expect(r.category, r.id).toBe('hardcode');
          expect(r.checks.value, `${r.id} value check`).toBe(true);
          expect(r.checks.formula, `${r.id} formula check`).toBe(false);
        }
        expect(res.passed).toBe(false);
      });

      item.mistakes.forEach((m, mi) => {
        it(`mistake ${mi + 1} is caught and named: ${m.label.slice(0, 50)}`, () => {
          for (const seed of SEEDS) {
            const res = gradeGrid(item, withCells(item, m.cells, m.sheet), { seed });
            for (const addr of Object.keys(m.cells)) {
              const r = res.targets.find((t) => t.addr === addr && t.sheet === (m.sheet ?? item.workbook.sheets[0].name));
              expect(r, `${addr} is not a target`).toBeDefined();
              expect(r!.status, `seed ${seed} ${addr} (${m.cells[addr]})`).toBe('wrong');
              expect(r!.message, `seed ${seed} ${addr}`).toBe(m.label);
              expect(r!.category).toBe(m.category);
            }
            // Cells that were left as the model solution must not be marked wrong.
            for (const r of res.targets) {
              if (!(r.addr in m.cells)) expect(['correct', 'upstream'], `seed ${seed} ${r.id}`).toContain(r.status);
            }
          }
        });
      });
    });
  }
});

describe('diagnosis: $ anchoring', () => {
  const rent = grid('l0-refs-grid-rent-growth');

  it('finds a growth rate that drifted when filled right', () => {
    const res = gradeGrid(rent, withCells(rent, fill('C7', 4, '=B7*(1+B3)')));
    const by = Object.fromEntries(res.targets.map((t) => [t.addr, t]));
    expect(by.C7.status).toBe('correct');
    for (const addr of ['D7', 'E7', 'F7']) {
      expect(by[addr].status).toBe('wrong');
      expect(by[addr].category).toBe('reference');
      expect(by[addr].message).toContain('drifted');
      expect(by[addr].message).toContain('$B3');
      expect(by[addr].message).toContain('F4');
    }
    // the annual row is right in itself: it only inherits the bad monthly rent
    expect(by.D8.status).toBe('upstream');
    expect(by.D8.credit).toBe(1);
  });

  it('says "row instead of column" when the wrong half is locked', () => {
    const res = gradeGrid(rent, withCells(rent, fill('C7', 4, '=B7*(1+B$3)')));
    const d7 = res.targets.find((t) => t.addr === 'D7')!;
    expect(d7.status).toBe('wrong');
    expect(d7.message).toContain('anchored the row instead of the column');
    expect(d7.message).toContain('$B$3');
  });

  it('spots a reference that should move but is locked', () => {
    const res = gradeGrid(rent, withCells(rent, fill('C7', 4, '=$B7*(1+$B$3)')));
    const d7 = res.targets.find((t) => t.addr === 'D7')!;
    expect(d7.status).toBe('wrong');
    expect(d7.message).toContain('locked');
    expect(d7.category).toBe('reference');
  });

  it('accepts any correct formula, however it is written', () => {
    const variants = [
      fill('C7', 4, '=B7+B7*$B$3'),
      fill('C7', 4, '=(1+$B$3)*B7'),
      fill('C7', 4, '=B7*(1+$B3)'),
      { C7: '=$B$4*(1+$B$3)^1', D7: '=$B$4*(1+$B$3)^2', E7: '=$B$4*(1+$B$3)^3', F7: '=$B$4*(1+$B$3)^4' },
    ];
    for (const cells of variants) {
      const res = gradeGrid(rent, withCells(rent, cells));
      expect(res.targets.filter((t) => t.status !== 'correct').map((t) => `${t.addr}: ${t.message}`)).toEqual([]);
    }
  });

  it('handles a two-way table', () => {
    const matrix = grid('l0-refs-grid-value-matrix');
    const res = gradeGrid(matrix, withCells(matrix, fillBlock('B4', 5, 5, '=A4/B3')));
    const by = Object.fromEntries(res.targets.map((t) => [t.addr, t]));
    expect(by.B4.status).toBe('correct');
    expect(by.C4.message).toContain('$A4');
    expect(by.B5.message).toContain('B$3');
    expect(by.C5.message).toContain('$A4');
    expect(by.C5.message).toContain('B$3');
    expect(res.targets.filter((t) => t.status === 'wrong').length).toBe(24);
    expect(res.mainCategory).toBe('reference');
  });

  it('treats a range as one unit when a lookup table drifts', () => {
    const lookup = grid('l0-lookup-grid-market-rent');
    const res = gradeGrid(lookup, withCells(lookup, fill('D10', 6, '=XLOOKUP(B10,A4:A7,B4:B7)', 'down')));
    const d11 = res.targets.find((t) => t.addr === 'D11')!;
    expect(d11.status).toBe('wrong');
    expect(d11.category).toBe('reference');
    expect(d11.message).toContain('A$4:A$7');
    expect(d11.message).toContain('B$4:B$7');
  });

  it('accepts INDEX/MATCH and VLOOKUP in place of XLOOKUP', () => {
    const lookup = grid('l0-lookup-grid-market-rent');
    for (const f of ['=INDEX($B$4:$B$7,MATCH(B10,$A$4:$A$7,0))', '=VLOOKUP(B10,$A$4:$B$7,2,FALSE)']) {
      const res = gradeGrid(lookup, withCells(lookup, fill('D10', 6, f, 'down')));
      expect(res.passed, f).toBe(true);
    }
  });
});

describe('diagnosis: hardcodes, signs, upstream errors', () => {
  const noi = grid('l1-noi-grid-year1');

  it('names the input that was typed into a formula', () => {
    const res = gradeGrid(noi, withCells(noi, { B13: '=-B12*0.05' }));
    const r = res.targets.find((t) => t.addr === 'B13')!;
    expect(r.status).toBe('wrong');
    expect(r.checks.value).toBe(true); // matches today...
    expect(r.checks.perturbation).toBe(false); // ...but not when inputs move
    expect(r.category).toBe('hardcode');
    expect(r.message).toContain('0.05');
    expect(r.message).toContain('Vacancy');
  });

  it('flags a formula built only from typed numbers', () => {
    const res = gradeGrid(noi, withCells(noi, { B12: '=48*2650*12' }));
    const r = res.targets.find((t) => t.addr === 'B12')!;
    expect(r.status).toBe('wrong');
    expect(r.category).toBe('hardcode');
    expect(r.checks.value).toBe(true);
  });

  it('recognises a flipped sign', () => {
    const res = gradeGrid(noi, withCells(noi, { B13: '=B12*B7' }));
    const r = res.targets.find((t) => t.addr === 'B13')!;
    expect(r.category).toBe('sign');
  });

  it('does not punish later cells for an earlier mistake', () => {
    const res = gradeGrid(noi, withCells(noi, { B12: '=B4*B5*11' }));
    const by = Object.fromEntries(res.targets.map((t) => [t.addr, t]));
    expect(by.B12.status).toBe('wrong');
    for (const addr of ['B13', 'B15', 'B17', 'B19', 'B20']) expect(by[addr].status, addr).toBe('upstream');
    expect(by.B14.status).toBe('correct');
    expect(res.score).toBeCloseTo((res.targets.length - 1) / res.targets.length);
    expect(res.passed).toBe(false);
  });

  it('accepts expenses subtracted as positives where the total still works', () => {
    const res = gradeGrid(noi, withCells(noi, { B17: '=B15-(-B16)' }));
    expect(res.passed).toBe(true);
  });

  it('says so when a function cannot be evaluated', () => {
    const res = gradeGrid(noi, withCells(noi, { B19: '=LET(x,B17,x/B9)' }));
    const r = res.targets.find((t) => t.addr === 'B19')!;
    expect(r.status).toBe('wrong');
    expect(r.message).toContain('LET');
    expect(r.message).toContain("can't");
  });

  it('explains a broken formula', () => {
    const res = gradeGrid(noi, withCells(noi, { B15: '=SUM(B12:B14' }));
    const r = res.targets.find((t) => t.addr === 'B15')!;
    expect(r.status).toBe('wrong');
    expect(r.message).toContain('parentheses');
  });

  it('lets helper cells be used', () => {
    // a scratch cell holds the monthly rent roll; the target links to it
    const attempt = withCells(noi, { D4: '=B4*B5', B12: '=D4*12' });
    expect(gradeGrid(noi, attempt).passed).toBe(true);
    // but a typed helper is still a hardcode once inputs move
    const bad = withCells(noi, { D4: '127200', B12: '=D4*12' });
    const r = gradeGrid(noi, bad).targets.find((t) => t.addr === 'B12')!;
    expect(r.status).toBe('wrong');
  });

  it('catches interest charged on the wrong balance, even though it is close', () => {
    const amort = grid('l1-loan-grid-amort');
    const res = gradeGrid(amort, withCells(amort, fill('D10', 5, '=B9*$B$4/12', 'down')));
    // off by about $60 on $60,000 of interest: a 0.5% tolerance would miss it
    for (const addr of ['D10', 'D11', 'D12']) {
      expect(res.targets.find((t) => t.addr === addr)!.status, addr).toBe('wrong');
    }
    const d11 = res.targets.find((t) => t.addr === 'D11')!;
    expect(d11.category).toBe('timing');
    expect(d11.message).toContain('row above');
  });

  it('accepts IPMT/PPMT in the amortization schedule', () => {
    const amort = grid('l1-loan-grid-amort');
    const cells = {
      ...fill('D9', 6, '=-IPMT($B$4/12,A9,$B$5*12,$B$3)', 'down'),
      ...fill('E9', 6, '=-PPMT($B$4/12,A9,$B$5*12,$B$3)', 'down'),
    };
    const res = gradeGrid(amort, withCells(amort, cells));
    expect(res.targets.filter((t) => t.status !== 'correct').map((t) => `${t.addr}: ${t.message}`)).toEqual([]);
  });
});

describe('every error hunt', () => {
  const hunts = ALL_ITEMS.filter((i): i is ErrorHuntItem => i.type === 'errorhunt');
  for (const item of hunts) {
    describe(item.id, () => {
      const gradeable = { ...item, mistakes: [] };
      const first = item.workbook.sheets[0].name;

      it('answer key is clean under random inputs', () => {
        for (const seed of SEEDS) expect(checkAnswerKey(gradeable, seed), `seed ${seed}`).toEqual([]);
      });

      it('every planted bug is really wrong, and nothing else is', () => {
        for (const seed of SEEDS) {
          const res = gradeErrorHunt(item, buggyAttempt(item), { seed });
          expect(res.score).toBe(0);
          expect(res.broken.map((t) => t.id), `seed ${seed}: cells outside the bugs are wrong`).toEqual([]);
          for (const bug of item.bugs) {
            for (const addr of Object.keys(bug.cells)) {
              const t = res.grid.targets.find((x) => x.sheet === (bug.sheet ?? first) && x.addr === addr);
              expect(t, `${addr} is not a formula cell of the model`).toBeDefined();
              expect(t!.status, `seed ${seed} ${addr} (${bug.cells[addr]}) is not detectably wrong`).toBe('wrong');
            }
          }
        }
      });

      it('bugs do not overlap', () => {
        const seen = new Set<string>();
        for (const bug of item.bugs)
          for (const addr of Object.keys(bug.cells)) {
            const key = `${bug.sheet ?? first}!${addr}`;
            expect(seen.has(key), `${key} is in two bugs`).toBe(false);
            seen.add(key);
          }
      });

      it('fixing every bug scores 100%, fixing one scores a share', () => {
        const fixed = gradeErrorHunt(item, solutionAttempt(item.workbook.sheets));
        expect(fixed.score).toBe(1);
        expect(fixed.bugs.every((b) => b.fixed)).toBe(true);

        const attempt = buggyAttempt(item);
        const bug = item.bugs[0];
        const sheet = bug.sheet ?? first;
        const solved = solutionAttempt(item.workbook.sheets);
        for (const addr of Object.keys(bug.cells)) attempt[sheet][addr] = solved[sheet][addr];
        const partial = gradeErrorHunt(item, attempt);
        expect(partial.bugs[0].fixed).toBe(true);
        expect(partial.score).toBeCloseTo(1 / item.bugs.length);
      });

      it('breaking a good cell costs credit', () => {
        const attempt = solutionAttempt(item.workbook.sheets);
        const bugCells = new Set(item.bugs.flatMap((b) => Object.keys(b.cells).map((c) => `${b.sheet ?? first}!${c}`)));
        const victim = collectTargets(item.workbook.sheets).find((t) => !bugCells.has(`${t.sheet}!${t.addr}`));
        if (!victim) return;
        attempt[victim.sheet][victim.addr] = '12345';
        const res = gradeErrorHunt(item, attempt);
        expect(res.broken.some((t) => t.id === victim.id)).toBe(true);
        expect(res.score).toBeLessThan(1);
      });
    });
  }
});

describe('every guided case', () => {
  const cases = ALL_ITEMS.filter((i): i is CaseQItem => i.type === 'case');
  for (const item of cases) {
    describe(item.id, () => {
      const first = item.workbook.sheets[0].name;

      it('steps cover every answer cell exactly once', () => {
        const targets = collectTargets(item.workbook.sheets).map((t) => `${t.sheet}!${t.addr}`).sort();
        const stepped = item.steps.flatMap((s) => s.cells.map((c) => `${s.sheet ?? first}!${c}`)).sort();
        expect(stepped).toEqual(targets);
      });

      it('the partly filled stage hands over every second step and grades the rest', () => {
        const sheets = caseSheets(item, 'partial');
        const mine = studentSteps(item, 'partial');
        const expected = mine.reduce((n, i) => n + item.steps[i].cells.length, 0);
        expect(collectTargets(sheets).length).toBe(expected);
        expect(expected).toBeGreaterThan(0);
        expect(expected).toBeLessThan(collectTargets(item.workbook.sheets).length);
        const staged = { ...item, workbook: { sheets } };
        expect(checkAnswerKey(staged)).toEqual([]);
        expect(gradeGrid(staged, solutionAttempt(sheets)).passed).toBe(true);
        expect(gradeGrid(staged, {}).score).toBe(0);
      });

      it('the blank stage is the whole model', () => {
        expect(collectTargets(caseSheets(item, 'blank')).length).toBe(collectTargets(item.workbook.sheets).length);
        expect(collectTargets(caseSheets(item, 'worked')).length).toBe(0);
      });
    });
  }
});
