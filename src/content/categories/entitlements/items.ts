/**
 * Entitlements & Zoning: seed questions. See BUILD_SPEC.md in this folder before adding more.
 * Both seeds are arithmetic on hypothetical standards and state no real-world rule (noLegalClaim).
 */
import { header, input, label, note, sheet, target, title, total } from '../../build';
import { categoryItems } from '../define';

export const ITEMS = categoryItems('entitlements', [
  {
    id: 'entitlements-zoning-grid-capacity',
    type: 'grid',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'What does the zoning allow?',
    prompt:
      'A site sits in a HYPOTHETICAL zone with the standards shown (invented for practice, not a real code section). Work out how much floor area and how many homes it allows. Every standard must be met at once. This code rounds partial storeys and partial units down.',
    tags: ['zoning', 'FAR', 'density', 'height', 'lot coverage', 'MIN', 'ROUNDDOWN'],
    estMinutes: 8,
    hints: [
      'There are two limits on floor area (FAR, and height with coverage) and two on the unit count (density, and what fits in the floor area).',
      'When several limits apply at once, the smallest result governs: MIN. Partial storeys and units do not count: ROUNDDOWN(x, 0).',
      'Storeys = ROUNDDOWN(height limit / floor-to-floor, 0). Buildable area = MIN(lot x FAR, storeys x lot x coverage).',
    ],
    workbook: {
      sheets: [
        sheet(
          'Zoning',
          {
            A1: title('Zoning capacity (hypothetical zone)'),
            A3: label('Lot area (SF)'),
            B3: input(20000, 'int', [12000, 40000, 500]),
            A4: label('Maximum floor area ratio (FAR)'),
            B4: input(2, 'num2', [1, 4, 0.25]),
            A5: label('Density: lot SF required per unit'),
            B5: input(800, 'int', [400, 1500, 50]),
            A6: label('Height limit (ft)'),
            B6: input(50, 'int', [30, 85, 5]),
            A7: label('Floor-to-floor height (ft)'),
            B7: input(10, 'num1', [10, 11, 0.5]),
            A8: label('Maximum lot coverage'),
            B8: input(0.6, 'pct', [0.4, 0.8, 0.05]),
            A9: label('Average gross SF per unit'),
            B9: input(950, 'int', [700, 1200, 25]),
            A11: header('Capacity', 'left'),
            A12: label('Floor area allowed by FAR'),
            B12: target('=B3*B4', 'int'),
            A13: label('Storeys allowed by the height limit'),
            B13: target('=ROUNDDOWN(B6/B7,0)', 'int'),
            A14: label('Footprint allowed by lot coverage'),
            B14: target('=B3*B8', 'int'),
            A15: label('Floor area allowed by height and coverage'),
            B15: target('=B13*B14', 'int'),
            A16: label('Buildable floor area'),
            B16: target('=MIN(B12,B15)', 'int'),
            A17: label('Units allowed by density'),
            B17: target('=ROUNDDOWN(B3/B5,0)', 'int'),
            A18: label('Units that fit in the floor area'),
            B18: target('=ROUNDDOWN(B16/B9,0)', 'int'),
            A19: total('Maximum units'),
            B19: target('=MIN(B17,B18)', 'int', { bold: true, border: 'top' }),
            A21: note('Hypothetical standards. Real codes differ, including on how they round.'),
          },
          { A: 310, B: 120 },
        ),
      ],
    },
    edgeCases: [{ B6: 55, B7: 10 }, { B3: 20500 }, { B4: 4 }, { B4: 1, B5: 400 }],
    mistakes: [
      { label: 'FAR is floor area divided by lot area, so floor area = lot area x FAR.', category: 'concept', cells: { B12: '=B3/B4' } },
      { label: 'A partial storey does not fit under a height limit. Round down, not to the nearest.', category: 'function', cells: { B13: '=ROUND(B6/B7,0)' } },
      { label: 'Multiply the footprint by the number of storeys, not by the height in feet.', category: 'units', cells: { B15: '=B6*B14' } },
      { label: 'Every standard must be met at once, so the smallest floor area governs. Use MIN.', category: 'concept', cells: { B16: '=MAX(B12,B15)' } },
      { label: 'This code rounds partial units down. Rounding up allows a home the lot area does not support.', category: 'function', cells: { B17: '=ROUNDUP(B3/B5,0)' } },
      { label: 'The unit count must satisfy both the density cap and the floor area, so take the smaller.', category: 'concept', cells: { B19: '=MAX(B17,B18)' } },
    ],
    explanation:
      'Zoning capacity is a stack of separate limits and the tightest one wins. Floor area is capped by FAR and, separately, by how many storeys fit under the height limit times the footprint coverage allows. The unit count is capped by density and by how many average-size homes fit in the buildable area. Knowing WHICH limit binds tells you what a variance or a bonus would actually be worth.',
  },
  {
    id: 'entitlements-risk-numeric-expected-carry',
    type: 'numeric',
    level: 2,
    topic: 'entitlements-risk',
    noLegalClaim: true,
    title: 'Expected holding cost with a risk of appeal',
    prompt:
      'A developer controls a site in Mission Valley and expects entitlement to take {base} months. Holding the site costs {carry|usd} a month in option payments, taxes and consultants. There is a {prob|pct} chance of an appeal that would add {extra} months. What is the expected holding cost through entitlement? (Illustrative figures.)',
    tags: ['entitlement risk', 'expected value', 'carry cost'],
    estMinutes: 2,
    hints: [
      'An expected value weights each outcome by its probability.',
      'The base months happen for certain. Only the extra months are uncertain.',
      'Expected months = base + probability x extra. Multiply by the monthly cost.',
    ],
    vars: [
      { name: 'carry', min: 30000, max: 90000, step: 5000, format: 'usd' },
      { name: 'base', choices: [12, 14, 16, 18] },
      { name: 'prob', choices: [0.2, 0.25, 0.3, 0.4], format: 'pct' },
      { name: 'extra', choices: [6, 8, 10, 12] },
    ],
    answer: '=carry*(base+prob*extra)',
    format: 'usd',
    mistakes: [
      { formula: '=carry*(base+extra)', label: 'That treats the appeal as certain. Weight the extra months by the {prob|pct} chance they happen.', category: 'concept' },
      { formula: '=carry*base', label: 'That ignores the appeal risk altogether. Add the probability-weighted extra months.', category: 'omitted' },
      { formula: '=carry*prob*(base+extra)', label: 'The base {base} months happen for certain. Apply the probability only to the extra months.', category: 'wrong-base' },
    ],
    explanation:
      'Expected months = {base} + {prob|pct} x {extra} = {=base+prob*extra|num1}. Expected cost = {=base+prob*extra|num1} x {carry|usd} = {=carry*(base+prob*extra)|usd}. The budget should also show the bad case on its own ({=carry*(base+extra)|usd}): an expected value hides how much the downside hurts.',
  },
]);
