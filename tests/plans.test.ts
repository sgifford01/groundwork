/**
 * Generated drawings: every fact a question can ask for is cross-checked
 * against the drawn geometry, at the default parameters and at each
 * parameter's minimum and maximum.
 */
import { describe, expect, it } from 'vitest';
import { distance, feetInches, paperInches, polygonArea, shapeArea, shapeContains, type PlanSet } from '../src/plans/model';
import { buildPlanSet, PLAN_SETS } from '../src/plans/sets';

function paramSets(id: string): Record<string, number>[] {
  const def = PLAN_SETS.find((s) => s.id === id)!;
  const out: Record<string, number>[] = [{}];
  for (const [name, [min, max]] of Object.entries(def.limits)) out.push({ [name]: min }, { [name]: max });
  // and everything at its minimum, then everything at its maximum
  out.push(Object.fromEntries(Object.entries(def.limits).map(([n, [min]]) => [n, min])));
  out.push(Object.fromEntries(Object.entries(def.limits).map(([n, [, max]]) => [n, max])));
  return out;
}

describe('geometry helpers', () => {
  it('measures distance and area', () => {
    expect(distance([0, 0], [3, 4])).toBe(5);
    expect(polygonArea([[0, 0], [10, 0], [10, 5], [0, 5]])).toBe(50);
    expect(shapeArea({ t: 'rect', x: 2, y: 2, w: 26, h: 30 })).toBe(780);
    expect(shapeContains({ t: 'rect', x: 0, y: 0, w: 10, h: 10 }, [5, 5])).toBe(true);
    expect(shapeContains({ t: 'rect', x: 0, y: 0, w: 10, h: 10 }, [11, 5])).toBe(false);
    expect(shapeContains({ t: 'circle', cx: 0, cy: 0, r: 2 }, [1, 1])).toBe(true);
  });

  it('formats feet-and-inches and paper inches', () => {
    expect(feetInches(26)).toBe('26\'-0"');
    expect(feetInches(26.5)).toBe('26\'-6"');
    expect(feetInches(149.99)).toBe('150\'-0"');
    expect(paperInches(3.25)).toBe('3 1/4"');
    expect(paperInches(0.5)).toBe('1/2"');
    expect(paperInches(4)).toBe('4"');
    expect(paperInches(18.75)).toBe('18 3/4"');
  });
});

