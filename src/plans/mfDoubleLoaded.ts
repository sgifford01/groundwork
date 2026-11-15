/**
 * Plan set "mf-double-loaded": a small apartment building with a double-loaded
 * corridor, generated from a handful of numbers.
 *
 *   G-001  Cover sheet and sheet index
 *   C-101  Site plan                     1" = 20'
 *   A-102  Level 2 floor plan            1/8" = 1'-0"
 *   A-103  Roof plan                     1/8" = 1'-0"
 *   A-201  South elevation               1/8" = 1'-0"
 *   A-301  Building section              1/8" = 1'-0"
 *   A-401  Enlarged unit plan (1BR)      1/4" = 1'-0"
 *   A-402  Enlarged unit reflected ceiling plan   1/4" = 1'-0"
 *
 * Sheet numbers follow the common discipline-letter + sheet-type convention
 * (1 plans, 3 sections, 4 large-scale views).
 *
 * Layout of the floor (north is up, dimensions to wall centrelines):
 *
 *   north row:  stair | n one-bed units | stair
 *   corridor
 *   south row:  two-bed end unit | one-bed units with a core bay in the middle | two-bed end unit
 *
 * The end units on the south side are wider by the stair width, which makes
 * them two-beds. The core bay holds the elevator, trash and electrical rooms.
 *
 * Roles used by elements (questions match on these or on an element id):
 *   unit corridor stair elevator lobby core trash electrical mechanical door window exterior-wall
 *   grid-bubble dimension detail-callout section-marker revision-cloud revision-delta revision-list
 *   drawing-title scale-bar north-arrow title-block sheet-number note border
 *   room partition tub toilet lavatory counter refrigerator range sheet-reference
 *   property-line setback-line easement building-footprint street
 *   floor-slab level-marker grade-line floor-line elevation-marker
 *   parapet roof-drain rooftop-unit roof-access elevator-overrun slope-arrow
 *   ceiling-zone soffit ceiling-tag light-fixture exhaust-fan smoke-detector
 *   project-title heading index-row prefix-row
 */
import {
  border,
  bubble,
  circle,
  dimension,
  door,
  drawingTitle,
  elevationMarker,
  elevator,
  gridBubble,
  hitRect,
  levelMarkers,
  line,
  northArrow,
  opening,
  poly,
  rect,
  revisionDelta,
  scaleBar,
  sectionHead,
  stair,
  text,
  titleBlock,
  windowH,
} from './draw';
import { feetInches, type PlanElement, type PlanSet, type PlanSetDef, type PlanSheet, type Pt } from './model';

const PROJECT = 'LINDA VISTA FLATS';

