/**
 * Plan set "retail-strip": the ground floor of a single-storey row of shops.
 *
 *   G-001  Cover sheet and sheet index
 *   A-101  Ground floor plan             1/8" = 1'-0"
 *
 * Layout (north is up, dimensions to wall centrelines):
 *
 *   north strip:  LOADING | service corridor ...................... | TRASH | ELEC
 *   shops:        suite 101 (two bays wide, the corner) | 102 | 103 | ...
 *   south edge:   storefront glazing and entry doors, then the sidewalk and the street
 *
 * Every shop has a storefront on the street and a rear door onto the service corridor.
 *
 * Roles: retail-bay storefront door column service-corridor loading trash electrical
 *        sidewalk exterior-wall dimension drawing-title scale-bar north-arrow title-block sheet-number note border
 */
import { border, dimension, door, drawingTitle, hitRect, line, northArrow, rect, scaleBar, text, titleBlock } from './draw';
import { coverSheet } from './mfDoubleLoaded';
import type { Mark, PlanElement, PlanSet, PlanSetDef, PlanSheet, Pt } from './model';

const PROJECT = 'CONVOY CORNER SHOPS';
const LOADING_W = 16; // the loading bay at the west end of the service corridor (ft)
const TRASH_W = 12;
const ELEC_W = 8;

function groundFloor(bays: number, bw: number, depth: number, service: number): PlanSheet {
  const k = 1;
  const L = bays * bw;
  const D = service + depth;
  const bounds = { x: -36, y: -30, w: L + 36 + 74, h: D + 30 + 54 };
  const els: PlanElement[] = [border(bounds, k)];

  // ---- shops: the corner tenant takes two bays, the rest one each ----
  const tenants: { x: number; w: number; num: number }[] = [{ x: 0, w: 2 * bw, num: 101 }];
  for (let i = 2; i < bays; i++) tenants.push({ x: i * bw, w: bw, num: 100 + i });
  for (const t of tenants) {
    const cx = t.x + t.w / 2;
    const cy = service + depth / 2;
    els.push({
      id: `suite-${t.num}`,
      role: 'retail-bay',
      name: `Suite ${t.num} (shop, ${t.w} ft of frontage)`,
      area: t.w * depth,
      marks: [
        rect(t.x, service, t.w, depth, 'medium'),
        rect(cx - 4.2, cy - 2.2, 8.4, 3.4, 'thin', 'paper'),
        text(cx, cy + 0.2, String(t.num), 2.1, { anchor: 'middle', bold: true }),
        text(cx, cy + 3.6, 'RETAIL', 1.5, { anchor: 'middle' }),
      ],
      hit: hitRect(t.x + 1, service + 4, t.w - 2, depth - 8),
    });
  }

  // ---- the service strip along the back ----
  els.push({
    id: 'loading',
    role: 'loading',
    name: 'Loading bay (deliveries come in here)',
    area: LOADING_W * service,
    // deliberately unlabelled: "where does the truck unload?" is a question, so the drawing must not answer it
    marks: [line(LOADING_W, 0, LOADING_W, service, 'dash')],
    hit: hitRect(0.5, 0.5, LOADING_W - 1, service - 1),
  });
  els.push({
    id: 'service-corridor',
    role: 'service-corridor',
    name: 'Service corridor (back-of-house access to every shop)',
    marks: [text((LOADING_W + L - TRASH_W - ELEC_W) / 2, service / 2 + 0.5, 'SERVICE CORRIDOR', 1.2, { anchor: 'middle' })],
    hit: hitRect(LOADING_W + 0.5, 0.5, L - LOADING_W - TRASH_W - ELEC_W - 1, service - 1),
  });
  els.push({
    id: 'trash',
    role: 'trash',
    name: 'Trash room',
    marks: [rect(L - TRASH_W - ELEC_W, 0, TRASH_W, service, 'medium'), text(L - ELEC_W - TRASH_W / 2, service / 2 + 0.5, 'TRASH', 1.1, { anchor: 'middle' })],
    hit: hitRect(L - TRASH_W - ELEC_W + 0.5, 0.5, TRASH_W - 1, service - 1),
  });
  els.push({
    id: 'elec',
    role: 'electrical',
    name: 'Electrical room',
    marks: [rect(L - ELEC_W, 0, ELEC_W, service, 'medium'), text(L - ELEC_W / 2, service / 2 + 0.5, 'ELEC', 1.1, { anchor: 'middle' })],
    hit: hitRect(L - ELEC_W + 0.5, 0.5, ELEC_W - 1, service - 1),
  });

  els.push({
    id: 'exterior-wall',
    role: 'exterior-wall',
    name: 'Exterior wall',
    // the loading bay is open to the alley on the west side: the wall is interrupted there
    marks: [rect(0, 0, L, D, 'wall'), rect(-0.45, 1, 0.9, service - 2, 'none', 'paper'), line(0, 1, 0, service - 1, 'dash')],
  });

  // ---- storefronts, entry doors and rear doors ----
  for (const t of tenants) {
    const cx = t.x + t.w / 2;
    const mullions: Mark[] = [];
    for (let x = t.x + 1; x <= t.x + t.w - 1 + 1e-6; x += (t.w - 2) / Math.round((t.w - 2) / 5)) mullions.push(line(x, D - 0.6, x, D + 0.6, 'thin'));
    els.push({
      id: `storefront-${t.num}`,
      role: 'storefront',
      name: `Storefront of suite ${t.num} (glazing on the street)`,
      marks: [rect(t.x + 1, D - 0.4, t.w - 2, 0.8, 'thin', 'paper'), line(t.x + 1, D, t.x + t.w - 1, D, 'thin'), ...mullions],
      hit: hitRect(t.x + 1, D - 1.6, t.w - 2, 3.2),
    });
    els.push(door(`door-front-${t.num}-a`, `Entry door, suite ${t.num}`, [cx - 3, D], [1, 0], [0, -1]));
    els.push(door(`door-front-${t.num}-b`, `Entry door, suite ${t.num}`, [cx + 3, D], [-1, 0], [0, -1]));
    els.push(door(`door-rear-${t.num}`, `Rear door, suite ${t.num}`, [t.x + t.w - 6, service], [1, 0], [0, 1]));
  }

  // ---- columns on the bay lines, at the storefront and the rear wall ----
  for (let i = 0; i <= bays; i++) {
    for (const [j, y] of [service, D].entries()) {
      els.push({ id: `column-${i + 1}-${j + 1}`, role: 'column', name: 'Structural column', marks: [rect(i * bw - 0.7, y - 0.7, 1.4, 1.4, 'thin', 'solid')], hit: hitRect(i * bw - 1.2, y - 1.2, 2.4, 2.4) });
    }
  }

  // ---- the street side ----
  els.push({
    id: 'sidewalk',
    role: 'sidewalk',
    name: 'Sidewalk',
    marks: [line(-12, D + 10, L + 12, D + 10, 'thin'), text(L * 0.82, D + 6.4, 'SIDEWALK', 1.3, { anchor: 'middle' }), text(L / 2, D + 14.6, 'CONVOY STREET (ILLUSTRATIVE)', 1.6, { anchor: 'middle', bold: true })],
    hit: hitRect(-12, D + 4, L + 24, 5.5),
  });

  // ---- dimension strings ----
  for (const t of tenants) els.push(dimension(`dim-frontage-${t.num}`, `Frontage of suite ${t.num}`, [t.x, -8], [t.x + t.w, -8], k));
  els.push(dimension('dim-length', 'Overall building length', [0, -15], [L, -15], k));
  els.push(dimension('dim-service', 'Service corridor width', [-8, 0], [-8, service], k));
  els.push(dimension('dim-shop-depth', 'Shop depth', [-8, service], [-8, D], k));
  els.push(dimension('dim-depth', 'Overall building depth', [-15, 0], [-15, D], k));

  els.push(drawingTitle(0, D + 27, '1', 'A-101', 'GROUND FLOOR PLAN', '1/8" = 1\'-0"', k));
  els.push(scaleBar(Math.max(70, L * 0.5), D + 28, 8, k));
  els.push(northArrow(L + 14, D + 27, k));
  els.push({
    id: 'general-note',
    role: 'note',
    name: 'General note',
    marks: [text(0, D + 37, 'NOTE: DIMENSIONS ARE TO WALL CENTRELINES. STOREFRONTS FACE THE STREET (SOUTH). AN ALLEY RUNS ALONG THE WEST SIDE.', 1.2)],
  });
  els.push(...titleBlock(bounds, { project: PROJECT, title: 'GROUND FLOOR PLAN', sheet: 'A-101', scale: '1/8" = 1\'-0"' }, k));

  const snaps: Pt[] = [];
  for (let i = 0; i <= bays; i++) for (const y of [0, service, D]) snaps.push([i * bw, y]);
  return { id: 'A-101', title: 'Ground floor plan', discipline: 'A', scale: { label: '1/8" = 1\'-0"', ftPerInch: 8 }, bounds, elements: els, snaps };
}

