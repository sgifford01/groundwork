/**
 * Plan set "office-floor": one multi-tenant floor of an office building with a central core.
 *
 *   G-001  Cover sheet and sheet index
 *   A-104  Level 4 floor plan            1/8" = 1'-0"
 *
 * Layout (dimensions to wall centrelines):
 *
 *   The floor plate is a rectangle on a column grid. A core sits in the middle
 *   (two stairs, four elevators either side of a lobby, restrooms, a shaft).
 *   A public corridor rings the core. Four suites take the rest: one at each
 *   end of the floor (full depth) and one each north and south of the core.
 *
 *   Lease depth = the distance from the core to the window wall.
 *
 * Areas (the basic idea only; measurement standards differ in the detail):
 *   usable    = the four suites
 *   rentable  = the whole plate less vertical penetrations (stairs, elevators, shaft)
 *   load factor = rentable / usable
 *
 * The sheet carries an area schedule (usable area by suite, total, and floor openings), so these can be taken off.
 *
 * Roles: suite corridor core stair elevator lobby restroom mechanical column door curtain-wall schedule
 *        grid-bubble dimension drawing-title scale-bar north-arrow title-block sheet-number note border
 */
import { border, dimension, door, drawingTitle, elevator, gridBubble, hitRect, line, northArrow, opening, rect, scaleBar, stair, text, titleBlock } from './draw';
import { coverSheet } from './mfDoubleLoaded';
import type { PlanElement, PlanSet, PlanSetDef, PlanSheet, Pt } from './model';

const PROJECT = 'TORREY RIDGE OFFICE';
const CORRIDOR = 5; // public corridor around the core (ft)
const STAIR_W = 10;
const CAB = 8; // elevator cab, square (ft)
const LOBBY_W = 6;
const SHAFT_W = 6;

interface Layout {
  L: number;
  D: number;
  coreX: number;
  coreLength: number;
  a: number; // west demising line
  b: number; // east demising line
}

function layout(bays: number, spacing: number, lease: number, coreDepth: number): Layout {
  const L = bays * spacing;
  const coreLength = 2 * spacing;
  const coreX = (L - coreLength) / 2;
  return { L, D: 2 * lease + coreDepth, coreX, coreLength, a: coreX - CORRIDOR, b: coreX + coreLength + CORRIDOR };
}

/** Areas of the floor, used both by the area schedule on the sheet and by the facts. */
function areasOf(bays: number, spacing: number, lease: number, coreDepth: number) {
  const { L, D, a, b } = layout(bays, spacing, lease, coreDepth);
  const endSuite = a * D; // suites 401 and 403 are the same size
  const midSuite = (b - a) * (lease - CORRIDOR); // suites 402 and 404
  const usable = 2 * endSuite + 2 * midSuite;
  const penetrations = 2 * STAIR_W * coreDepth + 4 * CAB * CAB + SHAFT_W * coreDepth;
  return { endSuite, midSuite, usable, penetrations, rentable: L * D - penetrations };
}

