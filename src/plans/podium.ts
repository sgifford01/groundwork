/**
 * Plan set "podium-mixed-use": a mixed-use podium building.
 *
 *   G-001  Cover sheet and sheet index
 *   A-100  Parking level P1 plan         1/8" = 1'-0"
 *   A-101  Ground floor plan             1/8" = 1'-0"
 *   A-102  Typical floor plan            1/8" = 1'-0"
 *   A-301  Building section              1/8" = 1'-0"
 *
 * All four drawings share one coordinate frame: x = 0, y = 0 is the north-west
 * corner of the garage and the ground floor (north is up), so anything that
 * runs through several floors (elevators, stairs, the shaft) has the same
 * coordinates on every sheet it appears on. The tests check that.
 *
 * Parking level (north is up): a west zone with the ramp, a cross aisle and a
 * stair; then one or two parking modules side by side (north to south); then
 * an east zone with a stair, two elevators and their lobby.
 *
 *   One module = a row of stalls, a drive aisle, a row of stalls.
 *   The last two stall positions of each module's south row, next to the
 *   elevator end, are one accessible stall and its hatched access aisle.
 *
 * Ground floor: the same footprint as the garage. The ramp down, a trash and
 * loading room and the garage's west stair on the west side; shops along the
 * street (north) as deep as the service corridor behind them; bikes, the
 * apartments' west stair and amenity rooms south of the corridor; on the east
 * side, the residential entry, the garage's east stair, the elevator lobby and
 * the apartments' east stair.
 *
 * Typical floor: an apartment bar centred north-south over the ground floor
 * and flush with its east face, so that its elevators stand on the garage's.
 *
 *   north row:  one-beds
 *   corridor (it ends in the elevator lobby)
 *   south row:  stair | two-beds | one-beds
 *   east end:   electrical room | lobby and two elevators | stair and shaft
 *
 * One-beds are 24 ft wide and two-beds 36 ft, so the two rows come out the
 * same length. The bar is as long as the garage's parking rows allow.
 *
 * Section: parking below grade, a tall retail floor at street level under a
 * concrete podium slab, and apartment floors above. Where the garage is wider
 * than the apartment bar, the apartments sit back from the podium edge.
 *
 * Stall, aisle and room sizes are illustrative, not code minimums.
 *
 * The podium slab is labelled only as a concrete slab, and neither the project name nor the notes say "podium", so that "what is this?" questions are not answered by the drawing.
 *
 * Roles: stall accessible-stall drive-aisle ramp column stair elevator lobby storage exterior-wall
 *        podium use-parking use-retail use-residential level-marker grade-line floor-slab
 *        retail-bay storefront corridor loading amenity utility mechanical electrical unit door window
 *        partition section-line section-marker
 *        dimension drawing-title scale-bar north-arrow title-block sheet-number note border
 */
import { border, circle, dimension, door, drawingTitle, elevator, hitRect, line, northArrow, opening, poly, rect, scaleBar, sectionHead, stair, text, titleBlock, windowH } from './draw';
import { coverSheet } from './mfDoubleLoaded';
import { feetInches, type Mark, type PlanElement, type PlanSet, type PlanSetDef, type PlanSheet, type Pt } from './model';

const PROJECT = 'KETTNER COMMONS';
const STALL_D = 18;
const AISLE = 24;
const MODULE = 2 * STALL_D + AISLE;
const WEST = 24; // west zone: ramp, cross aisle, stair
const EAST = 20; // east zone: stair, elevators, lobby
const RES_BAR = 66; // depth of the apartment bar above the podium (ft)
const PARAPET = 3;
const CORR = 6; // corridor width, apartments and ground floor (ft)
const ONE_W = 24; // one-bed width (ft)
const TWO_W = 36; // two-bed width (ft)
const STAIR_W = 12; // the apartments' west stair (ft)
const MIN_ROOM = 10; // narrowest room the ground floor leaves west of the apartment bar (ft)

