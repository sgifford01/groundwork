/**
 * LEVEL 4 - Equity waterfalls: preferred return, return of capital,
 * and the promote. The waterfall modelled here pays the pref first, then
 * returns capital, then splits what is left.
 */
import { across, defineItems, fill, given, header, input, label, sheet, target, title, total, type MistakeList } from '../build';

const years = (start: string, count: number) => across(start, count, (i) => header(`Year ${i + 1}`));

const PREF = {
  sheets: [
    sheet(
      'Pref',
      {
        A1: title('Preferred return, then return of capital'),
        A3: label('Equity invested'),
        B3: input(10000000, 'usd', [6000000, 14000000, 500000]),
        A4: label('Preferred return (annual, compounding)'),
        B4: input(0.08, 'pct1', [0.06, 0.1, 0.005]),
        A6: header('', 'left'),
        ...years('B6', 5),
        A7: label('Cash available to distribute'),
        ...across('B7', 4, (i) => input([500000, 650000, 700000, 750000][i], 'usd', [200000, 1200000, 50000])),
        F7: input(16500000, 'usd', [13000000, 20000000, 250000]),
        A8: label('Unreturned capital (start)'),
        B8: target('=$B$3', 'usd'),
        ...across('C8', 4, target('=B14', 'usd')),
        A9: label('Unpaid pref (start)'),
        B9: given('=0', 'usd'),
        ...across('C9', 4, target('=B12', 'usd')),
        A10: label('Pref accrued this year'),
        ...across('B10', 5, target('=(B8+B9)*$B$4', 'usd')),
        A11: label('Pref paid'),
        ...across('B11', 5, target('=MIN(B7,B9+B10)', 'usd')),
        A12: label('Unpaid pref (end)'),
        ...across('B12', 5, target('=B9+B10-B11', 'usd')),
        A13: label('Capital returned'),
        ...across('B13', 5, target('=MIN(B7-B11,B8)', 'usd')),
        A14: label('Unreturned capital (end)'),
        ...across('B14', 5, target('=B8-B13', 'usd')),
        A15: total('Cash remaining for the split'),
        ...across('B15', 5, target('=B7-B11-B13', 'usd', { border: 'top' })),
        A17: label('Total pref paid'),
        B17: target('=SUM(B11:F11)', 'usd'),
        A18: label('Total capital returned'),
        B18: target('=SUM(B13:F13)', 'usd'),
        A19: label('Total cash for the split'),
        B19: target('=SUM(B15:F15)', 'usd'),
      },
      { A: 260, B: 115, C: 115, D: 115, E: 115, F: 120 },
    ),
  ],
};

const PREF_EDGES: Record<string, number>[] = [
  { B7: 3000000, C7: 9000000, D7: 5000000, E7: 2000000 }, // capital comes back early
  { B7: 200000, C7: 200000, D7: 6000000, E7: 9000000 }, // capital comes back in the middle years
  { B7: 200000, C7: 200000, D7: 200000, E7: 200000, F7: 400000 }, // never enough cash to pay the pref
  { B7: 13000000, C7: 1000000 }, // everything is repaid in Year 1
];

const PREF_MISTAKES: MistakeList = [
  { label: 'The pref is not compounding. Unpaid pref from earlier years earns the pref too: accrue on capital plus unpaid pref.', category: 'concept', cells: fill('C10', 4, '=C8*$B$4') },
  { label: 'Capital is being repaid before the pref. Only cash left after paying the pref can return capital.', category: 'timing', cells: fill('B13', 5, '=MIN(B7,B8)') },
  { label: 'You can only pay out the cash the deal has. Pref paid is MIN(cash available, pref owed).', category: 'function', cells: fill('B11', 5, '=B9+B10') },
  { label: 'Capital has to be returned before anything is split. Subtract the capital returned as well.', category: 'omitted', cells: fill('B15', 5, '=B7-B11') },
];