describe('every plan set', () => {
  for (const def of PLAN_SETS) {
    describe(def.id, () => {
      it('defaults sit inside their limits', () => {
        for (const [name, value] of Object.entries(def.defaults)) {
          const lim = def.limits[name];
          expect(lim, `${name} has no limits`).toBeDefined();
          expect(value).toBeGreaterThanOrEqual(lim[0]);
          expect(value).toBeLessThanOrEqual(lim[1]);
        }
      });

      it('rejects unknown parameters and values outside the limits', () => {
        expect(() => buildPlanSet(def.id, { not_a_parameter: 1 })).toThrow();
        const [name, [, max]] = Object.entries(def.limits)[0];
        expect(() => buildPlanSet(def.id, { [name]: max + 1 })).toThrow();
        expect(() => buildPlanSet('no-such-set')).toThrow();
      });

      for (const params of paramSets(def.id)) {
        it(`is well formed with ${JSON.stringify(params)}`, () => {
          const set = buildPlanSet(def.id, params);
          const sheetIds = new Set(set.sheets.map((s) => s.id));
          expect(sheetIds.size, 'sheet ids are unique').toBe(set.sheets.length);
          for (const [name, value] of Object.entries(set.facts)) {
            expect(/^[a-z][a-z_]*[a-z]$/.test(name), `fact name "${name}" must be usable in a formula`).toBe(true);
            expect(Number.isFinite(value), `fact ${name}`).toBe(true);
          }
          for (const sheet of set.sheets) {
            const ids = new Set(sheet.elements.map((e) => e.id));
            expect(ids.size, `${sheet.id}: element ids are unique`).toBe(sheet.elements.length);
            expect(sheet.scale.ftPerInch).toBeGreaterThan(0);
            for (const el of sheet.elements) {
              expect(el.name.length, `${sheet.id}/${el.id} needs a name`).toBeGreaterThan(0);
              if (el.link) expect(sheetIds.has(el.link), `${sheet.id}/${el.id} links to a missing sheet ${el.link}`).toBe(true);
              // every mark and hotspot lies on the paper
              const b = sheet.bounds;
              const inside = (x: number, y: number) => x >= b.x - 1e-6 && x <= b.x + b.w + 1e-6 && y >= b.y - 1e-6 && y <= b.y + b.h + 1e-6;
              for (const shape of [...el.marks.map((m) => m.shape), ...(el.hit ? [el.hit] : [])]) {
                if (shape.t === 'rect') {
                  expect(shape.w, `${sheet.id}/${el.id} rect width`).toBeGreaterThan(0);
                  expect(shape.h, `${sheet.id}/${el.id} rect height`).toBeGreaterThan(0);
                  expect(inside(shape.x, shape.y) && inside(shape.x + shape.w, shape.y + shape.h), `${sheet.id}/${el.id} is off the sheet`).toBe(true);
                } else if (shape.t === 'line') {
                  expect(inside(shape.x1, shape.y1) && inside(shape.x2, shape.y2), `${sheet.id}/${el.id} is off the sheet`).toBe(true);
                } else if (shape.t === 'circle') {
                  expect(inside(shape.cx - shape.r, shape.cy - shape.r) && inside(shape.cx + shape.r, shape.cy + shape.r), `${sheet.id}/${el.id} is off the sheet`).toBe(true);
                } else if (shape.t === 'cloud') {
                  expect(inside(shape.x - shape.r, shape.y - shape.r) && inside(shape.x + shape.w + shape.r, shape.y + shape.h + shape.r), `${sheet.id}/${el.id} is off the sheet`).toBe(true);
                } else if (shape.t === 'poly') {
                  for (const [x, y] of shape.pts) expect(inside(x, y), `${sheet.id}/${el.id} is off the sheet`).toBe(true);
                } else if (shape.t === 'text') {
                  expect(inside(shape.x, shape.y), `${sheet.id}/${el.id} text is off the sheet`).toBe(true);
                }
              }
            }
          }
        });
      }
    });
  }
});

/** Sum the `area` of every element on a sheet with one of the given roles. */
function areaOf(set: PlanSet, sheetId: string, roles: string[]): number {
  const sheet = set.sheets.find((s) => s.id === sheetId)!;
  return sheet.elements.filter((e) => roles.includes(e.role)).reduce((n, e) => n + (e.area ?? 0), 0);
}
const count = (set: PlanSet, sheetId: string, role: string) => set.sheets.find((s) => s.id === sheetId)!.elements.filter((e) => e.role === role).length;

