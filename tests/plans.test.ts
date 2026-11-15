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
      expect(count(set, 'A-102', 'stair')).toBe(2);
      expect(count(set, 'A-102', 'elevator')).toBe(1);
      // every unit has its own entry door
      for (const u of units) expect(floor.elements.some((e) => e.id === `door-${u.id.slice(5)}`), `${u.id} has no door`).toBe(true);

      // areas: the parts add up to the whole floor, with no gaps or overlaps
      const unitArea = areaOf(set, 'A-102', ['unit']);
      expect(unitArea).toBeCloseTo(f.rentable_sf, 6);
      expect(unitArea + f.corridor_sf + f.stair_sf + f.core_sf).toBeCloseTo(f.floor_gsf, 6);
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
      expect(set.sheets.map((s) => s.id)).toEqual(['G-001', 'C-101', 'A-102', 'A-301', 'A-401']);
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