function floorPlan(n: number, uw: number, ud: number, cw: number, sw: number): PlanSheet {
  const k = 1;
  const L = 2 * sw + n * uw;
  const D = 2 * ud + cw;
  const ySouth = ud + cw;
  const mid = Math.floor(n / 2); // the core bay on the south side
  const bounds = { x: -36, y: -36, w: L + 36 + 74, h: D + 36 + 36 };
  const els: PlanElement[] = [border(bounds, k)];

  // ---- units ----
  let number = 201;
  const unit = (x: number, y: number, w: number, type: string): void => {
    const id = `unit-${number}`;
    const cx = x + w / 2;
    const cy = y + ud / 2;
    els.push({
      id,
      role: 'unit',
      name: `Unit ${number} (${type})`,
      area: w * ud,
      marks: [
        rect(x, y, w, ud, 'medium'),
        rect(cx - 4.2, cy - 2.2, 8.4, 3.4, 'thin', 'paper'),
        text(cx, cy + 0.2, String(number), 2.1, { anchor: 'middle', bold: true }),
        text(cx, cy + 3.6, type, 1.5, { anchor: 'middle' }),
      ],
      hit: hitRect(x + 1, y + 1, w - 2, ud - 2),
    });
    number++;
  };
  for (let i = 0; i < n; i++) unit(sw + i * uw, 0, uw, '1BR');
  const southUnits: { x: number; w: number; type: string }[] = [{ x: 0, w: sw + uw, type: '2BR' }];
  for (let i = 1; i < n - 1; i++) if (i !== mid) southUnits.push({ x: sw + i * uw, w: uw, type: '1BR' });
  southUnits.push({ x: L - sw - uw, w: sw + uw, type: '2BR' });
  const firstSouth = number;
  for (const u of southUnits) unit(u.x, ySouth, u.w, u.type);

  // ---- corridor ----
  els.push({
    id: 'corridor',
    role: 'corridor',
    name: 'Corridor',
    area: L * cw,
    marks: [text(L * 0.3, ud + cw / 2 + 0.5, 'CORRIDOR', 1.5, { anchor: 'middle' })],
    hit: hitRect(0.5, ud + 0.5, L - 1, cw - 1),
  });

  // ---- stairs (north row, both ends) ----
  els.push(stair('stair-1', 'Stair 1', 0, 0, sw, ud, k));
  els.push(stair('stair-2', 'Stair 2', L - sw, 0, sw, ud, k));

  // ---- core bay (south row) ----
  const cx0 = sw + mid * uw;
  els.push({
    id: 'core',
    role: 'core',
    name: 'Core bay (elevator, trash, electrical)',
    area: uw * ud,
    marks: [rect(cx0, ySouth, uw, ud, 'medium'), opening([cx0 + 1, ySouth], [1, 0], 9)],
  });
  els.push({
    id: 'elevator-lobby',
    role: 'lobby',
    name: 'Elevator lobby',
    marks: [text(cx0 + 5.5, ySouth + 3.6, 'LOBBY', 1.2, { anchor: 'middle' })],
    hit: hitRect(cx0 + 0.5, ySouth + 0.5, 10, 5),
  });
  els.push(elevator('elevator', cx0 + 1.5, ySouth + 6, 8, 8));
  els.push({
    id: 'mech',
    role: 'mechanical',
    name: 'Mechanical shaft',
    marks: [rect(cx0, ySouth + 14, 11, ud - 14, 'medium'), text(cx0 + 5.5, ySouth + 14 + (ud - 14) / 2 + 0.5, 'MECH', 1.3, { anchor: 'middle' })],
    hit: hitRect(cx0 + 0.5, ySouth + 14.5, 10, ud - 15),
  });
  els.push({
    id: 'trash',
    role: 'trash',
    name: 'Trash room',
    marks: [rect(cx0 + 11, ySouth, uw - 11, 12, 'medium'), text(cx0 + 11 + (uw - 11) / 2, ySouth + 7.5, 'TRASH', 1.3, { anchor: 'middle' })],
    hit: hitRect(cx0 + 11.5, ySouth + 3.5, uw - 12, 8),
  });
  els.push({
    id: 'elec',
    role: 'electrical',
    name: 'Electrical room',
    marks: [rect(cx0 + 11, ySouth + 12, uw - 11, ud - 12, 'medium'), text(cx0 + 11 + (uw - 11) / 2, ySouth + 12 + (ud - 12) / 2 + 0.5, 'ELEC', 1.3, { anchor: 'middle' })],
    hit: hitRect(cx0 + 11.5, ySouth + 12.5, uw - 12, ud - 13),
  });

  // ---- exterior wall (drawn over the room outlines so it reads heaviest) ----
  els.push({ id: 'exterior-wall', role: 'exterior-wall', name: 'Exterior wall', marks: [rect(0, 0, L, D, 'wall')] });

  // ---- doors: every unit opens off the corridor and swings into the unit ----
  for (let i = 0; i < n; i++) {
    els.push(door(`door-${201 + i}`, `Entry door, unit ${201 + i}`, [sw + i * uw + 2, ud], [1, 0], [0, -1]));
  }
  southUnits.forEach((u, i) => {
    els.push(door(`door-${firstSouth + i}`, `Entry door, unit ${firstSouth + i}`, [u.x + u.w - 5, ySouth], [1, 0], [0, 1]));
  });
  // stair doors swing in the direction of exit travel: into the stair
  els.push(door('door-stair-1', 'Stair 1 door', [sw - 4.5, ud], [1, 0], [0, -1]));
  els.push(door('door-stair-2', 'Stair 2 door', [L - sw + 1.5, ud], [1, 0], [0, -1]));
  els.push(door('door-trash', 'Trash room door', [cx0 + 12.5, ySouth], [1, 0], [0, 1]));

  // ---- windows on the two long exterior walls ----
  for (let i = 0; i < n; i++) els.push(windowH(`window-n-${i + 1}`, 'Window', sw + i * uw + uw / 2, 0));
  southUnits.forEach((u, i) => els.push(windowH(`window-s-${i + 1}`, 'Window', u.x + u.w / 2, D)));

  // ---- column grid ----
  const gx: number[] = [0, sw];
  for (let i = 1; i <= n; i++) gx.push(sw + i * uw);
  gx.push(L);
  const gy = [0, ud, ySouth, D];
  gx.forEach((x, i) => els.push(gridBubble(`grid-${i + 1}`, String(i + 1), [x, -27], [x, D + 4], k)));
  gy.forEach((y, i) => els.push(gridBubble(`grid-${'abcd'[i]}`, 'ABCD'[i], [-27, y], [L + 4, y], k)));

  // ---- dimension strings ----
  for (let i = 0; i < gx.length - 1; i++) {
    els.push(dimension(`dim-bay-${i + 1}`, `Bay dimension, grid ${i + 1} to ${i + 2}`, [gx[i], -9], [gx[i + 1], -9], k));
  }
  els.push(dimension('dim-length', 'Overall building length', [0, -16], [L, -16], k));
  for (let i = 0; i < gy.length - 1; i++) {
    els.push(dimension(`dim-depth-${i + 1}`, `Depth dimension, grid ${'ABCD'[i]} to ${'ABCD'[i + 1]}`, [-9, gy[i]], [-9, gy[i + 1]], k));
  }
  els.push(dimension('dim-depth', 'Overall building depth', [-16, 0], [-16, D], k));

  // ---- callout to the enlarged unit plan ----
  const ux = sw + uw; // unit 202
  els.push({
    id: 'callout-a401',
    role: 'detail-callout',
    name: 'Enlarged plan callout (see 1 / A-401)',
    link: 'A-401',
    marks: [
      { shape: { t: 'rect', x: ux + 1.2, y: 1.2, w: uw - 2.4, h: ud - 2.4 }, pen: 'dash', fill: 'none' },
      line(ux + uw - 1.2, 3.5, ux + uw - 3.2, 5.2, 'thin'),
      ...bubble(ux + uw - 5.4, 6.4, '1', 'A-401', k),
    ],
    hit: { t: 'circle', cx: ux + uw - 5.4, cy: 6.4, r: 3.4 },
  });

  // ---- section cut: a line through the building with a marker at each end, looking west ----
  const xs = L - sw - uw / 4;
  els.push({
    id: 'section-line',
    role: 'section-line',
    name: 'Section cut line (section A)',
    marks: [line(xs, -3.2, xs, D + 3.2, 'center')],
  });
  els.push(sectionHead('section-a-north', 'Section marker: section A, drawn on sheet A-301', xs, -3.4, 'A', 'A-301', [-1, 0], k, 'A-301'));
  els.push(sectionHead('section-a-south', 'Section marker: section A, drawn on sheet A-301', xs, D + 3.4, 'A', 'A-301', [-1, 0], k, 'A-301'));

  // ---- elevation marker: south of the building, looking north at the south face ----
  els.push(elevationMarker('elevation-south', 'Elevation marker: drawing 1 on sheet A-201 (the south elevation)', L * 0.35, D + 8, '1', 'A-201', [0, -1], k, 'A-201'));

  // ---- revision 1: the trash room, clouded, with its delta ----
  els.push({
    id: 'revision-cloud',
    role: 'revision-cloud',
    name: 'Revision cloud: the trash room changed in revision 1',
    marks: [{ shape: { t: 'cloud', x: cx0 + 11.7, y: ySouth + 0.9, w: uw - 12.4, h: 10.4, r: 0.8 }, pen: 'medium', fill: 'none' }],
    hit: hitRect(cx0 + 11.7, ySouth + 3.4, uw - 12.4, 7.9),
  });
  els.push(revisionDelta('revision-delta', cx0 + uw - 1.6, ySouth + 13.6, '1', k));

  // ---- sheet furniture ----
  els.push(drawingTitle(0, D + 17, '1', 'A-102', 'LEVEL 2 FLOOR PLAN', '1/8" = 1\'-0"', k));
  els.push(scaleBar(Math.max(70, L * 0.5), D + 18, 8, k));
  els.push(northArrow(L + 14, D + 17, k));
  els.push({
    id: 'general-note',
    role: 'note',
    name: 'General note',
    marks: [text(0, D + 27, 'NOTE: DIMENSIONS ARE TO WALL CENTRELINES. ALL UNITS OPEN OFF THE CORRIDOR.', 1.2)],
  });
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'LEVEL 2 FLOOR PLAN', sheet: 'A-102', scale: '1/8" = 1\'-0"' }, k));
  const tbx = bounds.x + bounds.w - 32;
  els.push({
    id: 'revision-list',
    role: 'revision-list',
    name: 'Revision list in the title block',
    marks: [
      text(tbx + 1.5, bounds.y + 27, 'REVISIONS', 0.95),
      line(tbx, bounds.y + 28, tbx + 30, bounds.y + 28, 'thin'),
      poly([[tbx + 2.6, bounds.y + 29.6], [tbx + 1.5, bounds.y + 31.6], [tbx + 3.7, bounds.y + 31.6]], 'thin', 'paper'),
      text(tbx + 2.6, bounds.y + 31.4, '1', 1, { anchor: 'middle' }),
      text(tbx + 5, bounds.y + 31.4, 'TRASH ROOM REVISED', 1.1),
    ],
    hit: hitRect(tbx, bounds.y + 25, 30, 8),
  });

  const snaps: Pt[] = [];
  for (const x of gx) for (const y of gy) snaps.push([x, y]);
  snaps.push([cx0 + 11, ySouth], [cx0 + 11, ySouth + 12], [cx0 + uw, ySouth + 12]);

  return { id: 'A-102', title: 'Level 2 floor plan', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

/** Fixed interior dimensions of the one-bed unit (feet). */
const BED_W = 12;
const BED_D = 13;
const BATH_W = 8;
const BATH_D = 9;
const KITCHEN_D = 10;

function unitPlan(uw: number, ud: number): PlanSheet {
  const k = 0.5;
  const bounds = { x: -22, y: -20, w: uw + 22 + 42, h: ud + 20 + 22 };
  const els: PlanElement[] = [border(bounds, k)];
  const yBath = ud - BATH_D;
  const yKitchen = ud - KITCHEN_D;

  const room = (id: string, name: string, x: number, y: number, w: number, h: number, label: string, outline = true): void => {
    els.push({
      id: `room-${id}`,
      role: 'room',
      name,
      area: w * h,
      marks: [
        ...(outline ? [rect(x, y, w, h, 'medium')] : []),
        text(x + w / 2, y + h / 2, label, 0.95, { anchor: 'middle', bold: true }),
      ],
      hit: hitRect(x + 0.4, y + 0.4, w - 0.8, h - 0.8),
    });
  };
  room('bedroom', 'Bedroom', 0, 0, BED_W, BED_D, 'BEDROOM');
  room('living', 'Living / dining', BED_W, 0, uw - BED_W, yKitchen, 'LIVING / DINING', false);
  room('kitchen', 'Kitchen', BED_W, yKitchen, uw - BED_W, KITCHEN_D, 'KITCHEN', false);
  room('closet', 'Walk-in closet', 0, BED_D, BED_W, yBath - BED_D, 'CLOSET');
  room('bath', 'Bathroom', 0, yBath, BATH_W, BATH_D, 'BATH');
  room('hall', 'Entry hall', BATH_W, yBath, BED_W - BATH_W, BATH_D, 'ENTRY');

  // the wall between the bedroom side and the living side, and the open-plan line
  els.push({
    id: 'partitions',
    role: 'partition',
    name: 'Interior partition',
    marks: [
      line(BED_W, 0, BED_W, ud, 'medium'),
      opening([BED_W, yBath + 1], [0, 1], 4), // hall to kitchen
      opening([BATH_W + 0.5, yBath], [1, 0], 3), // hall to closet
      line(BED_W, yKitchen, uw, yKitchen, 'dash'),
    ],
  });
  els.push({ id: 'unit-outline', role: 'exterior-wall', name: 'Unit demising and exterior walls', marks: [rect(0, 0, uw, ud, 'wall')] });

  // doors
  els.push(door('door-entry', 'Unit entry door', [BATH_W + 0.5, ud], [1, 0], [0, -1]));
  els.push(door('door-bedroom', 'Bedroom door', [BED_W, BED_D - 0.5], [0, -1], [-1, 0], 2.8));
  els.push(door('door-bath', 'Bathroom door', [BATH_W, yBath + 4], [0, -1], [-1, 0], 2.5));

  // windows on the exterior (north) wall
  els.push(windowH('window-bedroom', 'Bedroom window', BED_W / 2, 0, 5));
  els.push(windowH('window-living', 'Living room window', BED_W + (uw - BED_W) / 2, 0, 8));

  // plumbing fixtures
  els.push({
    id: 'tub',
    role: 'tub',
    name: 'Bathtub',
    marks: [rect(0.4, yBath + 0.4, 2.6, 5, 'thin'), rect(0.75, yBath + 0.75, 1.9, 4.3, 'thin'), circle(1.7, yBath + 1.3, 0.14, 'thin', 'solid')],
    hit: hitRect(0.4, yBath + 0.4, 2.6, 5),
  });
  els.push({
    id: 'toilet',
    role: 'toilet',
    name: 'Toilet (water closet)',
    marks: [rect(4.0, ud - 1.1, 1.6, 0.7, 'thin'), { shape: { t: 'circle', cx: 4.8, cy: ud - 1.9, r: 0.75 }, pen: 'thin', fill: 'paper' }],
    hit: hitRect(3.8, ud - 2.9, 2, 2.6),
  });
  els.push({
    id: 'lavatory',
    role: 'lavatory',
    name: 'Lavatory (bathroom sink)',
    marks: [rect(0.4, ud - 2.6, 2.4, 1.7, 'thin'), circle(1.6, ud - 1.75, 0.5, 'thin', 'paper')],
    hit: hitRect(0.4, ud - 2.6, 2.4, 1.7),
  });
  const kx = BED_W + 1.5;
  els.push({
    id: 'kitchen-counter',
    role: 'counter',
    name: 'Kitchen counter with sink',
    marks: [
      rect(kx + 3, ud - 2.4, uw - kx - 3.5 - 2.6, 2, 'thin'),
      rect(kx + 5, ud - 2.0, 2.2, 1.3, 'thin'),
      circle(kx + 6.1, ud - 1.35, 0.14, 'thin', 'solid'),
    ],
    hit: hitRect(kx + 3, ud - 2.4, uw - kx - 3.5 - 2.6, 2),
  });
  els.push({
    id: 'refrigerator',
    role: 'refrigerator',
    name: 'Refrigerator',
    marks: [rect(kx, ud - 3, 2.8, 2.6, 'thin'), text(kx + 1.4, ud - 1.4, 'REF', 0.7, { anchor: 'middle' })],
    hit: hitRect(kx, ud - 3, 2.8, 2.6),
  });
  const rx = uw - 3;
  els.push({
    id: 'range',
    role: 'range',
    name: 'Range',
    marks: [
      rect(rx, ud - 2.6, 2.5, 2.2, 'thin'),
      ...[0.65, 1.85].flatMap((dx) => [0.6, 1.6].map((dy) => circle(rx + dx, ud - 2.6 + dy, 0.35, 'thin', 'none'))),
    ],
    hit: hitRect(rx, ud - 2.6, 2.5, 2.2),
  });

  // dimension strings
  els.push(dimension('dim-bed-width', 'Bedroom width', [0, -4], [BED_W, -4], k));
  els.push(dimension('dim-living-width', 'Living room width', [BED_W, -4], [uw, -4], k));
  els.push(dimension('dim-unit-width', 'Overall unit width', [0, -8], [uw, -8], k));
  els.push(dimension('dim-bed-depth', 'Bedroom depth', [-4, 0], [-4, BED_D], k));
  els.push(dimension('dim-closet-depth', 'Closet depth', [-4, BED_D], [-4, yBath], k));
  els.push(dimension('dim-bath-depth', 'Bathroom depth', [-4, yBath], [-4, ud], k));
  els.push(dimension('dim-unit-depth', 'Overall unit depth', [-8, 0], [-8, ud], k));
  els.push(dimension('dim-living-depth', 'Living room depth', [uw + 4, 0], [uw + 4, yKitchen], k));
  els.push(dimension('dim-kitchen-depth', 'Kitchen depth', [uw + 4, yKitchen], [uw + 4, ud], k));
  els.push(dimension('dim-bath-width', 'Bathroom width', [0, ud + 4], [BATH_W, ud + 4], k));
  els.push(dimension('dim-hall-width', 'Entry hall width', [BATH_W, ud + 4], [BED_W, ud + 4], k));

  els.push({
    id: 'corridor-note',
    role: 'note',
    name: 'Corridor side',
    marks: [text(uw - 1, ud + 2.2, 'CORRIDOR', 0.8, { anchor: 'end' })],
  });
  els.push(drawingTitle(0, ud + 11, '1', 'A-401', 'ENLARGED UNIT PLAN, 1BR (TYPICAL)', '1/4" = 1\'-0"', k));
  els.push({
    id: 'back-reference',
    role: 'sheet-reference',
    name: 'Reference back to the floor plan (A-102)',
    link: 'A-102',
    marks: [text(0, ud + 16, 'TYPICAL OF ALL 1BR UNITS. SEE A-102 FOR LOCATION.', 0.8)],
    hit: hitRect(0, ud + 14.8, 26, 1.8),
  });
  els.push(scaleBar(0, ud + 19.6, 2, k));
  els.push(northArrow(uw + 10, ud + 12, k));
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'ENLARGED UNIT PLAN', sheet: 'A-401', scale: '1/4" = 1\'-0"' }, k));

  const xs = [0, BATH_W, BED_W, uw];
  const ys = [0, BED_D, yKitchen, yBath, ud];
  const snaps: Pt[] = [];
  for (const x of xs) for (const y of ys) snaps.push([x, y]);

  return { id: 'A-401', title: 'Enlarged unit plan', discipline: 'A', scale: { label: '1/4" = 1\'-0"', ftPerInch: 4 }, bounds, elements: els, snaps };
}