function parkingPlan(n: number, modules: number, sw: number): PlanSheet {
  const k = 1;
  const rowLength = n * sw;
  const L = WEST + rowLength + EAST;
  const D = modules * MODULE;
  const xE = WEST + rowLength;
  const bounds = { x: -36, y: -36, w: L + 36 + 74, h: D + 36 + 36 };
  const els: PlanElement[] = [border(bounds, k)];

  // ---- drive aisles first, so stalls and rooms sit on top of them ----
  els.push({
    id: 'cross-aisle',
    role: 'drive-aisle',
    name: 'Cross aisle (links the ramp to the parking aisles)',
    marks: [],
    hit: hitRect(0.5, STALL_D + 0.5, WEST - 1, D - 2 * STALL_D - 1),
  });
  for (let m = 0; m < modules; m++) {
    const y0 = m * MODULE;
    els.push({
      id: `aisle-${m + 1}`,
      role: 'drive-aisle',
      name: 'Drive aisle',
      marks: [text(WEST + rowLength / 2, y0 + STALL_D + AISLE / 2 + 0.6, 'DRIVE AISLE', 1.4, { anchor: 'middle' })],
      hit: hitRect(WEST + 0.5, y0 + STALL_D + 0.5, rowLength - 1, AISLE - 1),
    });
  }

  // ---- stalls ----
  let stallNo = 0;
  for (let m = 0; m < modules; m++) {
    const y0 = m * MODULE;
    for (const [row, y] of [y0, y0 + STALL_D + AISLE].entries()) {
      const count = row === 1 ? n - 2 : n; // the south row gives its last two positions to the accessible stall
      for (let i = 0; i < count; i++) {
        const x = WEST + i * sw;
        stallNo++;
        els.push({
          id: `stall-${stallNo}`,
          role: 'stall',
          name: 'Standard parking stall',
          marks: [line(x, y, x, y + STALL_D, 'thin'), line(x + sw, y, x + sw, y + STALL_D, 'thin')],
          hit: hitRect(x + 0.4, y + 0.4, sw - 0.8, STALL_D - 0.8),
        });
      }
      if (row === 1) {
        const x = WEST + (n - 2) * sw;
        const cx = x + sw / 2;
        const cy = y + STALL_D / 2;
        els.push({
          id: `accessible-${m + 1}`,
          role: 'accessible-stall',
          name: 'Accessible stall with its hatched access aisle',
          marks: [
            line(x, y, x, y + STALL_D, 'thin'),
            line(x + sw, y, x + sw, y + STALL_D, 'thin'),
            rect(x + sw, y, sw, STALL_D, 'thin', 'hatch'),
            // a simple wheelchair mark: a wheel, a seat back and a head
            circle(cx, cy + 1.2, 1.5, 'medium', 'none'),
            line(cx - 0.4, cy + 1, cx - 0.4, cy - 1.6, 'medium'),
            line(cx - 0.4, cy - 0.2, cx + 1.2, cy - 0.2, 'medium'),
            circle(cx - 0.4, cy - 2.4, 0.55, 'thin', 'solid'),
          ],
          hit: hitRect(x + 0.4, y + 0.4, 2 * sw - 0.8, STALL_D - 0.8),
        });
      }
    }
  }

  // ---- west zone: the ramp up to the street, and a stair with a storage room at the south end ----
  els.push({
    id: 'ramp',
    role: 'ramp',
    name: 'Ramp up to the street',
    marks: [
      rect(0, 0, WEST, STALL_D, 'medium'),
      line(WEST / 2, STALL_D - 2, WEST / 2, 5, 'medium'),
      poly([[WEST / 2, 3], [WEST / 2 - 1.2, 5.6], [WEST / 2 + 1.2, 5.6]], 'thin', 'solid'),
      // the break line: the ramp carries on above this level
      poly([[2, 9], [WEST / 2 - 2, 9], [WEST / 2 - 1, 7.6], [WEST / 2 + 1, 10.4], [WEST / 2 + 2, 9], [WEST - 2, 9]], 'thin', 'none', false),
      text(WEST / 2, STALL_D - 3.4, 'RAMP UP', 1.3, { anchor: 'middle' }),
      opening([1, STALL_D], [1, 0], WEST - 2),
    ],
    hit: hitRect(0.5, 0.5, WEST - 1, STALL_D - 1),
  });
  els.push(stair('stair-2', 'Stair 2', 0, D - STALL_D, 10, STALL_D, k));
  els.push({
    id: 'storage',
    role: 'storage',
    name: 'Storage room',
    marks: [rect(10, D - STALL_D, WEST - 10, STALL_D, 'medium'), text(10 + (WEST - 10) / 2, D - STALL_D / 2 + 0.5, 'STOR.', 1.2, { anchor: 'middle' })],
    hit: hitRect(10.5, D - STALL_D + 0.5, WEST - 11, STALL_D - 1),
  });

  // ---- east zone: stair, two elevators and their lobby, with rooms above and below ----
  const lobbyY = D / 2 - 8;
  els.push({
    id: 'east-rooms',
    role: 'storage',
    name: 'Bicycle and mechanical rooms',
    marks: [
      line(xE, 0, xE, D, 'medium'),
      opening([xE, lobbyY + 4], [0, 1], 8),
      line(xE, lobbyY, L, lobbyY, 'medium'),
      line(xE, lobbyY + 16, L, lobbyY + 16, 'medium'),
      text(xE + EAST / 2, lobbyY + 16 + (D - lobbyY - 16) / 2 + 0.5, 'BIKES / MECH', 1.1, { anchor: 'middle' }),
    ],
    hit: hitRect(xE + 0.5, lobbyY + 16.5, EAST - 1, D - lobbyY - 17),
  });
  els.push(stair('stair-1', 'Stair 1', xE + 10, 0, 10, Math.min(20, lobbyY), k));
  els.push({
    id: 'elevator-lobby',
    role: 'lobby',
    name: 'Elevator lobby',
    marks: [text(xE + 5.5, lobbyY + 8.5, 'LOBBY', 1.1, { anchor: 'middle' })],
    hit: hitRect(xE + 0.5, lobbyY + 0.5, 10, 15),
  });
  els.push(elevator('elevator-1', xE + 11, lobbyY, 8, 8));
  els.push(elevator('elevator-2', xE + 11, lobbyY + 8, 8, 8));

  els.push({ id: 'garage-wall', role: 'exterior-wall', name: 'Garage perimeter wall', marks: [rect(0, 0, L, D, 'wall')] });

  // ---- columns at the aisle edges, every third stall line ----
  let col = 0;
  for (let m = 0; m < modules; m++) {
    for (const y of [m * MODULE + STALL_D, m * MODULE + STALL_D + AISLE]) {
      for (let i = 0; i <= n; i += 3) {
        col++;
        const x = WEST + i * sw;
        els.push({ id: `column-${col}`, role: 'column', name: 'Structural column', marks: [rect(x - 0.6, y - 0.6, 1.2, 1.2, 'thin', 'solid')], hit: hitRect(x - 1.1, y - 1.1, 2.2, 2.2) });
      }
    }
  }

  // ---- dimension strings ----
  els.push(dimension('dim-stall-width', 'Width of one stall', [WEST, -8], [WEST + sw, -8], k));
  els.push(dimension('dim-row-length', 'Length of a row of stalls', [WEST, -15], [xE, -15], k));
  els.push(dimension('dim-garage-length', 'Overall garage length', [0, -22], [L, -22], k));
  els.push(dimension('dim-stall-depth', 'Stall depth', [-8, 0], [-8, STALL_D], k));
  els.push(dimension('dim-aisle', 'Drive aisle width', [-8, STALL_D], [-8, STALL_D + AISLE], k));
  els.push(dimension('dim-stall-depth-south', 'Stall depth', [-8, STALL_D + AISLE], [-8, MODULE], k));
  els.push(dimension('dim-module', 'One parking module: stalls, aisle, stalls', [-15, 0], [-15, MODULE], k));
  if (modules > 1) els.push(dimension('dim-garage-width', 'Overall garage width', [-22, 0], [-22, D], k));

  els.push(drawingTitle(0, D + 17, '1', 'A-100', 'PARKING LEVEL P1', '1/8" = 1\'-0"', k));
  els.push(scaleBar(Math.max(74, L * 0.5), D + 19, 8, k));
  els.push(northArrow(L + 14, D + 17, k));
  els.push({
    id: 'general-note',
    role: 'note',
    name: 'General note',
    marks: [text(0, D + 27, 'NOTE: STALL AND AISLE SIZES ARE ILLUSTRATIVE. HATCHED AREAS ARE ACCESS AISLES, NOT PARKING STALLS.', 1.2)],
  });
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'PARKING LEVEL P1', sheet: 'A-100', scale: '1/8" = 1\'-0"' }, k));

  const snaps: Pt[] = [];
  for (const x of [0, WEST, xE, L]) for (let m = 0; m <= modules; m++) snaps.push([x, m * MODULE]);
  for (let m = 0; m < modules; m++) for (const x of [WEST, WEST + sw, xE]) snaps.push([x, m * MODULE + STALL_D], [x, m * MODULE + STALL_D + AISLE]);
  return { id: 'A-100', title: 'Parking level P1 plan', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

/** A-301: a north-south section. Grade is y = 0; above grade is negative y, the garage is positive y. */
function podiumSection(modules: number, resStoreys: number, retailH: number, resH: number, parkingH: number): PlanSheet {
  const k = 1;
  const W = modules * MODULE;
  const resW = Math.min(RES_BAR, W);
  const rx = (W - resW) / 2;
  const top = retailH + resStoreys * resH;
  const bounds = { x: -40, y: -top - PARAPET - 22, w: W + 40 + 104, h: top + PARAPET + 22 + parkingH + 44 };
  const els: PlanElement[] = [border(bounds, k)];

  // the ground either side of the garage
  els.push({
    id: 'grade-line',
    role: 'grade-line',
    name: 'Grade (street level)',
    marks: [rect(-14, 0, 14, parkingH + 2, 'none', 'hatch'), rect(W, 0, 14, parkingH + 2, 'none', 'hatch'), rect(-14, parkingH, W + 28, 2, 'none', 'hatch'), line(-14, 0, 0, 0, 'wall'), line(W, 0, W + 14, 0, 'wall')],
    hit: hitRect(-14, -1, 14, 2),
  });

  const band = (id: string, role: string, name: string, x: number, y: number, w: number, h: number, label: string): void => {
    els.push({ id, role, name, area: w * h, marks: [rect(x, y, w, h, 'medium'), text(x + w / 2, y + h / 2 + 0.6, label, 1.5, { anchor: 'middle' })], hit: hitRect(x + 0.8, y + 1, w - 1.6, h - 2) });
  };
  band('use-parking', 'use-parking', 'Parking level, below grade', 0, 0, W, parkingH, 'PARKING (P1)');
  band('use-retail', 'use-retail', 'Retail and lobby at street level', 0, -retailH, W, retailH, 'RETAIL / LOBBY');
  for (let i = 0; i < resStoreys; i++) {
    band(`use-residential-${i + 1}`, 'use-residential', `Apartments, level ${i + 2}`, rx, -retailH - (i + 1) * resH, resW, resH, 'APARTMENTS');
  }

  // slabs: the ground floor, the podium (thicker: it carries the building above), and the roof
  const slabs: Mark[] = [rect(0, -0.5, W, 1, 'medium', 'solid'), rect(rx, -top - 0.4, resW, 0.8, 'medium', 'solid'), rect(rx - 0.4, -top - PARAPET, 0.8, PARAPET, 'medium', 'solid'), rect(rx + resW - 0.4, -top - PARAPET, 0.8, PARAPET, 'medium', 'solid')];
  els.push({ id: 'slabs', role: 'floor-slab', name: 'Ground floor slab, roof slab and parapets', marks: slabs });
  els.push({
    id: 'podium',
    role: 'podium',
    name: 'Podium: the concrete slab that separates the apartments from the retail and parking below',
    marks: [rect(0, -retailH - 1, W, 2, 'medium', 'solid'), text(W + 1.5, -retailH - 1.6, 'CONCRETE SLAB', 1.1)],
    hit: hitRect(0, -retailH - 1.6, W, 3.2),
  });

  // level markers, with heights above (or below) the street
  const levels: [string, string, number][] = [['p', 'P1', parkingH], ['1', 'LEVEL 1', 0], ['2', 'LEVEL 2', -retailH]];
  for (let i = 1; i < resStoreys; i++) levels.push([String(i + 2), `LEVEL ${i + 2}`, -retailH - i * resH]);
  levels.push(['roof', 'ROOF', -top]);
  for (const [id, name, y] of levels) {
    const el = y > 0 ? `-${feetInches(y)}` : `+${feetInches(-y)}`;
    els.push({
      id: `level-${id}`,
      role: 'level-marker',
      name: `Level marker: ${name.toLowerCase()}, ${y > 0 ? `${feetInches(y)} below` : `${feetInches(-y)} above`} the street`,
      marks: [line(W + 16, y, W + 46, y, 'center'), circle(W + 47.5, y, 1.5, 'thin', 'paper'), line(W + 46, y, W + 49, y, 'thin'), text(W + 20, y - 0.8, `${name}   EL. ${el}`, 1.4)],
      hit: hitRect(W + 16, y - 2.8, 33, 3.6),
    });
  }

  // dimension strings: every storey, and the height above the street
  els.push(dimension('dim-parking-height', 'Parking level height', [-9, 0], [-9, parkingH], k));
  els.push(dimension('dim-retail-height', 'Retail floor-to-floor height', [-9, -retailH], [-9, 0], k));
  for (let i = 0; i < resStoreys; i++) els.push(dimension(`dim-res-${i + 1}`, `Apartment floor-to-floor height, level ${i + 2}`, [-9, -retailH - (i + 1) * resH], [-9, -retailH - i * resH], k));
  els.push(dimension('dim-height', 'Building height above the street, to the roof', [-18, -top], [-18, 0], k));
  els.push(dimension('dim-garage-width', 'Podium and garage width', [0, parkingH + 8], [W, parkingH + 8], k));
  if (resW < W) els.push(dimension('dim-res-width', 'Apartment bar depth', [rx, -top - PARAPET - 6], [rx + resW, -top - PARAPET - 6], k));

  els.push(drawingTitle(0, parkingH + 21, 'A', 'A-301', 'BUILDING SECTION', '1/8" = 1\'-0"', k));
  els.push(scaleBar(Math.max(60, W * 0.6), parkingH + 23, 8, k));
  els.push({
    id: 'section-note',
    role: 'note',
    name: 'Section note',
    marks: [text(0, parkingH + 30, 'SECTION LOOKING WEST. PARKING BELOW GRADE, RETAIL AT THE STREET, APARTMENTS ABOVE.', 1.2)],
  });
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'BUILDING SECTION', sheet: 'A-301', scale: '1/8" = 1\'-0"' }, k));

  const snaps: Pt[] = [[0, 0], [W, 0], [0, parkingH], [W, parkingH], [0, -retailH], [W, -retailH], [rx, -top], [rx + resW, -top]];
  return { id: 'A-301', title: 'Building section', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

/** Where the apartment bar sits and how its rows are filled. A-101, A-102 and the facts all read this. */
interface Bar {
  /** Ground floor and garage: length (west to east) and depth (north to south). */
  L: number;
  D: number;
  /** The length between the garage's west and east zones (the parking rows; the shops on the ground floor). */
  row: number;
  /** Shops on the ground floor: how many, and how deep (they run back to the service corridor). */
  suites: number;
  shopDepth: number;
  /** Apartment bar depth (as drawn on the section) and apartment depth. */
  B: number;
  ud: number;
  /** The bar's north-west corner. Its east face is the building's east face. */
  x0: number;
  y0: number;
  /** Length of each row of apartments; the core is east of it. */
  N: number;
  /** Ground floor length west of the bar and east of the west zone (a room, or nothing). */
  gap: number;
  northOnes: number;
  southOnes: number;
  twoBeds: number;
}

function barLayout(n: number, sw: number, modules: number): Bar {
  const D = modules * MODULE;
  const row = n * sw;
  const L = WEST + row + EAST;
  const B = Math.min(RES_BAR, D);
  const ud = (B - CORR) / 2;
  // the north row is one-beds, as many as fit over the parking rows; a sliver too narrow to be a room downstairs is given back
  let northOnes = Math.floor(row / ONE_W + 1e-9);
  let gap = row - northOnes * ONE_W;
  if (gap > 1e-9 && gap < MIN_ROOM) {
    northOnes -= 1;
    gap += ONE_W;
  }
  // the south row is the stair, then two-beds, then one-beds; both rows come out the same length
  // because 12 + 3 x 36 = 5 x 24 and 12 + 36 = 2 x 24
  const twoBeds = northOnes >= 5 ? 3 : 1;
  const southOnes = northOnes - (twoBeds === 3 ? 5 : 2);
  return {
    L,
    D,
    row,
    suites: Math.max(2, Math.round(row / 48)),
    shopDepth: D / 2 - CORR / 2,
    B,
    ud,
    x0: WEST + gap,
    y0: (D - B) / 2,
    N: northOnes * ONE_W,
    gap,
    northOnes,
    southOnes,
    twoBeds,
  };
}

/** A rectangular room: its outline, a centred label and a hotspot. */
function room(id: string, role: string, name: string, x: number, y: number, w: number, h: number, label: string, size = 1.3): PlanElement {
  return {
    id,
    role,
    name,
    area: w * h,
    marks: [rect(x, y, w, h, 'medium'), text(x + w / 2, y + h / 2 + 0.5, label, size, { anchor: 'middle' })],
    hit: hitRect(x + 0.5, y + 0.5, w - 1, h - 1),
  };
}

/** A north-south section cut through a plan, looking west, with a marker at each end that opens A-301. */
function sectionCut(x: number, yTop: number, yBottom: number, k: number): PlanElement[] {
  return [
    { id: 'section-line', role: 'section-line', name: 'Section cut line (section A)', marks: [line(x, yTop - 3.2, x, yBottom + 3.2, 'center')] },
    sectionHead('section-a-north', 'Section marker: section A, drawn on sheet A-301', x, yTop - 3.4, 'A', 'A-301', [-1, 0], k, 'A-301'),
    sectionHead('section-a-south', 'Section marker: section A, drawn on sheet A-301', x, yBottom + 3.4, 'A', 'A-301', [-1, 0], k, 'A-301'),
  ];
}

/** A-101: the ground floor, on the garage's footprint and in the garage's coordinates. */
function groundFloor(bar: Bar): PlanSheet {
  const k = 1;
  const { L, D, row, suites, shopDepth: RD, B, x0, y0, gap } = bar;
  const xE = L - EAST; // the east zone, over the garage's
  const yS = RD + CORR; // north edge of the rooms south of the service corridor
  const yBar = y0 + B; // the south face of the apartments above
  const lobbyY = D / 2 - 8; // the elevator lobby, as on the garage level
  const F = row / suites;
  const bounds = { x: -36, y: -36, w: L + 36 + 74, h: D + 36 + 36 };
  const els: PlanElement[] = [border(bounds, k)];
  const late: PlanElement[] = []; // storefronts and doors: drawn over the walls

  // ---- west zone: the ramp down to the garage, trash and loading, and the garage's west stair ----
  els.push({
    id: 'ramp',
    role: 'ramp',
    name: 'Ramp down to the garage',
    area: WEST * STALL_D,
    marks: [
      rect(0, 0, WEST, STALL_D, 'medium'),
      line(WEST * 0.3, 3, WEST * 0.3, STALL_D - 4.5, 'medium'),
      poly([[WEST * 0.3, STALL_D - 2.4], [WEST * 0.3 - 1.2, STALL_D - 5], [WEST * 0.3 + 1.2, STALL_D - 5]], 'thin', 'solid'),
      text(WEST * 0.65, STALL_D / 2 + 0.5, 'RAMP DN', 1.3, { anchor: 'middle' }),
    ],
    hit: hitRect(0.5, 0.5, WEST - 1, STALL_D - 1),
  });
  els.push(room('loading', 'loading', 'Trash and loading room', 0, STALL_D, WEST, D - 2 * STALL_D, 'TRASH / LOADING', 1.2));
  els.push({ ...stair('stair-2', 'Stair 2 (up from the garage)', 0, D - STALL_D, 10, STALL_D, k), area: 10 * STALL_D });
  els.push(room('storage', 'storage', 'Storage room', 10, D - STALL_D, WEST - 10, STALL_D, 'STOR.', 1.2));
  late.push(door('door-stair-2', 'Stair 2 exit door', [2, D], [1, 0], [0, 1]));
  late.push(door('door-storage', 'Storage room door', [WEST - 5, D - STALL_D], [1, 0], [0, 1]));

  // ---- shops along the street, as deep as the service corridor behind them ----
  for (let i = 0; i < suites; i++) {
    const x = WEST + i * F;
    const letter = String.fromCharCode(65 + i);
    const s = letter.toLowerCase();
    els.push({
      id: `retail-${s}`,
      role: 'retail-bay',
      name: `Shop ${letter}`,
      area: F * RD,
      marks: [rect(x, 0, F, RD, 'medium'), text(x + F / 2, RD / 2 + 0.6, `RETAIL ${letter}`, 1.6, { anchor: 'middle' })],
      hit: hitRect(x + 1, 1.5, F - 2, RD - 2.5),
    });
    late.push({
      id: `storefront-${s}`,
      role: 'storefront',
      name: `Storefront glazing, shop ${letter}`,
      marks: [rect(x + 1.5, -0.4, F - 3, 0.8, 'thin', 'paper'), line(x + 1.5, 0, x + F - 1.5, 0, 'thin')],
      hit: hitRect(x + 1.5, -1.2, F - 3, 2.4),
    });
    late.push(door(`door-front-${s}`, `Entry door, shop ${letter}`, [x + F / 2 - 1.5, 0], [1, 0], [0, -1]));
    late.push(door(`door-rear-${s}`, `Rear door, shop ${letter}`, [x + F - 5, RD], [1, 0], [0, 1]));
  }
  els.push(room('service-corridor', 'corridor', 'Service corridor (deliveries, trash and the shops’ back doors)', WEST, RD, row, CORR, 'SERVICE CORRIDOR', 1.2));

  // ---- south of the corridor: bikes, the apartments' west stair and its way out, amenity rooms ----
  if (gap > 0) {
    els.push(room('bikes', 'storage', 'Bicycle room', WEST, yS, gap, D - yS, 'BIKES', 1.2));
    late.push(door('door-bikes', 'Bicycle room door', [WEST + 1.5, yS], [1, 0], [0, 1]));
  }
  els.push({ ...stair('stair-3', 'Stair 3 (down from the apartments)', x0, yS, STAIR_W, yBar - yS, k), area: STAIR_W * (yBar - yS) });
  late.push(door('door-stair-3', 'Stair 3 door', [x0 + STAIR_W - 3.5, yS], [1, 0], [0, 1]));
  if (D - yBar > 1e-9) {
    els.push(room('exit-west', 'corridor', 'Exit passage from stair 3 to the outside', x0, yBar, STAIR_W, D - yBar, 'EXIT', 1.1));
    late.push(door('door-stair-3-out', 'Stair 3 door into the exit passage', [x0 + 1.5, yBar], [1, 0], [0, 1]));
  }
  late.push(door('door-exit-west', 'Exit door to the outside', [x0 + 1.5, D], [1, 0], [0, 1]));
  const ax = x0 + STAIR_W;
  const half = (xE - ax) / 2;
  els.push(room('fitness', 'amenity', 'Fitness room', ax, yS, half, D - yS, 'FITNESS'));
  els.push(room('leasing', 'amenity', 'Leasing office', ax + half, yS, half, D - yS, 'LEASING'));
  late.push(door('door-fitness', 'Fitness room door', [ax + 2, yS], [1, 0], [0, 1]));
  late.push(door('door-leasing', 'Leasing office door', [ax + half + 2, yS], [1, 0], [0, 1]));

  // ---- east zone: the residential entry, the garage's east stair, the elevators, the apartments' east stair ----
  els.push(room('entry', 'lobby', 'Residential entry hall', xE, 0, 10, lobbyY, 'ENTRY', 1.1));
  late.push(door('door-entry-a', 'Residential entry door', [xE + 2, 0], [1, 0], [0, -1]));
  late.push(door('door-entry-b', 'Residential entry door', [xE + 8, 0], [-1, 0], [0, -1]));
  const stair1 = stair('stair-1', 'Stair 1 (up from the garage)', xE + 10, 0, 10, 20, k);
  if (lobbyY - 20 >= 6) {
    els.push({ ...stair1, area: 10 * 20 });
    els.push(room('mail', 'storage', 'Mail and package room', xE + 10, 20, 10, lobbyY - 20, 'MAIL', 1.1));
    late.push(door('door-mail', 'Mail room door', [xE + 10, 21.5], [0, 1], [1, 0]));
  } else {
    // with one parking module the lobby is close to the street: the stair enclosure takes the strip that is left
    els.push({ ...stair1, area: 10 * lobbyY, marks: [...stair1.marks, rect(xE + 10, 20, 10, lobbyY - 20, 'medium')] });
  }
  late.push(door('door-stair-1', 'Stair 1 exit door', [xE + 12, 0], [1, 0], [0, -1]));
  els.push({
    id: 'elevator-lobby',
    role: 'lobby',
    name: 'Elevator lobby',
    area: EAST * 16,
    marks: [
      text(xE + 5.5, lobbyY + 8.5, 'LOBBY', 1.1, { anchor: 'middle' }),
      line(xE + 10, lobbyY, L, lobbyY, 'medium'),
      line(xE, lobbyY + 16, L, lobbyY + 16, 'medium'),
      line(xE, lobbyY, xE, RD, 'medium'),
      line(xE, RD + CORR, xE, lobbyY + 16, 'medium'),
    ],
    hit: hitRect(xE + 0.5, lobbyY + 0.5, 10, 15),
  });
  els.push(elevator('elevator-1', xE + 11, lobbyY, 8, 8));
  els.push(elevator('elevator-2', xE + 11, lobbyY + 8, 8, 8));
  const h4 = yBar - lobbyY - 16;
  els.push({ ...stair('stair-4', 'Stair 4 (down from the apartments)', xE, lobbyY + 16, 10, h4, k), area: 10 * h4 });
  late.push(door('door-stair-4', 'Stair 4 door', [xE + 1.5, lobbyY + 16], [1, 0], [0, 1]));
  els.push(room('mech', 'mechanical', 'Mechanical shaft', xE + 10, lobbyY + 16, 10, h4, 'MECH', 1.1));
  if (D - yBar > 1e-9) {
    els.push(room('exit-east', 'corridor', 'Exit passage from stair 4 to the outside', xE, yBar, 10, D - yBar, 'EXIT', 1.1));
    els.push(room('utility', 'utility', 'Utility room (fire riser and water meters)', xE + 10, yBar, 10, D - yBar, 'UTIL.', 1.1));
    late.push(door('door-stair-4-out', 'Stair 4 door into the exit passage', [xE + 1.5, yBar], [1, 0], [0, 1]));
    late.push(door('door-utility', 'Utility room door', [xE + 13.5, D], [1, 0], [0, 1]));
  }
  late.push(door('door-exit-east', 'Exit door to the outside', [xE + 1.5, D], [1, 0], [0, 1]));

  // ---- walls, then the openings and doors cut through them ----
  els.push({ id: 'exterior-wall', role: 'exterior-wall', name: 'Exterior wall', marks: [rect(0, 0, L, D, 'wall')] });
  els.push({
    id: 'openings',
    role: 'partition',
    name: 'Openings between rooms',
    marks: [
      opening([1, 0], [1, 0], WEST - 2), // the garage entrance, off the street
      opening([0, STALL_D + 2], [0, 1], 10), // the loading door on the west side
      opening([WEST, RD + 0.5], [0, 1], CORR - 1), // service corridor into the loading room
      opening([xE, RD + 0.5], [0, 1], CORR - 1), // service corridor into the elevator lobby
      opening([xE + 1, lobbyY], [1, 0], 8), // entry hall into the lobby
    ],
  });
  els.push(...late);

  // ---- section cut, dimensions and sheet furniture ----
  els.push(...sectionCut(WEST + row * 0.62, 0, D, k));
  for (let i = 0; i < suites; i++) {
    const x = WEST + i * F;
    els.push(dimension(`dim-frontage-${i + 1}`, `Frontage, shop ${String.fromCharCode(65 + i)}`, [x, -9], [x + F, -9], k));
  }
  els.push(dimension('dim-west-zone', 'Ramp and loading zone width', [0, -9], [WEST, -9], k));
  els.push(dimension('dim-east-zone', 'Entry and core zone width', [xE, -9], [L, -9], k));
  els.push(dimension('dim-length', 'Overall building length', [0, -16], [L, -16], k));
  els.push(dimension('dim-shop-depth', 'Shop depth', [-9, 0], [-9, RD], k));
  els.push(dimension('dim-corridor', 'Service corridor width', [-9, RD], [-9, yS], k));
  els.push(dimension('dim-back', 'Depth of the rooms behind the corridor', [-9, yS], [-9, D], k));
  els.push(dimension('dim-depth', 'Overall building depth', [-16, 0], [-16, D], k));
  els.push(drawingTitle(0, D + 17, '1', 'A-101', 'GROUND FLOOR PLAN', '1/8" = 1\'-0"', k));
  els.push(scaleBar(Math.max(74, L * 0.5), D + 19, 8, k));
  els.push(northArrow(L + 14, D + 17, k));
  els.push({
    id: 'general-note',
    role: 'note',
    name: 'General note',
    marks: [text(0, D + 27, 'NOTE: STREET TO THE NORTH. DIMENSIONS ARE TO WALL CENTRELINES.', 1.2)],
  });
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'GROUND FLOOR PLAN', sheet: 'A-101', scale: '1/8" = 1\'-0"' }, k));

  const snaps: Pt[] = [[0, 0], [L, 0], [0, D], [L, D], [WEST, 0], [xE, 0], [WEST, RD], [xE, RD], [WEST, yS], [xE, yS], [x0, yS], [x0 + STAIR_W, yS], [x0, D], [x0 + STAIR_W, D]];
  for (let i = 1; i < suites; i++) snaps.push([WEST + i * F, 0], [WEST + i * F, RD]);
  return { id: 'A-101', title: 'Ground floor plan', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

/** A-102: the typical apartment floor, drawn where it sits over the ground floor (the same coordinates). */
function typicalFloor(bar: Bar): PlanSheet {
  const k = 1;
  const { L, B, ud, x0, y0, N, northOnes, southOnes, twoBeds } = bar;
  const xC = x0 + N; // the core zone, over the garage's east zone
  const yCor = y0 + ud;
  const ySo = yCor + CORR;
  const yS = y0 + B;
  const lobbyY = yCor - 5; // the elevator lobby is 16 ft deep, centred on the corridor, as on the floors below
  const bounds = { x: x0 - 36, y: y0 - 36, w: L - x0 + 36 + 74, h: B + 36 + 36 };
  const els: PlanElement[] = [border(bounds, k)];
  const late: PlanElement[] = []; // doors and windows: drawn over the walls

  // ---- apartments ----
  let num = 1;
  const northSpans: [number, number][] = [];
  const southSpans: [number, number][] = [];
  const unit = (x: number, y: number, w: number, type: '1BR' | '2BR', north: boolean): void => {
    const tag = String(num).padStart(2, '0');
    const cx = x + w / 2;
    const cy = y + ud / 2;
    els.push({
      id: `unit-${tag}`,
      role: 'unit',
      name: `Apartment ${tag} (${type === '1BR' ? 'one-bed' : 'two-bed'})`,
      area: w * ud,
      marks: [
        rect(x, y, w, ud, 'medium'),
        rect(cx - 3.4, cy - 2.2, 6.8, 3.4, 'thin', 'paper'),
        text(cx, cy + 0.2, tag, 2.1, { anchor: 'middle', bold: true }),
        text(cx, cy + 3.6, type, 1.5, { anchor: 'middle' }),
      ],
      hit: hitRect(x + 1, y + 1, w - 2, ud - 2),
    });
    late.push(door(`door-${tag}`, `Entry door, apartment ${tag}`, north ? [x + 2, yCor] : [x + w - 5, ySo], [1, 0], north ? [0, -1] : [0, 1]));
    late.push(windowH(`window-${tag}`, 'Window', cx, north ? y0 : yS));
    (north ? northSpans : southSpans).push([x, x + w]);
    num++;
  };
  for (let i = 0; i < northOnes; i++) unit(x0 + i * ONE_W, y0, ONE_W, '1BR', true);
  let xs = x0 + STAIR_W;
  for (let i = 0; i < twoBeds; i++, xs += TWO_W) unit(xs, ySo, TWO_W, '2BR', false);
  for (let i = 0; i < southOnes; i++, xs += ONE_W) unit(xs, ySo, ONE_W, '1BR', false);

  // ---- corridor and the west stair ----
  els.push({
    id: 'corridor',
    role: 'corridor',
    name: 'Corridor',
    area: N * CORR,
    marks: [text(x0 + N * 0.45, yCor + CORR / 2 + 0.5, 'CORRIDOR', 1.5, { anchor: 'middle' })],
    hit: hitRect(x0 + 0.5, yCor + 0.5, N - 1, CORR - 1),
  });
  els.push({ ...stair('stair-3', 'Stair 3', x0, ySo, STAIR_W, ud, k), area: STAIR_W * ud });
  late.push(door('door-stair-3', 'Stair 3 door', [x0 + STAIR_W - 3.5, ySo], [1, 0], [0, 1]));

  // ---- the core at the east end: electrical room, elevator lobby, stair and shaft ----
  els.push(room('elec', 'electrical', 'Electrical room', xC, y0, EAST, lobbyY - y0, 'ELEC', 1.2));
  late.push(door('door-elec', 'Electrical room door', [xC + 1.5, lobbyY], [1, 0], [0, -1]));
  els.push({
    id: 'elevator-lobby',
    role: 'lobby',
    name: 'Elevator lobby',
    area: EAST * 16,
    marks: [
      text(xC + 5.5, lobbyY + 8.5, 'LOBBY', 1.1, { anchor: 'middle' }),
      line(xC, lobbyY, xC, yCor, 'medium'),
      line(xC, ySo, xC, lobbyY + 16, 'medium'),
      line(xC, lobbyY + 16, L, lobbyY + 16, 'medium'),
    ],
    hit: hitRect(xC + 0.5, lobbyY + 0.5, 10, 15),
  });
  els.push(elevator('elevator-1', xC + 11, lobbyY, 8, 8));
  els.push(elevator('elevator-2', xC + 11, lobbyY + 8, 8, 8));
  const h4 = yS - lobbyY - 16;
  els.push({ ...stair('stair-4', 'Stair 4', xC, lobbyY + 16, 10, h4, k), area: 10 * h4 });
  late.push(door('door-stair-4', 'Stair 4 door', [xC + 1.5, lobbyY + 16], [1, 0], [0, 1]));
  els.push(room('mech', 'mechanical', 'Mechanical shaft', xC + 10, lobbyY + 16, 10, h4, 'MECH', 1.1));

  els.push({ id: 'exterior-wall', role: 'exterior-wall', name: 'Exterior wall', marks: [rect(x0, y0, L - x0, B, 'wall')] });
  els.push(...late);

  // ---- section cut, dimensions and sheet furniture ----
  els.push(...sectionCut(x0 + N * 0.62, y0, yS, k));
  northSpans.forEach(([a, b], i) => els.push(dimension(`dim-north-${i + 1}`, 'Apartment width', [a, y0 - 9], [b, y0 - 9], k)));
  els.push(dimension('dim-core', 'Core width', [xC, y0 - 9], [L, y0 - 9], k));
  els.push(dimension('dim-length', 'Overall length', [x0, y0 - 16], [L, y0 - 16], k));
  els.push(dimension('dim-stair-3', 'Stair width', [x0, yS + 9], [x0 + STAIR_W, yS + 9], k));
  southSpans.forEach(([a, b], i) => els.push(dimension(`dim-south-${i + 1}`, 'Apartment width', [a, yS + 9], [b, yS + 9], k)));
  els.push(dimension('dim-depth-north', 'Apartment depth, north row', [x0 - 9, y0], [x0 - 9, yCor], k));
  els.push(dimension('dim-corridor', 'Corridor width', [x0 - 9, yCor], [x0 - 9, ySo], k));
  els.push(dimension('dim-depth-south', 'Apartment depth, south row', [x0 - 9, ySo], [x0 - 9, yS], k));
  els.push(dimension('dim-depth', 'Overall depth', [x0 - 16, y0], [x0 - 16, yS], k));
  els.push(drawingTitle(x0, yS + 17, '1', 'A-102', 'TYPICAL FLOOR PLAN', '1/8" = 1\'-0"', k));
  els.push(scaleBar(x0 + 70, yS + 18, 8, k));
  els.push(northArrow(L + 14, yS + 17, k));
  els.push({
    id: 'general-note',
    role: 'note',
    name: 'General note',
    marks: [
      text(x0, yS + 26, 'NOTE: THIS PLAN REPEATS ON EVERY APARTMENT FLOOR. SEE A-301 FOR THE LEVELS.', 1.2),
      text(x0, yS + 28.4, 'DIMENSIONS ARE TO WALL CENTRELINES. ALL APARTMENTS OPEN OFF THE CORRIDOR.', 1.2),
    ],
  });
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'TYPICAL FLOOR PLAN', sheet: 'A-102', scale: '1/8" = 1\'-0"' }, k));

  const snaps: Pt[] = [[x0, ySo], [x0, yS], [x0 + STAIR_W, yS], [xC, y0], [xC, yS], [L, y0], [L, yS], [x0, yCor]];
  for (const [a, b] of northSpans) snaps.push([a, y0], [b, y0], [a, yCor], [b, yCor]);
  for (const [a, b] of southSpans) snaps.push([a, ySo], [b, ySo], [a, yS], [b, yS]);
  return { id: 'A-102', title: 'Typical floor plan', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

function build(params: Record<string, number>): PlanSet {
  const n = params.stalls_per_row;
  const modules = params.modules;
  const sw = params.stall_width;
  const resStoreys = params.res_storeys;
  const retailH = params.retail_height;
  const resH = params.res_height;
  const parkingH = params.parking_height;
  const L = WEST + n * sw + EAST;
  const D = modules * MODULE;
  const standard = modules * (2 * n - 2);
  const accessible = modules;

  const bar = barLayout(n, sw, modules);
  const oneBeds = bar.northOnes + bar.southOnes;
  const units = oneBeds + bar.twoBeds;
  const oneSf = ONE_W * bar.ud;
  const twoSf = TWO_W * bar.ud;
  const nra = oneBeds * oneSf + bar.twoBeds * twoSf;
  const typicalLength = bar.N + EAST;
  const typicalSf = typicalLength * bar.B;

  const parking = parkingPlan(n, modules, sw);
  const section = podiumSection(modules, resStoreys, retailH, resH, parkingH);
  const drawings = [parking, groundFloor(bar), typicalFloor(bar), section];
  const sheets = [coverSheet([{ id: 'G-001', title: 'Cover sheet and sheet index' }, ...drawings], 'A MIXED-USE APARTMENT BUILDING WITH SHOPS AND PARKING (ILLUSTRATIVE)', PROJECT), ...drawings];
  return {
    id: 'podium-mixed-use',
    title: 'Kettner Commons: parking, ground floor, typical floor and section (illustrative)',
    params: { ...params },
    sheets,
    facts: {
      stalls_per_row: n,
      modules,
      stall_width: sw,
      stall_depth: STALL_D,
      aisle_width: AISLE,
      module_width: MODULE,
      row_length: n * sw,
      garage_length: L,
      garage_width: D,
      garage_sf: L * D,
      standard_stalls: standard,
      accessible_stalls: accessible,
      total_stalls: standard + accessible,
      sf_per_stall: (L * D) / (standard + accessible),
      res_storeys: resStoreys,
      storeys_above_grade: resStoreys + 1,
      retail_height: retailH,
      res_height: resH,
      parking_height: parkingH,
      building_height: retailH + resStoreys * resH,
      res_bar_depth: Math.min(RES_BAR, D),
      // ground floor (A-101)
      ground_sf: L * D,
      retail_suites: bar.suites,
      suite_frontage: bar.row / bar.suites,
      retail_frontage: bar.row,
      retail_depth: bar.shopDepth,
      retail_sf: bar.row * bar.shopDepth,
      suite_sf: (bar.row / bar.suites) * bar.shopDepth,
      // typical floor (A-102), per floor unless named res_ (all apartment floors)
      north_one_beds: bar.northOnes,
      south_one_beds: bar.southOnes,
      floor_one_beds: oneBeds,
      floor_two_beds: bar.twoBeds,
      floor_units: units,
      unit_depth: bar.ud,
      one_bed_width: ONE_W,
      two_bed_width: TWO_W,
      one_bed_sf: oneSf,
      two_bed_sf: twoSf,
      typical_length: typicalLength,
      typical_depth: bar.B,
      typical_sf: typicalSf,
      typical_nra_sf: nra,
      res_units: units * resStoreys,
      res_one_beds: oneBeds * resStoreys,
      res_two_beds: bar.twoBeds * resStoreys,
      res_gsf: typicalSf * resStoreys,
      res_nra_sf: nra * resStoreys,
      res_efficiency: nra / typicalSf,
      avg_unit_sf: nra / units,
      two_bed_share: bar.twoBeds / units,
      above_grade_sf: L * D + typicalSf * resStoreys,
    },
  };
}

export const PODIUM_MIXED_USE: PlanSetDef = {
  id: 'podium-mixed-use',
  title: 'Mixed-use podium: garage, ground floor, typical floor and section',
  blurb: 'Cover sheet; a below-grade parking level (stalls, drive aisles, ramp, accessible stalls, columns, stair and elevator cores); the ground floor (shops along the street, service corridor, residential entry and lobby, back-of-house rooms); the typical apartment floor (one-beds and two-beds off a double-loaded corridor); and a section showing parking, retail and apartments stacked over a concrete podium. Elevators and stairs line up from floor to floor.',
  defaults: { stalls_per_row: 16, modules: 2, stall_width: 9, res_storeys: 4, retail_height: 18, res_height: 10, parking_height: 10 },
  limits: { stalls_per_row: [10, 20], modules: [1, 2], stall_width: [8.5, 9], res_storeys: [3, 5], retail_height: [16, 20], res_height: [10, 11], parking_height: [10, 12] },
  build,
};