function build(params: Record<string, number>): PlanSet {
  const bays = params.bays;
  const bw = params.bay_width;
  const depth = params.shop_depth;
  const service = params.service_width;
  const L = bays * bw;
  const D = service + depth;
  const plan = groundFloor(bays, bw, depth, service);
  const sheets = [coverSheet([{ id: 'G-001', title: 'Cover sheet and sheet index' }, plan], 'A SINGLE-STOREY ROW OF SHOPS (ILLUSTRATIVE)', PROJECT), plan];
  return {
    id: 'retail-strip',
    title: 'Convoy Corner Shops: ground floor (illustrative)',
    params: { ...params },
    sheets,
    facts: {
      bays,
      bay_width: bw,
      shop_depth: depth,
      service_width: service,
      building_length: L,
      building_depth: D,
      gross_sf: L * D,
      tenant_count: bays - 1,
      corner_frontage: 2 * bw,
      corner_sf: 2 * bw * depth,
      inline_sf: bw * depth,
      leasable_sf: L * depth,
      frontage: L,
      service_sf: L * service,
      depth_to_frontage: depth / bw,
    },
  };
}

export const RETAIL_STRIP: PlanSetDef = {
  id: 'retail-strip',
  title: 'Retail ground floor: a row of shops',
  blurb: 'Cover sheet and one ground floor plan: shops with storefronts on the street, a two-bay corner tenant, rear doors onto a service corridor, loading, trash and electrical rooms.',
  defaults: { bays: 6, bay_width: 25, shop_depth: 60, service_width: 8 },
  limits: { bays: [4, 8], bay_width: [20, 30], shop_depth: [50, 80], service_width: [6, 10] },
  build,
};