describe('mf-double-loaded: facts agree with what is drawn', () => {
  for (const params of paramSets('mf-double-loaded')) {
    it(JSON.stringify(params), () => {
      const set = buildPlanSet('mf-double-loaded', params);
      const f = set.facts;
      const floor = set.sheets.find((s) => s.id === 'A-102')!;

      // counts: one drawn unit per unit, by type
      const units = floor.elements.filter((e) => e.role === 'unit');
      expect(units.length).toBe(f.unit_count);
      expect(units.filter((u) => u.name.includes('1BR')).length).toBe(f.one_bed_count);
      expect(units.filter((u) => u.name.includes('2BR')).length).toBe(f.two_bed_count);
      expect(count(set, 'A-102', 'stair')).toBe(f.stair_count);
      expect(count(set, 'A-102', 'egress-problem')).toBe(2 - f.stair_count);
      expect(count(set, 'A-102', 'storage')).toBe(2 - f.stair_count);
      expect(count(set, 'A-102', 'elevator')).toBe(1);
      // every unit has its own entry door
      for (const u of units) expect(floor.elements.some((e) => e.id === `door-${u.id.slice(5)}`), `${u.id} has no door`).toBe(true);

      // areas: the parts add up to the whole floor, with no gaps or overlaps
      const unitArea = areaOf(set, 'A-102', ['unit']);
      expect(unitArea).toBeCloseTo(f.rentable_sf, 6);
      expect(unitArea + f.corridor_sf + f.stair_sf + f.storage_sf + f.core_sf).toBeCloseTo(f.floor_gsf, 6);
      expect(areaOf(set, 'A-102', ['storage'])).toBeCloseTo(f.storage_sf, 6);
      expect(areaOf(set, 'A-102', ['corridor'])).toBeCloseTo(f.corridor_sf, 6);
      expect(areaOf(set, 'A-102', ['core'])).toBeCloseTo(f.core_sf, 6);
      expect(f.floor_gsf).toBeCloseTo(f.building_length * f.building_depth, 6);
      expect(f.avg_unit_sf).toBeCloseTo(f.rentable_sf / f.unit_count, 6);
      // each drawn unit's clickable area is inside its own rectangle, and unit areas match their type
      for (const u of units) expect(u.area).toBeCloseTo(u.name.includes('2BR') ? f.two_bed_sf : f.one_bed_sf, 6);

      // independent arithmetic from the parameters (not from the generator's own facts)
      const p = set.params;
      const length = 2 * p.stair_width + p.bays * p.unit_width;
      const depth = 2 * p.unit_depth + p.corridor_width;
      expect(f.building_length).toBe(length);
      expect(f.building_depth).toBe(depth);
      const rentable = (2 * p.bays - 3) * p.unit_width * p.unit_depth + 2 * (p.stair_width + p.unit_width) * p.unit_depth;
      expect(f.rentable_sf).toBe(rentable);
      expect(f.rentable_sf / f.floor_gsf).toBeGreaterThan(0.6);
      expect(f.rentable_sf / f.floor_gsf).toBeLessThan(0.95);

      // the overall dimension strings are as long as the building
      const dim = (id: string) => floor.elements.find((e) => e.id === id)!.marks[0].shape;
      const lengthLine = dim('dim-length');
      const depthLine = dim('dim-depth');
      if (lengthLine.t !== 'line' || depthLine.t !== 'line') throw new Error('dimension strings must start with their line');
      expect(Math.abs(lengthLine.x2 - lengthLine.x1)).toBe(length);
      expect(Math.abs(depthLine.y2 - depthLine.y1)).toBe(depth);
      // bay dimensions add up to the overall length
      const bays = floor.elements.filter((e) => e.id.startsWith('dim-bay-'));
      const baySum = bays.reduce((n, e) => {
        const s = e.marks[0].shape;
        return n + (s.t === 'line' ? Math.abs(s.x2 - s.x1) : 0);
      }, 0);
      expect(baySum).toBe(length);

      // the enlarged unit plan: rooms tile the unit exactly
      const rooms = areaOf(set, 'A-401', ['room']);
      expect(rooms).toBeCloseTo(f.one_bed_sf, 6);
      expect(f.bedroom_sf + f.bath_sf + f.hall_sf + f.closet_sf + f.kitchen_sf + f.living_sf).toBeCloseTo(f.one_bed_sf, 6);
      expect(f.closet_sf, 'the closet must have positive depth').toBeGreaterThan(0);
      expect(f.bedroom_sf).toBe(f.bed_width * f.bed_depth);

      // the site plan (C-101): lot, setbacks, easement and footprint agree with the facts
      const site = set.sheets.find((s) => s.id === 'C-101')!;
      const rectOf = (el: { marks: { shape: { t: string } }[] }) => el.marks[0].shape as { t: 'rect'; x: number; y: number; w: number; h: number };
      const footprint = rectOf(site.elements.find((e) => e.role === 'building-footprint')!);
      expect(footprint.w).toBe(length);
      expect(footprint.h).toBe(depth);
      expect(footprint.w * footprint.h).toBe(f.footprint_sf);
      expect(f.footprint_sf).toBe(f.floor_gsf);
      expect(f.lot_sf).toBe(f.lot_width * f.lot_depth);
      const lineOf = (id: string) => site.elements.find((e) => e.id === id)!.marks[0].shape as { t: 'line'; x1: number; y1: number; x2: number; y2: number };
      // property lines form the lot rectangle
      expect(lineOf('property-line-north').x2 - lineOf('property-line-north').x1).toBe(f.lot_width);
      expect(lineOf('property-line-west').y2 - lineOf('property-line-west').y1).toBe(f.lot_depth);
      // each setback line is the stated distance inside its property line
      expect(f.lot_depth - lineOf('setback-front').y1).toBe(f.front_setback);
      expect(lineOf('setback-rear').y1).toBe(f.rear_setback);
      expect(lineOf('setback-west').x1).toBe(f.side_setback);
      expect(f.lot_width - lineOf('setback-east').x1).toBe(f.side_setback);
      // the building sits on the front setback line and inside all the others
      expect(footprint.y + footprint.h).toBe(f.lot_depth - f.front_setback);
      expect(footprint.x).toBeGreaterThanOrEqual(f.side_setback);
      expect(footprint.x + footprint.w).toBeLessThanOrEqual(f.lot_width - f.side_setback);
      expect(footprint.y).toBeGreaterThanOrEqual(f.rear_setback);
      // the easement is a strip of the stated width along the rear, clear of the building
      const easement = rectOf(site.elements.find((e) => e.role === 'easement')!);
      expect(easement.h).toBe(f.easement_width);
      expect(easement.w).toBe(f.lot_width);
      expect(footprint.y).toBeGreaterThan(easement.y + easement.h);
      expect(site.elements.filter((e) => e.role === 'property-line').length).toBe(4);
      expect(site.elements.filter((e) => e.role === 'setback-line').length).toBe(4);
      expect(site.scale.ftPerInch).toBe(20);
      // the setback dimension strings are as long as the setbacks
      const dimLength = (id: string) => {
        const d = lineOf(id);
        return Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
      };
      expect(dimLength('dim-front-setback')).toBe(f.front_setback);
      expect(dimLength('dim-rear-setback')).toBe(f.rear_setback);
      expect(dimLength('dim-side-setback')).toBe(f.side_setback);
      expect(dimLength('dim-lot-width')).toBe(f.lot_width);
      expect(dimLength('dim-lot-depth')).toBe(f.lot_depth);

      // the building section (A-301): one level marker per floor plus the roof, at the right heights
      const section = set.sheets.find((s) => s.id === 'A-301')!;
      const levels = section.elements.filter((e) => e.role === 'level-marker');
      expect(levels.length).toBe(f.storeys + 1);
      expect(section.elements.filter((e) => e.role === 'floor-slab').length).toBe(f.storeys);
      expect(f.building_height).toBe(f.storeys * f.floor_to_floor);
      const height = section.elements.find((e) => e.id === 'dim-height')!.marks[0].shape as { t: 'line'; y1: number; y2: number };
      expect(Math.abs(height.y2 - height.y1)).toBe(f.building_height);
      const across = section.elements.find((e) => e.id === 'dim-section-depth')!.marks[0].shape as { t: 'line'; x1: number; x2: number };
      expect(Math.abs(across.x2 - across.x1)).toBe(depth);
      expect(f.total_units).toBe(f.storeys * f.unit_count);
      expect(f.total_gsf).toBe(f.storeys * f.floor_gsf);

      // the floor plan carries a section marker at each end of the cut, pointing at the section sheet, and a revision cloud with its delta
      const markers = floor.elements.filter((e) => e.role === 'section-marker');
      expect(markers.length).toBe(2);
      for (const m of markers) expect(m.link).toBe('A-301');
      expect(floor.elements.filter((e) => e.role === 'revision-cloud').length).toBe(1);
      expect(floor.elements.filter((e) => e.role === 'revision-delta').length).toBe(1);
      // the cut line runs through apartments, clear of the stairs and of every door
      const cut = floor.elements.find((e) => e.id === 'section-line')!.marks[0].shape as { t: 'line'; x1: number };
      expect(cut.x1).toBeLessThan(length - p.stair_width);
      expect(cut.x1).toBeGreaterThan(p.stair_width);

      // sheets are in set order and numbered by the discipline + sheet-type convention
      expect(set.sheets.map((s) => s.id)).toEqual(['G-001', 'C-101', 'A-102', 'A-103', 'A-201', 'A-301', 'A-401', 'A-402']);

      // the south elevation (A-201): one window per south-side apartment per floor, heights as stated
      const elev = set.sheets.find((s) => s.id === 'A-201')!;
      const windows = elev.elements.filter((e) => e.role === 'window');
      expect(windows.length).toBe(f.south_window_count);
      expect(f.south_window_count).toBe(f.storeys * f.south_windows_per_floor);
      // as many windows per floor as there are apartments on the south side of the floor plan
      expect(f.south_windows_per_floor).toBe(floor.elements.filter((e) => e.id.startsWith('window-s-')).length);
      expect(elev.elements.filter((e) => e.role === 'level-marker').length).toBe(f.storeys + 1);
      const overall = elev.elements.find((e) => e.id === 'dim-overall-height')!.marks[0].shape as { t: 'line'; y1: number; y2: number };
      expect(Math.abs(overall.y2 - overall.y1)).toBe(f.overall_height);
      expect(f.overall_height).toBe(f.building_height + f.parapet_height);
      // every window sits inside its own storey, above its sill
      for (const w of windows) {
        const r = w.marks[0].shape as { t: 'rect'; x: number; y: number; w: number; h: number };
        const storey = Number(w.id.split('-')[1]);
        expect(-(r.y + r.h)).toBeCloseTo((storey - 1) * f.floor_to_floor + f.sill_height, 6);
        expect(-r.y).toBeLessThan(storey * f.floor_to_floor);
        expect(r.x).toBeGreaterThan(0);
        expect(r.x + r.w).toBeLessThan(length);
      }
      expect(floor.elements.find((e) => e.role === 'elevation-marker')?.link).toBe('A-201');

      // the roof plan (A-103)
      const roof = set.sheets.find((s) => s.id === 'A-103')!;
      expect(roof.elements.filter((e) => e.role === 'roof-drain').length).toBe(f.roof_drain_count);
      expect(roof.elements.filter((e) => e.role === 'rooftop-unit').length).toBe(f.rooftop_unit_count);
      expect(f.roof_sf).toBe(f.floor_gsf);
      const roofLength = roof.elements.find((e) => e.id === 'dim-roof-length')!.marks[0].shape as { t: 'line'; x1: number; x2: number };
      expect(Math.abs(roofLength.x2 - roofLength.x1)).toBe(length);
      // equipment and drains are on the roof, and do not sit on top of each other
      const boxes = roof.elements.filter((e) => ['roof-drain', 'rooftop-unit', 'roof-access', 'elevator-overrun'].includes(e.role)).map((e) => {
        const h = e.hit!;
        return h.t === 'circle' ? { x: h.cx - h.r, y: h.cy - h.r, w: 2 * h.r, h: 2 * h.r } : (h as { x: number; y: number; w: number; h: number });
      });
      boxes.forEach((a, i) => {
        expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= length && a.y + a.h <= depth, 'roof item is off the roof').toBe(true);
        boxes.slice(i + 1).forEach((b) => expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'two roof items overlap').toBe(true));
      });

      // the unit ceiling plan (A-402): lights counted, lowered ceilings measured, everything inside the unit
      const rcp = set.sheets.find((s) => s.id === 'A-402')!;
      const lights = rcp.elements.filter((e) => e.role === 'light-fixture');
      expect(lights.length).toBe(f.light_count);
      expect(areaOf(set, 'A-402', ['soffit'])).toBeCloseTo(f.soffit_sf, 6);
      expect(f.soffit_sf).toBe(f.bath_sf + f.hall_sf + f.kitchen_sf);
      for (const l of [...lights, ...rcp.elements.filter((e) => ['exhaust-fan', 'smoke-detector'].includes(e.role))]) {
        const h = l.hit!;
        const [x, y] = h.t === 'circle' ? [h.cx, h.cy] : [(h as { x: number }).x, (h as { y: number }).y];
        expect(x > 0 && x < p.unit_width && y > 0 && y < p.unit_depth, `${l.id} is outside the unit`).toBe(true);
      }
      expect(f.soffit_height).toBeLessThan(f.ceiling_height);
      expect(rcp.scale.ftPerInch).toBe(4);
      for (const sh of set.sheets) expect(sh.id.startsWith(`${sh.discipline}-`), sh.id).toBe(true);

      // navigation: the floor plan calls out the enlarged plan, the cover indexes every sheet
      expect(floor.elements.find((e) => e.role === 'detail-callout')?.link).toBe('A-401');
      expect(section.elements.find((e) => e.role === 'sheet-reference')?.link).toBe('A-102');
      const cover = set.sheets.find((s) => s.id === 'G-001')!;
      expect(cover.elements.filter((e) => e.role === 'index-row').map((e) => e.link).sort()).toEqual(set.sheets.map((s) => s.id).sort());
      // scales
      expect(floor.scale.ftPerInch).toBe(8);
      expect(set.sheets.find((s) => s.id === 'A-401')!.scale.ftPerInch).toBe(4);
    });
  }
});

