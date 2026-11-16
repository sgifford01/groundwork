/**
 * Entitlements & Zoning: zoning capacity (subtopic entitlements-zoning).
 *
 * Every question here is arithmetic or a general concept on HYPOTHETICAL
 * standards, invented for practice, so each carries `noLegalClaim: true` and
 * says "hypothetical" in its prompt. No real zone is quoted (see
 * VERIFICATION_LOG.md for why the optional San Diego zone question was not
 * written in Chunk 1).
 */
import { across, edgeCasesOf, fill, header, input, label, note, sheet, target, title, total, workbookOf } from '../../build';
import { categoryItems } from '../define';
import { ITEMS as SEEDS } from './items';

export const ITEMS = categoryItems('entitlements', [
  // ---------------------------------------------------------------- grids
  {
    id: 'entitlements-zoning-grid-setback-envelope',
    type: 'grid',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'From setbacks to a building envelope',
    prompt:
      'A rectangular lot sits in a HYPOTHETICAL zone (standards invented for practice). Work out the footprint the setbacks leave, the footprint lot coverage allows, how many storeys fit under the height limit, and the floor area of the envelope. Every standard applies at once. This code rounds partial storeys down. Finish by naming which limit sets the footprint.',
    tags: ['zoning', 'setbacks', 'lot coverage', 'height', 'envelope', 'MIN', 'ROUNDDOWN', 'IF'],
    estMinutes: 7,
    hints: [
      'Setbacks shrink the lot from every edge: one side setback on each side, a front and a rear.',
      'Lot coverage is a share of the whole lot. The footprint must satisfy both the setbacks and the coverage, so take the smaller: MIN.',
      'Storeys = ROUNDDOWN(height limit / floor-to-floor, 0). Envelope = footprint x storeys. For the last cell, IF(setback footprint < coverage footprint, "Setbacks", "Coverage").',
    ],
    workbook: {
      sheets: [
        sheet(
          'Envelope',
          {
            A1: title('Building envelope (hypothetical zone)'),
            A3: label('Lot width (ft)'),
            B3: input(100, 'int', [60, 200, 5]),
            A4: label('Lot depth (ft)'),
            B4: input(150, 'int', [100, 250, 5]),
            A5: label('Front setback (ft)'),
            B5: input(15, 'int', [5, 25, 1]),
            A6: label('Rear setback (ft)'),
            B6: input(10, 'int', [5, 20, 1]),
            A7: label('Side setback, each side (ft)'),
            B7: input(5, 'int', [0, 15, 1]),
            A8: label('Maximum lot coverage'),
            B8: input(0.6, 'pct', [0.4, 0.8, 0.05]),
            A9: label('Height limit (ft)'),
            B9: input(45, 'int', [30, 85, 5]),
            A10: label('Floor-to-floor height (ft)'),
            B10: input(10, 'num1', [9.5, 12, 0.5]),
            A12: header('Envelope', 'left'),
            A13: label('Buildable width inside the setbacks (ft)'),
            B13: target('=B3-2*B7', 'int'),
            A14: label('Buildable depth inside the setbacks (ft)'),
            B14: target('=B4-B5-B6', 'int'),
            A15: label('Footprint inside the setbacks (SF)'),
            B15: target('=B13*B14', 'int'),
            A16: label('Footprint allowed by lot coverage (SF)'),
            B16: target('=B3*B4*B8', 'int'),
            A17: label('Maximum footprint (SF)'),
            B17: target('=MIN(B15,B16)', 'int'),
            A18: label('Storeys under the height limit'),
            B18: target('=ROUNDDOWN(B9/B10,0)', 'int'),
            A19: total('Envelope floor area (SF)'),
            B19: target('=B17*B18', 'int', { border: 'top' }),
            A20: label('Which limit sets the footprint?'),
            B20: target('=IF(B15<B16,"Setbacks","Coverage")', 'text'),
            A22: note('Hypothetical standards. Real codes differ, including on how they measure height and round storeys.'),
          },
          { A: 300, B: 120 },
        ),
      ],
    },
    // deep setbacks so that they, not coverage, set the footprint; and a height that divides exactly
    edgeCases: [{ B5: 25, B6: 20, B7: 15, B8: 0.8 }, { B9: 40, B10: 10 }],
    mistakes: [
      { label: 'There is a side setback on EACH side of the lot: subtract it twice.', category: 'omitted', cells: { B13: '=B3-B7' } },
      { label: 'Take the rear setback off too: buildable depth = lot depth - front - rear.', category: 'omitted', cells: { B14: '=B4-B5' } },
      { label: 'Lot coverage is a share of the whole LOT, not of the area left inside the setbacks.', category: 'wrong-base', cells: { B16: '=B15*B8' } },
      { label: 'Both limits apply at once, so the smaller footprint governs. Use MIN.', category: 'concept', cells: { B17: '=MAX(B15,B16)' } },
      { label: 'A partial storey does not fit under a height limit: round down, not to the nearest.', category: 'function', cells: { B18: '=ROUND(B9/B10,0)' } },
      { label: 'Multiply the footprint by the number of storeys, not by the height in feet.', category: 'units', cells: { B19: '=B17*B9' } },
      { label: 'The limit that sets the footprint is the one with the SMALLER result.', category: 'concept', cells: { B20: '=IF(B15>B16,"Setbacks","Coverage")' } },
    ],
    explanation:
      'Setbacks and coverage are two separate limits on the same footprint, and the smaller one governs; height is a third limit, through the number of WHOLE storeys that fit. Knowing which limit binds tells you what relief would be worth asking for: when coverage sets the footprint, a smaller setback adds nothing, and when the setbacks set it, more coverage adds nothing.',
  },
  {
    id: 'entitlements-zoning-grid-zone-comparison',
    type: 'grid',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'Compare two zones for one lot',
    prompt:
      'A buyer is weighing two HYPOTHETICAL zones for the same lot (standards invented for practice). Build the capacity under Zone A in column C, then fill it right to Zone B in column D. The lot area in B3 is shared, so anchor it. This code rounds partial storeys and units down. Row 21 names the limit that caps the units, and B23 says how many more units Zone B allows.',
    tags: ['zoning', 'FAR', 'density', 'binding constraint', 'fill right', 'INDEX', 'MATCH', 'MIN'],
    estMinutes: 9,
    hints: [
      'Write each formula once in column C and fill it right. The lot area is in one cell (B3), so it needs $ signs: $B$3.',
      'Floor area = MIN(lot x FAR, storeys x lot x coverage). Units = MIN(units by density, units that fit in the floor area), each rounded down.',
      'The label of the binding limit: INDEX($A$18:$A$19, MATCH(MIN(C18:C19), C18:C19, 0)).',
    ],
    workbook: {
      sheets: [
        sheet(
          'Zones',
          {
            A1: title('Two zones, one lot (hypothetical standards)'),
            A3: label('Lot area (SF)'),
            B3: input(24000, 'int', [12000, 48000, 500]),
            C5: header('Zone A'),
            D5: header('Zone B'),
            A6: label('Maximum FAR'),
            C6: input(2, 'num2', [1, 3, 0.25]),
            D6: input(2.5, 'num2', [1.5, 4, 0.25]),
            A7: label('Density: lot SF per unit'),
            C7: input(1000, 'int', [600, 1500, 50]),
            D7: input(450, 'int', [350, 900, 50]),
            A8: label('Height limit (ft)'),
            C8: input(40, 'int', [30, 60, 5]),
            D8: input(65, 'int', [45, 85, 5]),
            A9: label('Floor-to-floor height (ft)'),
            C9: input(10, 'num1', [9.5, 11, 0.5]),
            D9: input(10, 'num1', [9.5, 11, 0.5]),
            A10: label('Maximum lot coverage'),
            C10: input(0.6, 'pct', [0.4, 0.8, 0.05]),
            D10: input(0.5, 'pct', [0.4, 0.8, 0.05]),
            A11: label('Average gross SF per unit'),
            C11: input(1000, 'int', [800, 1300, 25]),
            D11: input(1200, 'int', [800, 1300, 25]),
            A13: header('Capacity', 'left'),
            A14: label('Floor area allowed by FAR (SF)'),
            ...across('C14', 2, target('=$B$3*C6', 'int')),
            A15: label('Storeys under the height limit'),
            ...across('C15', 2, target('=ROUNDDOWN(C8/C9,0)', 'int')),
            A16: label('Floor area allowed by height and coverage (SF)'),
            ...across('C16', 2, target('=C15*$B$3*C10', 'int')),
            A17: label('Buildable floor area (SF)'),
            ...across('C17', 2, target('=MIN(C14,C16)', 'int')),
            A18: label('Units allowed by density'),
            ...across('C18', 2, target('=ROUNDDOWN($B$3/C7,0)', 'int')),
            A19: label('Units that fit in the floor area'),
            ...across('C19', 2, target('=ROUNDDOWN(C17/C11,0)', 'int')),
            A20: total('Maximum units'),
            ...across('C20', 2, target('=MIN(C18,C19)', 'int', { border: 'top' })),
            A21: label('Limit that caps the units'),
            ...across('C21', 2, target('=INDEX($A$18:$A$19,MATCH(MIN(C18:C19),C18:C19,0))', 'text')),
            A23: label('More units under Zone B than Zone A'),
            B23: target('=D20-C20', 'int'),
          },
          { A: 300, B: 110, C: 170, D: 170 },
        ),
      ],
    },
    // Zone A capped by floor area instead of density; Zone B capped by density instead of floor area
    edgeCases: [{ C7: 400 }, { D7: 1200 }, { C8: 45, C9: 10 }],
    mistakes: [
      { label: 'Every standard must be met at once, so the smaller floor area governs. Use MIN.', category: 'concept', cells: fill('C17', 2, '=MAX(C14,C16)') },
      { label: 'A partial storey does not fit under a height limit: round down, not to the nearest.', category: 'function', cells: fill('C15', 2, '=ROUND(C8/C9,0)') },
      { label: 'The unit count must satisfy both the density cap and the floor area, so take the smaller.', category: 'concept', cells: fill('C20', 2, '=MAX(C18,C19)') },
      {
        label: 'The limit that caps the units is the one with the SMALLER count: match the MIN, not the MAX.',
        category: 'concept',
        cells: fill('C21', 2, '=INDEX($A$18:$A$19,MATCH(MAX(C18:C19),C18:C19,0))'),
      },
      { label: 'Zone B minus Zone A: subtract in that order.', category: 'sign', cells: { B23: '=C20-D20' } },
    ],
    explanation:
      'The binding limit can differ by zone on the same lot: one zone\'s unit count is capped by density, the other\'s by how many homes fit in the floor area. That is what decides whether a density bonus, a height increase or a FAR increase would add anything. Anchoring the lot area ($B$3) is what lets one formula serve both columns.',
  },

  // ---------------------------------------------------------------- error hunt
  {
    id: 'entitlements-zoning-errorhunt-capacity-sheet',
    type: 'errorhunt',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'Fix the capacity sheet',
    prompt:
      'A colleague built this capacity check for a site in a HYPOTHETICAL zone (standards invented for practice). The code rounds partial storeys and partial units down, and every standard must be met at once. Three cells are wrong. Find them and fix them.',
    tags: ['zoning', 'capacity', 'error hunt', 'MIN', 'ROUNDDOWN'],
    estMinutes: 5,
    hints: [
      'Check every rounding function against the rule in the prompt.',
      'Where two limits apply to the same quantity, the smaller result governs.',
      'Look at the storeys, the buildable floor area and the units allowed by density.',
    ],
    workbook: workbookOf(SEEDS, 'entitlements-zoning-grid-capacity'),
    edgeCases: edgeCasesOf(SEEDS, 'entitlements-zoning-grid-capacity'),
    bugs: [
      { label: 'Storeys are rounded to the nearest whole storey. A partial storey does not fit under a height limit: round down.', category: 'function', cells: { B13: '=ROUND(B6/B7,0)' } },
      { label: 'The buildable area takes the LARGER of the two limits. Both apply at once, so the smaller governs: MIN.', category: 'concept', cells: { B16: '=MAX(B12,B15)' } },
      { label: 'Units by density are rounded up. This code rounds partial units down, so a fraction of a unit is lost.', category: 'function', cells: { B17: '=ROUNDUP(B3/B5,0)' } },
    ],
    explanation:
      'All three errors make the site look bigger than it is: rounding a storey up, taking the larger floor area, and rounding a unit up. Errors that inflate capacity are the dangerous kind, because they flow straight into the land price.',
  },

  // ---------------------------------------------------------------- calculations
  {
    id: 'entitlements-zoning-numeric-density-units',
    type: 'numeric',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'Units from dwelling units per acre',
    prompt:
      'A {lot|int} SF lot sits in a HYPOTHETICAL zone that allows {duac} dwelling units per acre (invented for practice). This code rounds partial units down. How many homes does density allow? (1 acre = 43,560 SF.)',
    tags: ['zoning', 'density', 'du/ac', 'ROUNDDOWN'],
    estMinutes: 2,
    hints: ['Density here is units per ACRE, so the lot area has to be in acres first.', 'Acres = lot SF / 43,560. Units = acres x units per acre.', 'Round the final count down: ROUNDDOWN(lot / 43560 x density, 0).'],
    vars: [
      { name: 'lot', choices: [17250, 23100, 28600, 34800, 41700, 52300], format: 'int' },
      { name: 'duac', choices: [20, 29, 35, 43, 58] },
    ],
    answer: '=ROUNDDOWN(lot/43560*duac,0)',
    format: 'int',
    tolerance: { abs: 0.4 },
    mistakes: [
      { formula: '=ROUNDUP(lot/43560*duac,0)', label: 'This code rounds partial units down. Rounding up allows a home the lot area does not support.', category: 'function' },
      { formula: '=ROUNDDOWN(lot/duac,0)', label: 'That treats the density as lot SF per unit. Here it is units per ACRE: convert the lot to acres first.', category: 'units' },
      { formula: '=ROUNDDOWN(lot/43560,0)*duac', label: 'Rounding the acres down before multiplying throws land away. Round only the final unit count.', category: 'function' },
    ],
    explanation:
      '{lot|int} SF / 43,560 = {=lot/43560|num2} acres. x {duac} units per acre = {=lot/43560*duac|num2}, rounded down to {=ROUNDDOWN(lot/43560*duac,0)|int} homes. How a code rounds varies, and a state law can override it, so always check the rule that applies.',
  },
  {
    id: 'entitlements-zoning-numeric-parking',
    type: 'numeric',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'Required parking from a unit mix',
    prompt:
      'A building has {studios} studios, {ones} one-beds and {twos} two-beds. A HYPOTHETICAL zone (ratios invented for practice) requires {r_studio|num2} stalls per studio, {r_one|num2} per one-bed and {r_two|num2} per two-bed, plus {guest|num2} guest stalls per unit. The code rounds the total up to a whole stall. How many stalls are required?',
    tags: ['zoning', 'parking', 'ratios', 'ROUNDUP'],
    estMinutes: 2,
    hints: ['Work out each unit type separately, then add the guest stalls.', 'Guest parking is per UNIT: multiply it by the total number of homes.', 'Total = studios x ratio + one-beds x ratio + two-beds x ratio + all units x guest ratio, then ROUNDUP.'],
    vars: [
      // each count is one more than a multiple of four, so with these quarter-stall ratios the total always ends in .5 and rounding up always matters
      { name: 'studios', choices: [5, 9, 13] },
      { name: 'ones', choices: [21, 25, 29, 33] },
      { name: 'twos', choices: [5, 9, 13] },
      { name: 'r_studio', formula: '=0.75', format: 'num2' },
      { name: 'r_one', formula: '=1.25', format: 'num2' },
      { name: 'r_two', formula: '=1.75', format: 'num2' },
      { name: 'guest', formula: '=0.25', format: 'num2' },
    ],
    answer: '=ROUNDUP(studios*r_studio+ones*r_one+twos*r_two+(studios+ones+twos)*guest,0)',
    format: 'int',
    tolerance: { abs: 0.4 },
    mistakes: [
      { formula: '=ROUNDDOWN(studios*r_studio+ones*r_one+twos*r_two+(studios+ones+twos)*guest,0)', label: 'The code rounds the total UP. A fraction of a stall still has to be provided.', category: 'function' },
      { formula: '=ROUNDUP(studios*r_studio+ones*r_one+twos*r_two,0)', label: 'You left out the guest stalls: {guest|num2} for every unit.', category: 'omitted' },
      {
        formula: '=ROUNDUP(studios*r_studio,0)+ROUNDUP(ones*r_one,0)+ROUNDUP(twos*r_two,0)+ROUNDUP((studios+ones+twos)*guest,0)',
        label: 'The code rounds the TOTAL up, once. Rounding each line up separately adds stalls the code does not require.',
        category: 'function',
      },
    ],
    explanation:
      'Residents: {studios} x {r_studio|num2} + {ones} x {r_one|num2} + {twos} x {r_two|num2} = {=studios*r_studio+ones*r_one+twos*r_two|num2}. Guests: {=studios+ones+twos} units x {guest|num2} = {=(studios+ones+twos)*guest|num2}. Total {=studios*r_studio+ones*r_one+twos*r_two+(studios+ones+twos)*guest|num2}, rounded up to {=ROUNDUP(studios*r_studio+ones*r_one+twos*r_two+(studios+ones+twos)*guest,0)|int} stalls. Real minimums vary by place, and state or local law can reduce or remove them near transit: check the project\'s own rules.',
  },

  // ---------------------------------------------------------------- multiple choice
  {
    id: 'entitlements-zoning-mcq-binding-constraint',
    type: 'mcq',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'Which limit governs the floor area?',
    prompt:
      'A {lot|int} SF lot is in a HYPOTHETICAL zone (invented for practice) that allows an FAR of {far|num2}, a height that fits {storeys} storeys, and lot coverage of {cover|pct}. How much floor area can be built?',
    tags: ['zoning', 'FAR', 'lot coverage', 'binding constraint'],
    estMinutes: 1.5,
    hints: ['There are two separate limits on floor area. Work out each one.', 'FAR gives lot x FAR. Height and coverage give storeys x lot x coverage.'],
    vars: [
      { name: 'lot', choices: [16000, 20000, 24000, 30000], format: 'int' },
      { name: 'far', choices: [1.5, 2, 2.5, 3.5], format: 'num2' },
      { name: 'storeys', choices: [3, 4, 5, 6] },
      { name: 'cover', choices: [0.45, 0.55, 0.65, 0.75], format: 'pct' },
    ],
    correct: { formula: '=MIN(lot*far,storeys*lot*cover)' },
    distractors: [
      { formula: '=MAX(lot*far,storeys*lot*cover)', why: 'That is the LARGER limit. Every standard must be met at once, so the smaller one governs.', category: 'concept' },
      { formula: '=storeys*lot', why: 'That ignores lot coverage: no floor can cover more than {cover|pct} of the lot.', category: 'omitted' },
      { formula: '=lot*far*cover', why: 'Coverage limits the footprint, not the FAR. FAR already counts every floor.', category: 'concept' },
    ],
    format: 'int',
    explanation:
      'FAR allows {=lot*far|int} SF. Height and coverage allow {storeys} x {=lot*cover|int} = {=storeys*lot*cover|int} SF. The smaller, {=MIN(lot*far,storeys*lot*cover)|int} SF, governs. Relief on the other limit would add nothing, which is worth knowing before paying for a variance.',
  },
  {
    id: 'entitlements-zoning-mcq-far-vs-coverage',
    type: 'mcq',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'FAR or lot coverage?',
    prompt:
      'A {storeys}-storey building, every floor the same size with a {footprint|int} SF footprint, sits on a {lot|int} SF lot. What is its floor area ratio (FAR)? (Illustrative figures; FAR here means total floor area / lot area.)',
    tags: ['zoning', 'FAR', 'lot coverage'],
    estMinutes: 1,
    hints: ['FAR counts the floor area of every storey, not just the ground floor.'],
    vars: [
      { name: 'storeys', choices: [3, 4, 5, 6] },
      { name: 'footprint', choices: [6800, 7200, 8400, 9600], format: 'int' },
      { name: 'lot', choices: [16500, 21000, 27000, 31500], format: 'int' },
    ],
    correct: { formula: '=storeys*footprint/lot' },
    distractors: [
      { formula: '=footprint/lot', why: 'That is lot coverage: footprint / lot area. FAR counts every floor.', category: 'concept' },
      { formula: '=lot/(storeys*footprint)', why: 'Upside down: FAR is floor area divided by lot area.', category: 'arithmetic' },
      { formula: '=storeys', why: 'That is floor area / footprint, the number of storeys. FAR compares the floor area with the LOT.', category: 'wrong-base' },
    ],
    format: 'num2',
    explanation:
      'Floor area = {storeys} x {footprint|int} = {=storeys*footprint|int} SF. FAR = {=storeys*footprint|int} / {lot|int} = {=storeys*footprint/lot|num2}. Lot coverage is a different measure: {=footprint/lot|pct}. Each code defines which floor area counts (some exclude parking or basements), so check the definition before comparing with a limit.',
  },

  // ---------------------------------------------------------------- concepts
  {
    id: 'entitlements-zoning-flashcard-conditional-use',
    type: 'flashcard',
    level: 1,
    topic: 'entitlements-zoning',
    noLegalClaim: true,
    title: 'Permitted use vs. conditional use',
    prompt: 'In zoning generally (a concept, not any one code), what is the difference between a permitted use and a conditional use?',
    tags: ['zoning', 'use', 'conditional use permit'],
    estMinutes: 0.5,
    answer:
      'A permitted use is allowed in the zone as of right: if the project meets the zone\'s standards, staff approve it against those standards. A conditional use is allowed only through a permit after a public hearing, where the decision-maker can attach conditions, or deny it if the required findings cannot be made. Same zone, very different risk and timeline.',
    explanation: 'Each code lists its own permitted and conditional uses by zone, so check the use table for the actual site. A use that needs a conditional use permit carries the schedule and appeal risk of a discretionary approval.',
  },
]);
