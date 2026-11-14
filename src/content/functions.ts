/**
 * THE FUNCTION CATALOG.
 *
 * One entry per Excel function the course teaches. The same entries drive:
 *   - the help that appears while typing a formula (suggestions + argument template)
 *   - the Functions guide page (explanation, live example, "try it")
 *   - the generated function flashcards
 *
 * Example results are never typed in: the app evaluates `example.formula`
 * against `example.cells` with the same engine that grades the sheets.
 */
import { dateToSerial, type NumFormat } from '../engine/format';
import type { TopicId } from './topics';

export type FnCategory = 'Totals and rounding' | 'Logic' | 'Conditional totals' | 'Lookups' | 'Dates' | 'Loans and returns' | 'Newer Excel';

export const FN_CATEGORIES: FnCategory[] = [
  'Totals and rounding',
  'Logic',
  'Conditional totals',
  'Lookups',
  'Dates',
  'Loans and returns',
  'Newer Excel',
];

export interface FnArg {
  name: string;
  desc: string;
  optional?: boolean;
}

export interface FnExample {
  /** A tiny sample sheet: cell -> text, number, or a formula starting with "=". */
  cells: Record<string, string | number>;
  /** Display formats, by cell ("B2") or by whole column ("C"). */
  formats?: Record<string, NumFormat>;
  formula: string;
  resultFormat?: NumFormat;
  /** What the formula is doing, in words. No typed-in results. */
  note: string;
}

export interface FnDoc {
  name: string;
  category: FnCategory;
  /** Shown in suggestion lists. */
  summary: string;
  /** A sentence or two of plain English. */
  detail: string;
  args: FnArg[];
  /** How many trailing arguments repeat (1 for SUM's numbers, 2 for SUMIFS's range/criteria pairs). */
  repeat?: number;
  example?: FnExample;
  /** Where it shows up in a real estate model. */
  realEstate: string;
  pitfalls: string[];
  related?: string[];
  /** Essentials are taught first and get a flashcard. */
  essential?: boolean;
  /** Which Excel versions have it, when not all. */
  availability?: string;
  /** False for functions this app's engine cannot evaluate. */
  supported?: boolean;
  /** Flashcard placement: [level, topic]. Omit to skip (already covered by a hand-written card). */
  card?: [number, TopicId];
}

/** "PMT(rate, nper, pv, [fv], [type])" */
export function syntaxOf(fn: FnDoc): string {
  const parts = fn.args.map((a) => (a.optional ? `[${a.name}]` : a.name));
  return `${fn.name}(${parts.join(', ')}${fn.repeat ? ', ...' : ''})`;
}

const d = dateToSerial;

const RENT_ROLL: FnExample['cells'] = {
  A1: 'Unit', B1: 'Type', C1: 'Rent',
  A2: '101', B2: 'Studio', C2: 1950,
  A3: '102', B3: '1BR', C3: 2450,
  A4: '103', B4: '1BR', C4: 2500,
  A5: '104', B5: '2BR', C5: 3250,
  A6: '105', B6: 'Studio', C6: 1995,
};
const RENT_FORMATS: FnExample['formats'] = { C: 'usd' };

const MARKET: FnExample['cells'] = {
  A1: 'Type', B1: 'Market rent', D1: 'Find',
  A2: 'Studio', B2: 2100, D2: '1BR',
  A3: '1BR', B3: 2650,
  A4: '2BR', B4: 3400,
};

const LOAN: FnExample['cells'] = { A1: 'Loan amount', B1: 12000000, A2: 'Annual rate', B2: 0.06, A3: 'Years', B3: 30 };
const LOAN_FORMATS: FnExample['formats'] = { B1: 'usd', B2: 'pct2' };

const FLOWS: FnExample['cells'] = {
  A1: 'Year', B1: 'Cash flow', C1: 'Date',
  A2: 0, B2: -9600000, C2: d(2026, 3, 31),
  A3: 1, B3: 316000, C3: d(2027, 3, 31),
  A4: 2, B4: 358000, C4: d(2028, 6, 30),
  A5: 3, B5: 401000, C5: d(2029, 3, 31),
  A6: 4, B6: 445000, C6: d(2030, 3, 31),
  A7: 5, B7: 15591000, C7: d(2031, 9, 30),
};
const FLOW_FORMATS: FnExample['formats'] = { B: 'usd', C: 'date' };

const DATES: FnExample['cells'] = { A1: 'Closing date', B1: d(2026, 3, 15), A2: 'Loan term (months)', B2: 36, A3: 'Sale date', B3: d(2031, 9, 30) };
const DATE_FORMATS: FnExample['formats'] = { B1: 'date', B3: 'date' };

const TESTS: FnExample['cells'] = { A1: 'DSCR', B1: 1.31, A2: 'LTV', B2: 0.62 };
const TEST_FORMATS: FnExample['formats'] = { B1: 'mult', B2: 'pct' };

const MIX: FnExample['cells'] = {
  A1: 'Type', B1: 'Units', C1: 'Rent',
  A2: 'Studio', B2: 24, C2: 2350,
  A3: '1BR', B3: 46, C3: 2950,
  A4: '2BR', B4: 32, C4: 3950,
};