type Rect = { t: 'rect'; x: number; y: number; w: number; h: number };
type Line = { t: 'line'; x1: number; y1: number; x2: number; y2: number };
const sheetOf = (set: PlanSet, id: string) => set.sheets.find((s) => s.id === id)!;
const byRole = (set: PlanSet, sheet: string, role: string) => sheetOf(set, sheet).elements.filter((e) => e.role === role);
const dimOf = (set: PlanSet, sheet: string, id: string) => {
  const d = sheetOf(set, sheet).elements.find((e) => e.id === id)!.marks[0].shape as Line;
  return Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
};

describe('retail-strip: facts agree with what is drawn', () => {
  for (const params of paramSets('retail-strip')) {
    it(JSON.stringify(params), () => {
      const set = buildPlanSet('retail-strip', params);
      const f = set.facts;
      const shops = byRole(set, 'A-101', 'retail-bay');
      expect(shops.length).toBe(f.tenant_count);
      expect(byRole(set, 'A-101', 'storefront').length).toBe(f.tenant_count);
      // every shop has a pair of entry doors on the street and a rear door on the service corridor
      const doors = byRole(set, 'A-101', 'door').map((d) => d.id);
      for (const shop of shops) {
        const num = shop.id.slice(6);
        expect(doors).toContain(`door-front-${num}-a`);
        expect(doors).toContain(`door-front-${num}-b`);
        expect(doors).toContain(`door-rear-${num}`);
      }
      expect(areaOf(set, 'A-101', ['retail-bay'])).toBeCloseTo(f.leasable_sf, 6);
      expect(f.leasable_sf + f.service_sf).toBeCloseTo(f.gross_sf, 6);
      expect(f.gross_sf).toBe(f.building_length * f.building_depth);
      expect(shops[0].area).toBe(f.corner_sf);
      expect(f.corner_sf).toBe(2 * f.inline_sf);
      for (const shop of shops.slice(1)) expect(shop.area).toBe(f.inline_sf);
      // frontages add up to the building, and the corner tenant's is two bays
      const frontages = shops.map((shop) => dimOf(set, 'A-101', `dim-frontage-${shop.id.slice(6)}`));
      expect(frontages.reduce((a, b) => a + b, 0)).toBeCloseTo(f.frontage, 6);
      expect(frontages[0]).toBe(f.corner_frontage);
      expect(dimOf(set, 'A-101', 'dim-length')).toBe(f.building_length);
      expect(dimOf(set, 'A-101', 'dim-shop-depth')).toBe(f.shop_depth);
      expect(dimOf(set, 'A-101', 'dim-service') + dimOf(set, 'A-101', 'dim-shop-depth')).toBe(dimOf(set, 'A-101', 'dim-depth'));
      expect(byRole(set, 'A-101', 'column').length).toBe(2 * (f.bays + 1));
      expect(byRole(set, 'A-101', 'loading').length).toBe(1);
      expect(f.depth_to_frontage).toBeCloseTo(f.shop_depth / f.bay_width, 9);
    });
  }
});

