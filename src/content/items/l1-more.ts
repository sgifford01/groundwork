/**
 * LEVEL 1 - Real estate math, part 2: error hunts, write-the-formula,
 * estimate-first, predict-then-check, ordering, explain-why, go/no-go,
 * timed sprints and a guided case.
 */
import {
  defineItems,
  edgeCasesOf,
  fill,
  given,
  header,
  input,
  label,
  mistakesOf,
  sheet,
  solved,
  sub,
  target,
  title,
  total,
  workbookOf,
} from '../build';
import { L1_ITEMS } from './l1-re-math';

const NOI = workbookOf(L1_ITEMS, 'l1-noi-grid-year1');
const METRICS = workbookOf(L1_ITEMS, 'l1-lev-grid-metrics');
const AMORT = workbookOf(L1_ITEMS, 'l1-loan-grid-amort');
const SIZING = workbookOf(L1_ITEMS, 'l1-sizing-grid-max-loan');

export const L1_MORE = defineItems([
  // =========================================================================
  // Error hunts
  // =========================================================================
  {
    id: 'l1-noi-hunt-year1',
    type: 'errorhunt',
    level: 1,
    topic: 'l1-noi',
    title: 'Audit a Year 1 NOI',
    prompt: 'This Year 1 pro forma was built in a hurry. Deductions are shown as negatives so the lines add up, vacancy applies to rent only, and value is NOI ÷ cap rate. Three things are wrong.',
    workbook: NOI,
    bugs: [
      { label: 'Vacancy is taken off twice: row 13 is already negative, and this subtracts it again. EGI is just the sum of rows 12 to 14.', category: 'double-count', cells: { B15: '=B12+B13+B14-B12*B7' } },
      { label: 'Operating expenses per unit are already annual. The ×12 overstates them twelve times.', category: 'units', cells: { B16: '=-B4*B8*12' } },
      { label: 'The cap rate is applied to EGI. It must be applied to NOI.', category: 'wrong-base', cells: { B19: '=B15/B9' } },
    ],
    explanation:
      'Sanity checks would have caught all three. An expense ratio far above 100% flags the ×12. A value per unit well out of line with the market flags the cap rate on EGI. And vacancy that is larger than the stated percentage of rent flags the double count.',
    hints: [
      'Do the outputs at the bottom look sensible for a San Diego apartment building?',
      'Check each line’s formula against its label, and check units: which inputs are monthly and which are annual?',
      'Look at B15, B16 and B19.',
    ],
    tags: ['NOI', 'audit', 'vacancy applied twice'],
    estMinutes: 5,
  },
  {
    id: 'l1-lev-hunt-metrics',
    type: 'errorhunt',
    level: 1,
    topic: 'l1-leverage',
    title: 'Audit a leverage block',
    prompt: 'This block sizes the loan and equity and computes the usual metrics. The loan amortizes with monthly payments, and equity funds everything the loan does not. Three things are wrong.',
    workbook: METRICS,
    bugs: [
      { label: 'PMT is fed an annual rate and a number of years, as if the loan paid once a year. Use rate/12 and years×12, then ×12.', category: 'units', cells: { B14: '=-PMT(B6,B7,B11)' } },
      { label: 'Equity ignores closing costs. It is total cost minus the loan.', category: 'omitted', cells: { B13: '=B3-B11' } },
      { label: 'Cash-on-cash is divided by the purchase price. It is measured on equity.', category: 'wrong-base', cells: { B19: '=B18/B3' } },
    ],
    explanation:
      'Debt service is the line everything else leans on: DSCR, cash flow and cash-on-cash all inherit an error there. Equity must tie to total cost minus the loan, and return-on-equity measures must divide by equity.',
    hints: [
      'Start with the loan payment: is the period inside PMT consistent?',
      'Sources must equal uses: loan plus equity should equal total cost. Then check what each ratio is divided by.',
      'Look at B13, B14 and B19.',
    ],
    tags: ['PMT', 'equity', 'cash-on-cash', 'audit'],
    estMinutes: 5,
  },
  {
    id: 'l1-loan-hunt-amort',
    type: 'errorhunt',
    level: 1,
    topic: 'l1-loan',
    title: 'Audit an amortization schedule',
    prompt: 'In a correct schedule, interest is charged on each month’s beginning balance, principal is the payment minus interest, and only principal reduces the balance. Three things are wrong here, and two of them are subtle.',
    workbook: AMORT,
    tolerance: { abs: 1 },
    bugs: [
      { label: 'Interest is charged on the original loan every month. It should use that month’s beginning balance (column B).', category: 'wrong-base', cells: fill('D10', 5, '=$B$3*$B$4/12', 'down') },
      { label: 'The whole payment is taken off the balance. Only the principal part reduces it.', category: 'concept', cells: fill('F9', 6, '=B9-C9', 'down') },
      { label: 'The total stops at month 5 and leaves out month 6.', category: 'omitted', cells: { C15: '=SUM(C9:C13)' } },
    ],
    explanation:
      'Interest on the wrong balance is the classic amortization bug, and it is nearly invisible: each month is off by only a few dollars. The balance running off the full payment is easier to spot because the balance falls far too fast.',
    hints: [
      'How fast should the balance fall on a 30-year loan? Compare the principal column with the change in balance.',
      'Turn on “Formulas”. Each interest cell should point at the balance on its own row.',
      'Look at D10:D14, F9:F14 and C15.',
    ],
    tags: ['amortization', 'interest on the wrong balance', 'audit'],
    estMinutes: 6,
  },
  {
    id: 'l1-sizing-hunt-max-loan',
    type: 'errorhunt',
    level: 1,
    topic: 'l1-sizing',
    title: 'Audit a loan sizing',
    prompt: 'The lender makes the smallest loan allowed by three tests. The DSCR test is for an amortizing loan with monthly payments. Three things are wrong.',
    workbook: SIZING,
    edgeCases: edgeCasesOf(L1_ITEMS, 'l1-sizing-grid-max-loan'),
    bugs: [
      { label: 'This sizes an interest-only loan. For an amortizing loan, use PV with the monthly rate, months and monthly debt service.', category: 'concept', cells: { B15: '=B4/B10/B5' } },
      { label: 'The lender makes the smallest of the three loans, not the largest.', category: 'concept', cells: { B17: '=MAX(B14:B16)' } },
      { label: 'The resulting LTV divides by NOI. It should divide by the property value in B3.', category: 'reference', cells: { B19: '=B17/B4' } },
    ],
    explanation:
      'A loan sized with MAX fails two of the three tests, which is the opposite of the lender’s intent. Sizing an amortizing loan as if it were interest-only overstates proceeds, because the real payment also includes principal.',
    hints: [
      'Would this loan pass all three of the lender’s tests?',
      'Check the function that picks between the tests, then check the DSCR test against the loan type.',
      'Look at B15, B17 and B19.',
    ],
    tags: ['loan sizing', 'MIN', 'PV', 'audit'],
    estMinutes: 5,
  },

  // =========================================================================
  // Write the formula
  // =========================================================================
  {
    id: 'l1-noi-formula-egi',
    type: 'formula',
    level: 1,
    topic: 'l1-noi',
    title: 'Effective gross income',
    prompt: 'Vacancy and credit loss applies to rent only. Write the formula for effective gross income.',
    workbook: {
      sheets: [
        sheet(
          'EGI',
          {
            A1: title('Effective gross income'),
            A3: label('Gross potential rent'),
            B3: input(1860000, 'usd', [900000, 3200000, 20000]),
            A4: label('Vacancy & credit loss'),
            B4: input(0.06, 'pct1', [0.03, 0.09, 0.005]),
            A5: label('Other income'),
            B5: input(74000, 'usd', [30000, 160000, 2000]),
            A7: label('Effective gross income'),
            B7: target('=B3*(1-B4)+B5', 'usd'),
          },
          { A: 210, B: 120 },
        ),
      ],
    },
    mistakes: [
      { label: 'This takes vacancy on other income too. Here it applies to rent only.', category: 'wrong-base', cells: { B7: '=(B3+B5)*(1-B4)' } },
      { label: 'This subtracts 6% as if it were six cents. Multiply rent by (1 − vacancy).', category: 'units', cells: { B7: '=B3-B4+B5' } },
      { label: 'This keeps only the vacancy amount. EGI is rent after vacancy, so multiply by (1 − vacancy).', category: 'concept', cells: { B7: '=B3*B4+B5' } },
    ],
    explanation: '=B3*(1-B4)+B5. Rent after vacancy, plus other income. Whether vacancy also applies to other income is a convention the model should state; here it does not.',
    hints: ['Take vacancy off the rent first, then add the other income.', 'Rent × (1 − vacancy %) + other income.'],
    tags: ['EGI', 'vacancy'],
    estMinutes: 1.5,
  },
  {
    id: 'l1-loan-formula-balloon',
    type: 'formula',
    level: 1,
    topic: 'l1-loan',
    title: 'Balloon balance at maturity',
    prompt:
      'The loan amortizes over 30 years but comes due after the loan term. Write a formula for the balance still owed at maturity. The monthly payment is already calculated in B7.',
    workbook: {
      sheets: [
        sheet(
          'Balloon',
          {
            A1: title('Loan balance at maturity'),
            A3: label('Loan amount'),
            B3: input(14500000, 'usd', [5000000, 25000000, 250000]),
            A4: label('Interest rate'),
            B4: input(0.0625, 'pct2', [0.05, 0.075, 0.0025]),
            A5: label('Amortization (years)'),
            B5: input(30, 'int', { choices: [25, 30] }),
            A6: label('Loan term (years)'),
            B6: input(10, 'int', { choices: [5, 7, 10] }),
            A7: label('Monthly payment'),
            B7: given('=-PMT(B4/12,B5*12,B3)', 'usd2'),
            A9: label('Balance due at maturity'),
            B9: target('=FV(B4/12,B6*12,B7,-B3)', 'usd'),
          },
          { A: 210, B: 130 },
        ),
      ],
    },
    mistakes: [
      { label: 'This subtracts every payment in full. Most of each payment is interest, so the balance falls far more slowly.', category: 'concept', cells: { B9: '=B3-B7*B6*12' } },
      { label: 'This uses the amortization period, which pays the loan down to zero. Use the loan term.', category: 'reference', cells: { B9: '=FV(B4/12,B5*12,B7,-B3)' } },
      { label: 'This compounds once a year. The loan pays monthly: use rate/12 and years×12.', category: 'units', cells: { B9: '=FV(B4,B6,B7*12,-B3)' } },
    ],
    explanation:
      '=FV(B4/12,B6*12,B7,-B3). FV rolls the loan forward for the loan term: the balance grows with interest and shrinks with each payment. The loan goes in as a negative because it is money the borrower received. After 10 years of a 30-year schedule, most of the loan is still outstanding.',
    hints: [
      'The balance at maturity is the loan carried forward with interest, less the payments made so far.',
      'FV(rate per period, periods, payment, −loan) returns the remaining balance. Use the loan term, in months.',
    ],
    tags: ['FV', 'balloon', 'amortization'],
    estMinutes: 3,
  },
  {
    id: 'l1-sizing-formula-lesser-of',
    type: 'formula',
    level: 1,
    topic: 'l1-sizing',
    title: 'Lesser of two tests',
    prompt: 'This lender uses two tests: a maximum LTV and a minimum debt yield. Write one formula for the largest loan that passes both.',
    workbook: {
      sheets: [
        sheet(
          'Sizing',
          {
            A1: title('Loan sizing'),
            A3: label('Property value'),
            B3: input(31000000, 'usd', [15000000, 45000000, 500000]),
            A4: label('Net operating income'),
            B4: input(1705000, 'usd', [900000, 2600000, 25000]),
            A5: label('Maximum LTV'),
            B5: input(0.65, 'pct', [0.55, 0.75, 0.05]),
            A6: label('Minimum debt yield'),
            B6: input(0.09, 'pct2', [0.075, 0.1, 0.005]),
            A8: label('Maximum loan'),
            B8: target('=MIN(B3*B5,B4/B6)', 'usd'),
          },
          { A: 200, B: 130 },
        ),
      ],
    },
    edgeCases: [
      { B3: 20000000, B4: 1600000, B5: 0.65, B6: 0.08 },
      { B3: 40000000, B4: 1500000, B5: 0.65, B6: 0.09 },
    ],
    mistakes: [
      { label: 'The lender makes the smaller of the two loans, not the larger.', category: 'concept', cells: { B8: '=MAX(B3*B5,B4/B6)' } },
      { label: 'This applies only the LTV test. The loan also has to satisfy the debt yield.', category: 'omitted', cells: { B8: '=B3*B5' } },
      { label: 'Debt yield = NOI ÷ loan, so the loan it allows is NOI ÷ debt yield, not NOI × debt yield.', category: 'concept', cells: { B8: '=MIN(B3*B5,B4*B6)' } },
    ],
    explanation: '=MIN(B3*B5,B4/B6). The LTV test allows value × LTV. The debt-yield test allows NOI ÷ debt yield. The loan must pass both, so it is the smaller.',
    hints: ['Work out the loan each test allows on its own.', 'LTV loan = value × LTV. Debt-yield loan = NOI ÷ debt yield. MIN picks the binding one.'],
    tags: ['loan sizing', 'MIN', 'debt yield'],
    estMinutes: 2,
  },

  // =========================================================================
  // Estimate first
  // =========================================================================
  {
    id: 'l1-noi-est-value-multiple',
    type: 'estimate',
    level: 1,
    topic: 'l1-noi',
    title: 'Value in your head',
    prompt: 'A building produces {noi} of NOI and trades at a {cap} cap rate. What is it worth?',
    vars: [
      { name: 'noi', min: 600000, max: 3000000, step: 50000, format: 'usd' },
      { name: 'cap', choices: [0.04, 0.05, 0.0625, 0.08], format: 'pct2' },
    ],
    answer: '=noi/cap',
    format: 'usd',
    mistakes: [{ formula: '=noi*cap', label: 'You multiplied NOI by the cap rate. Value = NOI ÷ cap rate.', category: 'concept' }],
    shortcut: 'Turn the cap rate into a multiple: 1 ÷ {cap} = {=1/cap|num1}x. Then {noi} × {=1/cap|num1} ≈ {=noi/cap|usd}. Worth memorising: 4% is 25x, 5% is 20x, 6.25% is 16x, 8% is 12.5x.',
    explanation: 'Value = NOI ÷ cap rate = {noi} ÷ {cap} = {=noi/cap|usd}.',
    hints: ['Dividing by a percentage is the same as multiplying by its reciprocal.'],
    tags: ['cap rate', 'mental math'],
    estMinutes: 1.5,
  },
  {
    id: 'l1-loan-est-debt-service',
    type: 'estimate',
    level: 1,
    topic: 'l1-loan',
    title: 'Annual debt service in your head',
    prompt: 'A {loan} loan at {rate} amortizes over 30 years with monthly payments. Roughly what is the annual debt service?',
    vars: [
      { name: 'loan', min: 4000000, max: 30000000, step: 500000, format: 'usd' },
      { name: 'rate', min: 0.055, max: 0.07, step: 0.0025, format: 'pct2' },
    ],
    answer: '=-PMT(rate/12,360,loan)*12',
    format: 'usd',
    ballpark: 0.15,
    mistakes: [
      { formula: '=loan*rate', label: 'That is interest only. An amortizing loan also repays principal each year.', category: 'concept' },
      { formula: '=-PMT(rate/12,360,loan)', label: 'That is one month’s payment. Multiply by 12 for the year.', category: 'units' },
    ],
    shortcut:
      'Interest alone is {loan} × {rate} = {=loan*rate|usd}. A 30-year schedule adds a little over 1% of the loan for principal, so think {loan} × about {=rate+0.012|pct1} ≈ {=loan*(rate+0.012)|usd}.',
    explanation:
      '=-PMT({rate}/12, 360, {loan}) × 12 = {=-PMT(rate/12,360,loan)*12|usd}. That is a loan constant of {=-PMT(rate/12,360,1)*12|pct2}: the annual payment as a share of the loan.',
    hints: ['Start from interest only, then add something for principal.'],
    tags: ['debt service', 'loan constant', 'mental math'],
    estMinutes: 2,
  },
  {
    id: 'l1-noi-est-noi-from-units',
    type: 'estimate',
    level: 1,
    topic: 'l1-noi',
    title: 'NOI from a rent roll in your head',
    prompt: 'A {units}-unit building rents for {rent} a month per unit. Assume {vac} vacancy and operating expenses of {ratio} of effective gross income. Roughly what is the NOI?',
    vars: [
      { name: 'units', min: 40, max: 200, step: 10, format: 'int' },
      { name: 'rent', min: 2200, max: 3400, step: 100, format: 'usd' },
      { name: 'vac', choices: [0.04, 0.05, 0.06], format: 'pct' },
      { name: 'ratio', choices: [0.35, 0.4], format: 'pct' },
    ],
    answer: '=units*rent*12*(1-vac)*(1-ratio)',
    format: 'usd',
    mistakes: [
      { formula: '=units*rent*(1-vac)*(1-ratio)', label: 'That is one month. Multiply by 12 for the annual NOI.', category: 'units' },
      { formula: '=units*rent*12*(1-vac)*ratio', label: 'That is the expenses, not what is left. Keep (1 − expense ratio).', category: 'concept' },
      { formula: '=units*rent*12*(1-ratio)', label: 'Vacancy was left out. Take it off before the expenses.', category: 'omitted' },
    ],
    shortcut:
      'Annual rent roll: {units} × {rent} × 12 = {=units*rent*12|usd}. After vacancy and expenses you keep about {=(1-vac)*(1-ratio)|pct} of it, so NOI ≈ {=units*rent*12*(1-vac)*(1-ratio)|usd}.',
    explanation:
      'GPR = {=units*rent*12|usd}. EGI = GPR × (1 − {vac}) = {=units*rent*12*(1-vac)|usd}. NOI = EGI × (1 − {ratio}) = {=units*rent*12*(1-vac)*(1-ratio)|usd}.',
    hints: ['Get the annual rent roll first, then ask what fraction of it survives vacancy and expenses.'],
    tags: ['NOI', 'mental math'],
    estMinutes: 2,
  },

  // =========================================================================
  // Predict, then check
  // =========================================================================
  {
    id: 'l1-noi-predict-cap-rate-up',
    type: 'predict',
    level: 1,
    topic: 'l1-noi',
    title: 'Cap rates rise 50 bps',
    prompt: 'Here is a finished Year 1 pro forma. Before anything changes, look at the cap rate and the value.',
    workbook: solved(NOI),
    output: { cell: 'B19', label: 'Value at market cap rate', format: 'usd' },
    shock: { cell: 'B9', label: 'The market cap rate rises by 50 basis points', add: 0.005 },
    measure: 'pct',
    explanation:
      'Value = NOI ÷ cap rate. NOI does not change, so value moves by (old cap ÷ new cap) − 1. From around 5%, a 50 bp rise takes roughly 10% off the value. The lower the starting cap rate, the bigger the hit.',
    trap: 'A higher cap rate does not mean a higher value. A cap rate is the yield buyers demand: when they demand more yield, they pay less for the same income.',
    hints: ['Value = NOI ÷ cap rate. Which of those two changed?', '50 bps is about a tenth of a 5% cap rate.'],
    tags: ['cap rate', 'sensitivity'],
    estMinutes: 2,
  },
  {
    id: 'l1-noi-predict-vacancy-up',
    type: 'predict',
    level: 1,
    topic: 'l1-noi',
    title: 'Vacancy rises three points',
    prompt: 'Here is a finished Year 1 pro forma. Look at how big the expenses are next to the income.',
    workbook: solved(NOI),
    output: { cell: 'B17', label: 'Net operating income', format: 'usd' },
    shock: { cell: 'B7', label: 'Vacancy and credit loss rises by 3 percentage points', add: 0.03 },
    measure: 'pct',
    band: 0.4,
    explanation:
      'Three points of vacancy removes 3% of gross potential rent. Expenses do not fall with it, so the whole loss lands on NOI. Because NOI is smaller than rent, the percentage fall in NOI is larger than 3%: operating leverage.',
    trap: 'NOI does not fall by exactly 3%. The lost rent is 3% of GPR, but it comes out of a smaller number, so the percentage hit to NOI is bigger.',
    hints: ['How many dollars of rent are lost? What happens to expenses?', 'Compare the lost rent with the size of NOI, not with the size of rent.'],
    tags: ['vacancy', 'operating leverage', 'sensitivity'],
    estMinutes: 2,
  },
  {
    id: 'l1-lev-predict-rate-debt-yield',
    type: 'predict',
    level: 1,
    topic: 'l1-leverage',
    title: 'Rates rise: debt yield',
    prompt: 'Here is a finished leverage block. Think about which lines depend on the interest rate.',
    workbook: solved(METRICS),
    output: { cell: 'B16', label: 'Debt yield', format: 'pct2' },
    shock: { cell: 'B6', label: 'The interest rate rises by 100 basis points', add: 0.01 },
    measure: 'abs',
    explanation:
      'Debt yield = NOI ÷ loan amount. Neither NOI nor the loan amount depends on the interest rate, so debt yield does not move. That is exactly why lenders like it: loan terms cannot flatter it.',
    trap: 'Not every lender metric worsens when rates rise. DSCR does, because the payment changes. Debt yield and LTV do not involve the payment at all.',
    hints: ['Write out the formula for debt yield. Is the interest rate in it?'],
    tags: ['debt yield', 'interest rate', 'sensitivity'],
    estMinutes: 1.5,
  },
  {
    id: 'l1-lev-predict-rate-dscr',
    type: 'predict',
    level: 1,
    topic: 'l1-leverage',
    title: 'Rates rise: DSCR',
    prompt: 'Here is a finished leverage block with an amortizing loan. Look at the DSCR.',
    workbook: solved(METRICS),
    output: { cell: 'B15', label: 'DSCR', format: 'mult' },
    shock: { cell: 'B6', label: 'The interest rate rises by 100 basis points', add: 0.01 },
    measure: 'pct',
    band: 0.4,
    explanation:
      'NOI is unchanged but the payment rises. On a 30-year amortizing loan, 100 bps adds roughly 9% to 10% to the payment, so DSCR falls by a little less than 10%. The payment rises by less than the interest alone would suggest, because part of it is principal.',
    trap: 'A higher rate raises debt service, and DSCR is NOI divided by debt service, so coverage gets worse, not better.',
    hints: ['DSCR = NOI ÷ debt service. Which part moves?', 'A 100 bp rise on a rate near 6% lifts an amortizing payment by a bit under a tenth.'],
    tags: ['DSCR', 'interest rate', 'sensitivity'],
    estMinutes: 2,
  },

  // =========================================================================
  // Ordering and explain-why
  // =========================================================================
  {
    id: 'l1-noi-order-pro-forma-lines',
    type: 'order',
    level: 1,
    topic: 'l1-noi',
    title: 'The lines of a pro forma',
    prompt: 'Put the lines of an operating pro forma in order, from the top of the page to the bottom.',
    lines: [
      'Gross potential rent',
      'Vacancy and credit loss',
      'Effective gross income',
      'Operating expenses',
      'Net operating income',
      'Debt service',
      'Cash flow after debt service',
    ],
    trap: 'Putting debt service above NOI. NOI is measured before financing, which is why two buyers with different loans agree on it.',
    explanation:
      'Start with the rent the building could earn, take off vacancy to get what it actually collects (EGI), take off the cost of running it to get NOI, and only then pay the lender. What is left belongs to the equity.',
    hints: ['Three of these are subtotals. Each one follows the deduction that creates it.'],
    tags: ['pro forma', 'NOI'],
    estMinutes: 1.5,
  },
  {
    id: 'l1-loan-order-amort-row',
    type: 'order',
    level: 1,
    topic: 'l1-loan',
    title: 'One row of an amortization schedule',
    prompt: 'The monthly payment is already known. Put the calculations for one month of the schedule in order.',
    lines: [
      'Beginning balance = last month’s ending balance',
      'Interest = beginning balance × annual rate ÷ 12',
      'Principal = payment − interest',
      'Ending balance = beginning balance − principal',
    ],
    trap: 'Computing principal before interest. Principal is whatever is left of the payment after interest, so interest has to come first.',
    explanation:
      'Each month starts where the last one ended. Interest is charged on that balance. Whatever the payment covers beyond interest is principal, and only principal reduces the balance.',
    hints: ['Which number does each line need that an earlier line produces?'],
    tags: ['amortization'],
    estMinutes: 1,
  },
  {
    id: 'l1-noi-explain-cap-rate-value',
    type: 'explain',
    level: 1,
    topic: 'l1-noi',
    title: 'Explain: lower cap rate, higher value',
    prompt: 'A friend outside real estate hears that “cap rates compressed, so values went up” and thinks it sounds backwards. Explain why a lower cap rate means a higher value.',
    rubric: [
      'A cap rate is NOI divided by price: the yield a buyer earns on what they pay.',
      'Rearranged, value = NOI ÷ cap rate, so with the same NOI a lower cap rate gives a higher value.',
      'A lower cap rate means buyers accept a lower yield, usually because they see less risk or more growth.',
      'A concrete example, such as $1M of NOI being worth $20M at 5% and $25M at 4%.',
    ],
    model:
      'A cap rate is the income yield a buyer gets: NOI divided by price. Turn it around and price equals NOI divided by the cap rate. If buyers will accept a 4% yield instead of 5%, the same $1 million of NOI is worth $25 million instead of $20 million. A lower cap rate just means buyers are paying more for each dollar of income.',
    trap: 'Treating the cap rate as a growth rate or a return that is “good when high”, and not connecting it to what a buyer pays.',
    tags: ['cap rate', 'valuation'],
    estMinutes: 3,
  },
  {
    id: 'l1-sizing-explain-debt-yield',
    type: 'explain',
    level: 1,
    topic: 'l1-sizing',
    title: 'Explain: why lenders use debt yield',
    prompt: 'A lender already tests DSCR. Explain why many also require a minimum debt yield.',
    rubric: [
      'Debt yield is NOI divided by the loan amount.',
      'It does not depend on the interest rate or the amortization, so loan terms cannot flatter it.',
      'DSCR can be made to look healthy with a low rate, interest-only payments or a long amortization.',
      'It is the return the lender would earn on its loan if it had to take the property back.',
    ],
    model:
      'Debt yield is NOI divided by the loan amount. Unlike DSCR, it ignores the interest rate and amortization, so a borrower cannot pass it just because rates are low or the loan is interest-only. It tells the lender what it would earn on its money if it ended up owning the building, which makes it a cleaner measure of how much is being lent against the income.',
    trap: 'Describing debt yield as just another coverage ratio, without saying that it is independent of the loan terms.',
    tags: ['debt yield', 'DSCR', 'loan sizing'],
    estMinutes: 3,
  },

  // =========================================================================
  // Go / no-go
  // =========================================================================
  {
    id: 'l1-lev-gonogo-loan-request',
    type: 'gonogo',
    level: 1,
    topic: 'l1-leverage',
    title: 'Will the lender approve this loan?',
    prompt:
      'A borrower asks for a {loan} interest-only loan at {rate} on a property worth {value} with NOI of {noi}. The lender needs all three tests to pass. Judge each test, then make the call.',
    vars: [
      { name: 'value', min: 20000000, max: 50000000, step: 1000000, format: 'usd' },
      { name: 'ltv', choices: [0.55, 0.6, 0.65, 0.7] },
      { name: 'loan', formula: '=value*ltv', format: 'usd' },
      { name: 'cap', choices: [0.045, 0.05, 0.055, 0.06] },
      { name: 'noi', formula: '=ROUND(value*cap,-4)', format: 'usd' },
      { name: 'rate', choices: [0.055, 0.06, 0.065], format: 'pct2' },
    ],
    metrics: [
      { label: 'Loan-to-value', value: '=loan/value', format: 'pct1' },
      { label: 'Annual debt service', value: '=loan*rate', format: 'usd' },
      { label: 'DSCR', value: '=noi/(loan*rate)', format: 'mult' },
      { label: 'Debt yield', value: '=noi/loan', format: 'pct2' },
    ],
    criteria: [
      { label: 'LTV no higher than 65%', pass: '=loan/value<=0.6501', note: 'LTV is {=loan/value|pct1} against a 65% ceiling.' },
      { label: 'DSCR of at least 1.25x', pass: '=noi/(loan*rate)>=1.25', note: 'DSCR is {=noi/(loan*rate)|mult} against a 1.25x floor.' },
      { label: 'Debt yield of at least 8.5%', pass: '=noi/loan>=0.085', note: 'Debt yield is {=noi/loan|pct2} against an 8.5% floor.' },
    ],
    explanation:
      'A loan is approved only if it clears every test, so one failure is enough for a No-go. Note which test is tightest here: that is the one that would set the loan size if the borrower asked the lender to size it.',
    hints: ['Take the tests one at a time. LTV is a ceiling; DSCR and debt yield are floors.'],
    tags: ['LTV', 'DSCR', 'debt yield', 'underwriting'],
    estMinutes: 2.5,
  },

  // =========================================================================
  // Timed sprints
  // =========================================================================
  {
    id: 'l1-noi-timed-noi-sprint',
    type: 'timed',
    level: 1,
    topic: 'l1-noi',
    title: 'Sprint: Year 1 NOI',
    prompt: 'Build the Year 1 pro forma and value the property, against the clock. Deductions are negative; vacancy applies to rent only.',
    workbook: NOI,
    mistakes: mistakesOf(L1_ITEMS, 'l1-noi-grid-year1'),
    minutes: 5,
    brief: ['Gross potential rent, vacancy, other income, EGI', 'Operating expenses and NOI', 'Value, value per unit and expense ratio'],
    explanation: 'Speed comes from working top to bottom without stopping: GPR, vacancy, other income, EGI, OpEx, NOI, then the three outputs.',
    tags: ['NOI', 'timed'],
    estMinutes: 6,
  },
  {
    id: 'l1-loan-timed-amort-sprint',
    type: 'timed',
    level: 1,
    topic: 'l1-loan',
    title: 'Sprint: amortization schedule',
    prompt: 'Compute the payment and build six months of the schedule, against the clock. Write row 10 once and fill it down.',
    workbook: AMORT,
    tolerance: { abs: 1 },
    mistakes: mistakesOf(L1_ITEMS, 'l1-loan-grid-amort'),
    minutes: 8,
    brief: ['Monthly payment with PMT', 'Beginning balance, payment, interest, principal, ending balance for six months', 'Totals for payment, interest and principal'],
    explanation: 'Write month 1, then month 2 with anchored references, then fill month 2 down. Typing each row by hand is what runs out the clock.',
    tags: ['amortization', 'timed'],
    estMinutes: 9,
  },

  // =========================================================================
  // Guided case: from rent roll to loan
  // =========================================================================
  {
    id: 'l1-noi-case-rent-roll-to-loan',
    type: 'case',
    level: 1,
    topic: 'l1-noi',
    title: 'Guided case: from rent roll to loan',
    prompt: 'Take a small apartment building from its rent roll to NOI, to value, and to the loan a lender would make. Deductions are negative so the lines add up.',
    workbook: {
      sheets: [
        sheet(
          'Deal',
          {
            A1: title('From rent roll to loan: 36 units in Normal Heights'),
            A3: header('Assumptions', 'left'),
            A4: label('Units'),
            B4: input(36, 'int', [20, 80, 2]),
            A5: label('Average rent / unit / month'),
            B5: input(2475, 'usd', [2000, 3200, 25]),
            A6: label('Vacancy & credit loss'),
            B6: input(0.05, 'pct1', [0.03, 0.08, 0.005]),
            A7: label('Other income (% of rent)'),
            B7: input(0.04, 'pct1', [0.02, 0.06, 0.005]),
            A8: label('Operating expenses (% of EGI)'),
            B8: input(0.36, 'pct', [0.3, 0.42, 0.01]),
            A9: label('Market cap rate'),
            B9: input(0.05, 'pct2', [0.0425, 0.06, 0.0025]),
            A10: label('Maximum LTV'),
            B10: input(0.65, 'pct', [0.55, 0.7, 0.05]),
            A11: label('Minimum DSCR'),
            B11: input(1.25, 'mult', [1.2, 1.4, 0.05]),
            A12: label('Interest rate (interest-only)'),
            B12: input(0.06, 'pct2', [0.05, 0.07, 0.0025]),
            A14: header('Year 1 income', 'left'),
            B14: header('Annual'),
            A15: label('Gross potential rent'),
            B15: target('=B4*B5*12', 'usd'),
            A16: sub('Vacancy & credit loss'),
            B16: target('=-B15*B6', 'usd'),
            A17: sub('Other income'),
            B17: target('=B15*B7', 'usd'),
            A18: total('Effective gross income'),
            B18: target('=SUM(B15:B17)', 'usd', { border: 'top' }),
            A19: sub('Operating expenses'),
            B19: target('=-B18*B8', 'usd'),
            A20: total('Net operating income'),
            B20: target('=B18+B19', 'usd', { border: 'top' }),
            A22: header('Value and loan', 'left'),
            A23: label('Value at market cap rate'),
            B23: target('=B20/B9', 'usd'),
            A24: label('Loan allowed by LTV'),
            B24: target('=B23*B10', 'usd'),
            A25: label('Loan allowed by DSCR'),
            B25: target('=B20/B11/B12', 'usd'),
            A26: total('Maximum loan'),
            B26: target('=MIN(B24:B25)', 'usd', { border: 'top' }),
            A27: label('Equity required'),
            B27: target('=B23-B26', 'usd'),
            A28: label('DSCR on the maximum loan'),
            B28: target('=B20/(B26*B12)', 'mult'),
          },
          { A: 250, B: 130 },
        ),
      ],
    },
    edgeCases: [
      { B9: 0.06, B12: 0.05 }, // LTV binds
      { B9: 0.0425, B12: 0.07 }, // DSCR binds
    ],
    steps: [
      { title: 'Gross potential rent', text: 'Start with what the building would earn if every unit were leased all year: units × monthly rent × 12.', cells: ['B15'] },
      {
        title: 'Vacancy and other income',
        text: 'Vacancy is a deduction, so show it as a negative: −GPR × vacancy %. Other income here is quoted as a percentage of rent, so it is GPR × that percentage.',
        cells: ['B16', 'B17'],
      },
      { title: 'Effective gross income', text: 'EGI is what the building actually collects. Because vacancy is already negative, a simple SUM of the three lines gives it.', cells: ['B18'] },
      {
        title: 'Expenses and NOI',
        text: 'Expenses are quoted as a share of EGI, and they are a deduction: −EGI × expense ratio. NOI is EGI plus that negative number.',
        cells: ['B19', 'B20'],
      },
      { title: 'Value', text: 'Value is what a buyer pays for the income: NOI ÷ cap rate.', cells: ['B23'] },
      {
        title: 'Size the loan two ways',
        text: 'LTV test: value × maximum LTV. DSCR test: the most debt service allowed is NOI ÷ DSCR, and on an interest-only loan debt service is loan × rate, so the loan is NOI ÷ DSCR ÷ rate.',
        cells: ['B24', 'B25'],
      },
      {
        title: 'Maximum loan, equity and coverage',
        text: 'The lender makes the smaller of the two loans. Equity is value minus that loan. Finish by checking coverage on the loan actually made: NOI ÷ (loan × rate). It should be at or above the minimum.',
        cells: ['B26', 'B27', 'B28'],
      },
    ],
    mistakes: [
      { label: 'The expense ratio is quoted against EGI, not gross potential rent.', category: 'wrong-base', cells: { B19: '=-B15*B8' } },
      { label: 'This ignores the coverage cushion. Divide NOI by the DSCR before dividing by the rate.', category: 'omitted', cells: { B25: '=B20/B12' } },
      { label: 'The lender makes the smaller of the two loans, not the larger.', category: 'concept', cells: { B26: '=MAX(B24:B25)' } },
      { label: 'Equity is value minus the loan actually made (the maximum loan), which may be smaller than the LTV loan.', category: 'reference', cells: { B27: '=B23-B24' } },
      { label: 'Other income is a percentage of rent here, not of EGI.', category: 'wrong-base', cells: { B17: '=(B15+B16)*B7' } },
    ],
    explanation:
      'The chain is: GPR → less vacancy, plus other income → EGI → less expenses → NOI → ÷ cap rate → value → lesser of the LTV and DSCR loans → equity. Each line uses only the inputs and the lines above it.',
    hints: [
      'Work down the page. Each line needs only the assumptions and the lines above it.',
      'Deductions are negative. The two loan tests each solve for a loan amount, and the lender takes the smaller.',
      'B19: =-B18*B8   B25: =B20/B11/B12   B26: =MIN(B24:B25)',
    ],
    tags: ['NOI', 'valuation', 'loan sizing', 'guided case'],
    estMinutes: 10,
  },
]);
