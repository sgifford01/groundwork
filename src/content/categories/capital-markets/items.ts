/** Debt & Capital Markets: seed questions. See BUILD_SPEC.md in this folder before adding more. Rate levels are illustrative. */
import { across, fill, given, header, input, label, note, sheet, target, title } from '../../build';
import { categoryItems } from '../define';

const SOFR: [number, number, number] = [0.03, 0.065, 0.0025];

export const ITEMS = categoryItems('capital-markets', [
  {
    id: 'capital-markets-rates-grid-rate-cap',
    type: 'grid',
    level: 1,
    topic: 'capital-markets-rates',
    title: 'Interest on a floating-rate loan with a cap',
    prompt:
      'A bridge loan charges SOFR plus a spread. The borrower bought an interest rate cap: whenever SOFR is above the strike, the cap provider pays the difference. For each year, compute the capped index, the all-in rate, the borrower’s net interest cost, what the cap provider pays and what the lender receives. (The SOFR path is illustrative, not a forecast.)',
    tags: ['SOFR', 'rate cap', 'floating rate', 'MIN', 'MAX'],
    estMinutes: 8,
    hints: [
      'A cap puts a ceiling on the INDEX, not on the whole rate. The spread comes on top.',
      'The lower of two numbers is MIN. A payment that is zero unless SOFR is above the strike is MAX(0, ...).',
      'Capped SOFR: =MIN(B7,$B$5). Cap payment: =MAX(0,B7-$B$5)*$B$3. The lender is still owed the full uncapped rate.',
    ],
    workbook: {
      sheets: [
        sheet(
          'Cap',
          {
            A1: title('Floating-rate loan with an interest rate cap'),
            A3: label('Loan balance (interest only)'),
            B3: input(30000000, 'usd', [15000000, 45000000, 1000000]),
            A4: label('Spread over SOFR'),
            B4: input(0.03, 'pct2', [0.02, 0.04, 0.0025]),
            A5: label('Cap strike (on SOFR)'),
            B5: input(0.045, 'pct2', [0.04, 0.055, 0.0025]),
            B6: header('Year 1'),
            C6: header('Year 2'),
            D6: header('Year 3'),
            E6: header('Year 4'),
            A7: label('SOFR (illustrative path)'),
            B7: input(0.043, 'pct2', SOFR),
            C7: input(0.049, 'pct2', SOFR),
            D7: input(0.054, 'pct2', SOFR),
            E7: input(0.039, 'pct2', SOFR),
            A9: label('SOFR after the cap'),
            ...across('B9', 4, target('=MIN(B7,$B$5)', 'pct2')),
            A10: label('All-in rate to the borrower'),
            ...across('B10', 4, target('=B9+$B$4', 'pct2')),
            A11: label('Net interest cost'),
            ...across('B11', 4, target('=$B$3*B10', 'usd')),
            A12: label('Paid by the cap provider'),
            ...across('B12', 4, target('=MAX(0,B7-$B$5)*$B$3', 'usd')),
            A13: label('Interest received by the lender'),
            ...across('B13', 4, target('=$B$3*(B7+$B$4)', 'usd')),
            A15: label('Check: lender interest - cap payments - net cost'),
            B15: given('=SUM(B13:E13)-SUM(B12:E12)-SUM(B11:E11)', 'usd'),
            A17: note('Illustrative rates. A real cap also costs an upfront premium, which is not modelled here.'),
          },
          { A: 320, B: 110, C: 110, D: 110, E: 110 },
        ),
      ],
    },
    edgeCases: [{ B7: 0.03, C7: 0.035, D7: 0.06, E7: 0.065 }, { B5: 0.04 }, { B5: 0.055 }],
    mistakes: [
      {
        label: 'A cap is a ceiling: the borrower pays the LOWER of SOFR and the strike. MAX would turn it into a floor.',
        category: 'concept',
        cells: fill('B9', 4, '=MAX(B7,$B$5)'),
      },
      {
        label: 'The strike caps SOFR, not the all-in rate. Cap the index first, then add the spread.',
        category: 'wrong-base',
        cells: fill('B10', 4, '=MIN(B7+$B$4,$B$5)'),
      },
      {
        label: 'The cap pays only when SOFR is above the strike. Below it the payment is zero, never negative: use MAX(0, ...).',
        category: 'function',
        cells: fill('B12', 4, '=(B7-$B$5)*$B$3'),
      },
      {
        label: 'The lender is still owed the full uncapped rate. The difference comes from the cap provider, not from the lender accepting less.',
        category: 'concept',
        cells: fill('B13', 4, '=$B$3*B10'),
      },
    ],
    explanation:
      'A cap is insurance bought from a third party. The loan itself is unchanged: the lender always receives SOFR plus the spread. In any year SOFR is above the strike, the cap provider pays the borrower the excess on the loan balance, so the borrower’s net cost behaves as if SOFR had stopped at the strike. The check row shows the three cash flows tie out.',
  },
  {
    id: 'capital-markets-refinance-judgment-extension-test',
    type: 'judgment',
    level: 2,
    topic: 'capital-markets-refinance',
    title: 'A bridge loan that will miss its extension test',
    prompt:
      'You are the analyst on a value-add apartment deal in Chula Vista (illustrative). The {loan|usd} floating-rate bridge loan matures in six months. It has one 12-month extension option, available only if the property passes a debt yield test of {test|pct1}. Leasing is behind plan: NOI is {noi|usd}, a debt yield of {dy|pct1}. Passing the test today would take a paydown of about {paydown|usd}. What should the team do first?',
    tags: ['bridge loan', 'extension test', 'debt yield', 'refinance'],
    estMinutes: 3,
    hints: [
      'Who controls the outcome if nothing is done until the maturity date?',
      'Time is the asset here. Think about which options disappear as maturity gets closer.',
    ],
    vars: [
      { name: 'loan', min: 24000000, max: 36000000, step: 1000000, format: 'usd' },
      { name: 'dy', choices: [0.066, 0.069, 0.072], format: 'pct1' },
      { name: 'test', choices: [0.08, 0.085], format: 'pct1' },
      { name: 'noi', formula: '=loan*dy', format: 'usd' },
      { name: 'paydown', formula: '=loan-noi/test', format: 'usd' },
    ],
    options: [
      {
        text: 'Call the lender now, share the leasing plan and ask what it would take to extend: a smaller paydown, a modified test or a new reserve. Price a refinance and a sale in parallel as fallbacks.',
        rating: 'best',
        why: 'Six months out there are still choices. Lenders respond best to a borrower who arrives early with a plan, and pricing the alternatives tells you whether the lender’s terms are fair.',
      },
      {
        text: 'Plan a capital call for the full {paydown|usd} so the loan passes the test at maturity.',
        rating: 'acceptable',
        why: 'It solves the problem and keeps the loan, but it is the most expensive answer, offered before asking whether the lender would accept less or a refinance would be cheaper.',
      },
      {
        text: 'Keep leasing and revisit the question a month before maturity, when NOI should be higher.',
        rating: 'poor',
        why: 'NOI may not get there, and one month is too short to refinance or raise equity. By then the lender holds every card.',
        category: 'timing',
      },
      {
        text: 'Cut the marketing and leasing budget to lift NOI above the test quickly.',
        rating: 'poor',
        why: 'Starving leasing lifts NOI for a quarter and then lowers occupancy, which is the real problem. Lenders also look through one-off cost cuts when they test NOI.',
        category: 'concept',
      },
    ],
    explanation:
      'Debt yield = NOI / loan = {noi|usd} / {loan|usd} = {dy|pct1}, short of the {test|pct1} test. The largest loan that passes is NOI / test = {=noi/test|usd}, so the gap is {paydown|usd}. The arithmetic sizes the problem. The judgment is to raise it early and keep more than one way out.',
  },
]);