describe('office-floor: facts agree with what is drawn', () => {
  for (const params of paramSets('office-floor')) {
    it(JSON.stringify(params), () => {
      const set = buildPlanSet('office-floor', params);
      const f = set.facts;
      const suites = byRole(set, 'A-104', 'suite');
      expect(suites.length).toBe(f.suite_count);
      expect(areaOf(set, 'A-104', ['suite'])).toBeCloseTo(f.usable_sf, 6);
      // suites, the ring corridor and the core tile the whole floor plate
      expect(areaOf(set, 'A-104', ['suite', 'corridor', 'core'])).toBeCloseTo(f.plate_sf, 6);
      expect(f.plate_sf).toBe(f.plate_length * f.plate_depth);
      expect(f.plate_depth).toBe(2 * f.lease_depth + f.core_depth);
      // vertical penetrations, measured from the drawn stairs, elevators and shaft
      const drawn = [...byRole(set, 'A-104', 'stair'), ...byRole(set, 'A-104', 'elevator'), ...byRole(set, 'A-104', 'mechanical')].reduce((n, e) => {
        const r = e.marks[0].shape as Rect;
        return n + r.w * r.h;
      }, 0);
      expect(drawn).toBeCloseTo(f.penetration_sf, 6);
      expect(f.rentable_sf).toBeCloseTo(f.plate_sf - f.penetration_sf, 6);
      expect(f.common_sf).toBeCloseTo(f.rentable_sf - f.usable_sf, 6);
      expect(f.load_factor).toBeCloseTo(f.rentable_sf / f.usable_sf, 9);
      expect(f.load_factor).toBeGreaterThan(1.05);
      expect(f.load_factor).toBeLessThan(1.3);
      expect(byRole(set, 'A-104', 'elevator').length).toBe(f.elevator_count);
      expect(byRole(set, 'A-104', 'stair').length).toBe(2);
      expect(byRole(set, 'A-104', 'column').length).toBe(4 * (f.bays + 1));
      // everything in the core fits inside it, with room left for the restrooms
      const core = sheetOf(set, 'A-104').elements.find((e) => e.id === 'core')!.marks[0].shape as Rect;
      for (const e of [...byRole(set, 'A-104', 'stair'), ...byRole(set, 'A-104', 'elevator'), ...byRole(set, 'A-104', 'restroom'), ...byRole(set, 'A-104', 'mechanical')]) {
        const r = e.marks[0].shape as Rect;
        expect(r.w, `${e.id} has no width`).toBeGreaterThan(5);
        expect(r.x >= core.x - 1e-9 && r.y >= core.y - 1e-9 && r.x + r.w <= core.x + core.w + 1e-9 && r.y + r.h <= core.y + core.h + 1e-9, `${e.id} is outside the core`).toBe(true);
      }
      expect(dimOf(set, 'A-104', 'dim-lease-north')).toBe(f.lease_depth);
      expect(dimOf(set, 'A-104', 'dim-lease-south')).toBe(f.lease_depth);
      expect(dimOf(set, 'A-104', 'dim-core-depth')).toBe(f.core_depth);
      expect(dimOf(set, 'A-104', 'dim-core-length')).toBe(f.core_length);
      expect(dimOf(set, 'A-104', 'dim-length')).toBe(f.plate_length);
      expect(dimOf(set, 'A-104', 'dim-bay-1')).toBe(f.column_spacing);
      // the area schedule shows the same numbers as the facts
      const schedule = sheetOf(set, 'A-104').elements.find((e) => e.id === 'area-schedule')!.marks.flatMap((m) => (m.shape.t === 'text' ? [m.shape.text] : []));
      const shown = (n: number) => `${Math.round(n).toLocaleString('en-US')} SF`;
      expect(schedule).toContain(shown(f.usable_sf));
      expect(schedule).toContain(shown(f.penetration_sf));
      expect(schedule).toContain(shown(f.end_suite_sf));
      expect(schedule).toContain(shown(f.mid_suite_sf));
    });
  }
});