function floorPlate(bays: number, spacing: number, lease: number, coreDepth: number): PlanSheet {
  const k = 1;
  const { L, D, coreX, coreLength, a, b } = layout(bays, spacing, lease, coreDepth);
  const coreY = lease;
  const coreEnd = coreX + coreLength;
  const bounds = { x: -36, y: -36, w: L + 36 + 74, h: D + 36 + 58 };
  const els: PlanElement[] = [border(bounds, k)];

  // ---- the four suites ----
  const suites: { num: number; x: number; y: number; w: number; h: number }[] = [
    { num: 401, x: 0, y: 0, w: a, h: D },
    { num: 402, x: a, y: 0, w: b - a, h: lease - CORRIDOR },
    { num: 403, x: b, y: 0, w: L - b, h: D },
    { num: 404, x: a, y: lease + coreDepth + CORRIDOR, w: b - a, h: lease - CORRIDOR },
  ];
  for (const s of suites) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    els.push({
      id: `suite-${s.num}`,
      role: 'suite',
      name: `Suite ${s.num} (tenant space)`,
      area: s.w * s.h,
      marks: [
        rect(cx - 4.2, cy - 2.2, 8.4, 3.4, 'thin', 'paper'),
        text(cx, cy + 0.2, String(s.num), 2.1, { anchor: 'middle', bold: true }),
        text(cx, cy + 3.6, 'OFFICE', 1.5, { anchor: 'middle' }),
      ],
      hit: hitRect(s.x + 1.5, s.y + 1.5, s.w - 3, s.h - 3),
    });
  }
  els.push({
    id: 'demising-walls',
    role: 'partition',
    name: 'Demising walls between suites and the corridor',
    marks: [line(a, 0, a, D, 'medium'), line(b, 0, b, D, 'medium'), line(a, lease - CORRIDOR, b, lease - CORRIDOR, 'medium'), line(a, lease + coreDepth + CORRIDOR, b, lease + coreDepth + CORRIDOR, 'medium')],
  });

  // ---- the public corridor that rings the core ----
  els.push({
    id: 'public-corridor',
    role: 'corridor',
    name: 'Public corridor (common area shared by all tenants)',
    area: (b - a) * (coreDepth + 2 * CORRIDOR) - coreLength * coreDepth,
    marks: [text(coreX + coreLength * 0.72, lease - CORRIDOR / 2 + 0.5, 'CORRIDOR', 1.1, { anchor: 'middle' })],
    hit: hitRect(a + 0.5, lease - CORRIDOR + 0.5, b - a - 1, CORRIDOR - 1),
  });

  // ---- the core ----
  const lobbyX = coreX + STAIR_W + CAB;
  const cabY = coreY + (coreDepth - 2 * CAB) / 2;
  const restX = lobbyX + LOBBY_W + CAB;
  const restW = coreEnd - STAIR_W - SHAFT_W - restX;
  els.push({
    id: 'core',
    role: 'core',
    name: 'Core: stairs, elevators, restrooms and shafts',
    area: coreLength * coreDepth,
    marks: [rect(coreX, coreY, coreLength, coreDepth, 'medium'), opening([lobbyX, coreY], [1, 0], LOBBY_W), opening([lobbyX, coreY + coreDepth], [1, 0], LOBBY_W)],
    // the parts of the core are drawn after this, so they stay clickable on top of it
    hit: hitRect(coreX, coreY, coreLength, coreDepth),
  });
  els.push(stair('stair-1', 'Stair 1', coreX, coreY, STAIR_W, coreDepth, k));
  els.push(stair('stair-2', 'Stair 2', coreEnd - STAIR_W, coreY, STAIR_W, coreDepth, k));
  els.push(elevator('elevator-1', lobbyX - CAB, cabY, CAB, CAB));
  els.push(elevator('elevator-2', lobbyX - CAB, cabY + CAB, CAB, CAB));
  els.push(elevator('elevator-3', lobbyX + LOBBY_W, cabY, CAB, CAB));
  els.push(elevator('elevator-4', lobbyX + LOBBY_W, cabY + CAB, CAB, CAB));
  els.push({
    id: 'elevator-lobby',
    role: 'lobby',
    name: 'Elevator lobby',
    marks: [line(lobbyX, coreY, lobbyX, coreY + coreDepth, 'thin'), line(lobbyX + LOBBY_W, coreY, lobbyX + LOBBY_W, coreY + coreDepth, 'thin'), text(lobbyX + LOBBY_W / 2 + 0.4, coreY + coreDepth / 2, 'LOBBY', 1, { anchor: 'middle', rot: -90 })],
    hit: hitRect(lobbyX + 0.4, coreY + 0.4, LOBBY_W - 0.8, coreDepth - 0.8),
  });
  els.push({
    id: 'restroom-men',
    role: 'restroom',
    name: 'Restroom',
    marks: [rect(restX, coreY, restW, coreDepth / 2, 'medium'), text(restX + restW / 2, coreY + coreDepth / 4 + 0.5, 'MEN', 1.1, { anchor: 'middle' })],
    hit: hitRect(restX + 0.5, coreY + 0.5, restW - 1, coreDepth / 2 - 1),
  });
  els.push({
    id: 'restroom-women',
    role: 'restroom',
    name: 'Restroom',
    marks: [rect(restX, coreY + coreDepth / 2, restW, coreDepth / 2, 'medium'), text(restX + restW / 2, coreY + (coreDepth * 3) / 4 + 0.5, 'WOMEN', 1.1, { anchor: 'middle' })],
    hit: hitRect(restX + 0.5, coreY + coreDepth / 2 + 0.5, restW - 1, coreDepth / 2 - 1),
  });
  els.push({
    id: 'shaft',
    role: 'mechanical',
    name: 'Mechanical and electrical shaft',
    marks: [rect(coreEnd - STAIR_W - SHAFT_W, coreY, SHAFT_W, coreDepth, 'medium'), line(coreEnd - STAIR_W - SHAFT_W, coreY, coreEnd - STAIR_W, coreY + coreDepth, 'thin'), text(coreEnd - STAIR_W - SHAFT_W / 2 + 0.4, coreY + coreDepth / 2, 'SHAFT', 1, { anchor: 'middle', rot: -90 })],
    hit: hitRect(coreEnd - STAIR_W - SHAFT_W + 0.4, coreY + 0.4, SHAFT_W - 0.8, coreDepth - 0.8),
  });

  // ---- the window wall ----
  els.push({ id: 'curtain-wall', role: 'curtain-wall', name: 'Window wall around the floor', marks: [rect(0, 0, L, D, 'wall'), rect(0.7, 0.7, L - 1.4, D - 1.4, 'thin')] });

  // ---- suite entries, off the corridor ----
  els.push(door('door-401', 'Entry door, suite 401', [a, D / 2 + 1.5], [0, -1], [-1, 0]));
  els.push(door('door-403', 'Entry door, suite 403', [b, D / 2 - 1.5], [0, 1], [1, 0]));
  els.push(door('door-402', 'Entry door, suite 402', [coreX + 4, lease - CORRIDOR], [1, 0], [0, -1]));
  els.push(door('door-404', 'Entry door, suite 404', [coreX + 4, lease + coreDepth + CORRIDOR], [1, 0], [0, 1]));

  // ---- columns on the grid: around the window wall and along the core ----
  const gy = [0, lease, lease + coreDepth, D];
  for (let i = 0; i <= bays; i++) {
    gy.forEach((y, j) => {
      els.push({ id: `column-${i + 1}-${'abcd'[j]}`, role: 'column', name: 'Structural column', marks: [rect(i * spacing - 0.75, y - 0.75, 1.5, 1.5, 'thin', 'solid')], hit: hitRect(i * spacing - 1.25, y - 1.25, 2.5, 2.5) });
    });
  }

  // ---- column grid and dimension strings ----
  for (let i = 0; i <= bays; i++) els.push(gridBubble(`grid-${i + 1}`, String(i + 1), [i * spacing, -27], [i * spacing, D + 4], k));
  gy.forEach((y, j) => els.push(gridBubble(`grid-${'abcd'[j]}`, 'ABCD'[j], [-27, y], [L + 4, y], k)));
  for (let i = 0; i < bays; i++) els.push(dimension(`dim-bay-${i + 1}`, `Column spacing, grid ${i + 1} to ${i + 2}`, [i * spacing, -9], [(i + 1) * spacing, -9], k));
  els.push(dimension('dim-length', 'Overall floor plate length', [0, -16], [L, -16], k));
  els.push(dimension('dim-lease-north', 'Lease depth: window wall to core (north side)', [-9, 0], [-9, lease], k));
  els.push(dimension('dim-core-depth', 'Core depth', [-9, lease], [-9, lease + coreDepth], k));
  els.push(dimension('dim-lease-south', 'Lease depth: core to window wall (south side)', [-9, lease + coreDepth], [-9, D], k));
  els.push(dimension('dim-depth', 'Overall floor plate depth', [-16, 0], [-16, D], k));
  els.push(dimension('dim-core-length', 'Core length', [coreX, D + 7], [coreEnd, D + 7], k));

  els.push(drawingTitle(0, D + 17, '1', 'A-104', 'LEVEL 4 FLOOR PLAN', '1/8" = 1\'-0"', k));
  els.push(scaleBar(Math.max(74, L * 0.5), D + 19, 8, k));
  els.push(northArrow(L + 14, D + 17, k));
  els.push({
    id: 'general-note',
    role: 'note',
    name: 'General note',
    marks: [text(0, D + 27, 'NOTE: DIMENSIONS ARE TO WALL CENTRELINES. THE CORRIDOR AROUND THE CORE IS 5 FT WIDE. COLUMNS ARE ON THE GRID LINES.', 1.2)],
  });
  // ---- area schedule, as architects put on their sheets ----
  const ar = areasOf(bays, spacing, lease, coreDepth);
  const sf = (n: number) => `${Math.round(n).toLocaleString('en-US')} SF`;
  const rows: [string, string][] = [
    ['SUITE 401', sf(ar.endSuite)],
    ['SUITE 402', sf(ar.midSuite)],
    ['SUITE 403', sf(ar.endSuite)],
    ['SUITE 404', sf(ar.midSuite)],
    ['TOTAL USABLE', sf(ar.usable)],
    ['FLOOR OPENINGS (STAIRS, ELEVATORS, SHAFT)', sf(ar.penetrations)],
  ];
  const sy = D + 33;
  els.push({
    id: 'area-schedule',
    role: 'schedule',
    name: 'Area schedule (usable area by suite, and floor openings)',
    marks: [
      text(0, sy, 'AREA SCHEDULE: USABLE AREA BY SUITE', 1.4, { bold: true }),
      line(0, sy + 0.8, 72, sy + 0.8, 'medium'),
      ...rows.flatMap(([label, value], i) => [text(0, sy + 3.4 + i * 2.6, label, 1.25, { bold: i >= 4 }), text(72, sy + 3.4 + i * 2.6, value, 1.25, { anchor: 'end', bold: i >= 4 })]),
      line(0, sy + 3.4 + 3 * 2.6 + 1, 72, sy + 3.4 + 3 * 2.6 + 1, 'thin'),
    ],
    hit: hitRect(0, sy - 2, 72, 3.4 + 6 * 2.6),
  });
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'LEVEL 4 FLOOR PLAN', sheet: 'A-104', scale: '1/8" = 1\'-0"' }, k));

  const snaps: Pt[] = [];
  for (let i = 0; i <= bays; i++) for (const y of gy) snaps.push([i * spacing, y]);
  for (const x of [a, b, coreX, coreEnd]) for (const y of [0, lease - CORRIDOR, lease, lease + coreDepth, lease + coreDepth + CORRIDOR, D]) snaps.push([x, y]);
  return { id: 'A-104', title: 'Level 4 floor plan', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

function build(params: Record<string, number>): PlanSet {
  const bays = params.bays;
  const spacing = params.column_spacing;
  const lease = params.lease_depth;
  const coreDepth = params.core_depth;
  const { L, D, coreLength } = layout(bays, spacing, lease, coreDepth);
  const plan = floorPlate(bays, spacing, lease, coreDepth);
  const sheets = [coverSheet([{ id: 'G-001', title: 'Cover sheet and sheet index' }, plan], 'A MULTI-TENANT OFFICE BUILDING (ILLUSTRATIVE)', PROJECT), plan];

  const { endSuite, midSuite, usable, penetrations, rentable } = areasOf(bays, spacing, lease, coreDepth);
  return {
    id: 'office-floor',
    title: 'Torrey Ridge Office: typical floor (illustrative)',
    params: { ...params },
    sheets,
    facts: {
      bays,
      column_spacing: spacing,
      lease_depth: lease,
      core_depth: coreDepth,
      core_length: coreLength,
      plate_length: L,
      plate_depth: D,
      plate_sf: L * D,
      core_sf: coreLength * coreDepth,
      end_suite_sf: endSuite,
      mid_suite_sf: midSuite,
      suite_count: 4,
      usable_sf: usable,
      penetration_sf: penetrations,
      rentable_sf: rentable,
      common_sf: rentable - usable,
      load_factor: rentable / usable,
      corridor_width: CORRIDOR,
      elevator_count: 4,
    },
  };
}

export const OFFICE_FLOOR: PlanSetDef = {
  id: 'office-floor',
  title: 'Office floor plate with a central core',
  blurb: 'Cover sheet and one multi-tenant office floor: column grid, central core (two stairs, four elevators, restrooms, shaft), a ring corridor and four suites. Facts include usable, rentable and load factor.',
  defaults: { bays: 7, column_spacing: 30, lease_depth: 40, core_depth: 30 },
  limits: { bays: [5, 9], column_spacing: [28, 32], lease_depth: [35, 45], core_depth: [26, 34] },
  build,
};