const PROMOTE = {
  sheets: [
    sheet(
      'Promote',
      {
        A1: title('Two tiers: pref and capital pro rata, then a promote'),
        A3: label('LP share of equity'),
        B3: input(0.9, 'pct', [0.8, 0.95, 0.05]),
        A4: label('Promote to the GP in Tier 2'),
        B4: input(0.3, 'pct', [0.2, 0.4, 0.05]),
        A5: label('Total equity invested'),
        B5: input(10000000, 'usd', [8000000, 12000000, 500000]),
        A6: header('', 'left'),
        ...years('B6', 5),
        A7: label('Tier 1 cash (pref and return of capital)'),
        ...across('B7', 4, (i) => input([500000, 650000, 700000, 750000][i], 'usd', [300000, 1200000, 50000])),
        F7: input(11567800, 'usd', [10500000, 13000000, 100000]),
        A8: label('Tier 2 cash (left for the split)'),
        ...across('B8', 4, () => input(0, 'usd', [0, 1500000, 100000])),
        F8: input(4932200, 'usd', [3000000, 7000000, 100000]),
        A10: header('Limited partner (LP)', 'left'),
        A11: label('Tier 1 to LP'),
        ...across('B11', 5, target('=B7*$B$3', 'usd')),
        A12: label('Tier 2 to LP'),
        ...across('B12', 5, target('=B8*(1-$B$4)*$B$3', 'usd')),
        A13: total('Total to LP'),
        ...across('B13', 5, target('=B11+B12', 'usd', { border: 'top' })),
        A15: header('General partner (GP)', 'left'),
        A16: label('Tier 1 to GP (co-invest)'),
        ...across('B16', 5, target('=B7*(1-$B$3)', 'usd')),
        A17: label('Tier 2 to GP (co-invest share)'),
        ...across('B17', 5, target('=B8*(1-$B$4)*(1-$B$3)', 'usd')),
        A18: label('Promote'),
        ...across('B18', 5, target('=B8*$B$4', 'usd')),
        A19: total('Total to GP'),
        ...across('B19', 5, target('=SUM(B16:B18)', 'usd', { border: 'top' })),
        A21: label('Check: paid out minus cash'),
        ...across('B21', 5, target('=B13+B19-B7-B8', 'usd', { allowConstant: true })),
        A23: header('Results', 'left'),
        A24: label('LP equity multiple'),
        B24: target('=SUM(B13:F13)/(B5*B3)', 'mult'),
        A25: label('GP equity multiple'),
        B25: target('=SUM(B19:F19)/(B5*(1-B3))', 'mult'),
        A26: label('GP share of total profit'),
        B26: target('=(SUM(B19:F19)-B5*(1-B3))/(SUM(B7:F8)-B5)', 'pct1'),
      },
      { A: 280, B: 115, C: 115, D: 115, E: 115, F: 120 },
    ),
  ],
};

const PROMOTE_MISTAKES: MistakeList = [
  { label: 'The promote applies only to Tier 2 cash, after the pref and return of capital. This takes it on all cash.', category: 'wrong-base', cells: fill('B18', 5, '=(B7+B8)*$B$4') },
  { label: 'The promote comes off Tier 2 first. The LP gets its share of the remainder, not of all Tier 2 cash.', category: 'omitted', cells: fill('B12', 5, '=B8*$B$3') },
  { label: 'The GP’s co-invest shares in what is left after the promote, not in all Tier 2 cash.', category: 'omitted', cells: fill('B17', 5, '=B8*(1-$B$3)') },
  { label: 'That is the GP’s share of all cash paid out. Share of PROFIT takes each side’s equity off first.', category: 'concept', cells: { B26: '=SUM(B19:F19)/SUM(B7:F8)' } },
  { label: 'The GP multiple divides by the GP’s own equity, not by total equity.', category: 'wrong-base', cells: { B25: '=SUM(B19:F19)/B5' } },
];