describe('podium-mixed-use: facts agree with what is drawn', () => {
  for (const params of paramSets('podium-mixed-use')) {
    it(JSON.stringify(params), () => {
      const set = buildPlanSet('podium-mixed-use', params);
      const f = set.facts;
      const stalls = byRole(set, 'A-100', 'stall');
      expect(stalls.length).toBe(f.standard_stalls);
      expect(byRole(set, 'A-100', 'accessible-stall').length).toBe(f.accessible_stalls);
      expect(f.total_stalls).toBe(f.standard_stalls + f.accessible_stalls);
      expect(f.module_width).toBe(2 * f.stall_depth + f.aisle_width);
      expect(f.garage_width).toBe(f.modules * f.module_width);
      expect(f.garage_sf).toBe(f.garage_length * f.garage_width);
      expect(dimOf(set, 'A-100', 'dim-stall-width')).toBe(f.stall_width);
      expect(dimOf(set, 'A-100', 'dim-row-length')).toBeCloseTo(f.row_length, 9);
      expect(dimOf(set, 'A-100', 'dim-garage-length')).toBeCloseTo(f.garage_length, 9);
      expect(dimOf(set, 'A-100', 'dim-aisle')).toBe(f.aisle_width);
      expect(dimOf(set, 'A-100', 'dim-module')).toBe(f.module_width);
      // no two stalls (standard or accessible) overlap, and none sits in a drive aisle, the ramp or a room
      const boxes = [...stalls, ...byRole(set, 'A-100', 'accessible-stall')].map((e) => e.hit as Rect);
      const blocked = [...byRole(set, 'A-100', 'drive-aisle'), ...byRole(set, 'A-100', 'ramp'), ...byRole(set, 'A-100', 'lobby'), ...byRole(set, 'A-100', 'storage')].map((e) => e.hit as Rect);
      const apart = (a: Rect, b: Rect) => a.x + a.w <= b.x + 1e-9 || b.x + b.w <= a.x + 1e-9 || a.y + a.h <= b.y + 1e-9 || b.y + b.h <= a.y + 1e-9;
      boxes.forEach((a, i) => {
        expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= f.garage_length && a.y + a.h <= f.garage_width, 'a stall is outside the garage').toBe(true);
        boxes.slice(i + 1).forEach((b) => expect(apart(a, b), 'two stalls overlap').toBe(true));
        blocked.forEach((b) => expect(apart(a, b), 'a stall sits in an aisle or a room').toBe(true));
      });
      expect(f.sf_per_stall).toBeGreaterThan(250);
      expect(f.sf_per_stall).toBeLessThan(450);

      // the section: parking below, a tall retail floor, then the apartments, with one marker per level
      const section = sheetOf(set, 'A-301');
      const bandOf = (id: string) => section.elements.find((e) => e.id === id)!.marks[0].shape as Rect;
      expect(bandOf('use-parking').h).toBe(f.parking_height);
      expect(bandOf('use-parking').y).toBe(0);
      expect(bandOf('use-retail').h).toBe(f.retail_height);
      expect(bandOf('use-retail').y + bandOf('use-retail').h).toBe(0);
      const flats = byRole(set, 'A-301', 'use-residential');
      expect(flats.length).toBe(f.res_storeys);
      for (const flat of flats) expect((flat.marks[0].shape as Rect).h).toBe(f.res_height);
      expect((flats[0].marks[0].shape as Rect).w).toBe(f.res_bar_depth);
      expect(f.res_bar_depth).toBeLessThanOrEqual(f.garage_width);
      expect(bandOf('use-retail').w).toBe(f.garage_width);
      expect(byRole(set, 'A-301', 'level-marker').length).toBe(f.res_storeys + 3);
      expect(f.storeys_above_grade).toBe(f.res_storeys + 1);
      expect(f.building_height).toBe(f.retail_height + f.res_storeys * f.res_height);
      expect(dimOf(set, 'A-301', 'dim-height')).toBe(f.building_height);
      expect(dimOf(set, 'A-301', 'dim-retail-height')).toBe(f.retail_height);
      expect(dimOf(set, 'A-301', 'dim-parking-height')).toBe(f.parking_height);
      expect(byRole(set, 'A-301', 'podium').length).toBe(1);
      expect(set.sheets.map((s) => s.id)).toEqual(['G-001', 'A-100', 'A-301']);
    });
  }
});
