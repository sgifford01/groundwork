/** Asset & Portfolio Management: seed questions. See BUILD_SPEC.md in this folder before adding more. */
import { down, fill, given, header, input, label, note, sheet, target, title, total } from '../../build';
import { categoryItems } from '../define';

export const ITEMS = categoryItems('asset-management', [
  {
    id: 'asset-management-budgets-grid-variance',
    type: 'grid',
    level: 1,
    topic: 'asset-management-budgets',
    title: 'Budget vs. actual variance report',
    prompt:
      'Here is the first-half budget and actual for an apartment community in Mira Mesa (illustrative). Build the variance columns using the convention that a POSITIVE variance is favourable: more revenue than budget is positive, and spending less than budget is positive. Expenses are entered as positive numbers. Variance % is always measured against the budget.',
    tags: ['variance', 'budget', 'asset management', 'favourable'],
    estMinutes: 8,
    hints: [
      'Favourable means better for the owner. For revenue that is actual above budget. For an expense it is actual below budget.',
      'So revenue variance = actual - budget, and expense variance = budget - actual. NOI is income, so it follows the revenue rule.',
      'D5: =C5-B5. D9: =B9-C9. Percent: =D5/B5.',
    ],
    workbook: {
      sheets: [
        sheet(
          'Variance',
          {
            A1: title('Budget vs. actual, January to June'),
            B3: header('Budget'),
            C3: header('Actual'),
            D3: header('Variance ($)'),
            E3: header('Variance (%)'),
            A4: header('Revenue', 'left'),
            A5: label('Rental income'),
            B5: input(1240000, 'usd', [1000000, 1500000, 10000]),
            C5: input(1198000, 'usd', [1000000, 1500000, 10000]),
            A6: label('Other income'),
            B6: input(86000, 'usd', [60000, 110000, 1000]),
            C6: input(93500, 'usd', [60000, 110000, 1000]),
            A7: total('Total revenue'),
            B7: given('=SUM(B5:B6)', 'usd', { border: 'top' }),
            C7: given('=SUM(C5:C6)', 'usd', { border: 'top' }),
            A8: header('Operating expenses (positive numbers)', 'left'),
            A9: label('Payroll'),
            B9: input(142000, 'usd', [110000, 170000, 1000]),
            C9: input(139500, 'usd', [110000, 170000, 1000]),
            A10: label('Repairs and maintenance'),
            B10: input(96000, 'usd', [70000, 130000, 1000]),
            C10: input(121400, 'usd', [70000, 130000, 1000]),
            A11: label('Utilities'),
            B11: input(88000, 'usd', [70000, 110000, 1000]),
            C11: input(91200, 'usd', [70000, 110000, 1000]),
            A12: label('Taxes and insurance'),
            B12: input(214000, 'usd', [180000, 250000, 1000]),
            C12: input(219800, 'usd', [180000, 250000, 1000]),
            A13: total('Total operating expenses'),
            B13: given('=SUM(B9:B12)', 'usd', { border: 'top' }),
            C13: given('=SUM(C9:C12)', 'usd', { border: 'top' }),
            A15: total('Net operating income'),
            B15: given('=B7-B13', 'usd', { border: 'double' }),
            C15: given('=C7-C13', 'usd', { border: 'double' }),
            ...down('D5', 3, target('=C5-B5', 'usd')),
            ...down('E5', 3, target('=D5/B5', 'pct1')),
            ...down('D9', 5, target('=B9-C9', 'usd')),
            ...down('E9', 5, target('=D9/B9', 'pct1')),
            D15: target('=C15-B15', 'usd'),
            E15: target('=D15/B15', 'pct1'),
            A17: note('Positive variance = favourable. Illustrative figures.'),
          },
          { A: 290, B: 115, C: 115, D: 115, E: 105 },
        ),
      ],
    },
    mistakes: [
      {
        label: 'For an expense, spending more than budget is UNFAVOURABLE. With positive meaning favourable, an expense variance is budget minus actual.',
        category: 'sign',
        cells: fill('D9', 5, '=C9-B9', 'down'),
      },
      {
        label: 'A variance percentage is measured against the budget, not against the actual.',
        category: 'wrong-base',
        cells: fill('E5', 3, '=D5/C5', 'down'),
      },
      {
        label: 'Both variances are already signed so that positive is favourable. The NOI variance is their SUM, which is the same as actual NOI minus budget NOI.',
        category: 'sign',
        cells: { D15: '=D7-D13' },
      },
    ],
    explanation:
      'A variance report is only readable if the sign means the same thing on every line. Here positive is always good news for the owner: revenue above budget, expenses below budget, NOI above budget. Check yourself: the revenue variance plus the expense variance must equal the NOI variance. Then read the report for causes. Repairs running well over budget is the line an asset manager would ask about first.',
  },
  {
    id: 'asset-management-roles-judgment-chiller',
    type: 'judgment',
    level: 1,
    topic: 'asset-management-roles',
    title: 'An unbudgeted capital item: who decides?',
    prompt:
      'You are the asset manager for a 1990s office building in Kearny Mesa owned by a joint venture (illustrative). The property manager calls: the main chiller is failing and a replacement is quoted at {cost|usd}. It is not in this year’s budget. The JV agreement makes any unbudgeted spending above {threshold|usd} a major decision that needs the partners’ approval. What do you do?',
    tags: ['asset management', 'property management', 'capex', 'joint venture', 'major decisions'],
    estMinutes: 3,
    hints: [
      'Three roles are in play: the property manager, you, and the owners. Whose money is it?',
      'Compare the quote with the approval threshold in the JV agreement.',
    ],
    vars: [
      { name: 'cost', min: 140000, max: 220000, step: 10000, format: 'usd' },
      { name: 'threshold', choices: [50000, 75000, 100000], format: 'usd' },
    ],
    options: [
      {
        text: 'Have the property manager get competing bids and a repair-or-replace opinion, check reserves and the loan documents, then take a recommendation to the partners for approval, tied to the business plan and the expected hold period.',
        rating: 'best',
        why: 'This is the asset manager’s job: frame the capital decision, test it against the plan and obtain the approval the JV agreement requires. The property manager supplies the facts and carries out the work.',
      },
      {
        text: 'Authorise a temporary repair within your own approval limit to keep tenants comfortable, and put the replacement in next year’s budget.',
        rating: 'acceptable',
        why: 'A stopgap can be right and it respects the limit. But it postpones a decision the partners should hear about now, and a failure in August costs more in tenant goodwill than the repair saves.',
      },
      {
        text: 'Tell the property manager to handle it. Building systems are an operations matter.',
        rating: 'poor',
        why: 'Day-to-day operations belong to the property manager, but a {cost|usd} unbudgeted capital item is above their authority and above the {threshold|usd} threshold. The decision belongs with the owners.',
        category: 'concept',
      },
      {
        text: 'Approve the replacement today so work can start, and report it in the next quarterly letter.',
        rating: 'poor',
        why: 'Speed feels responsible, but spending above {threshold|usd} without the partners’ consent breaches the JV agreement. Urgency is a reason to call the partners today, not to skip them.',
        category: 'concept',
      },
    ],
    explanation:
      'Property managers run the building day to day. Asset managers own the business plan and bring capital decisions to the owners with a recommendation. The owners, here the JV partners, approve whatever the agreement reserves for them. A {cost|usd} item against a {threshold|usd} limit goes to the partners.',
  },
]);
