/** Market Analysis: seed questions. See BUILD_SPEC.md in this folder before adding more. All market figures are illustrative. */
import { across, fill, header, input, label, note, sheet, target, title, total } from '../../build';
import { categoryItems } from '../define';

const RENT: [number, number, number] = [2300, 3100, 25];
const SIZE: [number, number, number] = [640, 840, 10];
const BUILT: [number, number, number] = [2005, 2024, 1];
const YES_NO = { choices: [0, 1] };

export const ITEMS = categoryItems('market-analysis', [
  {
    id: 'market-analysis-rent-comps-grid-adjustments',
    type: 'grid',
    level: 2,
    topic: 'market-analysis-rent-comps',
    title: 'Rent comp adjustment grid',
    prompt:
      'You are setting the rent for a new one-bedroom in Kearny Mesa (the subject). Three comparable units have leased recently. Adjust each comp to the subject for size, age and parking, then conclude a rent. The rule: adjust the COMP toward the SUBJECT. Where the comp is inferior to the subject, its rent is adjusted up; where it is superior, down. (Illustrative figures, not real listings.)',
    tags: ['rent comps', 'adjustment grid', 'mixed references', 'AVERAGE'],
    estMinutes: 9,
    hints: [
      'Each adjustment is (subject minus comp) times the value of one unit of that feature. Larger, newer and with parking all count as better.',
      'You will fill each row to the right. The subject column and the adjustment value must stay put while the comp column moves: mixed and absolute references.',
      'Size adjustment for Comp 1: =($B5-C5)*$B$10. Adjusted rent = the comp’s rent plus its three adjustments.',
    ],
    workbook: {
      sheets: [
        sheet(
          'Comps',
          {
            A1: title('Rent comparables: adjusting three comps to the subject'),
            B3: header('Subject'),
            C3: header('Comp 1'),
            D3: header('Comp 2'),
            E3: header('Comp 3'),
            A4: label('Monthly rent'),
            C4: input(2650, 'usd', RENT),
            D4: input(2480, 'usd', RENT),
            E4: input(2900, 'usd', RENT),
            A5: label('Unit size (SF)'),
            B5: input(720, 'int', [650, 800, 10]),
            C5: input(760, 'int', SIZE),
            D5: input(690, 'int', SIZE),
            E5: input(800, 'int', SIZE),
            A6: label('Year built'),
            B6: input(2026, 'general', false),
            C6: input(2019, 'general', BUILT),
            D6: input(2012, 'general', BUILT),
            E6: input(2023, 'general', BUILT),
            A7: label('Parking included (1 = yes, 0 = no)'),
            B7: input(1, 'int', YES_NO),
            C7: input(1, 'int', YES_NO),
            D7: input(0, 'int', YES_NO),
            E7: input(1, 'int', YES_NO),
            A9: header('Adjustment values', 'left'),
            A10: label('Size: $ per SF per month'),
            B10: input(1.5, 'usd2', [1, 2.5, 0.25]),
            A11: label('Age: $ per month for each year newer'),
            B11: input(15, 'usd', [5, 30, 5]),
            A12: label('Parking space: $ per month'),
            B12: input(150, 'usd', [75, 250, 25]),
            A14: header('Adjust each comp to the subject', 'left'),
            A15: label('Size adjustment'),
            ...across('C15', 3, target('=($B5-C5)*$B$10', 'usd')),
            A16: label('Age adjustment'),
            ...across('C16', 3, target('=($B6-C6)*$B$11', 'usd')),
            A17: label('Parking adjustment'),
            ...across('C17', 3, target('=($B7-C7)*$B$12', 'usd')),
            A18: total('Adjusted rent'),
            ...across('C18', 3, target('=C4+SUM(C15:C17)', 'usd', { border: 'top' })),
            A20: total('Indicated rent for the subject'),
            B20: target('=AVERAGE(C18:E18)', 'usd'),
            A21: label('Indicated rent per SF'),
            B21: target('=B20/B5', 'usd2'),
            A23: note('Illustrative figures for teaching, not real listings.'),
          },
          { A: 290, B: 100, C: 100, D: 100, E: 100 },
        ),
      ],
    },
    mistakes: [
      {
        label: 'Adjust the comp toward the subject. A comp that is larger than the subject has its rent brought DOWN: subject minus comp, not comp minus subject.',
        category: 'sign',
        cells: fill('C15', 3, '=(C5-$B5)*$B$10'),
      },
      {
        label: 'The adjustments are already signed (positive where the comp is inferior), so add them to the comp’s rent.',
        category: 'sign',
        cells: fill('C18', 3, '=C4-SUM(C15:C17)'),
      },
      {
        label: 'That averages the comps’ raw rents. Conclude from the ADJUSTED rents.',
        category: 'omitted',
        cells: { B20: '=AVERAGE(C4:E4)' },
      },
      {
        label: 'The indicated rent is for a unit like the subject, so divide by the subject’s size, not the comps’.',
        category: 'wrong-base',
        cells: { B21: '=B20/AVERAGE(C5:E5)' },
      },
    ],
    explanation:
      'An adjustment grid answers one question per comp: what would this unit rent for if it were the subject? Each feature is priced, the difference (subject minus comp) is multiplied by that price, and the adjustments are added to the comp’s rent. If the adjusted rents land close together, the comps agree and the conclusion is defensible. If they spread, an adjustment value or a comp is wrong.',
  },
  {
    id: 'market-analysis-absorption-numeric-months-to-stabilise',
    type: 'numeric',
    level: 2,
    topic: 'market-analysis-absorption',
    title: 'Months to work off vacancy and pipeline',
    prompt:
      'An apartment submarket has {inventory|int} existing units, of which {vacant|int} are vacant. Another {pipeline|int} units are under construction and will deliver empty. Net absorption has been running at {absorb} units a month. Lenders treat {stab|pct} vacancy as stabilised. If absorption holds, how many months until the submarket is back to stabilised vacancy? (Illustrative figures.)',
    tags: ['absorption', 'pipeline', 'vacancy', 'months of supply'],
    estMinutes: 3,
    hints: [
      'First find how many vacant units there will be once the pipeline delivers.',
      'A healthy market is never 100% full. Stabilised vacancy is a share of the inventory AFTER the new units are added.',
      'Months = (vacant + pipeline - stabilised % x (inventory + pipeline)) / monthly absorption.',
    ],
    vars: [
      { name: 'inventory', min: 6000, max: 9000, step: 250, format: 'int' },
      { name: 'vacant', min: 400, max: 700, step: 20, format: 'int' },
      { name: 'pipeline', min: 300, max: 600, step: 50, format: 'int' },
      { name: 'stab', choices: [0.05, 0.06], format: 'pct' },
      { name: 'absorb', min: 25, max: 60, step: 5 },
    ],
    answer: '=(vacant+pipeline-stab*(inventory+pipeline))/absorb',
    format: 'num1',
    unit: 'months',
    tolerance: { abs: 0.06 },
    mistakes: [
      { formula: '=(vacant+pipeline)/absorb', label: 'That absorbs every vacant unit. A stabilised market still carries {stab|pct} vacancy, so those units never need absorbing.', category: 'concept' },
      { formula: '=(vacant-stab*inventory)/absorb', label: 'The {pipeline|int} units under construction will deliver empty and compete for the same renters. Add them.', category: 'omitted' },
      { formula: '=(vacant+pipeline-stab*inventory)/absorb', label: 'Once the pipeline delivers, inventory is larger. Stabilised vacancy is {stab|pct} of the new total, not of today’s inventory.', category: 'wrong-base' },
    ],
    explanation:
      'After delivery there are {=vacant+pipeline|int} vacant units in an inventory of {=inventory+pipeline|int}. Stabilised vacancy is {stab|pct} of that: {=stab*(inventory+pipeline)|int} units. The excess to absorb is {=vacant+pipeline-stab*(inventory+pipeline)|int} units, which at {absorb} a month takes {=(vacant+pipeline-stab*(inventory+pipeline))/absorb|num1} months. A project delivering into this submarket should expect a slow lease-up until then.',
  },
]);