const PREFIXES: [string, string][] = [
  ['G', 'GENERAL'],
  ['C', 'CIVIL'],
  ['L', 'LANDSCAPE'],
  ['S', 'STRUCTURAL'],
  ['A', 'ARCHITECTURAL'],
  ['F', 'FIRE PROTECTION'],
  ['P', 'PLUMBING'],
  ['M', 'MECHANICAL'],
  ['E', 'ELECTRICAL'],
];

const STOREY_WORDS: Record<number, string> = { 3: 'THREE', 4: 'FOUR', 5: 'FIVE', 6: 'SIX' };

/** A cover sheet with a sheet index, the discipline designators and general notes. Shared by every plan set. */
export function coverSheet(index: { id: string; title: string }[], subtitle: string, project: string = PROJECT): PlanSheet {
  const k = 1;
  const bounds = { x: 0, y: 0, w: 190, h: 126 };
  const els: PlanElement[] = [border(bounds, k)];
  els.push({
    id: 'project-title',
    role: 'project-title',
    name: 'Project title',
    marks: [
      text(10, 20, project, 6, { bold: true }),
      text(10, 27, subtitle, 2),
      text(10, 31, 'PERMIT SET', 2),
    ],
    hit: hitRect(8, 12, 90, 21),
  });
  els.push({ id: 'index-heading', role: 'heading', name: 'Sheet index heading', marks: [text(10, 46, 'SHEET INDEX', 2.4, { bold: true }), line(10, 47.5, 80, 47.5, 'medium')] });
  index.forEach((s, i) => {
    const y = 53 + i * 5;
    els.push({
      id: `index-${s.id.toLowerCase()}`,
      role: 'index-row',
      name: `Sheet index row: ${s.id} ${s.title}`,
      link: s.id,
      marks: [text(10, y, s.id, 2, { bold: true }), text(26, y, s.title.toUpperCase(), 2)],
      hit: hitRect(9, y - 3, 72, 4.4),
    });
  });
  els.push({ id: 'prefix-heading', role: 'heading', name: 'Discipline prefixes heading', marks: [text(100, 46, 'DISCIPLINE DESIGNATORS', 2.4, { bold: true }), line(100, 47.5, 150, 47.5, 'medium')] });
  PREFIXES.forEach(([p, name], i) => {
    const y = 53 + i * 4.2;
    els.push({
      id: `prefix-${p.toLowerCase()}`,
      role: 'prefix-row',
      name: `Discipline prefix ${p}: ${name.toLowerCase()}`,
      marks: [text(100, y, p, 1.8, { bold: true }), text(108, y, name, 1.8)],
      hit: hitRect(99, y - 2.6, 50, 3.8),
    });
  });
  els.push({
    id: 'cover-notes',
    role: 'note',
    name: 'General notes',
    marks: [
      text(10, 102, 'GENERAL NOTES', 2.4, { bold: true }),
      text(10, 107, '1. THIS SET IS GENERATED FOR TEACHING. IT IS NOT A REAL PROJECT.', 1.6),
      text(10, 111, '2. DIMENSIONS ARE TO WALL CENTRELINES UNLESS NOTED.', 1.6),
      text(10, 115, '3. DO NOT SCALE DRAWINGS FOR CONSTRUCTION. WRITTEN DIMENSIONS GOVERN.', 1.6),
    ],
  });
  els.push(...titleBlock(bounds, { project, title: 'COVER & SHEET INDEX', sheet: 'G-001', scale: 'NONE' }, k));
  return { id: 'G-001', title: 'Cover sheet and sheet index', discipline: 'G', scale: { label: 'NONE', ftPerInch: 8 }, bounds, elements: els, snaps: [] };
}

