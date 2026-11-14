/** Commercial Leases & ARGUS: seed questions. See BUILD_SPEC.md in this folder before adding more. */
import { input, label, note, sheet, target, title, header } from '../../build';
import { categoryItems } from '../define';

export const ITEMS = categoryItems('argus', [
  {
    id: 'argus-recoveries-grid-three-structures',
    type: 'grid',
    level: 1,
    topic: 'argus-recoveries',
    title: 'Recoveries under three lease structures',
    prompt:
      'A tenant leases part of an office building in Sorrento Mesa (illustrative figures). Compute what the landlord recovers from this tenant for operating expenses under three lease structures: triple net, a base-year lease, and an expense stop. A recovery is never negative: if expenses fall below the base year or the stop, the tenant simply pays nothing extra.',
    tags: ['recoveries', 'NNN', 'base year', 'expense stop', 'MAX'],
    estMinutes: 6,
    hints: [
      'Start with the tenant’s share of the building: its area over the building’s area.',
      'A base-year lease recovers only the INCREASE over the base year. A stop recovers only the amount per SF above the stop. MAX(0, ...) keeps either from going negative.',
      'Base year: =MAX(0, expenses - base year) * share. The stop works the same way, but per square foot.',
    ],
    workbook: {
      sheets: [
        sheet(
          'Recoveries',
          {
            A1: title('Expense recoveries: one tenant, three lease structures'),
            A3: label('Building rentable area (SF)'),
            B3: input(60000, 'int', [40000, 90000, 5000]),
            A4: label('Tenant rentable area (SF)'),
            B4: input(12000, 'int', [5000, 20000, 1000]),
            A5: label('Operating expenses this year'),
            B5: input(780000, 'usd', [600000, 900000, 10000]),
            A6: label('Base-year operating expenses'),
            B6: input(690000, 'usd', [600000, 800000, 10000]),
            A7: label('Expense stop ($ per SF)'),
            B7: input(12, 'usd2', [10, 14, 0.25]),
            A9: header('Recovery from this tenant', 'left'),
            A10: label('Pro rata share'),
            B10: target('=B4/B3', 'pct1'),
            A11: label('Triple net: share of all expenses'),
            B11: target('=B5*B10', 'usd'),
            A12: label('Base-year lease: share of the increase'),
            B12: target('=MAX(0,B5-B6)*B10', 'usd'),
            A13: label('Expense stop: excess per SF x tenant SF'),
            B13: target('=MAX(0,B5/B3-B7)*B4', 'usd'),
            A15: note('Illustrative figures for teaching.'),
          },
          { A: 310, B: 130 },
        ),
      ],
    },
    edgeCases: [{ B5: 620000, B6: 690000 }],
    mistakes: [
      {
        label: 'Pro rata share is the tenant’s area divided by the building’s, not the other way round.',
        category: 'concept',
        cells: { B10: '=B3/B4' },
      },
      {
        label: 'That is expenses per square foot. A triple-net tenant pays its share of the total.',
        category: 'units',
        cells: { B11: '=B5/B3' },
      },
      {
        label: 'A recovery cannot go negative. When expenses fall below the base year the tenant pays nothing extra: wrap the increase in MAX(0, ...).',
        category: 'function',
        cells: { B12: '=(B5-B6)*B10' },
      },
      {
        label: 'The base year belongs to the whole building. Subtract it from building expenses first, then take the tenant’s share.',
        category: 'wrong-base',
        cells: { B12: '=MAX(0,B5*B10-B6)' },
      },
      {
        label: 'The excess over the stop is per square foot of the tenant’s space. Multiply by the tenant’s area, not the building’s.',
        category: 'wrong-base',
        cells: { B13: '=MAX(0,B5/B3-B7)*B3' },
      },
    ],
    explanation:
      'All three start from the same expenses. Triple net passes through the tenant’s full share. A base-year lease passes through only the share of the increase since the base year, so the landlord carries the base. An expense stop does the same thing with a fixed dollar-per-SF threshold. In a year when expenses fall, the base-year and stop recoveries are zero, not negative.',
  },
  {
    id: 'argus-baserent-numeric-escalated-year',
    type: 'numeric',
    level: 1,
    topic: 'argus-baserent',
    title: 'Base rent in a later lease year',
    prompt:
      'A {sf|int} SF office tenant pays {rent|usd2} per SF per year in lease year 1, with fixed {bump|pct1} annual escalations. What is the annual base rent in lease year {yr}? (Illustrative figures.)',
    tags: ['base rent', 'escalations', 'compounding'],
    estMinutes: 2,
    hints: [
      'How many escalations have happened by the start of the year you want?',
      'Year 1 has none, year 2 has one. Escalations compound.',
      'Rent = area x year-1 rent per SF x (1 + escalation)^(year - 1).',
    ],
    vars: [
      { name: 'sf', min: 4000, max: 20000, step: 500, format: 'int' },
      { name: 'rent', min: 30, max: 54, step: 1.5, format: 'usd2' },
      { name: 'bump', choices: [0.03, 0.035, 0.04], format: 'pct1' },
      { name: 'yr', choices: [6, 8, 10] },
    ],
    answer: '=sf*rent*(1+bump)^(yr-1)',
    format: 'usd',
    unit: 'per year',
    mistakes: [
      { formula: '=sf*rent*(1+bump)^yr', label: 'Year 1 has no escalation yet, so year {yr} has had {=yr-1} escalations, not {yr}.', category: 'timing' },
      { formula: '=sf*rent*(1+bump*(yr-1))', label: 'Escalations compound: each applies to the rent already escalated. Use (1 + rate)^(years), not 1 + rate x years.', category: 'concept' },
      { formula: '=rent*(1+bump)^(yr-1)', label: 'That is the rent per SF in year {yr}. Multiply by the tenant’s area for the annual rent.', category: 'units' },
    ],
    explanation:
      'By year {yr} the rent has escalated {=yr-1} times. Rent per SF = {rent|usd2} x (1 + {bump|pct1})^{=yr-1} = {=rent*(1+bump)^(yr-1)|usd2}. Times {sf|int} SF = {=sf*rent*(1+bump)^(yr-1)|usd} a year.',
  },
]);
