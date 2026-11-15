/** Plan Reading: symbols and annotation (subtopic plan-reading-symbols). The seed for this subtopic is in items.ts. */
import { categoryItems } from '../define';

const SIZES: Record<string, number>[] = [{ bays: 5 }, { bays: 6, unit_width: 24 }, { bays: 7, unit_width: 24, unit_depth: 28 }];
const UNITS: Record<string, number>[] = [{ unit_width: 26, unit_depth: 30 }, { unit_width: 28, unit_depth: 32 }, { unit_width: 24, unit_depth: 28 }];
const SITES: Record<string, number>[] = [{ bays: 5 }, { bays: 6, front_setback: 20, side_setback: 5 }, { bays: 4, front_setback: 10, rear_setback: 25, side_setback: 15 }];
const FLOOR = { set: 'mf-double-loaded', variants: SIZES, sheet: 'A-102' };
const SITE = { set: 'mf-double-loaded', variants: SITES, sheet: 'C-101' };

export const ITEMS = categoryItems('plan-reading', [
  {
    id: 'plan-reading-symbols-locate-grid-bubble',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'Find a grid bubble',
    prompt: 'Main walls and columns are set out on a grid, and every grid line is named in a bubble at its end. Click any grid bubble.',
    tags: ['grid lines', 'symbols'],
    estMinutes: 1,
    hints: ['Look outside the building, at the ends of the long thin lines that run through it.', 'Grid bubbles hold a single number (along the top) or letter (down the side).'],
    plan: FLOOR,
    task: {
      kind: 'locate',
      targets: ['grid-bubble'],
      decoys: [
        { match: 'detail-callout', why: 'That bubble is split in two and belongs to a dashed box: it is a callout to an enlarged plan. A grid bubble holds one number or letter at the end of a grid line.', category: 'concept' },
        { match: 'section-marker', why: 'That is a section marker: a split bubble with a solid pointer. A grid bubble holds one number or letter at the end of a grid line.', category: 'concept' },
        { match: 'drawing-title', why: 'That bubble is the drawing’s title. Grid bubbles sit at the ends of the grid lines, above and beside the building.', category: 'concept' },
      ],
    },
    explanation:
      'Grid lines are the building’s coordinate system: numbers one way, letters the other. "The column at C-4" means the same place on every sheet of every discipline, which is why structural, architectural and mechanical drawings all carry the same grid.',
  },
  {
    id: 'plan-reading-symbols-identify-street-side',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'Use the north arrow',
    prompt: 'The street is highlighted on this site plan. Which side of the lot does it run along?',
    tags: ['north arrow', 'site plan', 'orientation'],
    estMinutes: 1,
    hints: ['Find the north arrow before you answer anything about direction.', 'Here north points up the sheet, so the bottom of the sheet is south.'],
    plan: SITE,
    task: {
      kind: 'identify',
      highlight: 'street',
      correct: 'The south side',
      distractors: [
        { text: 'The north side', why: 'The north arrow points up the sheet, and the street is at the bottom: that is south.', category: 'concept' },
        { text: 'The east side', why: 'East is to the right of the sheet when north is up. The street runs along the bottom: south.', category: 'concept' },
        { text: 'The west side', why: 'West is to the left of the sheet when north is up. The street runs along the bottom: south.', category: 'concept' },
      ],
    },
    explanation:
      'Never assume the top of a sheet is north: read the north arrow. On this sheet it does point up, so the street along the bottom edge is on the south side, and the building’s front faces south. Orientation drives sun, views and which setback is the "front".',
  },
  {
    id: 'plan-reading-symbols-locate-overall-dimension',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'Find the overall dimension',
    prompt: 'Dimension strings are stacked: small pieces closest to the building, totals further out. Click the string that gives the overall LENGTH of the building.',
    tags: ['dimension strings', 'symbols'],
    estMinutes: 1,
    hints: ['Length is the long way: left to right on this sheet.', 'The outermost string is the total of the strings inside it.', 'It is the top-most string, running the full width of the building.'],
    plan: FLOOR,
    task: {
      kind: 'locate',
      targets: ['dim-length'],
      decoys: [
        { match: 'dim-depth', why: 'That is the overall DEPTH, the short way across the building. The overall length is the outermost string along the top.', category: 'concept' },
        { match: 'dimension', why: 'That string measures one part. The overall dimension is the outermost string, which spans the whole building and equals the pieces added together.', category: 'concept' },
        { match: 'scale-bar', why: 'That is the graphic scale, for measuring. The overall length is written on the outermost dimension string above the plan.', category: 'concept' },
      ],
    },
    explanation:
      'This building is {building_length} ft long. Dimension strings are read from the outside in: the outer string is the total, and the strings inside it break that total into bays. The inner strings must add up to the outer one, which makes a quick check when you take sizes off a plan.',
  },
  {
    id: 'plan-reading-symbols-identify-graphic-scale',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'What is this bar?',
    prompt: 'What is the highlighted bar below the floor plan?',
    tags: ['graphic scale', 'scale', 'symbols'],
    estMinutes: 1,
    hints: ['Read the numbers along it.', 'It would still be right if this sheet were printed at half size.'],
    plan: FLOOR,
    task: {
      kind: 'identify',
      highlight: 'scale-bar',
      correct: 'A graphic scale: a bar marked in feet for measuring the drawing',
      distractors: [
        { text: 'A dimension string for the corridor', why: 'A dimension string sits against the thing it measures and carries one length. This bar is marked 0, 8, 16, 32 feet: it is a ruler for the whole drawing.', category: 'concept' },
        { text: 'A parking stall layout', why: 'Stalls are drawn in a parking plan, at their real positions. This bar, marked in feet, is a scale for measuring.', category: 'concept' },
        { text: 'A legend of wall types', why: 'A wall legend shows wall constructions. This bar is marked in feet: it is a graphic scale.', category: 'concept' },
      ],
    },
    explanation:
      'A graphic scale is a ruler drawn on the sheet. Because it is part of the drawing, it shrinks or grows with it, so it stays true on a reduced print or a phone screen where the written scale (1/8" = 1\'-0") no longer does.',
  },
  {
    id: 'plan-reading-symbols-locate-door',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'Find a door',
    prompt: 'Click any door on this floor plan.',
    tags: ['doors', 'door swing', 'symbols'],
    estMinutes: 1,
    hints: ['Zoom in on the corridor walls.', 'A door is drawn as a short straight leaf with a quarter-circle showing the path it swings through.'],
    plan: FLOOR,
    task: {
      kind: 'locate',
      targets: ['door'],
      decoys: [
        { match: 'window', why: 'That is a window: a thin double line set in the exterior wall. A door shows a leaf and the quarter-circle it swings through.', category: 'concept' },
        { match: 'stair', why: 'That is a stair. Doors are the small quarter-circles in the walls along the corridor.', category: 'concept' },
        { match: 'unit', why: 'That is the apartment itself. Its entry door is the small quarter-circle where it meets the corridor.', category: 'concept' },
      ],
    },
    explanation:
      'A door in plan is a line for the leaf and an arc for its swing. The arc tells you which way it opens and how much floor it sweeps. Here every apartment door swings into the unit, and the stair doors swing into the stairs, the direction people travel to get out.',
  },
  {
    id: 'plan-reading-symbols-identify-elevator',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'What is the box with an X?',
    prompt: 'In the middle of the building, off the lobby, is a square with an X through it (highlighted). What is it?',
    tags: ['elevator', 'core', 'symbols'],
    estMinutes: 1,
    hints: ['It is next to a space labelled LOBBY.', 'An X through a box means an opening in the floor that runs through every level.'],
    plan: FLOOR,
    task: {
      kind: 'identify',
      highlight: 'elevator',
      correct: 'An elevator',
      distractors: [
        { text: 'A stair', why: 'A stair shows a run of treads and an UP or DN arrow. A plain box with an X, opening onto a lobby, is an elevator shaft.', category: 'concept' },
        { text: 'A structural column', why: 'A column is small and solid. This is a room-sized shaft with an X, opening onto the lobby: an elevator.', category: 'concept' },
        { text: 'A storage room', why: 'A room would be labelled and have a door swing. The X marks a shaft through the floor: an elevator.', category: 'concept' },
      ],
    },
    explanation:
      'An X through a rectangle marks a shaft: a hole that passes through the floor. Next to a lobby and sized for a cab, it is an elevator. Together with the stairs and service rooms it forms the core, the part of each floor that earns no rent.',
  },
  {
    id: 'plan-reading-symbols-identify-enlarged-plan-callout',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'What does the dashed box mean?',
    prompt: 'One apartment has a dashed box around it and a split bubble (highlighted). What is this telling you?',
    tags: ['callout', 'enlarged plan', 'symbols'],
    estMinutes: 1,
    hints: ['Read both halves of the bubble.', 'A dashed outline with a bubble means "this area is shown again somewhere else".'],
    plan: FLOOR,
    task: {
      kind: 'identify',
      highlight: 'callout-a401',
      correct: 'This area is drawn at a larger scale as drawing 1 on sheet A-401',
      distractors: [
        { text: 'A section is cut through this apartment', why: 'A section is shown by a cut line with a pointer at each end. A dashed box with a bubble refers you to an enlarged drawing of the boxed area.', category: 'concept' },
        { text: 'This apartment changed in revision 1', why: 'A revision is ringed with a scalloped cloud and a triangle. A plain dashed box with a split bubble is a callout to an enlarged plan.', category: 'concept' },
        { text: 'This is unit type 1, and there are 401 of them', why: 'The bubble is a reference, not a count: drawing 1 on sheet A-401.', category: 'concept' },
      ],
    },
    explanation:
      'A floor plan at 1/8" scale has no room for interior detail, so a typical unit is boxed and drawn again at 1/4" scale on its own sheet. The bubble gives the address of that drawing: number on top, sheet below.',
  },
  {
    id: 'plan-reading-symbols-locate-bathroom-fixtures',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'Find the bathroom fixtures',
    prompt: 'This is the enlarged plan of a one-bedroom apartment. Click the three plumbing fixtures in the BATHROOM.',
    tags: ['plumbing fixtures', 'enlarged plan', 'symbols'],
    estMinutes: 1.5,
    hints: ['Find the room labelled BATH first.', 'A toilet is a tank with a round bowl. A tub is a long rectangle with a drain. A bathroom sink (lavatory) is a small counter with a bowl.', 'All three are in the bottom-left corner of the unit.'],
    plan: { set: 'mf-double-loaded', variants: UNITS, sheet: 'A-401' },
    task: {
      kind: 'locate',
      targets: ['tub', 'toilet', 'lavatory'],
      pick: 3,
      decoys: [
        { match: 'counter', why: 'That counter and sink are in the kitchen. The question asks for the fixtures in the bathroom.', category: 'concept' },
        { match: 'range', why: 'That is the range, a kitchen appliance. The bathroom fixtures are the tub, the toilet and the lavatory.', category: 'concept' },
        { match: 'refrigerator', why: 'That is the refrigerator. The bathroom fixtures are the tub, the toilet and the lavatory.', category: 'concept' },
        { match: 'room', why: 'That is a room, not a fixture. Click the tub, the toilet and the lavatory inside the bathroom.', category: 'concept' },
      ],
    },
    explanation:
      'Fixtures are drawn roughly as they look from above: a tub as a long rectangle with a drain, a toilet as a tank and bowl, a lavatory as a small counter with a basin. Counting fixtures and noticing where the "wet" rooms stack is useful early on, because plumbing is expensive to move.',
  },
  {
    id: 'plan-reading-symbols-locate-section-marker',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'Find the section marker',
    prompt: 'Somewhere on this plan is the mark showing where a section drawing has been cut through the building. Click it.',
    tags: ['section marker', 'symbols'],
    estMinutes: 1,
    hints: ['A section is a vertical slice. The plan shows the LINE of the slice.', 'Look for a line crossing the whole building with a pointed bubble at each end.', 'It is near the east end of the building.'],
    plan: FLOOR,
    task: {
      kind: 'locate',
      targets: ['section-marker'],
      decoys: [
        { match: 'detail-callout', why: 'That is a callout to an enlarged plan: a dashed box and a plain split bubble. A section marker has a solid pointer and sits at the end of a cut line.', category: 'concept' },
        { match: 'grid-bubble', why: 'That is a grid bubble: one number or letter at the end of a grid line. A section marker is a split bubble with a solid pointer.', category: 'concept' },
        { match: 'revision-delta', why: 'That triangle is a revision delta. A section marker is a split bubble with a solid pointer at the end of a cut line.', category: 'concept' },
      ],
    },
    explanation:
      'A section marker sits at each end of the cut line. Its pointer shows which way you are looking, and its bubble gives the section’s name over the sheet it is drawn on: here section A on sheet A-301, looking west. Open A-301 to see the floors stacked up.',
  },
  {
    id: 'plan-reading-symbols-locate-property-line',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'Find a property line',
    prompt: 'This is the site plan. Click one of the property lines.',
    tags: ['property line', 'site plan', 'symbols'],
    estMinutes: 1,
    hints: ['The property line is the outer edge of the lot.', 'It is drawn as a long dash followed by two short ones, and is marked PL at the corners.'],
    plan: SITE,
    task: {
      kind: 'locate',
      targets: ['property-line'],
      decoys: [
        { match: 'setback-line', why: 'That dashed line is a setback line: the closest a building may come to the edge of the lot. The property line is the outer boundary, drawn long-short-short and marked PL.', category: 'concept' },
        { match: 'easement', why: 'That hatched strip is an easement, land inside the lot that someone else has a right to use. The property line is the outer boundary, marked PL.', category: 'concept' },
        { match: 'building-footprint', why: 'That is the building. The property line is the outer boundary of the lot, marked PL at the corners.', category: 'concept' },
        { match: 'street', why: 'The street is outside the lot. The property line is the boundary of the lot itself, marked PL at the corners.', category: 'concept' },
      ],
    },
    explanation:
      'The property line is the legal edge of the lot: {lot_width} ft by {lot_depth} ft here. It has its own line type (long dash, two short dashes) so it cannot be mistaken for a wall, a fence or a setback. Everything a zoning code measures starts from it.',
  },
  {
    id: 'plan-reading-symbols-identify-setback-line',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-symbols',
    title: 'What is the dashed line inside the lot?',
    prompt: 'On this site plan a dashed line runs inside the lot, parallel to the street edge (highlighted). What is it?',
    tags: ['setback', 'site plan', 'symbols'],
    estMinutes: 1,
    hints: ['A dimension string connects it to the property line.', 'Notice that the building comes up to this line and stops.'],
    plan: SITE,
    task: {
      kind: 'identify',
      highlight: 'setback-front',
      correct: 'A setback line: the building may not come closer to the property line than this',
      distractors: [
        { text: 'The property line', why: 'The property line is the outer boundary, drawn long-short-short and marked PL. This dashed line sits inside it: a setback line.', category: 'concept' },
        { text: 'A utility easement', why: 'The easement on this plan is the hatched strip at the rear, with a label. This dashed line is the limit for the building: a setback line.', category: 'concept' },
        { text: 'The edge of the street paving', why: 'The street is outside the lot, beyond the property line. This line is inside the lot: a setback line.', category: 'concept' },
      ],
    },
    explanation:
      'A setback is the minimum distance a building must keep from a property line: {front_setback} ft at the front of this lot. The setback lines on all four sides box in the area where a building is allowed, and this building sits right on the front one. (How setbacks are set is an Entitlements topic; here the skill is recognising them on a drawing.)',
  },
]);