const EASEMENT = 10; // utility easement along the rear property line (ft)
const REAR_YARD = 40; // open area between the rear setback line and the building (ft)
const SIDE_YARD = 10; // extra room on each side beyond the side setback (ft)

/** C-101: the lot, its setback lines and easement, and the building footprint. Street on the south side. */
function sitePlan(L: number, D: number, front: number, side: number, rear: number): PlanSheet {
  const k = 2.5; // 1" = 20' is 2.5 times smaller than 1/8" = 1'-0"
  const W = L + 2 * (side + SIDE_YARD);
  const H = D + front + rear + REAR_YARD;
  const bx = (W - L) / 2;
  const by = H - front - D;
  const bounds = { x: -50, y: -50, w: W + 50 + 120, h: H + 50 + 85 };
  const els: PlanElement[] = [border(bounds, k)];

  els.push({
    id: 'easement',
    role: 'easement',
    name: 'Utility easement (10 ft, along the rear property line)',
    area: W * EASEMENT,
    marks: [rect(0, 0, W, EASEMENT, 'thin', 'hatch'), text(W / 2, EASEMENT + 4.6, "10' UTILITY EASEMENT", 3.2, { anchor: 'middle' })],
    hit: hitRect(0, 3, W, EASEMENT - 3),
  });
  els.push({
    id: 'building-footprint',
    role: 'building-footprint',
    name: 'Building footprint',
    area: L * D,
    marks: [rect(bx, by, L, D, 'wall', 'tint'), text(bx + L / 2, by + D / 2 - 1, 'PROPOSED BUILDING', 4, { anchor: 'middle', bold: true }), text(bx + L / 2, by + D / 2 + 5, 'SEE A-102', 3, { anchor: 'middle' })],
    hit: hitRect(bx + 2, by + 2, L - 4, D - 4),
  });

  // setback lines: dashed, inside the property line
  const sb = { x: side, y: rear, w: W - 2 * side, h: H - rear - front };
  const setbacks: [string, string, number, number, number, number][] = [
    ['rear', 'Rear setback line', sb.x, sb.y, sb.x + sb.w, sb.y],
    ['front', 'Front setback line', sb.x, sb.y + sb.h, sb.x + sb.w, sb.y + sb.h],
    ['west', 'Side setback line', sb.x, sb.y, sb.x, sb.y + sb.h],
    ['east', 'Side setback line', sb.x + sb.w, sb.y, sb.x + sb.w, sb.y + sb.h],
  ];
  for (const [id, name, x1, y1, x2, y2] of setbacks) {
    els.push({
      id: `setback-${id}`,
      role: 'setback-line',
      name,
      marks: [line(x1, y1, x2, y2, 'dash')],
      hit: x1 === x2 ? hitRect(x1 - 2.5, y1, 5, y2 - y1) : hitRect(x1, y1 - 2.5, x2 - x1, 5),
    });
  }

  // property lines: long dash, two short dashes, marked PL
  const lines: [string, number, number, number, number][] = [
    ['north', 0, 0, W, 0],
    ['south', 0, H, W, H],
    ['west', 0, 0, 0, H],
    ['east', W, 0, W, H],
  ];
  for (const [id, x1, y1, x2, y2] of lines) {
    els.push({
      id: `property-line-${id}`,
      role: 'property-line',
      name: 'Property line',
      marks: [line(x1, y1, x2, y2, 'phantom')],
      hit: x1 === x2 ? hitRect(x1 - 3, y1, 6, y2 - y1) : hitRect(x1, y1 - 3, x2 - x1, 6),
    });
  }
  els.push({
    id: 'pl-labels',
    role: 'note',
    name: 'Property line labels',
    marks: [text(-3, -3, 'PL', 3, { anchor: 'end', bold: true }), text(W + 3, -3, 'PL', 3, { bold: true }), text(-3, H + 5, 'PL', 3, { anchor: 'end', bold: true }), text(W + 3, H + 5, 'PL', 3, { bold: true })],
  });

  // the street
  els.push({
    id: 'street',
    role: 'street',
    name: 'Street',
    marks: [line(-30, H + 12, W + 30, H + 12, 'medium'), line(-30, H + 30, W + 30, H + 30, 'center'), text(W / 2, H + 24, 'MESA GROVE STREET', 3.6, { anchor: 'middle', bold: true })],
    hit: hitRect(-30, H + 13, W + 60, 16),
  });

  // dimension strings: the lot, and each setback
  els.push(dimension('dim-lot-width', 'Lot width', [0, -22], [W, -22], k));
  els.push(dimension('dim-lot-depth', 'Lot depth', [-22, 0], [-22, H], k));
  els.push(dimension('dim-front-setback', 'Front setback', [bx + L * 0.18, H - front], [bx + L * 0.18, H], k));
  els.push(dimension('dim-rear-setback', 'Rear setback', [bx + L * 0.18, 0], [bx + L * 0.18, rear], k));
  els.push(dimension('dim-side-setback', 'Side setback', [0, by + D * 0.5], [side, by + D * 0.5], k));

  els.push(drawingTitle(0, H + 46, '1', 'C-101', 'SITE PLAN', '1" = 20\'', k));
  els.push(scaleBar(4, H + 70, 20, k));
  els.push(northArrow(W + 22, H + 54, k));
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'SITE PLAN', sheet: 'C-101', scale: '1" = 20\'' }, k));

  const snaps: Pt[] = [
    [0, 0], [W, 0], [0, H], [W, H],
    [sb.x, sb.y], [sb.x + sb.w, sb.y], [sb.x, sb.y + sb.h], [sb.x + sb.w, sb.y + sb.h],
    [bx, by], [bx + L, by], [bx, by + D], [bx + L, by + D],
    [0, EASEMENT], [W, EASEMENT],
    // straight above and below the building's corners, on the property lines, for measuring yards
    [bx, 0], [bx + L, 0], [bx, H], [bx + L, H],
  ];
  return { id: 'C-101', title: 'Site plan', discipline: 'C', scale: { label: '1" = 20\'', ftPerInch: 20 }, bounds, elements: els, snaps };
}

