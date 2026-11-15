/**
 * Plan Reading: the capstone case (subtopic plan-reading-case).
 *
 * A timed plan-to-spreadsheet task on the whole podium-mixed-use set: take the
 * quantities off four drawings, then build the program, check it against the
 * fictional project's limits, and value it. The limits are GIVEN as this
 * project's rules (zoning itself is taught in Entitlements). Rents and rates
 * are illustrative.
 *
 * The cells are weighted by count, close to the spec's rubric (section 9):
 * 7 takeoffs (29%), 8 program cells (33%), 4 checks (17%), 5 value cells (21%).
 */
import { header, input, label, sheet, target, title, total } from '../../build';
import { categoryItems } from '../define';

/** Three buildings: the default, a longer one with five apartment floors, and the longest with three. Each has one-beds on both sides of the corridor. */
const CASE: Record<string, number>[] = [{ stalls_per_row: 16 }, { stalls_per_row: 18, res_storeys: 5 }, { stalls_per_row: 20, res_storeys: 3 }];

export const ITEMS = categoryItems('plan-reading', [
  {
    id: 'plan-reading-case-plangrid-kettner-commons',
    type: 'plangrid',
    level: 3,
    topic: 'plan-reading-case',
    title: 'Capstone: from the drawings to a program and a value',
    prompt:
      'Kettner Commons is an illustrative mixed-use building: a parking level below the street, shops and the lobby on the ground floor, and apartment floors above. Take the seven numbers at the top of the sheet off the drawings (each label names its sheet), then build the program, the three checks and the value. The limits, unit sizes, rents and rates are given for this fictional project. Its FAR counts the ground floor and the apartment floors, not the parking level. Round the parking requirement up to a whole stall. Each check shows PASS or FAIL.',
    tags: ['capstone', 'takeoff', 'building program', 'FAR', 'parking', 'unit mix', 'pro forma', 'ROUNDUP', 'IF'],
    estMinutes: 36,
    hints: [],
    minutes: 35,
    passMark: 0.8,
    brief: [
      'Takeoffs (B4 to B10): one-beds and two-beds on an apartment floor, the number of apartment floors, the gross area of an apartment floor and of the ground floor, the retail area and the parking stalls.',
      'Program: apartments, the two-bed share, the gross and rentable area of the apartment floors, their efficiency, the average apartment size, the floor area counted for FAR and the FAR used.',
      'Checks: parking (stalls provided at least the requirement for the apartments plus the shops, rounded up), unit mix (two-bed share at least the target) and FAR (no more than the limit).',
      'Value: apartment and retail rent per year (both rents are monthly), effective gross income after vacancy, NOI after expenses, and value at the cap rate.',
    ],
    figure: { set: 'podium-mixed-use', variants: CASE, sheet: 'G-001' },
    workbook: {
      sheets: [
        sheet(
          'Program',
          {
            A1: title('Kettner Commons: program, checks and value (illustrative)'),
            A3: header('Taken off the drawings', 'left'),
            A4: label('One-beds per apartment floor (A-102)'),
            A5: label('Two-beds per apartment floor (A-102)'),
            A6: label('Apartment floors (A-301)'),
            A7: label('Apartment floor gross area, SF (A-102)'),
            A8: label('Ground floor gross area, SF (A-101)'),
            A9: label('Retail area, SF (A-101)'),
            A10: label('Parking stalls (A-100)'),

            A12: header('Given for this project (illustrative)', 'left'),
            A13: label('One-bed rentable area, SF (unit plans)'),
            B13: input(720, 'int', [650, 850, 10]),
            A14: label('Two-bed rentable area, SF (unit plans)'),
            B14: input(1080, 'int', [950, 1250, 10]),
            A15: label('Lot area, SF (survey)'),
            B15: input(28000, 'int', [27000, 32000, 500]),
            A16: label('FAR limit'),
            B16: input(2.5, 'num2', [2.2, 3, 0.05]),
            A17: label('Stalls required per apartment'),
            B17: input(1, 'num2', [0.75, 1.5, 0.05]),
            A18: label('Stalls required per 1,000 SF of retail'),
            B18: input(2.5, 'num1', [2, 4, 0.5]),
            A19: label('Two-bed share required (at least)'),
            B19: input(0.28, 'pct', [0.2, 0.35, 0.01]),
            A20: label('One-bed rent per month'),
            B20: input(2650, 'usd', [2200, 3100, 25]),
            A21: label('Two-bed rent per month'),
            B21: input(3450, 'usd', [2900, 4000, 25]),
            A22: label('Retail rent per SF per month'),
            B22: input(3.25, 'usd2', [2.5, 4.5, 0.05]),
            A23: label('Vacancy and credit loss'),
            B23: input(0.05, 'pct', [0.03, 0.08, 0.005]),
            A24: label('Operating expenses (% of EGI)'),
            B24: input(0.35, 'pct', [0.28, 0.42, 0.01]),
            A25: label('Cap rate'),
            B25: input(0.0525, 'pct2', [0.045, 0.06, 0.0025]),

            A27: header('Program', 'left'),
            A28: label('Apartments'),
            B28: target('=(B4+B5)*B6', 'int'),
            A29: label('Two-bed share of the apartments'),
            B29: target('=B5/(B4+B5)', 'pct1'),
            A30: label('Apartment floors: gross area, SF'),
            B30: target('=B7*B6', 'int'),
            A31: label('Floor area counted for FAR, SF'),
            B31: target('=B8+B30', 'int'),
            A32: label('Apartments: rentable area, SF'),
            B32: target('=(B4*B13+B5*B14)*B6', 'int'),
            A33: label('Efficiency of the apartment floors'),
            B33: target('=B32/B30', 'pct1'),
            A34: label('Average apartment size, SF'),
            B34: target('=B32/B28', 'int'),
            A35: label('FAR used'),
            B35: target('=B31/B15', 'num2'),

            A37: header('Checks', 'left'),
            A38: label('Stalls required (rounded up)'),
            B38: target('=ROUNDUP(B28*B17+B9/1000*B18,0)', 'int'),
            A39: label('Parking: provided vs. required'),
            B39: target('=IF(B10>=B38,"PASS","FAIL")', 'text'),
            A40: label('Unit mix: two-bed share vs. required'),
            B40: target('=IF(B29>=B19,"PASS","FAIL")', 'text'),
            A41: label('FAR: used vs. limit'),
            B41: target('=IF(B35<=B16,"PASS","FAIL")', 'text'),

            A43: header('Value', 'left'),
            A44: label('Apartment rent, per year'),
            B44: target('=(B4*B20+B5*B21)*12*B6', 'usd'),
            A45: label('Retail rent, per year'),
            B45: target('=B9*B22*12', 'usd'),
            A46: label('Effective gross income'),
            B46: target('=(B44+B45)*(1-B23)', 'usd'),
            A47: label('Net operating income'),
            B47: target('=B46*(1-B24)', 'usd'),
            A48: total('Value'),
            B48: target('=B47/B25', 'usd', { border: 'top' }),
          },
          { A: 320, B: 130 },
        ),
      ],
    },
    takeoffs: [
      {
        cell: 'B4',
        label: 'One-beds per apartment floor',
        answer: '=floor_one_beds',
        format: 'int',
        tolerance: { abs: 0.4 },
        mistakes: [
          { formula: '=north_one_beds', label: 'That counts only the north side of the corridor. The south side has one-beds too, east of the two-beds.', category: 'omitted' },
          { formula: '=floor_units', label: 'That is every apartment on the floor. This cell is the one-beds only (tagged 1BR).', category: 'wrong-base' },
        ],
      },
      {
        cell: 'B5',
        label: 'Two-beds per apartment floor',
        answer: '=floor_two_beds',
        format: 'int',
        tolerance: { abs: 0.4 },
        mistakes: [{ formula: '=res_two_beds', label: 'That is every apartment floor. This cell is one floor: the plan is typical, so it repeats.', category: 'double-count' }],
      },
      {
        cell: 'B6',
        label: 'Apartment floors',
        answer: '=res_storeys',
        format: 'int',
        tolerance: { abs: 0.4 },
        mistakes: [
          {
            formula: '=storeys_above_grade',
            label: 'That counts the ground floor, which holds the shops and the lobby. Only the floors above the concrete slab are apartments.',
            category: 'double-count',
          },
        ],
      },
      {
        cell: 'B7',
        label: 'Apartment floor gross area',
        answer: '=typical_sf',
        format: 'int',
        mistakes: [
          { formula: '=typical_nra_sf', label: 'That is the apartments only. Gross area is the whole floor: overall length times overall depth.', category: 'wrong-base' },
          { formula: '=ground_sf', label: 'That is the ground floor. The apartment floors are smaller: use the overall dimensions on A-102.', category: 'wrong-base' },
        ],
      },
      {
        cell: 'B8',
        label: 'Ground floor gross area',
        answer: '=ground_sf',
        format: 'int',
        mistakes: [
          { formula: '=retail_sf', label: 'That is the shops only. Gross area is the whole ground floor: overall length times overall depth.', category: 'wrong-base' },
          { formula: '=typical_sf', label: 'That is an apartment floor. The ground floor covers the whole site footprint: use A-101.', category: 'wrong-base' },
        ],
      },
      {
        cell: 'B9',
        label: 'Retail area',
        answer: '=retail_sf',
        format: 'int',
        mistakes: [
          { formula: '=ground_sf', label: 'That is the whole ground floor. Retail is the shops only, not the ramp, lobby, corridor and back-of-house rooms.', category: 'wrong-base' },
          { formula: '=retail_frontage*garage_width', label: 'The shops stop at the service corridor: use the shop depth, not the depth of the building.', category: 'wrong-base' },
        ],
      },
      {
        cell: 'B10',
        label: 'Parking stalls',
        answer: '=total_stalls',
        format: 'int',
        tolerance: { abs: 0.4 },
        mistakes: [
          { formula: '=standard_stalls', label: 'You left out the accessible stalls (the ones with the wheelchair symbol). They are parking stalls too.', category: 'omitted' },
          { formula: '=modules*2*stalls_per_row', label: 'The hatched space beside each accessible stall is an access aisle, kept clear. Nobody can park there.', category: 'double-count' },
        ],
      },
    ],
    // a set where every check passes, one where every check fails, and stall counts either side of the requirement
    edgeCases: [{ B17: 0.5, B16: 3.5, B19: 0.2 }, { B17: 2, B16: 2, B19: 0.4 }, { B10: 30 }, { B10: 200 }],
    mistakes: [
      { label: 'The ground floor is shops and the lobby: only the floors above it have apartments.', category: 'double-count', cells: { B28: '=(B4+B5)*(B6+1)' } },
      { label: 'The ground floor is not an apartment floor. It has its own area, in B8.', category: 'double-count', cells: { B30: '=B7*(B6+1)' } },
      { label: 'That is the gross area. Rentable area is the apartments only: the corridor, stairs and core are not rented.', category: 'concept', cells: { B32: '=B7*B6' } },
      { label: 'Efficiency compares the apartments with the apartment floors, not with the whole building.', category: 'wrong-base', cells: { B33: '=B32/B31' } },
      {
        label: 'That is the average of the two sizes, not of the apartments. There are more one-beds than two-beds, so divide the rentable area by the number of apartments.',
        category: 'concept',
        cells: { B34: '=(B13+B14)/2' },
      },
      { label: 'This project’s FAR counts the ground floor as well as the apartment floors (B31).', category: 'omitted', cells: { B35: '=B30/B15' } },
      { label: 'A requirement is rounded up: a fraction of a stall still has to be provided.', category: 'function', cells: { B38: '=ROUNDDOWN(B28*B17+B9/1000*B18,0)' } },
      { label: 'The shops need parking too: add the retail requirement before rounding.', category: 'omitted', cells: { B38: '=ROUNDUP(B28*B17,0)' } },
      { label: 'The retail ratio is per 1,000 SF: divide the retail area by 1,000 first.', category: 'units', cells: { B38: '=ROUNDUP(B28*B17+B9*B18,0)' } },
      { label: 'Parking passes when the stalls provided are at least the stalls required.', category: 'concept', cells: { B39: '=IF(B10<=B38,"PASS","FAIL")' } },
      { label: 'A FAR limit is a maximum: the project passes when the FAR used is no more than the limit.', category: 'concept', cells: { B41: '=IF(B35>=B16,"PASS","FAIL")' } },
      { label: 'Rents are monthly: multiply by 12 for a year.', category: 'units', cells: { B44: '=(B4*B20+B5*B21)*B6' } },
      { label: 'The retail rent is per SF per month: multiply by 12 for a year.', category: 'units', cells: { B45: '=B9*B22' } },
      { label: 'Take vacancy off: EGI = (apartment rent + retail rent) x (1 - vacancy).', category: 'omitted', cells: { B46: '=B44+B45' } },
      { label: 'Value capitalises NOI, after operating expenses, not EGI.', category: 'wrong-base', cells: { B48: '=B46/B25' } },
    ],
    explanation:
      'Each apartment floor has {floor_one_beds} one-beds and {floor_two_beds} two-beds, and the section shows {res_storeys} apartment floors above the shops: {res_units} apartments. An apartment floor is {typical_length|int} by {typical_depth|int} ft ({typical_sf|int} SF), of which {typical_nra_sf|int} SF is apartments, so {res_efficiency|pct1} of it can be rented. The ground floor is the whole footprint ({ground_sf|int} SF) with {retail_sf|int} SF of shops, and the garage holds {total_stalls} stalls. The traps: the ground floor is not an apartment floor, the corridor and core are not rentable, the average size is weighted by the counts, the parking requirement rounds up and includes the shops, and the retail rent is monthly.',
  },
]);
