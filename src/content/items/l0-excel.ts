/**
 * LEVEL 0 - Excel fundamentals.
 * See CLAUDE.md for how to add items. Numbers are illustrative San Diego figures.
 */
import { dateToSerial } from '../../engine/format';
import {
  across,
  block,
  defineItems,
  down,
  fill,
  fillBlock,
  given,
  header,
  input,
  label,
  sheet,
  target,
  title,
  total,
} from '../build';

const TYPES3 = ['Studio', '1BR', '2BR'];
const TYPES4 = ['Studio', '1BR', '2BR', '3BR'];

export const L0_ITEMS = defineItems([
  // =========================================================================
  // References & anchoring
  // =========================================================================
  {
    id: 'l0-refs-f4-cycle',
    type: 'flashcard',
    level: 0,
    topic: 'l0-refs',
    title: 'F4 anchoring cycle',
    prompt: 'Your cursor is on the reference B2 while editing a formula. You press F4 four times. What does the reference look like after each press?',
    answer:
      '$B$2 (both locked) → B$2 (row locked) → $B2 (column locked) → B2 (nothing locked).\n\nIn this app press F4 (fn+F4 on a MacBook). In Excel for Mac, Cmd+T does the same thing.',
    tags: ['anchoring', 'F4', 'shortcut'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-refs-dollar-meaning',
    type: 'flashcard',
    level: 0,
    topic: 'l0-refs',
    title: 'What the $ locks',
    prompt: 'In the reference $B7, which part stays fixed when you copy the formula somewhere else: the column or the row?',
    answer:
      'The column. A $ locks whatever comes right after it.\n\n$B7 always stays in column B (the row can move).\nB$7 always stays on row 7 (the column can move).\n$B$7 never moves.',
    tags: ['anchoring', 'mixed references'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-refs-copy-result',
    type: 'mcq',
    level: 0,
    topic: 'l0-refs',
    title: 'Copying a mixed reference',
    prompt: 'Cell C5 contains =B$2*$A5. You copy it one column right and one row down, into D6. What does D6 contain?',
    correct: { text: '=C$2*$A6' },
    distractors: [
      { text: '=C$3*$B6', why: 'This moves every part. The $ parts must stay put: row 2 is locked in B$2 and column A is locked in $A5.', category: 'reference' },
      { text: '=B$2*$A5', why: 'This moves nothing. Only the parts with a $ in front stay fixed; the rest shift by one column and one row.', category: 'reference' },
      { text: '=C$2*$B6', why: 'The $ in front of A locks the column, so $A5 can only change its row.', category: 'reference' },
    ],
    explanation:
      'Moving one column right and one row down shifts every part that has no $ in front of it. B$2 → C$2 (the column moves, row 2 is locked). $A5 → $A6 (column A is locked, the row moves).',
    hints: ['Take each reference separately. Which half has a $ in front of it?', 'A $ locks the letter or number that follows it. Everything else shifts by one column and one row.'],
    tags: ['anchoring', 'mixed references'],
    estMinutes: 1,
  },
  {
    id: 'l0-refs-grid-rent-growth',
    type: 'grid',
    level: 0,
    topic: 'l0-refs',
    title: 'Grow a rent across five years',
    prompt:
      'Project the monthly rent for five years. Year 1 links to the starting rent. Each later year grows off the prior year by the growth rate in B3. Then annualise each year.\n\nWrite the Year 2 formula once and fill it right (select C7:F7, then Ctrl+R). It only works if the growth-rate reference is anchored.',
    workbook: {
      sheets: [
        sheet(
          'Rent',
          {
            A1: title('Rent projection: 2BR at Hillcrest Flats'),
            A3: label('Annual rent growth'),
            B3: input(0.03, 'pct1', [0.02, 0.05, 0.005]),
            A4: label('Year 1 monthly rent'),
            B4: input(2850, 'usd', [2400, 3400, 50]),
            A6: header('', 'left'),
            ...across('B6', 5, (i) => header(`Year ${i + 1}`)),
            A7: label('Monthly rent'),
            B7: target('=B4', 'usd'),
            ...across('C7', 4, target('=B7*(1+$B$3)', 'usd')),
            A8: label('Annual rent'),
            ...across('B8', 5, target('=B7*12', 'usd')),
          },
          { A: 190 },
        ),
      ],
    },
    mistakes: [
      {
        label: 'This is only the increase, not the new rent. Multiply the prior year by (1 + growth).',
        category: 'omitted',
        cells: fill('C7', 4, '=B7*$B$3'),
      },
      {
        label: 'This adds 3% as if it were dollars. Growth compounds: prior year × (1 + growth).',
        category: 'units',
        cells: fill('C7', 4, '=B7+$B$3'),
      },
      {
        label: 'This grows every year off Year 1 only. Each year should grow off the year before it.',
        category: 'reference',
        cells: fill('D7', 3, '=$B$7*(1+$B$3)'),
      },
    ],
    explanation:
      'Year 2 is =B7*(1+$B$3). B7 has no $ so it becomes C7, D7, E7 as you fill right: each year grows off the one before. $B$3 has both $ so every year keeps pointing at the single growth-rate cell.',
    hints: [
      'Two references in the Year 2 formula behave differently when filled right. One should move, one should not.',
      'Press F4 while your cursor is on a reference to lock it with $ signs.',
      'Year 2: =B7*(1+$B$3). Then select C7:F7 and press Ctrl+R to fill right.',
    ],
    tags: ['anchoring', 'growth', 'fill right'],
    estMinutes: 3,
  },
  {
    id: 'l0-refs-grid-value-matrix',
    type: 'grid',
    level: 0,
    topic: 'l0-refs',
    title: 'Value matrix with mixed references',
    prompt:
      'Fill the table with property value = NOI ÷ cap rate. NOI runs down column A and cap rates run across row 3.\n\nWrite ONE formula in B4 that you can copy to the whole table (copy B4, select B4:F8, paste). Each reference needs exactly one $.',
    workbook: {
      sheets: [
        sheet(
          'Matrix',
          {
            A1: title('Value sensitivity: NOI vs. cap rate'),
            A3: header('NOI ↓  /  Cap rate →', 'left'),
            ...across('B3', 5, (i) => input(0.045 + i * 0.0025, 'pct2', [0.04, 0.07, 0.0025])),
            ...down('A4', 5, (i) => input(1800000 + i * 100000, 'usd', [1200000, 3000000, 50000])),
            ...block('B4', 5, 5, target('=$A4/B$3', 'usd')),
          },
          { A: 150, B: 110, C: 110, D: 110, E: 110, F: 110 },
        ),
      ],
    },
    mistakes: [
      {
        label: 'Value is NOI divided by the cap rate, not multiplied by it.',
        category: 'concept',
        cells: fillBlock('B4', 5, 5, '=$A4*B$3'),
      },
      {
        label: 'This is upside down. Value = NOI ÷ cap rate.',
        category: 'concept',
        cells: fillBlock('B4', 5, 5, '=B$3/$A4'),
      },
    ],
    explanation:
      'B4 is =$A4/B$3. The NOI reference must always stay in column A but move down the rows, so lock the column: $A4. The cap rate must always stay on row 3 but move across the columns, so lock the row: B$3.',
    hints: [
      'As you copy right, which reference must stay in the same column? As you copy down, which must stay on the same row?',
      'Mixed references lock only one half: $A4 locks the column, B$3 locks the row. F4 cycles through them.',
      '=$A4/B$3',
    ],
    tags: ['anchoring', 'mixed references', 'sensitivity'],
    estMinutes: 3,
  },

  // =========================================================================
  // Core functions
  // =========================================================================
  {
    id: 'l0-core-iferror',
    type: 'flashcard',
    level: 0,
    topic: 'l0-core',
    title: 'IFERROR: use and risk',
    prompt: 'What does =IFERROR(A1/B1, 0) do, and why can it be risky in a model?',
    answer:
      'It returns A1/B1, or 0 if that calculation produces any error (such as #DIV/0!).\n\nThe risk: it hides every error, including real bugs like a broken reference. Use it only where an error is expected, such as dividing by a cell that can legitimately be zero.',
    tags: ['IFERROR', 'errors'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-core-min-max',
    type: 'flashcard',
    level: 0,
    topic: 'l0-core',
    title: 'MIN and MAX as caps and floors',
    prompt: 'Write a formula for each: (1) the smaller of A1 and B1, (2) A1, but never less than zero.',
    answer:
      '(1) =MIN(A1,B1)\n(2) =MAX(A1,0)\n\nMIN picks the binding (smaller) limit, which is how lenders size loans. MAX(x, 0) puts a floor at zero, for example cash available to distribute cannot be negative.',
    tags: ['MIN', 'MAX'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-core-round',
    type: 'mcq',
    level: 0,
    topic: 'l0-core',
    title: 'ROUND with negative digits',
    prompt: 'What does =ROUND({val}, -2) return?',
    vars: [{ name: 'val', choices: [1267.482, 2851.337, 48376.915, 7462.058, 15689.224] }],
    correct: { formula: '=ROUND(val,-2)' },
    distractors: [
      { formula: '=ROUND(val,2)', why: 'Positive digits round to decimal places. Negative digits round to the left of the decimal point.', category: 'function' },
      { formula: '=ROUNDDOWN(val,-2)', why: 'ROUND goes to the nearest hundred, which here is up. ROUNDDOWN always goes down.', category: 'function' },
      { formula: '=ROUND(val,-1)', why: '-1 rounds to the nearest ten. -2 rounds to the nearest hundred.', category: 'function' },
    ],
    explanation:
      'The second argument is the number of digits. 2 means two decimal places, 0 means whole numbers, -2 means the nearest hundred. So =ROUND({val}, -2) = {=ROUND(val,-2)}.',
    hints: ['A negative digit count rounds to the left of the decimal point.', '-1 is tens, -2 is hundreds, -3 is thousands.'],
    tags: ['ROUND'],
    estMinutes: 1,
  },
  {
    id: 'l0-core-grid-rent-roll',
    type: 'grid',
    level: 0,
    topic: 'l0-core',
    title: 'Rent roll with IF and MAX',
    prompt:
      'Complete the rent roll.\n\n• Collected rent: the lease rent if the unit is "Occupied", otherwise 0.\n• Loss to lease: market rent minus lease rent, for occupied units only, and never below zero (a unit leased above market has no loss to lease).\n• Total both columns, then compute physical occupancy (occupied units ÷ all units).',
    workbook: {
      sheets: [
        sheet(
          'RentRoll',
          {
            A1: title('Rent roll: Bankers Hill fourplex'),
            A3: header('Unit', 'left'),
            B3: header('Status', 'left'),
            C3: header('Market rent'),
            D3: header('Lease rent'),
            E3: header('Collected rent'),
            F3: header('Loss to lease'),
            ...down('A4', 4, (i) => label(['101', '102', '201', '202'][i])),
            ...down('B4', 4, (i) => input(['Occupied', 'Occupied', 'Vacant', 'Occupied'][i], 'text', { choices: ['Occupied', 'Vacant'] })),
            ...down('C4', 4, (i) => input([2400, 2400, 2950, 2950][i], 'usd', [2200, 3200, 50])),
            ...down('D4', 4, (i) => input([2250, 2350, 2700, 3050][i], 'usd', [2000, 3400, 50])),
            ...down('E4', 4, target('=IF(B4="Occupied",D4,0)', 'usd')),
            ...down('F4', 4, target('=IF(B4="Occupied",MAX(C4-D4,0),0)', 'usd')),
            A8: total('Total'),
            E8: target('=SUM(E4:E7)', 'usd', { border: 'top' }),
            F8: target('=SUM(F4:F7)', 'usd', { border: 'top' }),
            A10: label('Physical occupancy'),
            B10: target('=COUNTIF(B4:B7,"Occupied")/COUNTA(B4:B7)', 'pct'),
          },
          { A: 150, B: 100, C: 105, D: 105, E: 115, F: 115 },
        ),
      ],
    },
    edgeCases: [
      // every unit occupied and leased above market
      { B4: 'Occupied', B5: 'Occupied', B6: 'Occupied', B7: 'Occupied', D4: 2600, D5: 2650, D6: 3100, D7: 3200 },
      // every unit occupied and leased below market
      { B4: 'Occupied', B5: 'Occupied', B6: 'Occupied', B7: 'Occupied', D4: 2100, D5: 2200, D6: 2700, D7: 2800 },
      // every unit vacant, with market rent above the old lease rent
      { B4: 'Vacant', B5: 'Vacant', B6: 'Vacant', B7: 'Vacant', D7: 2800 },
    ],
    mistakes: [
      {
        label: 'Vacant units collect no rent. Wrap the rent in IF(status="Occupied", rent, 0).',
        category: 'omitted',
        cells: fill('E4', 4, '=D4', 'down'),
      },
      {
        label: 'A unit leased above market shows a negative loss here. Floor it at zero with MAX(…, 0).',
        category: 'function',
        cells: fill('F4', 4, '=IF(B4="Occupied",C4-D4,0)', 'down'),
      },
      {
        label: 'Vacant units have no lease, so they have no loss to lease. Test the status first.',
        category: 'omitted',
        cells: fill('F4', 4, '=MAX(C4-D4,0)', 'down'),
      },
    ],
    explanation:
      'Collected rent: =IF(B4="Occupied",D4,0). Loss to lease: =IF(B4="Occupied",MAX(C4-D4,0),0). The MAX stops unit 202, which is leased above market, from showing a negative loss. Occupancy: =COUNTIF(B4:B7,"Occupied")/COUNTA(B4:B7).',
    hints: [
      'Both columns depend on the Status cell. Which function chooses between two results?',
      'IF(test, value_if_true, value_if_false). Text in a test needs quotes: B4="Occupied". MAX(x, 0) stops a number going negative.',
      'Collected: =IF(B4="Occupied",D4,0)   Loss to lease: =IF(B4="Occupied",MAX(…),0)',
    ],
    tags: ['IF', 'MAX', 'SUM', 'COUNTIF', 'rent roll'],
    estMinutes: 5,
  },

  // =========================================================================
  // SUMIFS & SUMPRODUCT
  // =========================================================================
  {
    id: 'l0-agg-sumifs-order',
    type: 'flashcard',
    level: 0,
    topic: 'l0-agg',
    title: 'SUMIFS argument order',
    prompt: 'In SUMIFS, which comes first: the range you are adding up, or the range you are testing?',
    answer:
      'The range you are adding up comes first:\n=SUMIFS(sum_range, criteria_range1, criteria1, criteria_range2, criteria2, …)\n\nWatch out: the older SUMIF puts it last (range, criteria, sum_range). Mixing the two up is a classic error.',
    tags: ['SUMIFS', 'SUMIF'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-agg-sumproduct-result',
    type: 'mcq',
    level: 0,
    topic: 'l0-agg',
    title: 'What SUMPRODUCT returns',
    prompt:
      'A building has {studios} studios renting at {studio_rent} and {ones} one-bedrooms renting at {one_rent}. Unit counts are in B4:B5 and rents are in D4:D5. What does =SUMPRODUCT(B4:B5, D4:D5) return?',
    vars: [
      { name: 'studios', min: 12, max: 24, step: 2, format: 'int' },
      { name: 'ones', min: 30, max: 60, step: 2, format: 'int' },
      { name: 'studio_rent', min: 2000, max: 2500, step: 50, format: 'usd' },
      { name: 'one_rent', min: 2600, max: 3200, step: 50, format: 'usd' },
    ],
    correct: { formula: '=studios*studio_rent+ones*one_rent' },
    distractors: [
      { formula: '=(studios+ones)*(studio_rent+one_rent)', why: 'That multiplies the two totals. SUMPRODUCT multiplies row by row first, then adds.', category: 'function' },
      { formula: '=(studios+ones)*(studio_rent+one_rent)/2', why: 'That is total units times the simple average rent. It ignores that there are more one-bedrooms than studios.', category: 'concept' },
      { formula: '=studios+ones+studio_rent+one_rent', why: 'That just adds everything. SUMPRODUCT multiplies each pair, then adds the results.', category: 'function' },
    ],
    format: 'usd',
    explanation:
      'SUMPRODUCT multiplies matching rows and adds the results: {studios} × {studio_rent} + {ones} × {one_rent} = {=studios*studio_rent+ones*one_rent|usd} of monthly rent. It is the standard way to get a weighted total.',
    hints: ['SUMPRODUCT works row by row.', 'Multiply each unit count by its own rent, then add the two results.'],
    tags: ['SUMPRODUCT', 'weighted average'],
    estMinutes: 1.5,
  },
  {
    id: 'l0-agg-grid-sumifs-unit-mix',
    type: 'grid',
    level: 0,
    topic: 'l0-agg',
    title: 'Summarise a rent roll with SUMIFS',
    prompt:
      'Summarise the rent roll by unit type: count the units, total their square feet and rent, and compute the average rent.\n\nWrite each formula once in row 14 and fill down. Wrap the average in IFERROR so a type with no units shows 0 instead of an error.',
    workbook: {
      sheets: [
        sheet(
          'Mix',
          {
            A1: title('Unit mix summary: North Park Lofts'),
            A3: header('Unit', 'left'),
            B3: header('Type', 'left'),
            C3: header('SF'),
            D3: header('Monthly rent'),
            ...down('A4', 8, (i) => label(String(101 + i))),
            ...down('B4', 8, (i) => input(['Studio', '1BR', '1BR', '2BR', 'Studio', '1BR', '2BR', '2BR'][i], 'text', { choices: TYPES3 })),
            ...down('C4', 8, (i) => input([480, 650, 675, 920, 495, 660, 940, 955][i], 'int', [450, 1000, 5])),
            ...down('D4', 8, (i) => input([1950, 2450, 2500, 3250, 1995, 2475, 3300, 3350][i], 'usd', [1900, 3500, 25])),
            A13: header('Type', 'left'),
            B13: header('Units'),
            C13: header('Total SF'),
            D13: header('Total rent'),
            E13: header('Avg rent'),
            ...down('A14', 3, (i) => label(TYPES3[i])),
            ...down('B14', 3, target('=COUNTIF($B$4:$B$11,$A14)', 'int')),
            ...down('C14', 3, target('=SUMIFS(C$4:C$11,$B$4:$B$11,$A14)', 'int')),
            ...down('D14', 3, target('=SUMIFS(D$4:D$11,$B$4:$B$11,$A14)', 'usd')),
            ...down('E14', 3, target('=IFERROR(D14/B14,0)', 'usd')),
          },
          { A: 90, B: 90, C: 90, D: 110, E: 100 },
        ),
      ],
    },
    edgeCases: [
      // no studios at all: the average must not show #DIV/0!
      { B4: '1BR', B8: '2BR' },
      // only studios
      { B4: 'Studio', B5: 'Studio', B6: 'Studio', B7: 'Studio', B8: 'Studio', B9: 'Studio', B10: 'Studio', B11: 'Studio' },
    ],
    mistakes: [
      {
        label: 'This divides by zero when a type has no units. Wrap it in IFERROR(…, 0).',
        category: 'function',
        cells: fill('E14', 3, '=D14/B14', 'down'),
      },
      {
        label: 'The unit type is typed into the formula, so every row returns the Studio total. Point the criteria at the label in column A.',
        category: 'hardcode',
        cells: fill('D15', 2, '=SUMIFS(D$4:D$11,$B$4:$B$11,"Studio")', 'down'),
      },
      {
        label: 'This totals every unit. Use SUMIFS so only the matching unit type is added.',
        category: 'omitted',
        cells: { ...fill('C14', 3, '=SUM(C$4:C$11)', 'down'), ...fill('D14', 3, '=SUM(D$4:D$11)', 'down') },
      },
    ],
    explanation:
      'Units: =COUNTIF($B$4:$B$11,$A14). Totals: =SUMIFS(C$4:C$11,$B$4:$B$11,$A14), where the first argument is the range being added and the Type column is the test. Average: =IFERROR(D14/B14,0). The $ anchors keep the ranges fixed as you fill down.',
    hints: [
      'You want a total of one column, but only for rows where another column matches a label.',
      'COUNTIF(range, criteria) counts matches. SUMIFS(sum_range, criteria_range, criteria) adds matches. Anchor the ranges with $ so they stay put when you fill down.',
      'C14: =SUMIFS(C$4:C$11,$B$4:$B$11,$A14)',
    ],
    tags: ['SUMIFS', 'COUNTIF', 'IFERROR', 'unit mix'],
    estMinutes: 6,
  },
  {
    id: 'l0-agg-grid-sumproduct-mix',
    type: 'grid',
    level: 0,
    topic: 'l0-agg',
    title: 'Weighted averages with SUMPRODUCT',
    prompt:
      'Each row is a unit type with its count, average size and monthly rent. Work out the building totals and the weighted averages. A weighted average counts each type in proportion to how many units it has.',
    workbook: {
      sheets: [
        sheet(
          'Mix',
          {
            A1: title('Unit mix: Little Italy mid-rise'),
            A3: header('Type', 'left'),
            B3: header('Units'),
            C3: header('Avg SF'),
            D3: header('Rent / month'),
            ...down('A4', 4, (i) => label(TYPES4[i])),
            ...down('B4', 4, (i) => input([24, 46, 32, 8][i], 'int', [4, 60, 2])),
            ...down('C4', 4, (i) => input([510, 690, 1020, 1310][i], 'int', [450, 1400, 10])),
            ...down('D4', 4, (i) => input([2350, 2950, 3950, 5100][i], 'usd', [2000, 5500, 50])),
            A9: label('Total units'),
            B9: target('=SUM(B4:B7)', 'int'),
            A10: label('Total rentable SF'),
            B10: target('=SUMPRODUCT(B4:B7,C4:C7)', 'int'),
            A11: label('Gross potential rent / month'),
            B11: target('=SUMPRODUCT(B4:B7,D4:D7)', 'usd'),
            A12: label('Weighted average rent / unit'),
            B12: target('=B11/B9', 'usd'),
            A13: label('Weighted average rent / SF'),
            B13: target('=B11/B10', 'usd2'),
          },
          { A: 210, B: 110, C: 90, D: 110 },
        ),
      ],
    },
    mistakes: [
      {
        label: 'A simple average treats every unit type as equally common. Divide total rent by total units.',
        category: 'concept',
        cells: { B12: '=AVERAGE(D4:D7)' },
      },
      {
        label: 'This adds up the average sizes. Multiply each size by its unit count first (SUMPRODUCT).',
        category: 'omitted',
        cells: { B10: '=SUM(C4:C7)' },
      },
      {
        label: 'This adds up the four rents. Multiply each rent by its unit count first (SUMPRODUCT).',
        category: 'omitted',
        cells: { B11: '=SUM(D4:D7)' },
      },
      {
        label: 'Rent per SF is total rent ÷ total SF. Averaging the rents and sizes separately ignores the unit counts.',
        category: 'concept',
        cells: { B13: '=AVERAGE(D4:D7)/AVERAGE(C4:C7)' },
      },
    ],
    explanation:
      'Total SF is =SUMPRODUCT(B4:B7,C4:C7): each count times its size, added up. Rent works the same way. The weighted averages are then total rent ÷ total units and total rent ÷ total SF. A plain AVERAGE of the rent column would overweight the eight 3BRs.',
    hints: [
      'There are far more 1BRs than 3BRs. How do you make each type count in proportion?',
      'SUMPRODUCT(counts, values) multiplies row by row and adds. Weighted average = SUMPRODUCT(counts, values) ÷ SUM(counts).',
      'B11: =SUMPRODUCT(B4:B7,D4:D7)   B12: =B11/B9',
    ],
    tags: ['SUMPRODUCT', 'weighted average', 'unit mix'],
    estMinutes: 4,
  },

  // =========================================================================
  // Lookups
  // =========================================================================
  {
    id: 'l0-lookup-xlookup-args',
    type: 'flashcard',
    level: 0,
    topic: 'l0-lookup',
    title: 'XLOOKUP arguments',
    prompt: 'What are the three required arguments of XLOOKUP, in order?',
    answer:
      '=XLOOKUP(lookup_value, lookup_array, return_array)\n\nIt finds lookup_value in lookup_array and returns the item in the same position of return_array. Exact match is the default. An optional 4th argument sets what to show if nothing is found.',
    requires: ['XLOOKUP'],
    tags: ['XLOOKUP'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-lookup-index-match',
    type: 'flashcard',
    level: 0,
    topic: 'l0-lookup',
    title: 'INDEX / MATCH pattern',
    prompt: 'Unit types are in A4:A7 and rents are in B4:B7. Write an INDEX/MATCH formula that returns the rent for the unit type typed in E2.',
    answer:
      '=INDEX(B4:B7, MATCH(E2, A4:A7, 0))\n\nMATCH finds the position of E2 in the type list (the 0 means exact match). INDEX returns the rent at that position. It works in every version of Excel.',
    tags: ['INDEX', 'MATCH'],
    estMinutes: 1,
  },
  {
    id: 'l0-lookup-vlookup-weakness',
    type: 'mcq',
    level: 0,
    topic: 'l0-lookup',
    title: 'Why not VLOOKUP?',
    prompt: 'Why do most modelers prefer XLOOKUP or INDEX/MATCH over VLOOKUP?',
    correct: { text: 'VLOOKUP relies on a typed column number that breaks when columns are inserted, and it can only look to the right.' },
    distractors: [
      { text: 'VLOOKUP cannot do exact matches.', why: 'It can: put FALSE as the fourth argument. The real problems are the typed column number and the look-right limit.', category: 'function' },
      { text: 'VLOOKUP only works on numbers, not text.', why: 'VLOOKUP handles text fine. Its weakness is structural: a hardcoded column number.', category: 'function' },
      { text: 'VLOOKUP is banned by lenders in underwriting models.', why: 'There is no such rule. Modelers avoid it because it is fragile, not because it is prohibited.', category: 'concept' },
    ],
    explanation:
      'In =VLOOKUP(x, A:D, 3, FALSE) the 3 is a hardcode. Insert a column and it silently returns the wrong field. VLOOKUP also needs the lookup column to be the leftmost one. XLOOKUP and INDEX/MATCH point at the actual return range, so they survive edits.',
    hints: ['Think about what happens to =VLOOKUP(x, A:D, 3, FALSE) when someone inserts a new column B.'],
    tags: ['VLOOKUP', 'XLOOKUP', 'model hygiene'],
    estMinutes: 1,
  },
  {
    id: 'l0-lookup-grid-market-rent',
    type: 'grid',
    level: 0,
    topic: 'l0-lookup',
    title: 'Look up market rents',
    prompt:
      'For each unit, look up the market rent for its type from the table at the top, then compute the upside (market rent minus lease rent). Total both columns.\n\nUse XLOOKUP or INDEX/MATCH. Write the formula once in D10 and fill down, so the table references need anchoring.',
    workbook: {
      sheets: [
        sheet(
          'Rents',
          {
            A1: title('Mark-to-market: Pacific Beach walk-up'),
            A3: header('Type', 'left'),
            B3: header('Market rent'),
            ...down('A4', 4, (i) => label(TYPES4[i])),
            ...down('B4', 4, (i) => input([2100, 2650, 3400, 4300][i], 'usd', [1900, 4800, 50])),
            A9: header('Unit', 'left'),
            B9: header('Type', 'left'),
            C9: header('Lease rent'),
            D9: header('Market rent'),
            E9: header('Upside'),
            ...down('A10', 6, (i) => label(String(i + 1))),
            ...down('B10', 6, (i) => input(['1BR', 'Studio', '2BR', '1BR', '3BR', '2BR'][i], 'text', { choices: TYPES4 })),
            ...down('C10', 6, (i) => input([2400, 1950, 3150, 2650, 3900, 3300][i], 'usd', [1800, 4400, 50])),
            ...down('D10', 6, target('=XLOOKUP(B10,$A$4:$A$7,$B$4:$B$7)', 'usd')),
            ...down('E10', 6, target('=D10-C10', 'usd')),
            A16: total('Total'),
            C16: given('=SUM(C10:C15)', 'usd', { border: 'top' }),
            D16: target('=SUM(D10:D15)', 'usd', { border: 'top' }),
            E16: target('=SUM(E10:E15)', 'usd', { border: 'top' }),
          },
          { A: 90, B: 100, C: 105, D: 110, E: 100 },
        ),
      ],
    },
    edgeCases: [
      { B10: 'Studio', B11: 'Studio', B12: 'Studio', B13: 'Studio', B14: 'Studio', B15: 'Studio' },
      { B10: '3BR', B11: '3BR', B12: '3BR', B13: '3BR', B14: '3BR', B15: '3BR' },
      { B10: '2BR', B11: '1BR', B12: 'Studio', B13: '3BR', B14: '1BR', B15: 'Studio' },
    ],
    mistakes: [
      {
        label: 'This returns the lease rent, not the market rent. Look the type up in the table at the top.',
        category: 'reference',
        cells: fill('D10', 6, '=C10', 'down'),
      },
      {
        label: 'This looks the type up but returns the type column. The third argument should be the rent column, B4:B7.',
        category: 'function',
        cells: fill('D10', 6, '=XLOOKUP(B10,$A$4:$A$7,$A$4:$A$7)', 'down'),
      },
    ],
    explanation:
      'D10 is =XLOOKUP(B10,$A$4:$A$7,$B$4:$B$7): find this unit’s type in the type list and return the rent beside it. The table ranges are fully anchored so they do not slide down as you fill. =INDEX($B$4:$B$7,MATCH(B10,$A$4:$A$7,0)) does the same job.',
    hints: [
      'Each unit needs the rent that sits beside its type in the small table.',
      'XLOOKUP(what to find, where to look, what to return). Lock the table ranges with $ before filling down.',
      '=XLOOKUP(B10,$A$4:$A$7,$B$4:$B$7)',
    ],
    tags: ['XLOOKUP', 'INDEX', 'MATCH', 'anchoring'],
    estMinutes: 5,
  },

  // =========================================================================
  // Dates & timelines
  // =========================================================================
  {
    id: 'l0-dates-edate-vs-eomonth',
    type: 'flashcard',
    level: 0,
    topic: 'l0-dates',
    title: 'EDATE vs. EOMONTH',
    prompt: 'What is the difference between =EDATE(A1, 1) and =EOMONTH(A1, 1)?',
    answer:
      'EDATE moves forward exactly one month and keeps the same day number: Jan 15 → Feb 15.\n\nEOMONTH moves forward one month and then jumps to the last day of that month: Jan 15 → Feb 28.\n\nUse EOMONTH to build month-end timelines.',
    tags: ['EDATE', 'EOMONTH', 'dates'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-dates-eomonth-zero',
    type: 'mcq',
    level: 0,
    topic: 'l0-dates',
    title: 'EOMONTH with zero months',
    prompt: 'What does =EOMONTH(DATE(2026, {mon}, {day}), 0) return?',
    vars: [
      { name: 'mon', choices: [2, 4, 6, 9, 11] },
      { name: 'day', choices: [5, 10, 18, 22] },
    ],
    correct: { formula: '=EOMONTH(DATE(2026,mon,day),0)' },
    distractors: [
      { formula: '=EOMONTH(DATE(2026,mon,day),1)', why: 'That is the end of the NEXT month. A 0 means “the month this date is already in”.', category: 'timing' },
      { formula: '=EOMONTH(DATE(2026,mon,day),-1)', why: 'That is the end of the PREVIOUS month, which is what -1 returns.', category: 'timing' },
      { formula: '=DATE(2026,mon,day)+30', why: 'EOMONTH does not add days. It jumps to the last calendar day of a month.', category: 'function' },
    ],
    format: 'date',
    explanation:
      'EOMONTH(date, 0) returns the last day of the month the date is in: {=EOMONTH(DATE(2026,mon,day),0)|date}. Use 1 for next month-end, -1 for the previous one.',
    hints: ['The second argument is how many months to move before jumping to month-end.'],
    tags: ['EOMONTH', 'dates'],
    estMinutes: 1,
  },
  {
    id: 'l0-dates-grid-timeline',
    type: 'grid',
    level: 0,
    topic: 'l0-dates',
    title: 'Build a month-end timeline',
    prompt:
      'Build a six-month timeline from the closing date.\n\n• Month 1 ends on the last day of the closing month. Each later month ends on the last day of the next month.\n• Days in month is the day number of each month-end.\n• Rent is due the day after each month-end.\n• The loan matures a whole number of months after closing, on the same day of the month.',
    workbook: {
      sheets: [
        sheet(
          'Timeline',
          {
            A1: title('Monthly timeline'),
            A3: label('Closing date'),
            B3: input(dateToSerial(2026, 3, 15), 'date', {
              choices: [
                dateToSerial(2026, 1, 20),
                dateToSerial(2026, 3, 15),
                dateToSerial(2026, 6, 8),
                dateToSerial(2026, 8, 18),
                dateToSerial(2026, 11, 12),
              ],
            }),
            A4: label('Loan term (months)'),
            B4: input(36, 'int', [24, 60, 12]),
            A6: header('', 'left'),
            ...across('B6', 6, (i) => header(`Month ${i + 1}`)),
            A7: label('Month end'),
            B7: target('=EOMONTH(B3,0)', 'date'),
            ...across('C7', 5, target('=EOMONTH(B7,1)', 'date')),
            A8: label('Days in month'),
            ...across('B8', 6, target('=DAY(B7)', 'int')),
            A9: label('Next rent due'),
            ...across('B9', 6, target('=B7+1', 'date')),
            A11: label('Loan maturity date'),
            B11: target('=EDATE(B3,B4)', 'date'),
          },
          { A: 170, B: 100, C: 100, D: 100, E: 100, F: 100, G: 100 },
        ),
      ],
    },
    edgeCases: [
      { B3: dateToSerial(2026, 4, 10) },
      { B3: dateToSerial(2026, 5, 5) },
      { B3: dateToSerial(2026, 1, 31), B4: 25 },
    ],
    mistakes: [
      {
        label: 'Adding 30 days drifts off month-end. EOMONTH(date, 1) always lands on the last day of the next month.',
        category: 'function',
        cells: fill('C7', 5, '=B7+30'),
      },
      {
        label: 'EDATE keeps the day number, so after a 30-day month it stays on the 30th. Use EOMONTH for month-ends.',
        category: 'function',
        cells: fill('C7', 5, '=EDATE(B7,1)'),
      },
      {
        label: 'Months are not all 30 days. EDATE(start, months) moves by whole calendar months.',
        category: 'function',
        cells: { B11: '=B3+B4*30' },
      },
      {
        label: 'This returns the month number. DAY() of a month-end gives the number of days in that month.',
        category: 'function',
        cells: fill('B8', 6, '=MONTH(B7)'),
      },
    ],
    explanation:
      'Month 1: =EOMONTH(B3,0). Later months: =EOMONTH(B7,1), filled right. Days in month: =DAY(B7). Next rent due: =B7+1, because dates are just numbers and one day is 1. Maturity: =EDATE(B3,B4), which keeps the day of the month.',
    hints: [
      'Two functions move a date by whole months. One keeps the day number, the other jumps to month-end.',
      'EOMONTH(date, 0) is the end of the date’s own month. EOMONTH(date, 1) is the end of the next month. EDATE(date, n) moves n months and keeps the day.',
      'B7: =EOMONTH(B3,0)   C7: =EOMONTH(B7,1)   B11: =EDATE(B3,B4)',
    ],
    tags: ['EOMONTH', 'EDATE', 'DAY', 'timeline'],
    estMinutes: 5,
  },

  // =========================================================================
  // Model hygiene
  // =========================================================================
  {
    id: 'l0-hygiene-colors',
    type: 'flashcard',
    level: 0,
    topic: 'l0-hygiene',
    title: 'Font colour conventions',
    prompt: 'In a standard real estate model, what do blue, black and green font colours mean?',
    answer:
      'Blue = a hardcoded input you can change.\nBlack = a formula.\nGreen = a link that pulls from another sheet.\n\nAnyone opening the model can then see at a glance which numbers are assumptions and which are calculated.',
    tags: ['formatting', 'conventions'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-hygiene-one-formula-per-row',
    type: 'flashcard',
    level: 0,
    topic: 'l0-hygiene',
    title: 'One formula per row',
    prompt: 'What does “one formula per row” mean, and why does it matter?',
    answer:
      'Every cell across a row (Year 1 through Year 10) uses the same formula, written once and filled right.\n\nIt makes a model quick to audit, because you check one cell and trust the rest of the row, and it forces you to get the $ anchoring right.',
    tags: ['conventions', 'auditing'],
    estMinutes: 0.5,
  },
  {
    id: 'l0-hygiene-buried-hardcode',
    type: 'mcq',
    level: 0,
    topic: 'l0-hygiene',
    title: 'The buried assumption',
    prompt: 'A reviewer finds =B12*1.03 in a rent row. What is the main problem?',
    correct: { text: 'The 3% growth is buried in the formula. It should be a labelled blue input that the formula links to.' },
    distractors: [
      { text: 'The formula should be wrapped in ROUND.', why: 'Rounding is not the issue. The issue is an assumption nobody can see or change in one place.', category: 'concept' },
      { text: '1.03 should be written as 103%.', why: 'That is the same hidden hardcode in different clothes. The growth rate needs its own input cell.', category: 'hardcode' },
      { text: 'Nothing. Short formulas are best practice.', why: 'Short is good, but a hidden assumption cannot be found, flexed or sensitised. Every assumption belongs in an input cell.', category: 'hardcode' },
    ],
    explanation:
      'Any number typed inside a formula is a hidden assumption. Put 3.0% in a labelled blue input cell and write =B12*(1+$B$3). Then one change updates every year, and a reviewer can see the assumption.',
    hints: ['Where would you go to change the growth rate from 3% to 4%?'],
    tags: ['hardcodes', 'conventions'],
    estMinutes: 1,
  },
]);