export const L4_ITEMS = defineItems([
  // =========================================================================
  // Pref & return of capital
  // =========================================================================
  {
    id: 'l4-pref-what-is-pref',
    type: 'flashcard',
    level: 4,
    topic: 'l4-pref',
    title: 'What a preferred return is',
    prompt: 'What is a preferred return, and is it a guarantee?',
    answer:
      'A preferred return (pref) is a hurdle: investors receive cash up to a stated annual return, say 8%, on their unreturned capital before the sponsor shares in any profit.\n\nIt is a priority, not a guarantee. If the deal does not produce the cash, the pref goes unpaid. In most deals unpaid pref accrues, and usually compounds, until there is cash to pay it.',
    tags: ['preferred return', 'waterfall'],
    estMinutes: 0.5,
  },
  {
    id: 'l4-pref-irr-hurdle',
    type: 'flashcard',
    level: 4,
    topic: 'l4-pref',
    title: 'What an IRR hurdle means',
    prompt: 'A waterfall says the sponsor’s promote starts “after an 8% IRR to investors”. What has to happen before the promote is paid?',
    answer:
      'Investors must have received enough cash, counting both timing and amount, that the IRR on their cash flows is 8%.\n\nIn practice that means they have been paid a compounding 8% preferred return and have had all of their capital returned. An 8% IRR hurdle and “8% compounding pref plus return of capital” are the same test.',
    tags: ['IRR hurdle', 'preferred return'],
    estMinutes: 0.5,
  },
  {
    id: 'l4-pref-num-accrued-pref',
    type: 'numeric',
    level: 4,
    topic: 'l4-pref',
    title: 'Pref that has built up unpaid',
    prompt: 'Investors put in {equity} with a {pref} compounding preferred return. Nothing is paid for {years} years. How much pref has accrued?',
    vars: [
      { name: 'equity', min: 5000000, max: 20000000, step: 500000, format: 'usd' },
      { name: 'pref', choices: [0.07, 0.08, 0.09, 0.1], format: 'pct' },
      { name: 'years', choices: [3, 4, 5], format: 'int' },
    ],
    answer: '=equity*((1+pref)^years-1)',
    format: 'usd',
    tolerance: { pct: 0.002 },
    mistakes: [
      { formula: '=equity*pref*years', label: 'That is simple interest. A compounding pref also accrues on the unpaid pref from earlier years.', category: 'concept' },
      { formula: '=equity*(1+pref)^years', label: 'That is capital plus pref. The question asks for the pref alone: subtract the capital.', category: 'omitted' },
    ],
    explanation:
      'With compounding, the balance owed grows to {equity} × (1 + {pref})^{years} = {=equity*(1+pref)^years|usd}. Take off the capital and the accrued pref is {=equity*((1+pref)^years-1)|usd}. Simple interest would give only {=equity*pref*years|usd}.',
    hints: ['Unpaid pref is added to the balance that earns next year’s pref.', 'Accrued pref = capital × ((1 + pref)^years − 1).'],
    tags: ['preferred return', 'compounding'],
    estMinutes: 2,
  },
  {
    id: 'l4-pref-formula-pref-paid',
    type: 'formula',
    level: 4,
    topic: 'l4-pref',
    title: 'How much pref gets paid',
    prompt: 'Pref is paid from available cash, up to the amount owed. Write the formula for the pref paid this year.',
    workbook: {
      sheets: [
        sheet(
          'Year',
          {
            A1: title('One year of a waterfall'),
            A3: label('Cash available to distribute'),
            B3: input(650000, 'usd', [100000, 2500000, 50000]),
            A4: label('Unpaid pref from earlier years'),
            B4: input(300000, 'usd', [0, 900000, 50000]),
            A5: label('Pref accrued this year'),
            B5: input(824000, 'usd', [400000, 1200000, 4000]),
            A7: label('Pref paid this year'),
            B7: target('=MIN(B3,B4+B5)', 'usd'),
          },
          { A: 250, B: 120 },
        ),
      ],
    },
    edgeCases: [
      { B3: 2500000, B4: 300000, B5: 824000 },
      { B3: 100000, B4: 900000, B5: 824000 },
    ],
    mistakes: [
      { label: 'This pays the full amount owed even when there is not enough cash. Cap it at the cash available with MIN.', category: 'function', cells: { B7: '=B4+B5' } },
      { label: 'This ignores the unpaid pref from earlier years, which is owed too.', category: 'omitted', cells: { B7: '=MIN(B3,B5)' } },
      { label: 'MAX pays the larger of the two, which can be more cash than the deal has.', category: 'function', cells: { B7: '=MAX(B3,B4+B5)' } },
    ],
    explanation: '=MIN(B3,B4+B5). The pref owed is everything unpaid so far plus this year’s accrual. The deal can pay that, or all the cash it has, whichever is smaller.',
    hints: ['Two limits apply: what is owed, and what cash exists.', 'MIN(cash available, unpaid pref + this year’s pref).'],
    tags: ['preferred return', 'MIN', 'waterfall'],
    estMinutes: 1.5,
  },
  {
    id: 'l4-pref-order-waterfall',
    type: 'order',
    level: 4,
    topic: 'l4-pref',
    title: 'The order of a waterfall',
    prompt: 'In the waterfall used in this course, who is paid first? Put the steps in order.',
    lines: [
      'Start with cash available after debt service',
      'Pay investors any accrued preferred return',
      'Return investors’ capital',
      'Split what is left between investors and the sponsor (the promote)',
    ],
    trap: 'Paying the promote before capital has been returned. The sponsor shares in profit only after investors have their money back plus the pref.',
    explanation:
      'Investors are made whole first: the pref, then their capital. Only cash beyond that is profit to be shared, and the promote is the sponsor’s larger share of that profit. (Some agreements return capital before the pref; the documents decide.)',
    hints: ['The sponsor’s promote is a share of profit. What has to happen before there is any profit to share?'],
    tags: ['waterfall', 'promote'],
    estMinutes: 1,
  },
  {
    id: 'l4-pref-grid-pref-and-capital',
    type: 'grid',
    level: 4,
    topic: 'l4-pref',
    title: 'Pref accrual and return of capital',
    prompt:
      'Run five years of cash through the first tier of a waterfall.\n\n• The pref accrues each year on unreturned capital PLUS any unpaid pref (it compounds).\n• Cash pays the pref first, up to what is owed. Whatever is left returns capital, up to the amount outstanding.\n• Anything beyond that is cash for the split.\n• Each row carries forward from the year before. Write each row so it fills right.',
    workbook: PREF,
    edgeCases: PREF_EDGES,
    mistakes: PREF_MISTAKES,
    explanation:
      'Accrual: =(B8+B9)*$B$4. Pref paid: =MIN(B7,B9+B10). Unpaid pref: =B9+B10-B11. Capital returned: =MIN(B7-B11,B8). Capital left: =B8-B13. For the split: =B7-B11-B13. Next year starts from this year’s ending balances. Here the pref goes unpaid for four years, compounds, and is cleared at the sale.',
    hints: [
      'Track two running balances: unreturned capital and unpaid pref. Each year’s cash reduces the pref first.',
      'MIN does the work twice: pref paid is limited by cash, and capital returned is limited by the capital outstanding.',
      'B10: =(B8+B9)*$B$4   B11: =MIN(B7,B9+B10)   B13: =MIN(B7-B11,B8)',
    ],
    tags: ['preferred return', 'return of capital', 'waterfall', 'MIN'],
    estMinutes: 10,
  },
  {
    id: 'l4-pref-hunt-pref-and-capital',
    type: 'errorhunt',
    level: 4,
    topic: 'l4-pref',
    title: 'Audit a pref calculation',
    prompt: 'The pref should compound, capital should be returned only after the pref is paid, and the totals should cover all five years. Three things are wrong.',
    workbook: PREF,
    edgeCases: PREF_EDGES,
    bugs: [
      { label: 'The pref accrues on capital only. Unpaid pref from earlier years must earn the pref too: =(capital + unpaid pref) × rate.', category: 'concept', cells: fill('C10', 4, '=C8*$B$4') },
      { label: 'Year 5 cash for the split ignores the capital returned that year. Subtract row 13 as well.', category: 'omitted', cells: { F15: '=F7-F11' } },
      { label: 'The total stops at Year 4 and leaves out the pref paid at the sale.', category: 'omitted', cells: { B17: '=SUM(B11:E11)' } },
    ],
    explanation:
      'A non-compounding pref understates what investors are owed, which overstates the sponsor’s promote: it is the single most contested line in a waterfall. A sanity check on the split: pref paid plus capital returned plus cash for the split must equal total cash.',
    hints: [
      'Add the three totals at the bottom. Do they equal the cash that came in?',
      'Read across the accrual row: what balance is each year’s pref charged on?',
      'Look at row 10, F15 and B17.',
    ],
    tags: ['preferred return', 'compounding', 'audit'],
    estMinutes: 6,
  },

  // =========================================================================
  // Promote tiers
  // =========================================================================
  {
    id: 'l4-promote-what-is-promote',
    type: 'flashcard',
    level: 4,
    topic: 'l4-promote',
    title: 'What a promote is',
    prompt: 'What is a promote (carried interest), and why do investors agree to pay it?',
    answer:
      'A promote is a share of profit paid to the sponsor (GP) that is larger than the sponsor’s share of the equity. For example, the GP puts in 10% of the equity but receives 30% of the profit above an 8% pref.\n\nInvestors agree because it pays the sponsor only when the deal performs. The sponsor earns the promote after investors have received their pref and their capital back.',
    tags: ['promote', 'carried interest', 'GP', 'LP'],
    estMinutes: 0.5,
  },
  {
    id: 'l4-promote-mcq-split-meaning',
    type: 'mcq',
    level: 4,
    topic: 'l4-promote',
    title: 'What a 70/30 split means',
    prompt: 'A deal has an 8% pref and then a “70/30 split”. The sponsor invested 10% of the equity. Which statement is right?',
    correct: { text: 'Above the pref and return of capital, the sponsor gets 30% as a promote, plus its 10% share of the other 70%.' },
    distractors: [
      { text: 'The sponsor gets 30% of every dollar the deal distributes, from the first dollar.', why: 'The promote starts only after investors have their pref and their capital back.', category: 'timing' },
      { text: 'Investors’ returns are capped at 8% and the sponsor keeps the rest.', why: 'The pref is a hurdle, not a cap. Investors also receive most of the profit above it.', category: 'concept' },
      { text: 'The sponsor must contribute 30% of the equity.', why: 'The split describes how profit is shared, not who put in the equity.', category: 'concept' },
    ],
    explanation:
      'A split describes profit above the hurdle. 30% goes to the sponsor as promote. The remaining 70% goes to the equity pro rata, and the sponsor owns 10% of the equity, so it also receives 7% that way: 37% of Tier 2 cash in total.',
    hints: ['Separate two ideas: who owns the equity, and how profit above the hurdle is divided.'],
    tags: ['promote', 'waterfall'],
    estMinutes: 1.5,
  },
  {
    id: 'l4-promote-mcq-lp-tier-two',
    type: 'mcq',
    level: 4,
    topic: 'l4-promote',
    title: 'The LP’s share of Tier 2',
    prompt: 'After the pref and return of capital there is {cash} left. The sponsor takes a {promote} promote, and the LP owns {lp} of the equity. How much of the {cash} goes to the LP?',
    vars: [
      { name: 'cash', min: 2000000, max: 9000000, step: 250000, format: 'usd' },
      { name: 'promote', choices: [0.2, 0.3], format: 'pct' },
      { name: 'lp', choices: [0.9, 0.95], format: 'pct' },
    ],
    correct: { formula: '=cash*(1-promote)*lp' },
    distractors: [
      { formula: '=cash*lp', why: 'That ignores the promote. It comes off the top before the equity shares what is left.', category: 'omitted' },
      { formula: '=cash*(1-promote)', why: 'That gives all of the non-promote cash to the LP. The sponsor’s own equity shares in it too.', category: 'omitted' },
      { formula: '=cash*promote', why: 'That is the promote itself, which goes to the sponsor.', category: 'concept' },
    ],
    format: 'usd',
    explanation: 'Promote: {cash} × {promote} = {=cash*promote|usd} to the sponsor. The rest, {=cash*(1-promote)|usd}, is shared by ownership, so the LP gets {lp} of it: {=cash*(1-promote)*lp|usd}.',
    hints: ['Take the promote off first. Then split the remainder by who owns the equity.'],
    tags: ['promote', 'LP', 'waterfall'],
    estMinutes: 1.5,
  },
  {
    id: 'l4-promote-num-total-to-gp',
    type: 'numeric',
    level: 4,
    topic: 'l4-promote',
    title: 'Everything the sponsor receives in Tier 2',
    prompt: 'Tier 2 cash is {cash}. The promote is {promote} and the sponsor owns {gp} of the equity. How much of the Tier 2 cash goes to the sponsor in total?',
    vars: [
      { name: 'cash', min: 2000000, max: 9000000, step: 250000, format: 'usd' },
      { name: 'promote', choices: [0.2, 0.25, 0.3], format: 'pct' },
      { name: 'gp', choices: [0.05, 0.1, 0.15], format: 'pct' },
    ],
    answer: '=cash*promote+cash*(1-promote)*gp',
    format: 'usd',
    mistakes: [
      { formula: '=cash*promote', label: 'That is only the promote. The sponsor’s own equity also shares in the rest.', category: 'omitted' },
      { formula: '=cash*(promote+gp)', label: 'The sponsor’s ownership share applies to what is left after the promote, not to all of the cash.', category: 'wrong-base' },
    ],
    explanation:
      'Promote: {cash} × {promote} = {=cash*promote|usd}. Co-invest share of the rest: {=cash*(1-promote)|usd} × {gp} = {=cash*(1-promote)*gp|usd}. Total to the sponsor: {=cash*promote+cash*(1-promote)*gp|usd}.',
    hints: ['The sponsor is paid twice: once as promoter, once as an investor.', 'Promote + (ownership share × the cash left after the promote).'],
    tags: ['promote', 'GP'],
    estMinutes: 2,
  },
  {
    id: 'l4-promote-explain-alignment',
    type: 'explain',
    level: 4,
    topic: 'l4-promote',
    title: 'Explain: how a promote aligns interests',
    prompt: 'Explain how a promote is meant to align a sponsor with its investors, and name one way it can do the opposite.',
    rubric: [
      'The sponsor earns the promote only after investors receive their pref and their capital back.',
      'So the sponsor’s big payday depends on the deal performing well for investors first.',
      'One way it misaligns: it can push the sponsor toward more risk, more leverage or holding out for upside, since the sponsor shares the gains above the hurdle but not the losses in the same way.',
      'Co-investment by the sponsor (its own money in the deal) is the usual counterweight.',
    ],
    model:
      'Because the promote is paid only after investors have their pref and capital back, the sponsor makes real money only when investors do, which pushes it to create value. The catch is that a promote is like an option: the sponsor shares the upside above the hurdle but loses little on the downside, so it can be tempted to take more risk or more leverage. That is why investors also want the sponsor to have its own cash in the deal.',
    trap: 'Describing only the alignment and missing the option-like incentive to take risk, or leaving out the role of sponsor co-investment.',
    tags: ['promote', 'alignment', 'GP', 'LP'],
    estMinutes: 3,
  },
  {
    id: 'l4-promote-grid-two-tier',
    type: 'grid',
    level: 4,
    topic: 'l4-promote',
    title: 'Split a two-tier waterfall',
    prompt:
      'The cash has already been sorted into two tiers. Split each tier between the LP and the GP.\n\n• Tier 1 (pref and return of capital) is shared by ownership.\n• Tier 2: the GP takes the promote off the top; the rest is shared by ownership.\n• The check row should be zero in every year: everything paid out equals the cash.\n• Then compute each side’s equity multiple and the GP’s share of total profit.',
    workbook: PROMOTE,
    mistakes: PROMOTE_MISTAKES,
    explanation:
      'LP: Tier 1 =B7*$B$3, Tier 2 =B8*(1-$B$4)*$B$3. GP: Tier 1 =B7*(1-$B$3), Tier 2 co-invest =B8*(1-$B$4)*(1-$B$3), promote =B8*$B$4. The check, =B13+B19-B7-B8, proves no cash was lost or invented. The GP ends with a much higher multiple than the LP because the promote is paid on equity it did not put in.',
    hints: [
      'Tier 1 is a straight ownership split. Tier 2 has one extra step before the ownership split.',
      'Promote = Tier 2 cash × promote %. What is left is shared by ownership.',
      'B12: =B8*(1-$B$4)*$B$3   B18: =B8*$B$4   B21: =B13+B19-B7-B8',
    ],
    tags: ['promote', 'waterfall', 'GP', 'LP', 'check cell'],
    estMinutes: 9,
  },
  {
    id: 'l4-promote-hunt-two-tier',
    type: 'errorhunt',
    level: 4,
    topic: 'l4-promote',
    title: 'Audit a waterfall split',
    prompt: 'This split has a check row that should read zero in every year. It does not. Find out why, and check the results at the bottom too. Three things are wrong.',
    workbook: PROMOTE,
    bugs: [
      { label: 'The promote is taken on all cash, including the pref and return of capital. It applies to Tier 2 only.', category: 'wrong-base', cells: fill('B18', 5, '=(B7+B8)*$B$4') },
      { label: 'The LP is given its full share of Tier 2 before the promote. It should share only what is left after the promote.', category: 'omitted', cells: fill('B12', 5, '=B8*$B$3') },
      { label: 'The GP multiple divides by total equity. It should divide by the GP’s own equity.', category: 'wrong-base', cells: { B25: '=SUM(B19:F19)/B5' } },
    ],
    explanation:
      'This is what check cells are for. More cash is being paid out than exists, and the check row shows it immediately. Follow a non-zero check back to the rows that feed it, and fix those rather than the check itself.',
    hints: [
      'A non-zero check means the amounts paid out do not add up to the cash. Which rows pay out too much?',
      'Compare each Tier 2 formula with the rule: promote first, then ownership.',
      'Look at row 18, row 12 and B25.',
    ],
    tags: ['promote', 'check cell', 'audit'],
    estMinutes: 6,
  },
]);