const PARAPET = 3; // ft above the roof

/** A-301: a section across the building (the short way), looking west. Ground is y = 0; up is negative y. */
function buildingSection(ud: number, cw: number, storeys: number, ftf: number): PlanSheet {
  const k = 1;
  const D = 2 * ud + cw;
  const top = storeys * ftf;
  const bounds = { x: -40, y: -(top + PARAPET) - 22, w: D + 40 + 100, h: top + PARAPET + 22 + 40 };
  const els: PlanElement[] = [border(bounds, k)];

  els.push({
    id: 'grade-line',
    role: 'grade-line',
    name: 'Grade (ground) line',
    marks: [line(-14, 0, D + 14, 0, 'wall'), rect(-14, 0, D + 28, 2.2, 'none', 'hatch')],
    hit: hitRect(-14, -0.8, D + 28, 3),
  });

  // floors: a slab line at each level, with the rooms the cut passes through
  for (let i = 0; i < storeys; i++) {
    const y = -i * ftf; // floor level of storey i + 1
    if (i > 0) {
      els.push({ id: `slab-${i + 1}`, role: 'floor-slab', name: `Level ${i + 1} floor slab`, marks: [rect(0, y - 0.5, D, 1, 'medium', 'solid')], hit: hitRect(0, y - 1.2, D, 2.4) });
    }
    const mid = y - ftf / 2;
    els.push({
      id: `storey-${i + 1}`,
      role: 'note',
      name: `Level ${i + 1} rooms`,
      marks: [
        line(ud, y, ud, y - ftf, 'medium'),
        line(ud + cw, y, ud + cw, y - ftf, 'medium'),
        text(ud / 2, mid + 0.6, 'UNIT', 1.4, { anchor: 'middle' }),
        text(ud + cw / 2, mid + 0.5, 'CORR.', 1, { anchor: 'middle' }),
        text(ud + cw + ud / 2, mid + 0.6, 'UNIT', 1.4, { anchor: 'middle' }),
      ],
    });
  }
  els.push({ id: 'roof-slab', role: 'floor-slab', name: 'Roof slab', marks: [rect(0, -top - 0.5, D, 1, 'medium', 'solid')], hit: hitRect(0, -top - 1.2, D, 2.4) });
  els.push({
    id: 'section-walls',
    role: 'exterior-wall',
    name: 'Exterior walls and parapet',
    marks: [rect(-0.5, -top - PARAPET, 1, top + PARAPET, 'medium', 'solid'), rect(D - 0.5, -top - PARAPET, 1, top + PARAPET, 'medium', 'solid')],
  });

  // level markers: a leader with the level name and its elevation above grade
  for (let i = 0; i <= storeys; i++) {
    const y = -i * ftf;
    const name = i === storeys ? 'ROOF' : `LEVEL ${i + 1}`;
    els.push({
      id: `level-${i === storeys ? 'roof' : i + 1}`,
      role: 'level-marker',
      name: `Level marker: ${name.toLowerCase()}, ${feetInches(i * ftf)} above grade`,
      marks: [line(D + 2, y, D + 30, y, 'center'), circle(D + 31.5, y, 1.5, 'thin', 'paper'), line(D + 30, y, D + 33, y, 'thin'), text(D + 4, y - 0.8, `${name}   EL. +${feetInches(i * ftf)}`, 1.4)],
      hit: hitRect(D + 2, y - 2.8, 31, 3.6),
    });
  }

  // dimension strings: each floor-to-floor height, and the overall height to the roof
  for (let i = 0; i < storeys; i++) {
    els.push(dimension(`dim-storey-${i + 1}`, `Floor-to-floor height, level ${i + 1}`, [-9, -(i + 1) * ftf], [-9, -i * ftf], k));
  }
  els.push(dimension('dim-height', 'Building height to the roof', [-16, -top], [-16, 0], k));
  els.push(dimension('dim-section-depth', 'Building depth', [0, 7], [D, 7], k));

  els.push(drawingTitle(0, 18, 'A', 'A-301', 'BUILDING SECTION', '1/8" = 1\'-0"', k));
  els.push({
    id: 'back-reference',
    role: 'sheet-reference',
    name: 'Reference back to the floor plan (A-102)',
    link: 'A-102',
    marks: [text(0, 25, 'SECTION CUT SHOWN ON A-102, LOOKING WEST.', 1.2)],
    hit: hitRect(0, 23.2, 44, 2.6),
  });
  els.push(scaleBar(D - 20, 19, 8, k));
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'BUILDING SECTION', sheet: 'A-301', scale: '1/8" = 1\'-0"' }, k));

  const snaps: Pt[] = [];
  for (let i = 0; i <= storeys; i++) snaps.push([0, -i * ftf], [D, -i * ftf]);
  return { id: 'A-301', title: 'Building section', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

const SILL = 3; // window sill above the floor (ft)
const WINDOW_H = 5; // window height (ft)
const WINDOW_W = 6; // window width (ft)

/** The apartments on the south side of a floor, west to east: their left edge and width. The core bay has none. */
function southUnits(n: number, uw: number, sw: number): { x: number; w: number }[] {
  const L = 2 * sw + n * uw;
  const mid = Math.floor(n / 2);
  const out = [{ x: 0, w: sw + uw }];
  for (let i = 1; i < n - 1; i++) if (i !== mid) out.push({ x: sw + i * uw, w: uw });
  out.push({ x: L - sw - uw, w: sw + uw });
  return out;
}

/** A-201: the south face of the building, seen from the street. Ground is y = 0; up is negative y. */
function southElevation(n: number, uw: number, sw: number, storeys: number, ftf: number): PlanSheet {
  const k = 1;
  const L = 2 * sw + n * uw;
  const top = storeys * ftf;
  const H = top + PARAPET;
  const bounds = { x: -40, y: -H - 22, w: L + 40 + 100, h: H + 22 + 40 };
  const els: PlanElement[] = [border(bounds, k)];

  els.push({
    id: 'grade-line',
    role: 'grade-line',
    name: 'Grade (ground) line',
    marks: [line(-14, 0, L + 14, 0, 'wall'), rect(-14, 0, L + 28, 2.2, 'none', 'hatch')],
    hit: hitRect(-14, -0.8, L + 28, 3),
  });
  els.push({ id: 'facade', role: 'exterior-wall', name: 'South face of the building', marks: [rect(0, -H, L, H, 'wall')] });
  // floor lines, and the roof line with the parapet above it
  const lines = [];
  for (let i = 1; i <= storeys; i++) lines.push(line(0, -i * ftf, L, -i * ftf, i === storeys ? 'medium' : 'thin'));
  els.push({ id: 'floor-lines', role: 'floor-line', name: 'Floor lines and roof line', marks: lines });
  els.push({ id: 'parapet', role: 'parapet', name: 'Parapet (the wall that rises above the roof)', marks: [text(L / 2, -top - 0.9, 'PARAPET', 1.1, { anchor: 'middle' })], hit: hitRect(0, -H, L, PARAPET) });

  // one window per apartment per floor; the core bay has none
  const units = southUnits(n, uw, sw);
  for (let i = 0; i < storeys; i++) {
    units.forEach((u, j) => {
      const x = u.x + u.w / 2 - WINDOW_W / 2;
      const y = -i * ftf - SILL - WINDOW_H;
      els.push({
        id: `window-${i + 1}-${j + 1}`,
        role: 'window',
        name: `Window, level ${i + 1}`,
        marks: [rect(x, y, WINDOW_W, WINDOW_H, 'medium', 'tint'), line(x + WINDOW_W / 2, y, x + WINDOW_W / 2, y + WINDOW_H, 'thin')],
        hit: hitRect(x, y, WINDOW_W, WINDOW_H),
      });
    });
  }
  // the building entrance, at the core bay on the ground floor
  const ex = sw + Math.floor(n / 2) * uw + uw / 2 - 3;
  els.push({
    id: 'entry-door',
    role: 'door',
    name: 'Building entrance',
    marks: [rect(ex, -7.5, 6, 7.5, 'medium', 'paper'), line(ex + 3, -7.5, ex + 3, 0, 'thin')],
    hit: hitRect(ex, -7.5, 6, 7.5),
  });

  els.push(...levelMarkers(L, storeys, ftf));
  for (let i = 0; i < storeys; i++) {
    els.push(dimension(`dim-storey-${i + 1}`, `Floor-to-floor height, level ${i + 1}`, [-9, -(i + 1) * ftf], [-9, -i * ftf], k));
  }
  els.push(dimension('dim-overall-height', 'Overall height to the top of the parapet', [-16, -H], [-16, 0], k));
  els.push(dimension('dim-elevation-length', 'Building length', [0, 7], [L, 7], k));

  els.push(drawingTitle(0, 18, '1', 'A-201', 'SOUTH ELEVATION', '1/8" = 1\'-0"', k));
  els.push({
    id: 'back-reference',
    role: 'sheet-reference',
    name: 'Reference back to the floor plan (A-102)',
    link: 'A-102',
    marks: [text(0, 25, 'VIEWPOINT SHOWN BY THE ELEVATION MARKER ON A-102.', 1.2)],
    hit: hitRect(0, 23.2, 50, 2.6),
  });
  els.push(scaleBar(Math.max(70, L * 0.5), 19, 8, k));
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'SOUTH ELEVATION', sheet: 'A-201', scale: '1/8" = 1\'-0"' }, k));

  const snaps: Pt[] = [];
  for (let i = 0; i <= storeys; i++) snaps.push([0, -i * ftf], [L, -i * ftf]);
  snaps.push([0, -H], [L, -H]);
  return { id: 'A-201', title: 'South elevation', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

const ROOF_DRAINS = 4;

/** A-103: the roof from above: parapet, drains and the slope to them, rooftop equipment, the hatch and the elevator overrun. */
function roofPlan(n: number, uw: number, ud: number, cw: number, sw: number): PlanSheet {
  const k = 1;
  const L = 2 * sw + n * uw;
  const D = 2 * ud + cw;
  const bounds = { x: -36, y: -36, w: L + 36 + 74, h: D + 36 + 36 };
  const els: PlanElement[] = [border(bounds, k)];

  els.push({ id: 'parapet', role: 'parapet', name: 'Parapet around the roof edge', marks: [rect(0, 0, L, D, 'wall'), rect(1, 1, L - 2, D - 2, 'thin')] });

  // drains along the middle of the roof, with arrows showing the roof sloping to them
  const arrows = [];
  for (let i = 0; i < ROOF_DRAINS; i++) {
    const x = (L * (2 * i + 1)) / (2 * ROOF_DRAINS);
    const y = D / 2;
    els.push({
      id: `roof-drain-${i + 1}`,
      role: 'roof-drain',
      name: 'Roof drain',
      marks: [circle(x, y, 0.9, 'medium', 'paper'), line(x - 0.9, y, x + 0.9, y, 'thin'), line(x, y - 0.9, x, y + 0.9, 'thin'), text(x + 1.6, y + 0.5, 'RD', 1.1)],
      hit: { t: 'circle', cx: x, cy: y, r: 2 },
    });
    arrows.push(line(x, y - 12, x, y - 4, 'thin'), poly([[x, y - 3], [x - 0.6, y - 4.6], [x + 0.6, y - 4.6]], 'thin', 'solid'));
    arrows.push(line(x, y + 12, x, y + 4, 'thin'), poly([[x, y + 3], [x - 0.6, y + 4.6], [x + 0.6, y + 4.6]], 'thin', 'solid'));
  }
  els.push({ id: 'slope-arrows', role: 'slope-arrow', name: 'Slope arrows: the roof falls toward the drains', marks: [...arrows, text(L / 2, D / 2 - 13.2, 'SLOPE TO DRAIN', 1.1, { anchor: 'middle' })] });

  // one condensing unit per north-side bay
  for (let i = 0; i < n; i++) {
    const x = sw + i * uw + uw / 2 - 2;
    const y = D * 0.2 - 2;
    els.push({
      id: `rooftop-unit-${i + 1}`,
      role: 'rooftop-unit',
      name: 'Rooftop mechanical unit',
      marks: [rect(x, y, 4, 4, 'medium', 'paper'), circle(x + 2, y + 2, 1.3, 'thin', 'none')],
      hit: hitRect(x, y, 4, 4),
    });
  }
  els.push({
    id: 'roof-hatch',
    role: 'roof-access',
    name: 'Roof hatch (access from stair 1)',
    marks: [rect(sw / 2 - 1.5, 5, 3, 4, 'medium', 'paper'), line(sw / 2 - 1.5, 5, sw / 2 + 1.5, 9, 'thin'), text(sw / 2, 11, 'HATCH', 0.9, { anchor: 'middle' })],
    hit: hitRect(sw / 2 - 1.5, 5, 3, 4),
  });
  const cx0 = sw + Math.floor(n / 2) * uw;
  els.push({
    id: 'elevator-overrun',
    role: 'elevator-overrun',
    name: 'Elevator overrun (the top of the shaft, above the roof)',
    marks: [rect(cx0 + 1.5, ud + cw + 6, 8, 8, 'medium', 'tint'), text(cx0 + 5.5, ud + cw + 16, 'ELEV. OVERRUN', 0.9, { anchor: 'middle' })],
    hit: hitRect(cx0 + 1.5, ud + cw + 6, 8, 8),
  });

  els.push(dimension('dim-roof-length', 'Roof length', [0, -9], [L, -9], k));
  els.push(dimension('dim-roof-depth', 'Roof depth', [-9, 0], [-9, D], k));
  els.push(drawingTitle(0, D + 17, '1', 'A-103', 'ROOF PLAN', '1/8" = 1\'-0"', k));
  els.push(scaleBar(Math.max(70, L * 0.5), D + 18, 8, k));
  els.push(northArrow(L + 14, D + 17, k));
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'ROOF PLAN', sheet: 'A-103', scale: '1/8" = 1\'-0"' }, k));

  return { id: 'A-103', title: 'Roof plan', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps: [[0, 0], [L, 0], [0, D], [L, D]] };
}

