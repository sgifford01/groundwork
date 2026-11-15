/**
 * Plan set "podium-mixed-use": a mixed-use podium building, shown by the two
 * drawings that explain it best.
 *
 *   G-001  Cover sheet and sheet index
 *   A-100  Parking level P1 plan         1/8" = 1'-0"
 *   A-301  Building section              1/8" = 1'-0"
 *
 * Parking level (north is up): a west zone with the ramp, a cross aisle and a
 * stair; then one or two parking modules side by side (north to south); then
 * an east zone with a stair, two elevators and their lobby.
 *
 *   One module = a row of stalls, a drive aisle, a row of stalls.
 *   The last two stall positions of each module's south row, next to the
 *   elevator end, are one accessible stall and its hatched access aisle.
 *
 * Section: parking below grade, a tall retail floor at street level under a
 * concrete podium slab, and apartment floors above. Where the garage is wider
 * than the apartment bar, the apartments sit back from the podium edge.
 *
 * Stall and aisle sizes are illustrative, not code minimums.
 *
 * The podium slab is labelled only as a concrete slab, and neither the project name nor the notes say "podium", so that "what is this?" questions are not answered by the drawing.
 *
 * Roles: stall accessible-stall drive-aisle ramp column stair elevator lobby storage exterior-wall
 *        podium use-parking use-retail use-residential level-marker grade-line floor-slab
 *        dimension drawing-title scale-bar north-arrow title-block sheet-number note border
 */
import { border, circle, dimension, drawingTitle, elevator, hitRect, line, northArrow, opening, poly, rect, scaleBar, stair, text, titleBlock } from './draw';
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

  const parking = parkingPlan(n, modules, sw);
  const section = podiumSection(modules, resStoreys, retailH, resH, parkingH);
  const drawings = [parking, section];
  const sheets = [coverSheet([{ id: 'G-001', title: 'Cover sheet and sheet index' }, ...drawings], 'A MIXED-USE APARTMENT BUILDING WITH SHOPS AND PARKING (ILLUSTRATIVE)', PROJECT), ...drawings];
  return {
    id: 'podium-mixed-use',
    title: 'Kettner Commons: parking level and section (illustrative)',
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
    },
  };
}

export const PODIUM_MIXED_USE: PlanSetDef = {
  id: 'podium-mixed-use',
  title: 'Mixed-use podium: parking level and section',
  blurb: 'Cover sheet, a below-grade parking level (stalls, drive aisles, ramp, accessible stalls, columns, stair and elevator cores) and a section showing parking, retail and apartments stacked over a concrete podium.',
  defaults: { stalls_per_row: 16, modules: 2, stall_width: 9, res_storeys: 4, retail_height: 18, res_height: 10, parking_height: 10 },
  limits: { stalls_per_row: [10, 20], modules: [1, 2], stall_width: [8.5, 9], res_storeys: [3, 5], retail_height: [16, 20], res_height: [10, 11], parking_height: [10, 12] },
  build,
};
