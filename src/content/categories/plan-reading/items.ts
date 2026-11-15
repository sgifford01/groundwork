/** Plan Reading & Building Program: seed questions. See BUILD_SPEC.md in this folder before adding more. */
import { categoryItems } from '../define';

export const ITEMS = categoryItems('plan-reading', [
  {
    id: 'plan-reading-symbols-locate-stair',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'Find a stair on a floor plan',
    prompt: 'This is one floor of an apartment building. Click one of the stairs.',
    tags: ['floor plan', 'stairs', 'symbols', 'egress'],
    estMinutes: 1,
    hints: [
      'Look for a row of parallel lines drawn close together. Those are treads.',
      'A stair carries an arrow marked UP or DN. It never has a unit number.',
      'There is one at each end of the corridor, on the north side.',
    ],
    plan: {
      set: 'mf-double-loaded',
      variants: [{ bays: 5 }, { bays: 6, unit_width: 24 }, { bays: 7, unit_width: 24, unit_depth: 28 }],
      sheet: 'A-102',
    },
    task: {
      kind: 'locate',
      targets: ['stair'],
      decoys: [
        { match: 'elevator', why: 'That is the elevator: a box with an X through it. A stair shows a row of treads and an UP or DN arrow.', category: 'concept' },
        { match: 'corridor', why: 'That is the corridor. The stairs open off it, one at each end, so every unit has two ways out.', category: 'concept' },
        { match: 'unit', why: 'That is an apartment: it has a unit number in a tag. A stair shows treads and an UP or DN arrow.', category: 'concept' },
        { match: 'lobby', why: 'That is the elevator lobby. The stairs are at the two ends of the corridor.', category: 'concept' },
      ],
    },
    explanation:
      'On a plan a stair is drawn as a run of closely spaced treads with an arrow marked UP or DN from the floor you are standing on. This building has two, at opposite ends of the corridor, so that anyone in the corridor has two directions of escape.',
  },
  {
    id: 'plan-reading-program-measure-efficiency',
    type: 'plan',
    level: 2,
    topic: 'plan-reading-program',
    title: 'Floor efficiency from a plan',
    prompt:
      'This is one floor of an apartment building. Using the dimension strings on sheet A-102, work out the floor’s efficiency: the area inside the apartments divided by the gross floor area. Dimensions are to wall centrelines, so you can multiply them directly.',
    tags: ['efficiency', 'gross area', 'rentable area', 'dimension strings'],
    estMinutes: 5,
    hints: [
      'Gross floor area is the overall length times the overall depth.',
      'Only the apartments are rentable. The corridor, stairs, elevator and service rooms are not. Notice that the end units on the south side are wider.',
      'Efficiency = (one-beds x their area + two-beds x their area) / (length x depth).',
    ],
    plan: {
      set: 'mf-double-loaded',
      variants: [
        { bays: 5, unit_width: 26, unit_depth: 30 },
        { bays: 5, unit_width: 28, unit_depth: 32 },
        { bays: 7, unit_width: 24, unit_depth: 28 },
        { bays: 6, unit_width: 26, unit_depth: 30 },
      ],
      sheet: 'A-102',
    },
    task: {
      kind: 'measure',
      answer: '=rentable_sf/floor_gsf',
      format: 'pct1',
      tolerance: { abs: 0.006 },
      tool: 'real',
      mistakes: [
        { formula: '=(rentable_sf+corridor_sf)/floor_gsf', label: 'The corridor is common area. Nobody pays rent on it, so it is not rentable.', category: 'concept' },
        { formula: '=(floor_gsf-corridor_sf)/floor_gsf', label: 'The stairs, elevator and service rooms are not rentable either. Count only the area inside apartments.', category: 'omitted' },
        { formula: '=one_bed_count*one_bed_sf/floor_gsf', label: 'That leaves out the two-bedroom end units. They are wider than the one-beds: check the bay dimensions.', category: 'omitted' },
        { formula: '=unit_count*one_bed_sf/floor_gsf', label: 'Not every unit is the same size. The two end units on the south side are wider than a one-bed.', category: 'wrong-base' },
      ],
    },
    explanation:
      'Gross floor area = {building_length|int} ft x {building_depth|int} ft = {floor_gsf|int} SF. Apartments: {one_bed_count} one-beds at {one_bed_sf|int} SF and {two_bed_count} two-beds at {two_bed_sf|int} SF = {rentable_sf|int} SF. Efficiency = {=rentable_sf/floor_gsf|pct1}. The rest is corridor ({corridor_sf|int} SF), two stairs ({stair_sf|int} SF) and the core bay ({core_sf|int} SF).',
  },
]);