const CEILING = 9; // ceiling height in the main rooms (ft)
const SOFFIT = 8; // lowered ceiling over the bathroom, entry and kitchen (ft)

/** A-402: the unit's ceiling, drawn in the same orientation as the floor plan (as if reflected in a mirror on the floor). */
function unitCeilingPlan(uw: number, ud: number): { sheet: PlanSheet; lights: number } {
  const k = 0.5;
  const bounds = { x: -22, y: -20, w: uw + 22 + 42, h: ud + 20 + 22 };
  const els: PlanElement[] = [border(bounds, k)];
  const yBath = ud - BATH_D;
  const yKitchen = ud - KITCHEN_D;

  // lowered ceilings are hatched
  const soffits: [string, string, number, number, number, number][] = [
    ['bath', 'Lowered ceiling over the bathroom', 0, yBath, BATH_W, BATH_D],
    ['hall', 'Lowered ceiling over the entry', BATH_W, yBath, BED_W - BATH_W, BATH_D],
    ['kitchen', 'Lowered ceiling over the kitchen', BED_W, yKitchen, uw - BED_W, KITCHEN_D],
  ];
  for (const [id, name, x, y, w, h] of soffits) {
    els.push({ id: `soffit-${id}`, role: 'soffit', name, area: w * h, marks: [rect(x, y, w, h, 'thin', 'hatch')], hit: hitRect(x + 0.3, y + 0.3, w - 0.6, h - 0.6) });
  }
  els.push({
    id: 'ceiling-lines',
    role: 'partition',
    name: 'Walls, shown where they meet the ceiling',
    marks: [rect(0, 0, BED_W, BED_D, 'thin'), rect(0, BED_D, BED_W, yBath - BED_D, 'thin'), line(BED_W, 0, BED_W, ud, 'thin')],
  });
  els.push({ id: 'unit-outline', role: 'exterior-wall', name: 'Unit demising and exterior walls', marks: [rect(0, 0, uw, ud, 'wall')] });

  // ceiling height tags
  const tags: [string, number, number, number][] = [
    ['bedroom', BED_W / 2, BED_D - 2, CEILING],
    ['living', BED_W + (uw - BED_W) / 2, yKitchen - 2, CEILING],
    ['bath', BATH_W / 2, yBath + 1.6, SOFFIT],
    ['kitchen', BED_W + (uw - BED_W) / 2, ud - 1.6, SOFFIT],
  ];
  for (const [id, x, y, h] of tags) {
    els.push({
      id: `ceiling-tag-${id}`,
      role: 'ceiling-tag',
      name: `Ceiling height tag: ${feetInches(h)} above the floor`,
      marks: [rect(x - 2.1, y - 0.75, 4.2, 1.5, 'thin', 'paper'), text(x, y + 0.3, `${feetInches(h)} CLG`, 0.75, { anchor: 'middle' })],
      hit: hitRect(x - 2.1, y - 0.75, 4.2, 1.5),
    });
  }

  // light fixtures: a circle with a cross
  const lights: Pt[] = [
    [BED_W / 2, BED_D / 2 - 1],
    [BED_W / 2, BED_D + (yBath - BED_D) / 2],
    [BATH_W / 2, yBath + BATH_D / 2 + 1.2],
    [BATH_W + (BED_W - BATH_W) / 2, yBath + BATH_D / 2],
  ];
  const lw = uw - BED_W;
  for (const fx of [0.3, 0.7]) for (const fy of [0.3, 0.7]) lights.push([BED_W + lw * fx, yKitchen * fy - 1]);
  for (const fx of [0.2, 0.5, 0.8]) lights.push([BED_W + lw * fx, yKitchen + KITCHEN_D / 2 - 1.2]);
  lights.forEach(([x, y], i) => {
    els.push({
      id: `light-${i + 1}`,
      role: 'light-fixture',
      name: 'Ceiling light fixture',
      marks: [circle(x, y, 0.45, 'medium', 'paper'), line(x - 0.45, y, x + 0.45, y, 'thin'), line(x, y - 0.45, x, y + 0.45, 'thin')],
      hit: { t: 'circle', cx: x, cy: y, r: 0.9 },
    });
  });
  els.push({
    id: 'exhaust-fan',
    role: 'exhaust-fan',
    name: 'Bathroom exhaust fan',
    marks: [rect(BATH_W - 2.2, yBath + 0.8, 1.2, 1.2, 'medium', 'paper'), line(BATH_W - 2.2, yBath + 0.8, BATH_W - 1, yBath + 2, 'thin'), line(BATH_W - 1, yBath + 0.8, BATH_W - 2.2, yBath + 2, 'thin')],
    hit: hitRect(BATH_W - 2.5, yBath + 0.5, 1.8, 1.8),
  });
  const detectors: Pt[] = [[BED_W - 2, 2], [BATH_W + (BED_W - BATH_W) / 2, ud - 1.6]];
  detectors.forEach(([x, y], i) => {
    els.push({
      id: `smoke-detector-${i + 1}`,
      role: 'smoke-detector',
      name: 'Smoke detector',
      marks: [circle(x, y, 0.6, 'thin', 'paper'), text(x, y + 0.25, 'SD', 0.55, { anchor: 'middle' })],
      hit: { t: 'circle', cx: x, cy: y, r: 0.9 },
    });
  });

  els.push(dimension('dim-unit-width', 'Overall unit width', [0, -5], [uw, -5], k));
  els.push(dimension('dim-unit-depth', 'Overall unit depth', [-5, 0], [-5, ud], k));
  els.push(drawingTitle(0, ud + 8, '1', 'A-402', 'ENLARGED UNIT REFLECTED CEILING PLAN', '1/4" = 1\'-0"', k));
  els.push({
    id: 'rcp-note',
    role: 'note',
    name: 'Ceiling plan notes',
    marks: [text(0, ud + 13, 'CEILING HEIGHTS ARE ABOVE THE FINISHED FLOOR. HATCHED AREAS ARE LOWERED CEILINGS.', 0.8)],
  });
  els.push({
    id: 'back-reference',
    role: 'sheet-reference',
    name: 'Reference to the unit floor plan (A-401)',
    link: 'A-401',
    marks: [text(0, ud + 15.5, 'SEE A-401 FOR THE FLOOR PLAN OF THIS UNIT.', 0.8)],
    hit: hitRect(0, ud + 14.4, 24, 1.7),
  });
  els.push(scaleBar(0, ud + 19.6, 2, k));
  els.push(northArrow(uw + 10, ud + 9, k));
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'UNIT CEILING PLAN', sheet: 'A-402', scale: '1/4" = 1\'-0"' }, k));

  const snaps: Pt[] = [];
  for (const x of [0, BATH_W, BED_W, uw]) for (const y of [0, BED_D, yKitchen, yBath, ud]) snaps.push([x, y]);
  return { sheet: { id: 'A-402', title: 'Enlarged unit reflected ceiling plan', discipline: 'A', scale: { label: '1/4" = 1\'-0"', ftPerInch: 4 }, bounds, elements: els, snaps }, lights: lights.length };
}