export const FUNCTIONS: FnDoc[] = [
  // ===========================================================================
  // Totals and rounding
  // ===========================================================================
  {
    name: 'SUM',
    category: 'Totals and rounding',
    summary: 'Adds up numbers or a range.',
    detail: 'The most used function in any model. Give it a range and it adds every number in it; text and blank cells are ignored.',
    args: [
      { name: 'number1', desc: 'The first number, cell or range to add, such as C2:C6.' },
      { name: 'number2', desc: 'More numbers or ranges, separated by commas.', optional: true },
    ],
    repeat: 1,
    example: { cells: RENT_ROLL, formats: RENT_FORMATS, formula: '=SUM(C2:C6)', resultFormat: 'usd', note: 'Adds the five rents in C2 to C6.' },
    realEstate: 'Totals everywhere: total rent, total uses, total sources. If deductions are entered as negatives, one SUM gives the subtotal.',
    pitfalls: ['Check the range covers every row. A SUM that stops one row short is one of the most common real model errors.'],
    related: ['SUMIFS', 'SUMPRODUCT'],
    essential: true,
    card: [0, 'l0-core'],
  },
  {
    name: 'AVERAGE',
    category: 'Totals and rounding',
    summary: 'The simple average of a set of numbers.',
    detail: 'Adds the numbers and divides by how many there are. Every number counts equally.',
    args: [
      { name: 'number1', desc: 'The first number, cell or range.' },
      { name: 'number2', desc: 'More numbers or ranges.', optional: true },
    ],
    repeat: 1,
    example: { cells: RENT_ROLL, formats: RENT_FORMATS, formula: '=AVERAGE(C2:C6)', resultFormat: 'usd', note: 'The average of the five rents, each unit counting once.' },
    realEstate: 'Average rent across a list of individual units.',
    pitfalls: ['When rows are unit TYPES with different counts, a simple average is wrong. Use a weighted average: SUMPRODUCT(counts, rents) ÷ SUM(counts).'],
    related: ['SUMPRODUCT'],
    essential: true,
    card: [0, 'l0-core'],
  },
  {
    name: 'MIN',
    category: 'Totals and rounding',
    summary: 'The smallest of a set of numbers.',
    detail: 'Returns the lowest value. In a model it is how you say “the lesser of”: the binding limit.',
    args: [
      { name: 'number1', desc: 'The first number, cell or range.' },
      { name: 'number2', desc: 'More numbers or ranges.', optional: true },
    ],
    repeat: 1,
    example: {
      cells: { A1: 'LTV test', B1: 15600000, A2: 'DSCR test', B2: 14290000, A3: 'Debt yield test', B3: 15530000 },
      formats: { B: 'usd' },
      formula: '=MIN(B1:B3)',
      resultFormat: 'usd',
      note: 'The lender makes the smallest of the three loans.',
    },
    realEstate: 'Loan sizing (lesser of LTV, DSCR and debt yield), equity draws (the smaller of the cost and the equity left), capping lease-up at stabilized occupancy.',
    pitfalls: ['“The lesser of” is MIN. People reach for MAX because they are thinking “the maximum loan”.'],
    related: ['MAX'],
    essential: true,
  },
  {
    name: 'MAX',
    category: 'Totals and rounding',
    summary: 'The largest of a set of numbers.',
    detail: 'Returns the highest value. MAX(x, 0) is the standard way to stop a number going negative: a floor.',
    args: [
      { name: 'number1', desc: 'The first number, cell or range.' },
      { name: 'number2', desc: 'More numbers or ranges.', optional: true },
    ],
    repeat: 1,
    example: {
      cells: { A1: 'Market rent', B1: 2950, A2: 'Lease rent', B2: 3050 },
      formats: { B: 'usd' },
      formula: '=MAX(B1-B2,0)',
      resultFormat: 'usd',
      note: 'Loss to lease can never be negative, so the difference is floored at zero.',
    },
    realEstate: 'Floors: loss to lease, loan draws, cash available to distribute, a minimum management fee.',
    pitfalls: ['“Never less than X” is a floor, which needs MAX. “Never more than X” is a cap, which needs MIN.'],
    related: ['MIN'],
    essential: true,
  },
  {
    name: 'ROUND',
    category: 'Totals and rounding',
    summary: 'Rounds a number to a set number of digits.',
    detail: 'The second argument is the number of decimal places. 2 means cents, 0 means whole numbers, and negative numbers round to the left of the decimal point: -3 is the nearest thousand.',
    args: [
      { name: 'number', desc: 'The number to round.' },
      { name: 'num_digits', desc: 'Decimal places to keep. 0 for whole numbers; -3 for the nearest thousand.' },
    ],
    example: { cells: { A1: 'Value', B1: 28968421.05 }, formats: { B1: 'usd2' }, formula: '=ROUND(B1,-3)', resultFormat: 'usd', note: 'Rounds the value to the nearest thousand dollars.' },
    realEstate: 'Rounding a bid price, or rounding a check cell before testing whether it equals zero.',
    pitfalls: ['Formatting a cell to show no decimals does not change its value. ROUND does.', 'Do not round in the middle of a model. Small rounding errors add up and break check cells.'],
    related: ['ROUNDUP', 'ROUNDDOWN'],
    essential: true,
    card: [0, 'l0-core'],
  },
  {
    name: 'ROUNDUP',
    category: 'Totals and rounding',
    summary: 'Rounds a number up, away from zero.',
    detail: 'Like ROUND, but always goes up. Use it when part of a unit still requires a whole one.',
    args: [
      { name: 'number', desc: 'The number to round up.' },
      { name: 'num_digits', desc: 'Decimal places to keep. 0 for whole numbers.' },
    ],
    example: { cells: { A1: 'Units', B1: 46, A2: 'Stalls per unit', B2: 1.35 }, formula: '=ROUNDUP(B1*B2,0)', resultFormat: 'int', note: 'A requirement with a fraction of a stall still needs a whole stall.' },
    realEstate: 'Parking stalls required, months needed to lease up, number of elevators.',
    pitfalls: ['ROUND can round down. If a requirement must be met in full, use ROUNDUP.'],
    related: ['ROUND', 'ROUNDDOWN'],
    essential: true,
    card: [0, 'l0-core'],
  },
  {
    name: 'ROUNDDOWN',
    category: 'Totals and rounding',
    summary: 'Rounds a number down, toward zero.',
    detail: 'Like ROUND, but always goes down. Use it for “how many whole ones fit”.',
    args: [
      { name: 'number', desc: 'The number to round down.' },
      { name: 'num_digits', desc: 'Decimal places to keep. 0 for whole numbers.' },
    ],
    example: {
      cells: { A1: 'Buildable area (SF)', B1: 48300, A2: 'Average unit (SF)', B2: 780 },
      formula: '=ROUNDDOWN(B1/B2,0)',
      resultFormat: 'int',
      note: 'How many whole units fit in the buildable area.',
    },
    realEstate: 'Units that fit on a site, whole floors within a height limit.',
    pitfalls: ['For negative numbers it rounds toward zero, which is “up” on a number line.'],
    related: ['ROUND', 'ROUNDUP'],
  },
  {
    name: 'ABS',
    category: 'Totals and rounding',
    summary: 'The size of a number, ignoring its sign.',
    detail: 'Turns negatives into positives and leaves positives alone.',
    args: [{ name: 'number', desc: 'The number whose absolute value you want.' }],
    example: {
      cells: { A1: 'Total sources', B1: 6878000, A2: 'Total uses', B2: 6878000.004 },
      formats: { B: 'usd2' },
      formula: '=ABS(B1-B2)<0.01',
      note: 'A check that passes when sources and uses agree to within a cent, in either direction.',
    },
    realEstate: 'Check cells: testing that two totals agree, whichever one happens to be larger.',
    pitfalls: ['Do not use ABS to hide a sign error in a cash flow. Fix the sign at its source.'],
    related: ['ROUND'],
  },
  {
    name: 'SUMPRODUCT',
    category: 'Totals and rounding',
    summary: 'Multiplies matching rows of two ranges, then adds the results.',
    detail: 'It pairs the first cells of each range, the second cells, and so on, multiplies each pair, and adds the products. That is exactly a weighted total.',
    args: [
      { name: 'array1', desc: 'The first range, such as the unit counts.' },
      { name: 'array2', desc: 'A second range of the same size, such as the rents.', optional: true },
    ],
    repeat: 1,
    example: { cells: MIX, formats: { C: 'usd' }, formula: '=SUMPRODUCT(B2:B4,C2:C4)', resultFormat: 'usd', note: 'Each unit count times its rent, added up: the total monthly rent.' },
    realEstate: 'Total rent from a unit mix, total square feet, and weighted averages (divide by the SUM of the counts).',
    pitfalls: ['The ranges must be the same size and shape.', 'A weighted average is SUMPRODUCT(weights, values) ÷ SUM(weights), not AVERAGE(values).'],
    related: ['SUM', 'AVERAGE'],
    essential: true,
    card: [0, 'l0-agg'],
  },
  {
    name: 'COUNT',
    category: 'Totals and rounding',
    summary: 'Counts the cells that contain numbers.',
    detail: 'Counts numeric cells only. Text and blanks are skipped.',
    args: [
      { name: 'value1', desc: 'The first cell or range to count.' },
      { name: 'value2', desc: 'More cells or ranges.', optional: true },
    ],
    repeat: 1,
    example: { cells: RENT_ROLL, formats: RENT_FORMATS, formula: '=COUNT(C2:C6)', resultFormat: 'int', note: 'How many cells in the rent column hold a number.' },
    realEstate: 'Counting units in a rent roll by counting their rents.',
    pitfalls: ['COUNT ignores text. To count cells containing anything at all, use COUNTA.'],
    related: ['COUNTA', 'COUNTIF'],
  },
  {
    name: 'COUNTA',
    category: 'Totals and rounding',
    summary: 'Counts the cells that are not empty.',
    detail: 'Counts every cell with something in it: numbers, text, even a formula that returns an empty string.',
    args: [
      { name: 'value1', desc: 'The first cell or range to count.' },
      { name: 'value2', desc: 'More cells or ranges.', optional: true },
    ],
    repeat: 1,
    example: { cells: RENT_ROLL, formats: RENT_FORMATS, formula: '=COUNTA(B2:B6)', resultFormat: 'int', note: 'How many units have a type filled in.' },
    realEstate: 'Total unit count from a column of text, such as status or unit type.',
    pitfalls: ['A cell holding a space or an empty-string formula still counts.'],
    related: ['COUNT', 'COUNTIF'],
  },

  // ===========================================================================
  // Logic
  // ===========================================================================
  {
    name: 'IF',
    category: 'Logic',
    summary: 'Returns one thing if a test is true, another if it is false.',
    detail: 'The test is a comparison such as B1="Occupied" or B4>=1.25. Text in a test or a result goes in double quotes.',
    args: [
      { name: 'logical_test', desc: 'A comparison that is either true or false, such as B1="Occupied".' },
      { name: 'value_if_true', desc: 'What to return when the test is true.' },
      { name: 'value_if_false', desc: 'What to return when the test is false.', optional: true },
    ],
    example: {
      cells: { A1: 'Status', B1: 'Vacant', A2: 'Lease rent', B2: 2700 },
      formats: { B2: 'usd' },
      formula: '=IF(B1="Occupied",B2,0)',
      resultFormat: 'usd',
      note: 'A vacant unit collects nothing; an occupied one collects its lease rent.',
    },
    realEstate: 'Collected rent only for occupied units, a loan payoff only in the sale year, a pass/fail label on a lender test.',
    pitfalls: ['Text must be in quotes: "Occupied", not Occupied.', 'Several IFs nested inside each other get unreadable fast. Consider IFS, CHOOSE or a lookup table.'],
    related: ['AND', 'OR', 'IFS', 'IFERROR'],
    essential: true,
    card: [0, 'l0-core'],
  },
  {
    name: 'AND',
    category: 'Logic',
    summary: 'True only if every test is true.',
    detail: 'Combines several comparisons. Usually used as the test inside an IF.',
    args: [
      { name: 'logical1', desc: 'The first test.' },
      { name: 'logical2', desc: 'More tests.', optional: true },
    ],
    repeat: 1,
    example: { cells: TESTS, formats: TEST_FORMATS, formula: '=AND(B1>=1.25,B2<=0.65)', note: 'True because the deal passes both the DSCR test and the LTV test.' },
    realEstate: 'A deal clears underwriting only if it passes every lender test.',
    pitfalls: ['Excel cannot read 1.2<=B1<=1.5. Write it as AND(B1>=1.2, B1<=1.5).'],
    related: ['OR', 'IF'],
    essential: true,
    card: [0, 'l0-core'],
  },
  {
    name: 'OR',
    category: 'Logic',
    summary: 'True if at least one test is true.',
    detail: 'Combines several comparisons and is true when any of them is. Usually used inside an IF.',
    args: [
      { name: 'logical1', desc: 'The first test.' },
      { name: 'logical2', desc: 'More tests.', optional: true },
    ],
    repeat: 1,
    example: { cells: TESTS, formats: TEST_FORMATS, formula: '=OR(B1<1.25,B2>0.65)', note: 'A red flag if EITHER test fails. Here neither does.' },
    realEstate: 'Flagging a deal that breaches any one covenant.',
    pitfalls: ['“Passes all tests” is AND. “Fails any test” is OR. Mixing them up flips the answer.'],
    related: ['AND', 'IF'],
    essential: true,
    card: [0, 'l0-core'],
  },
  {
    name: 'IFERROR',
    category: 'Logic',
    summary: 'Returns a fallback value if a formula produces an error.',
    detail: 'Runs the first argument. If that gives an error such as #DIV/0! or #N/A, it returns the second argument instead.',
    args: [
      { name: 'value', desc: 'The formula to try.' },
      { name: 'value_if_error', desc: 'What to return if that formula gives an error, often 0 or "".' },
    ],
    example: {
      cells: { A1: 'Total rent', B1: 7425, A2: 'Units', B2: 0 },
      formats: { B1: 'usd' },
      formula: '=IFERROR(B1/B2,0)',
      resultFormat: 'usd',
      note: 'Dividing by zero units would be an error, so the average shows 0 instead.',
    },
    realEstate: 'Averages for a unit type that has no units yet, per-unit figures before the unit count is entered.',
    pitfalls: ['It hides EVERY error, including real bugs like a broken reference. Use it only where an error is expected.'],
    related: ['IF'],
    essential: true,
  },
  {
    name: 'IFS',
    category: 'Logic',
    summary: 'Checks several tests in order and returns the first match.',
    detail: 'A cleaner way to write nested IFs. It works through the pairs from left to right and stops at the first test that is true. Use TRUE as the last test to catch everything else.',
    args: [
      { name: 'logical_test1', desc: 'The first test.' },
      { name: 'value_if_true1', desc: 'What to return if the first test is true.' },
      { name: 'logical_test2', desc: 'The next test, checked only if the earlier ones were false.', optional: true },
      { name: 'value_if_true2', desc: 'What to return if that test is true.', optional: true },
    ],
    repeat: 2,
    example: {
      cells: { A1: 'DSCR', B1: 1.18 },
      formats: { B1: 'mult' },
      formula: '=IFS(B1>=1.25,"Pass",B1>=1.15,"Watch",TRUE,"Fail")',
      resultFormat: 'text',
      note: 'Three bands for a coverage ratio, checked from the top down.',
    },
    realEstate: 'Banding a metric into pass, watch and fail; tiered fees.',
    pitfalls: ['Order matters: put the strictest test first.', 'With no final TRUE catch-all, a value that matches nothing returns #N/A.'],
    related: ['IF', 'CHOOSE'],
    availability: 'Excel 2019 and later',
  },
  {
    name: 'CHOOSE',
    category: 'Logic',
    summary: 'Picks the Nth item from a list.',
    detail: 'The first argument is a position number. CHOOSE returns the value at that position among the arguments that follow.',
    args: [
      { name: 'index_num', desc: 'Which item to return: 1 for the first, 2 for the second, and so on.' },
      { name: 'value1', desc: 'The first item.' },
      { name: 'value2', desc: 'More items.', optional: true },
    ],
    repeat: 1,
    example: {
      cells: { A1: 'Scenario (1, 2 or 3)', B1: 2, A2: 'Downside rent', B2: 2500, A3: 'Base rent', B3: 2700, A4: 'Upside rent', B4: 2850 },
      formats: { B2: 'usd', B3: 'usd', B4: 'usd' },
      formula: '=CHOOSE(B1,B2,B3,B4)',
      resultFormat: 'usd',
      note: 'The scenario number picks which rent the model uses.',
    },
    realEstate: 'Scenario toggles: one cell switches the whole model between downside, base and upside.',
    pitfalls: ['A position outside the list gives #VALUE!.', 'For a long row of scenario values, INDEX(range, n) is easier to fill down.'],
    related: ['INDEX', 'IFS'],
    essential: true,
    card: [5, 'l5-present'],
  },

  // ===========================================================================
  // Conditional totals
  // ===========================================================================
  {
    name: 'SUMIFS',
    category: 'Conditional totals',
    summary: 'Adds up a range, but only the rows that meet your conditions.',
    detail: 'The range to add comes FIRST. Then come pairs: a range to test, and what it must equal. A row is added only if every pair matches.',
    args: [
      { name: 'sum_range', desc: 'The numbers to add, such as the rent column.' },
      { name: 'criteria_range1', desc: 'The column to test, such as the unit-type column.' },
      { name: 'criteria1', desc: 'What that column must match: a cell, "1BR", or a comparison like ">2400".' },
      { name: 'criteria_range2', desc: 'A second column to test.', optional: true },
      { name: 'criteria2', desc: 'What the second column must match.', optional: true },
    ],
    repeat: 2,
    example: { cells: RENT_ROLL, formats: RENT_FORMATS, formula: '=SUMIFS(C2:C6,B2:B6,"1BR")', resultFormat: 'usd', note: 'Total rent for the rows whose type is 1BR.' },
    realEstate: 'Summarising a rent roll by unit type, rolling monthly cash flows up into years, totalling a budget by category.',
    pitfalls: [
      'The sum range is FIRST. The older SUMIF puts it last, and mixing them up is a classic error.',
      'All the ranges must be the same size.',
      'Point the criteria at a cell (such as $A14) instead of typing "1BR" so the formula can be filled down.',
    ],
    related: ['SUMIF', 'COUNTIF', 'SUMPRODUCT'],
    essential: true,
  },
  {
    name: 'SUMIF',
    category: 'Conditional totals',
    summary: 'Adds up the rows that meet one condition.',
    detail: 'The older, single-condition version of SUMIFS. Note the different order: the range to test comes first and the range to add comes last.',
    args: [
      { name: 'range', desc: 'The column to test.' },
      { name: 'criteria', desc: 'What it must match.' },
      { name: 'sum_range', desc: 'The numbers to add. If left out, the tested range itself is added.', optional: true },
    ],
    example: { cells: RENT_ROLL, formats: RENT_FORMATS, formula: '=SUMIF(B2:B6,"Studio",C2:C6)', resultFormat: 'usd', note: 'Total rent for the studios.' },
    realEstate: 'The same jobs as SUMIFS, when there is only one condition.',
    pitfalls: ['Its argument order is the reverse of SUMIFS. Most modelers use SUMIFS everywhere to avoid the confusion.'],
    related: ['SUMIFS'],
  },
  {
    name: 'COUNTIF',
    category: 'Conditional totals',
    summary: 'Counts the cells that meet a condition.',
    detail: 'Give it a range and what to look for, and it counts the matches.',
    args: [
      { name: 'range', desc: 'The cells to look through.' },
      { name: 'criteria', desc: 'What to count: a cell, "Occupied", or a comparison like ">2400".' },
    ],
    example: { cells: RENT_ROLL, formats: RENT_FORMATS, formula: '=COUNTIF(B2:B6,"1BR")', resultFormat: 'int', note: 'How many units are one-bedrooms.' },
    realEstate: 'Units by type, occupied units for an occupancy rate.',
    pitfalls: ['A comparison goes inside the quotes: ">2400". To compare with a cell, join them: ">"&D1.'],
    related: ['COUNTIFS', 'SUMIFS', 'COUNTA'],
    essential: true,
    card: [0, 'l0-agg'],
  },
  {
    name: 'COUNTIFS',
    category: 'Conditional totals',
    summary: 'Counts the rows that meet several conditions.',
    detail: 'Pairs of range and condition. A row is counted only if every pair matches.',
    args: [
      { name: 'criteria_range1', desc: 'The first column to test.' },
      { name: 'criteria1', desc: 'What it must match.' },
      { name: 'criteria_range2', desc: 'A second column to test.', optional: true },
      { name: 'criteria2', desc: 'What the second column must match.', optional: true },
    ],
    repeat: 2,
    example: { cells: RENT_ROLL, formats: RENT_FORMATS, formula: '=COUNTIFS(B2:B6,"1BR",C2:C6,">2400")', resultFormat: 'int', note: 'One-bedrooms renting for more than $2,400.' },
    realEstate: 'Units of one type above a rent threshold, leases expiring in a given year.',
    pitfalls: ['All the ranges must be the same size.'],
    related: ['COUNTIF', 'SUMIFS'],
  },

  // ===========================================================================
  // Lookups
  // ===========================================================================
  {
    name: 'XLOOKUP',
    category: 'Lookups',
    summary: 'Finds a value in one range and returns the matching value from another.',
    detail: 'You give it what to find, where to look, and what to return. It matches exactly by default and can look in any direction.',
    args: [
      { name: 'lookup_value', desc: 'What to find, such as this unit’s type.' },
      { name: 'lookup_array', desc: 'The range to search, such as the list of types.' },
      { name: 'return_array', desc: 'The range to return from, such as the list of market rents. Same size as the lookup range.' },
      { name: 'if_not_found', desc: 'What to show if there is no match, instead of #N/A.', optional: true },
      { name: 'match_mode', desc: '0 for an exact match (the default).', optional: true },
      { name: 'search_mode', desc: '1 to search from the top (the default), -1 from the bottom.', optional: true },
    ],
    example: { cells: MARKET, formats: { B: 'usd' }, formula: '=XLOOKUP(D2,A2:A4,B2:B4)', resultFormat: 'usd', note: 'Finds the type in D2 in the type list and returns the rent beside it.' },
    realEstate: 'Pulling a market rent by unit type, an expense by category, an assumption by scenario name.',
    pitfalls: ['Anchor both ranges with $ before filling the formula down, or they slide and return wrong rows.', 'Not available in Excel 2019 or earlier: use INDEX with MATCH there.'],
    related: ['INDEX', 'MATCH', 'VLOOKUP'],
    essential: true,
    availability: 'Excel 2021 and Microsoft 365',
  },
  {
    name: 'INDEX',
    category: 'Lookups',
    summary: 'Returns the cell at a given position in a range.',
    detail: 'Give it a range and a position number and it returns that cell. For a table, give a row number and a column number. It is usually paired with MATCH, which finds the position.',
    args: [
      { name: 'array', desc: 'The range to pick from.' },
      { name: 'row_num', desc: 'Which row of the range (or which cell, if the range is a single row or column).' },
      { name: 'column_num', desc: 'Which column of the range, for a table.', optional: true },
    ],
    example: { cells: MARKET, formats: { B: 'usd' }, formula: '=INDEX(B2:B4,MATCH(D2,A2:A4,0))', resultFormat: 'usd', note: 'MATCH finds where the type sits in the list; INDEX returns the rent at that position.' },
    realEstate: 'Lookups that work in every version of Excel, two-way lookups (row and column), and scenario toggles: INDEX(range, scenario number).',
    pitfalls: ['The position is counted within the range, not the sheet: the first cell of the range is 1.'],
    related: ['MATCH', 'XLOOKUP', 'CHOOSE'],
    essential: true,
  },
  {
    name: 'MATCH',
    category: 'Lookups',
    summary: 'Finds the position of a value in a list.',
    detail: 'Returns a position number, not the value itself: 1 if the item is first in the list, 2 if second. Feed that number to INDEX.',
    args: [
      { name: 'lookup_value', desc: 'What to find.' },
      { name: 'lookup_array', desc: 'The single row or column to search.' },
      { name: 'match_type', desc: 'Use 0 for an exact match. Leaving it out assumes a sorted list.', optional: true },
    ],
    example: { cells: MARKET, formats: { B: 'usd' }, formula: '=MATCH(D2,A2:A4,0)', resultFormat: 'int', note: 'The position of the type in D2 within the type list.' },
    realEstate: 'The lookup half of INDEX/MATCH; finding which test is the binding one.',
    pitfalls: ['Always include the 0. Without it MATCH assumes the list is sorted and can return the wrong position silently.'],
    related: ['INDEX', 'XLOOKUP'],
    essential: true,
  },
  {
    name: 'VLOOKUP',
    category: 'Lookups',
    summary: 'Looks down the first column of a table and returns a value from a column to its right.',
    detail: 'The classic lookup. You will meet it in older models, so learn to read it, but prefer XLOOKUP or INDEX/MATCH in your own work.',
    args: [
      { name: 'lookup_value', desc: 'What to find in the first column of the table.' },
      { name: 'table_array', desc: 'The whole table. The lookup column must be its leftmost column.' },
      { name: 'col_index_num', desc: 'Which column of the table to return, counted from the left: 2 for the second.' },
      { name: 'range_lookup', desc: 'FALSE for an exact match. Leaving it out does an approximate match.', optional: true },
    ],
    example: { cells: MARKET, formats: { B: 'usd' }, formula: '=VLOOKUP(D2,A2:B4,2,FALSE)', resultFormat: 'usd', note: 'Finds the type in the first column of the table and returns the second column.' },
    realEstate: 'Reading other people’s models.',
    pitfalls: [
      'The column number is typed in, so inserting a column makes it return the wrong field with no warning.',
      'It can only look to the right.',
      'Leaving out FALSE gives an approximate match, which is wrong on unsorted lists.',
    ],
    related: ['XLOOKUP', 'INDEX', 'MATCH'],
  },

  // ===========================================================================
  // Dates
  // ===========================================================================
  {
    name: 'DATE',
    category: 'Dates',
    summary: 'Builds a date from a year, a month and a day.',
    detail: 'Excel stores a date as a number (days since 1900), which is why you can add to dates and subtract them. DATE creates one safely from its three parts.',
    args: [
      { name: 'year', desc: 'The four-digit year.' },
      { name: 'month', desc: 'The month, 1 to 12.' },
      { name: 'day', desc: 'The day of the month.' },
    ],
    example: { cells: { A1: 'Year', B1: 2026, A2: 'Month', B2: 3, A3: 'Day', B3: 15 }, formula: '=DATE(B1,B2,B3)', resultFormat: 'date', note: 'Assembles a real date from three numbers.' },
    realEstate: 'Building a timeline start date from separate inputs.',
    pitfalls: ['A date showing as a five-digit number is still a date. Change the cell’s format to Date.'],
    related: ['EOMONTH', 'EDATE', 'YEAR'],
    essential: true,
    card: [0, 'l0-dates'],
  },
  {
    name: 'EOMONTH',
    category: 'Dates',
    summary: 'The last day of the month, a given number of months away.',
    detail: 'Moves forward (or back) by whole months, then jumps to month-end. Use 0 for the end of the date’s own month.',
    args: [
      { name: 'start_date', desc: 'The date to start from.' },
      { name: 'months', desc: 'Months to move: 0 for this month, 1 for next month, -1 for last month.' },
    ],
    example: { cells: DATES, formats: DATE_FORMATS, formula: '=EOMONTH(B1,0)', resultFormat: 'date', note: 'The last day of the month the closing falls in.' },
    realEstate: 'Monthly timelines. Row headers of a draw schedule are usually =EOMONTH(previous, 1).',
    pitfalls: ['Never build a timeline by adding 30 days. Months have 28 to 31 days and the dates drift.'],
    related: ['EDATE', 'DATE'],
    essential: true,
  },
  {
    name: 'EDATE',
    category: 'Dates',
    summary: 'The same day of the month, a given number of months away.',
    detail: 'Moves by whole calendar months and keeps the day number: the 15th stays the 15th.',
    args: [
      { name: 'start_date', desc: 'The date to start from.' },
      { name: 'months', desc: 'Months to move. Negative numbers go back.' },
    ],
    example: { cells: DATES, formats: DATE_FORMATS, formula: '=EDATE(B1,B2)', resultFormat: 'date', note: 'The loan matures a whole number of months after closing, on the same day of the month.' },
    realEstate: 'Loan maturity dates, lease expirations, option dates.',
    pitfalls: ['For month-END timelines use EOMONTH. EDATE from the 30th stays on the 30th even in a 31-day month.'],
    related: ['EOMONTH', 'DATE'],
    essential: true,
  },
  {
    name: 'YEAR',
    category: 'Dates',
    summary: 'The year of a date.',
    detail: 'Pulls the four-digit year out of a date.',
    args: [{ name: 'serial_number', desc: 'The date.' }],
    example: { cells: DATES, formats: DATE_FORMATS, formula: '=YEAR(B3)', resultFormat: 'general', note: 'The calendar year of the sale.' },
    realEstate: 'Labelling monthly columns with their year so SUMIFS can roll months up into annual totals.',
    pitfalls: ['YEAR gives the calendar year. A deal’s “Year 1” is usually counted from closing, which is a different thing.'],
    related: ['MONTH', 'DAY', 'DATE'],
  },
  {
    name: 'MONTH',
    category: 'Dates',
    summary: 'The month of a date, as a number from 1 to 12.',
    detail: 'Pulls the month number out of a date.',
    args: [{ name: 'serial_number', desc: 'The date.' }],
    example: { cells: DATES, formats: DATE_FORMATS, formula: '=MONTH(B1)', resultFormat: 'general', note: 'The month number of the closing date.' },
    realEstate: 'Counting whole months between two dates, flagging seasonal months.',
    pitfalls: ['Subtracting two MONTH results ignores the years between them. Add (difference in YEAR) × 12.'],
    related: ['YEAR', 'DAY'],
  },
  {
    name: 'DAY',
    category: 'Dates',
    summary: 'The day of the month of a date.',
    detail: 'Pulls the day number out of a date. On a month-end date it tells you how many days that month has.',
    args: [{ name: 'serial_number', desc: 'The date.' }],
    example: { cells: DATES, formats: DATE_FORMATS, formula: '=DAY(EOMONTH(B1,0))', resultFormat: 'general', note: 'The number of days in the closing month.' },
    realEstate: 'Days in a month for prorating rent or interest.',
    pitfalls: ['DAY is the day of the month, not the number of days between dates. For that, subtract the dates.'],
    related: ['MONTH', 'YEAR', 'EOMONTH'],
  },
  {
    name: 'YEARFRAC',
    category: 'Dates',
    summary: 'The time between two dates, in years.',
    detail: 'Returns the gap as a fraction of a year, such as 5.5. An optional third argument sets the day-count convention.',
    args: [
      { name: 'start_date', desc: 'The earlier date.' },
      { name: 'end_date', desc: 'The later date.' },
      { name: 'basis', desc: 'Day-count convention. Leave it out for 30/360; use 1 for actual days.', optional: true },
    ],
    example: { cells: DATES, formats: DATE_FORMATS, formula: '=YEARFRAC(B1,B3)', resultFormat: 'num2', note: 'The length of the hold, from closing to sale, in years.' },
    realEstate: 'Hold period in years, prorating an annual figure for a partial year.',
    pitfalls: ['The default convention is 30/360, not actual days. State which one your model uses.'],
    related: ['EDATE', 'XIRR'],
  },

  // ===========================================================================
  // Loans and returns
  // ===========================================================================
  {
    name: 'PMT',
    category: 'Loans and returns',
    summary: 'The level payment on a loan.',
    detail: 'Gives the payment per period that repays a loan over a set number of periods. The rate and the number of periods must be in the same unit: for monthly payments use the annual rate ÷ 12 and years × 12.',
    args: [
      { name: 'rate', desc: 'Interest rate PER PERIOD. For monthly payments, the annual rate ÷ 12.' },
      { name: 'nper', desc: 'Number of payments. For a 30-year monthly loan, 30 × 12.' },
      { name: 'pv', desc: 'The loan amount today.' },
      { name: 'fv', desc: 'Balance left after the last payment. Leave out for a fully amortizing loan.', optional: true },
      { name: 'type', desc: '0 if payments are at the end of each period (the default), 1 if at the start.', optional: true },
    ],
    example: { cells: LOAN, formats: LOAN_FORMATS, formula: '=-PMT(B2/12,B3*12,B1)', resultFormat: 'usd2', note: 'The monthly payment. The minus sign in front shows it as a positive number.' },
    realEstate: 'Debt service on an amortizing loan. Multiply the monthly payment by 12 for the annual figure used in DSCR.',
    pitfalls: [
      'It returns a negative number, because money you pay out is negative. Put a minus sign in front.',
      'Mixing units: an annual rate with a number of months (or the reverse) gives a wildly wrong payment.',
    ],
    related: ['IPMT', 'PPMT', 'PV', 'FV'],
    essential: true,
    card: [1, 'l1-loan'],
  },
  {
    name: 'IPMT',
    category: 'Loans and returns',
    summary: 'The interest part of one loan payment.',
    detail: 'Same arguments as PMT, plus which payment you are asking about. Early payments are mostly interest.',
    args: [
      { name: 'rate', desc: 'Interest rate per period.' },
      { name: 'per', desc: 'Which payment: 1 for the first.' },
      { name: 'nper', desc: 'Total number of payments.' },
      { name: 'pv', desc: 'The loan amount.' },
      { name: 'fv', desc: 'Balance left at the end. Usually left out.', optional: true },
      { name: 'type', desc: '0 for end-of-period payments (the default).', optional: true },
    ],
    example: { cells: LOAN, formats: LOAN_FORMATS, formula: '=-IPMT(B2/12,1,B3*12,B1)', resultFormat: 'usd2', note: 'The interest in the first monthly payment.' },
    realEstate: 'The interest column of an amortization schedule; interest expense for the year.',
    pitfalls: ['Interest for a period is also just the opening balance × rate per period, which is easier to audit in a schedule.'],
    related: ['PMT', 'PPMT'],
    essential: true,
    card: [1, 'l1-loan'],
  },
  {
    name: 'PPMT',
    category: 'Loans and returns',
    summary: 'The principal part of one loan payment.',
    detail: 'The share of a payment that reduces the balance. PPMT plus IPMT equals PMT for every period.',
    args: [
      { name: 'rate', desc: 'Interest rate per period.' },
      { name: 'per', desc: 'Which payment: 1 for the first.' },
      { name: 'nper', desc: 'Total number of payments.' },
      { name: 'pv', desc: 'The loan amount.' },
      { name: 'fv', desc: 'Balance left at the end. Usually left out.', optional: true },
      { name: 'type', desc: '0 for end-of-period payments (the default).', optional: true },
    ],
    example: { cells: LOAN, formats: LOAN_FORMATS, formula: '=-PPMT(B2/12,1,B3*12,B1)', resultFormat: 'usd2', note: 'The principal repaid in the first monthly payment.' },
    realEstate: 'The principal column of an amortization schedule; working out the loan balance at sale.',
    pitfalls: ['Only principal reduces the balance. Subtracting the whole payment from the balance is a common schedule bug.'],
    related: ['PMT', 'IPMT'],
    essential: true,
    card: [1, 'l1-loan'],
  },
  {
    name: 'PV',
    category: 'Loans and returns',
    summary: 'What a stream of level payments is worth today.',
    detail: 'The reverse of PMT: give it the payment and it returns the loan that payment supports.',
    args: [
      { name: 'rate', desc: 'Interest rate per period.' },
      { name: 'nper', desc: 'Number of payments.' },
      { name: 'pmt', desc: 'The payment each period. Enter it as a negative to get a positive answer.' },
      { name: 'fv', desc: 'A lump sum at the end. Usually left out.', optional: true },
      { name: 'type', desc: '0 for end-of-period payments (the default).', optional: true },
    ],
    example: {
      cells: { A1: 'Monthly payment allowed', B1: 88000, A2: 'Annual rate', B2: 0.0625, A3: 'Years', B3: 30 },
      formats: { B1: 'usd', B2: 'pct2' },
      formula: '=PV(B2/12,B3*12,-B1)',
      resultFormat: 'usd',
      note: 'The largest loan whose monthly payment is the amount in B1.',
    },
    realEstate: 'Sizing an amortizing loan from a DSCR test: the most debt service allowed is NOI ÷ DSCR, and PV turns that into a loan amount.',
    pitfalls: ['Signs: a negative payment gives a positive loan, and the reverse.', 'Use monthly units throughout: rate ÷ 12, years × 12, and a MONTHLY payment.'],
    related: ['PMT', 'FV', 'NPV'],
    essential: true,
    card: [1, 'l1-sizing'],
  },
  {
    name: 'FV',
    category: 'Loans and returns',
    summary: 'The balance after a number of periods of interest and payments.',
    detail: 'Rolls a starting amount forward with interest, less (or plus) a payment each period. For a loan, it gives the balance still owed.',
    args: [
      { name: 'rate', desc: 'Interest rate per period.' },
      { name: 'nper', desc: 'Number of periods to roll forward.' },
      { name: 'pmt', desc: 'The payment each period.' },
      { name: 'pv', desc: 'The starting amount. For a loan balance, enter the loan as a negative.', optional: true },
      { name: 'type', desc: '0 for end-of-period payments (the default).', optional: true },
    ],
    example: {
      cells: { ...LOAN, A4: 'Years until sale', B4: 10 },
      formats: LOAN_FORMATS,
      formula: '=FV(B2/12,B4*12,-PMT(B2/12,B3*12,B1),-B1)',
      resultFormat: 'usd',
      note: 'The balance still owed when the property is sold, on a loan that amortizes over a longer period.',
    },
    realEstate: 'The balloon balance to repay at sale or refinance.',
    pitfalls: ['Use the HOLD period for the number of periods, not the amortization period, which would return zero.'],
    related: ['PV', 'PMT'],
    card: [1, 'l1-loan'],
  },
  {
    name: 'NPV',
    category: 'Loans and returns',
    summary: 'The value today of a series of future cash flows.',
    detail: 'Discounts each cash flow back at the rate you give. Excel’s NPV assumes the FIRST value is one full period away, so a Year 0 outlay must be added outside the function.',
    args: [
      { name: 'rate', desc: 'The discount rate per period: your required return.' },
      { name: 'value1', desc: 'The cash flows from Year 1 onward, usually a range.' },
      { name: 'value2', desc: 'More cash flows.', optional: true },
    ],
    repeat: 1,
    example: { cells: FLOWS, formats: FLOW_FORMATS, formula: '=NPV(0.08,B3:B7)+B2', resultFormat: 'usd', note: 'Years 1 to 5 discounted at 8%, plus the Year 0 outlay added separately.' },
    realEstate: 'Whether a deal beats your required return: a positive NPV means it does.',
    pitfalls: ['Putting Year 0 inside NPV discounts the purchase by a year. Use =NPV(rate, Year 1 onward) + Year 0.'],
    related: ['IRR', 'XNPV'],
    essential: true,
    card: [2, 'l2-returns'],
  },
  {
    name: 'IRR',
    category: 'Loans and returns',
    summary: 'The annual return implied by a series of cash flows.',
    detail: 'Finds the discount rate at which the cash flows have an NPV of zero. Give it the whole row, Year 0 included. It assumes the cash flows are evenly spaced.',
    args: [
      { name: 'values', desc: 'The cash flows in order, starting with the Year 0 outlay as a negative.' },
      { name: 'guess', desc: 'A starting guess. Almost always left out.', optional: true },
    ],
    example: { cells: FLOWS, formats: FLOW_FORMATS, formula: '=IRR(B2:B7)', resultFormat: 'pct2', note: 'The return on the cash flows from Year 0 to Year 5.' },
    realEstate: 'Unlevered IRR on the property’s cash flows; levered IRR on the equity’s cash flows.',
    pitfalls: [
      'It needs at least one negative and one positive cash flow.',
      'It assumes equal periods. Monthly cash flows give a MONTHLY rate; for irregular dates use XIRR.',
      'A high IRR on a quick deal can mean little profit. Always read it with the equity multiple.',
    ],
    related: ['XIRR', 'NPV'],
    essential: true,
    card: [2, 'l2-returns'],
  },
  {
    name: 'XNPV',
    category: 'Loans and returns',
    summary: 'NPV for cash flows on specific dates.',
    detail: 'Like NPV, but each cash flow has its own date, so the spacing can be uneven. The first cash flow is treated as today, so the Year 0 outlay goes INSIDE.',
    args: [
      { name: 'rate', desc: 'The annual discount rate.' },
      { name: 'values', desc: 'The cash flows, including the first outlay.' },
      { name: 'dates', desc: 'The date of each cash flow, the same size as the values.' },
    ],
    example: { cells: FLOWS, formats: FLOW_FORMATS, formula: '=XNPV(0.08,B2:B7,C2:C7)', resultFormat: 'usd', note: 'Each cash flow discounted by the actual time since the first date.' },
    realEstate: 'Valuing cash flows that fall on real, uneven dates: closings, distributions, a sale mid-year.',
    pitfalls: ['Unlike NPV, the first cash flow is NOT discounted. Do not add Year 0 again outside.'],
    related: ['XIRR', 'NPV'],
  },
  {
    name: 'XIRR',
    category: 'Loans and returns',
    summary: 'IRR for cash flows on specific dates.',
    detail: 'Like IRR, but uses each cash flow’s actual date. It always returns an ANNUAL rate, whatever the spacing.',
    args: [
      { name: 'values', desc: 'The cash flows, starting with the outlay as a negative.' },
      { name: 'dates', desc: 'The date of each cash flow, the same size as the values.' },
      { name: 'guess', desc: 'A starting guess. Almost always left out.', optional: true },
    ],
    example: { cells: FLOWS, formats: FLOW_FORMATS, formula: '=XIRR(B2:B7,C2:C7)', resultFormat: 'pct2', note: 'The annualised return using the real dates in column C.' },
    realEstate: 'Returns on monthly or irregular cash flows. Most institutional models report XIRR.',
    pitfalls: ['Values come first, dates second. Swapping them gives an error.', 'The dates must be real dates, not text that looks like dates.'],
    related: ['IRR', 'XNPV'],
    essential: true,
    card: [2, 'l2-returns'],
  },
  {
    name: 'RATE',
    category: 'Loans and returns',
    summary: 'The interest rate per period that links a starting amount, payments and an ending amount.',
    detail: 'Solves for the rate. With no payments in between, it is the annual growth rate that turns one amount into another.',
    args: [
      { name: 'nper', desc: 'Number of periods.' },
      { name: 'pmt', desc: 'Payment each period. Use 0 if there are none.' },
      { name: 'pv', desc: 'The amount today. Enter money paid out as a negative.' },
      { name: 'fv', desc: 'The amount at the end.', optional: true },
      { name: 'type', desc: '0 for end-of-period payments (the default).', optional: true },
      { name: 'guess', desc: 'A starting guess. Almost always left out.', optional: true },
    ],
    example: {
      cells: { A1: 'Invested today', B1: 5000000, A2: 'Received at the end', B2: 8000000, A3: 'Years', B3: 5 },
      formats: { B1: 'usd', B2: 'usd' },
      formula: '=RATE(B3,0,-B1,B2)',
      resultFormat: 'pct2',
      note: 'The annual return when one amount goes in and one comes out.',
    },
    realEstate: 'Annualised growth between two values; the rate implied by a quoted payment.',
    pitfalls: ['The amount invested and the amount received need opposite signs.'],
    related: ['IRR', 'NPER'],
  },
  {
    name: 'NPER',
    category: 'Loans and returns',
    summary: 'How many periods it takes to pay off a loan at a given payment.',
    detail: 'Solves for the number of payments.',
    args: [
      { name: 'rate', desc: 'Interest rate per period.' },
      { name: 'pmt', desc: 'The payment each period, as a negative.' },
      { name: 'pv', desc: 'The loan amount.' },
      { name: 'fv', desc: 'Balance left at the end. Usually left out.', optional: true },
      { name: 'type', desc: '0 for end-of-period payments (the default).', optional: true },
    ],
    example: {
      cells: { A1: 'Loan', B1: 1000000, A2: 'Monthly rate', B2: 0.005, A3: 'Monthly payment', B3: 10000 },
      formats: { B1: 'usd', B2: 'pct2', B3: 'usd' },
      formula: '=NPER(B2,-B3,B1)',
      resultFormat: 'num1',
      note: 'The number of monthly payments needed to repay the loan.',
    },
    realEstate: 'How long a loan takes to repay at a fixed payment; payback periods.',
    pitfalls: ['If the payment does not even cover the interest, the loan never repays and NPER returns an error.'],
    related: ['PMT', 'RATE'],
  },

  // ===========================================================================
  // Newer Excel
  // ===========================================================================
  {
    name: 'LET',
    category: 'Newer Excel',
    summary: 'Names a value inside a formula so you can reuse it.',
    detail: 'Lets you give a name to a calculation and then use the name later in the same formula. For example =LET(noi, B15+B16, noi/B9) names NOI once and then divides it by the cap rate.',
    args: [
      { name: 'name1', desc: 'A name you choose, such as noi.' },
      { name: 'name_value1', desc: 'The value or calculation that name stands for.' },
      { name: 'calculation', desc: 'The final calculation, which can use the names. (More name and value pairs can come before it.)' },
    ],
    realEstate: 'Shortening a long formula that repeats the same sub-calculation.',
    pitfalls: [
      'This app cannot evaluate LET, so a cell that uses it cannot be graded here. Split the calculation across helper cells instead, which is also easier to audit.',
      'Many firms avoid LET in shared models because reviewers cannot see the intermediate values.',
    ],
    availability: 'Excel 2021 and Microsoft 365',
    supported: false,
  },
];

const BY_NAME = new Map(FUNCTIONS.map((f) => [f.name, f]));

export function fnByName(name: string): FnDoc | undefined {
  return BY_NAME.get(name.toUpperCase());
}