function build(params: Record<string, number>): PlanSet {
  const n = params.bays;
  const uw = params.unit_width;
  const ud = params.unit_depth;
  const cw = params.corridor_width;
  const sw = params.stair_width;
  const L = 2 * sw + n * uw;
  const D = 2 * ud + cw;
  const oneBeds = 2 * n - 3;
  const twoBeds = 2;
  const oneBedSf = uw * ud;
  const twoBedSf = (sw + uw) * ud;
  const rentable = oneBeds * oneBedSf + twoBeds * twoBedSf;

  const storeys = params.storeys;
  const ftf = params.floor_to_floor;
  const front = params.front_setback;
  const side = params.side_setback;
  const rear = params.rear_setback;
  const lotWidth = L + 2 * (side + SIDE_YARD);
  const lotDepth = D + front + rear + REAR_YARD;

  const site = sitePlan(L, D, front, side, rear);
  const floor = floorPlan(n, uw, ud, cw, sw);
  const section = buildingSection(ud, cw, storeys, ftf);
  const roof = roofPlan(n, uw, ud, cw, sw);
  const elevation = southElevation(n, uw, sw, storeys, ftf);
  const a401 = unitPlan(uw, ud);
  const ceiling = unitCeilingPlan(uw, ud);
  const drawings = [site, floor, roof, elevation, section, a401, ceiling.sheet];
  const subtitle = `A ${STOREY_WORDS[storeys] ?? storeys}-STOREY APARTMENT BUILDING (ILLUSTRATIVE)`;
  const sheets = [coverSheet([{ id: 'G-001', title: 'Cover sheet and sheet index' }, ...drawings], subtitle), ...drawings];

  return {
    id: 'mf-double-loaded',
    title: 'Linda Vista Flats: typical floor (illustrative)',
    params: { ...params },
    sheets,
    facts: {
      bays: n,
      unit_width: uw,
      unit_depth: ud,
      corridor_width: cw,
      stair_width: sw,
      building_length: L,
      building_depth: D,
      floor_gsf: L * D,
      unit_count: oneBeds + twoBeds,
      one_bed_count: oneBeds,
      two_bed_count: twoBeds,
      one_bed_sf: oneBedSf,
      two_bed_sf: twoBedSf,
      rentable_sf: rentable,
      avg_unit_sf: rentable / (oneBeds + twoBeds),
      corridor_sf: L * cw,
      stair_sf: 2 * sw * ud,
      core_sf: uw * ud,
      bed_width: BED_W,
      bed_depth: BED_D,
      bedroom_sf: BED_W * BED_D,
      bath_sf: BATH_W * BATH_D,
      hall_sf: (BED_W - BATH_W) * BATH_D,
      closet_sf: BED_W * (ud - BATH_D - BED_D),
      kitchen_sf: (uw - BED_W) * KITCHEN_D,
      living_sf: (uw - BED_W) * (ud - KITCHEN_D),
      // site (C-101)
      lot_width: lotWidth,
      lot_depth: lotDepth,
      lot_sf: lotWidth * lotDepth,
      front_setback: front,
      side_setback: side,
      rear_setback: rear,
      easement_width: EASEMENT,
      footprint_sf: L * D,
      rear_yard: rear + REAR_YARD, // rear property line to the back of the building
      // section (A-301)
      storeys,
      floor_to_floor: ftf,
      building_height: storeys * ftf,
      total_gsf: storeys * L * D,
      total_units: storeys * (oneBeds + twoBeds),
      // roof plan (A-103)
      roof_sf: L * D,
      roof_drain_count: ROOF_DRAINS,
      rooftop_unit_count: n,
      // south elevation (A-201)
      south_windows_per_floor: n - 1,
      south_window_count: storeys * (n - 1),
      parapet_height: PARAPET,
      overall_height: storeys * ftf + PARAPET,
      sill_height: SILL,
      // unit ceiling plan (A-402)
      light_count: ceiling.lights,
      ceiling_height: CEILING,
      soffit_height: SOFFIT,
      soffit_sf: BATH_W * BATH_D + (BED_W - BATH_W) * BATH_D + (uw - BED_W) * KITCHEN_D,
    },
  };
}

export const MF_DOUBLE_LOADED: PlanSetDef = {
  id: 'mf-double-loaded',
  title: 'Multifamily typical floor, double-loaded corridor',
  blurb: 'Eight sheets for one small apartment building: cover, site plan, typical floor plan, roof plan, south elevation, building section, enlarged one-bed unit plan and its reflected ceiling plan.',
  defaults: { bays: 5, unit_width: 26, unit_depth: 30, corridor_width: 6, stair_width: 10, storeys: 4, floor_to_floor: 10, front_setback: 15, side_setback: 10, rear_setback: 20 },
  limits: {
    bays: [3, 8],
    unit_width: [22, 32],
    unit_depth: [26, 34],
    corridor_width: [5, 8],
    stair_width: [9, 12],
    storeys: [3, 6],
    floor_to_floor: [9, 12],
    front_setback: [10, 25],
    side_setback: [5, 15],
    rear_setback: [12, 30],
  },
  build,
};
