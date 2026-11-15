/**
 * Drafting helpers shared by every plan generator: the conventional symbols
 * (doors, windows, stairs, grid bubbles, dimension strings, north arrow,
 * graphic scale, callout bubbles, title block) built from basic shapes.
 *
 * `k` is the annotation scale: 1 on a 1/8" = 1'-0" sheet, 0.5 on a 1/4" sheet.
 * Text and symbols are a fixed size ON PAPER, so they are smaller in feet on
 * a larger-scale drawing.
 */
import { feetInches, type Fill, type Mark, type Pen, type PlanElement, type Pt, type Shape } from './model';

export const rect = (x: number, y: number, w: number, h: number, pen: Pen = 'medium', fill: Fill = 'none'): Mark => ({
  shape: { t: 'rect', x, y, w, h },
  pen,
  fill,
});

export const line = (x1: number, y1: number, x2: number, y2: number, pen: Pen = 'thin'): Mark => ({
  shape: { t: 'line', x1, y1, x2, y2 },
  pen,
});

export const circle = (cx: number, cy: number, r: number, pen: Pen = 'thin', fill: Fill = 'paper'): Mark => ({
  shape: { t: 'circle', cx, cy, r },
  pen,
  fill,
});

export const poly = (pts: Pt[], pen: Pen = 'thin', fill: Fill = 'none', closed = true): Mark => ({
  shape: { t: 'poly', pts, closed },
  pen,
  fill,
});

export function text(
  x: number,
  y: number,
  str: string,
  size: number,
  opts: { anchor?: 'start' | 'middle' | 'end'; bold?: boolean; rot?: number } = {},
): Mark {
  return { shape: { t: 'text', x, y, text: str, size, ...opts }, pen: 'none' };
}

export const hitRect = (x: number, y: number, w: number, h: number): Shape => ({ t: 'rect', x, y, w, h });

/**
 * A swing door in a wall.
 * `hinge` is the hinge point on the wall line; `along` is the unit vector from
 * the hinge across the opening; `into` is the unit vector the leaf swings toward.
 */
export function door(id: string, name: string, hinge: Pt, along: Pt, into: Pt, width = 3): PlanElement {
  const [hx, hy] = hinge;
  const leafEnd: Pt = [hx + into[0] * width, hy + into[1] * width];
  const jamb: Pt = [hx + along[0] * width, hy + along[1] * width];
  const deg = (v: Pt) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
  let from = deg(into);
  let to = deg(along);
  if (to - from > 180) to -= 360;
  if (from - to > 180) from -= 360;
  // erase the wall across the opening (a little wider than the wall line)
  const t = 0.45;
  const ex = Math.min(hx, jamb[0]) - Math.abs(into[0]) * t;
  const ey = Math.min(hy, jamb[1]) - Math.abs(into[1]) * t;
  const ew = Math.abs(jamb[0] - hx) + Math.abs(into[0]) * 2 * t;
  const eh = Math.abs(jamb[1] - hy) + Math.abs(into[1]) * 2 * t;
  const bx = Math.min(hx, leafEnd[0], jamb[0]);
  const by = Math.min(hy, leafEnd[1], jamb[1]);
  return {
    id,
    role: 'door',
    name,
    marks: [
      rect(ex, ey, ew, eh, 'none', 'paper'),
      line(hx, hy, leafEnd[0], leafEnd[1], 'medium'),
      { shape: { t: 'arc', cx: hx, cy: hy, r: width, from, to }, pen: 'thin' },
    ],
    hit: hitRect(bx, by, width, width),
  };
}

/** A cased opening: the wall is simply interrupted. */
export function opening(hinge: Pt, along: Pt, width: number): Mark {
  const t = 0.45;
  const horizontal = along[0] !== 0;
  const x = Math.min(hinge[0], hinge[0] + along[0] * width) - (horizontal ? 0 : t);
  const y = Math.min(hinge[1], hinge[1] + along[1] * width) - (horizontal ? t : 0);
  return rect(x, y, horizontal ? width : 2 * t, horizontal ? 2 * t : width, 'none', 'paper');
}

/** A window in a horizontal exterior wall, centred on cx. */
export function windowH(id: string, name: string, cx: number, y: number, width = 6): PlanElement {
  return {
    id,
    role: 'window',
    name,
    marks: [rect(cx - width / 2, y - 0.4, width, 0.8, 'thin', 'paper'), line(cx - width / 2, y, cx + width / 2, y, 'thin')],
    hit: hitRect(cx - width / 2, y - 1.2, width, 2.4),
  };
}

/** A stair: treads, a centre rail and an UP arrow. Deliberately not labelled "STAIR". */
export function stair(id: string, name: string, x: number, y: number, w: number, h: number, k = 1): PlanElement {
  const marks: Mark[] = [rect(x, y, w, h, 'medium')];
  const top = y + Math.min(4.5, h * 0.2);
  const bottom = y + h - Math.min(4.5, h * 0.2);
  for (let ty = top; ty <= bottom + 1e-6; ty += 1) marks.push(line(x, ty, x + w, ty, 'thin'));
  marks.push(rect(x + w / 2 - 0.25, top, 0.5, bottom - top, 'thin', 'paper'));
  const ax = x + w * 0.25;
  marks.push(line(ax, bottom - 0.5, ax, top + 1.5, 'medium'));
  marks.push(poly([[ax, top + 0.4], [ax - 0.7, top + 1.9], [ax + 0.7, top + 1.9]], 'thin', 'solid'));
  marks.push(text(ax, bottom + 1.9 * k + 0.3, 'UP', 1.3 * k, { anchor: 'middle' }));
  marks.push(text(x + w * 0.75, top - 0.8, 'DN', 1.3 * k, { anchor: 'middle' }));
  return { id, role: 'stair', name, marks, hit: hitRect(x + 0.5, y + 0.5, w - 1, h - 1) };
}

/** An elevator shaft: a box with an X. */
export function elevator(id: string, x: number, y: number, w: number, h: number): PlanElement {
  return {
    id,
    role: 'elevator',
    name: 'Elevator',
    marks: [rect(x, y, w, h, 'medium'), line(x, y, x + w, y + h, 'thin'), line(x + w, y, x, y + h, 'thin')],
    hit: hitRect(x, y, w, h),
  };
}

/** A column-grid bubble with its grid line. */
export function gridBubble(id: string, label: string, centre: Pt, lineEnd: Pt, k = 1): PlanElement {
  const r = 2.4 * k;
  const [cx, cy] = centre;
  const dx = lineEnd[0] - cx;
  const dy = lineEnd[1] - cy;
  const len = Math.hypot(dx, dy);
  return {
    id,
    role: 'grid-bubble',
    name: `Grid line ${label}`,
    marks: [
      line(cx + (dx / len) * r, cy + (dy / len) * r, lineEnd[0], lineEnd[1], 'center'),
      circle(cx, cy, r, 'thin', 'paper'),
      text(cx, cy + 0.75 * k, label, 2.1 * k, { anchor: 'middle', bold: true }),
    ],
    hit: { t: 'circle', cx, cy, r: r + 0.4 },
  };
}

/** A dimension string between two points (horizontal or vertical), with tick marks and the length written on it. */
export function dimension(id: string, name: string, a: Pt, b: Pt, k = 1, label?: string): PlanElement {
  const horizontal = Math.abs(a[1] - b[1]) < 1e-9;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const str = label ?? feetInches(len);
  const tick = 0.8 * k;
  const size = 1.45 * k;
  const marks: Mark[] = [line(a[0], a[1], b[0], b[1], 'thin')];
  for (const p of [a, b]) marks.push(line(p[0] - tick, p[1] + tick, p[0] + tick, p[1] - tick, 'medium'));
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  if (horizontal) {
    marks.push(text(mx, my - 0.7 * k, str, size, { anchor: 'middle' }));
    return { id, role: 'dimension', name, marks, hit: hitRect(Math.min(a[0], b[0]), my - 2.6 * k, len, 3.4 * k) };
  }
  marks.push(text(mx - 0.7 * k, my, str, size, { anchor: 'middle', rot: -90 }));
  return { id, role: 'dimension', name, marks, hit: hitRect(mx - 2.6 * k, Math.min(a[1], b[1]), 3.4 * k, len) };
}

export function northArrow(cx: number, cy: number, k = 1): PlanElement {
  const r = 4 * k;
  return {
    id: 'north-arrow',
    role: 'north-arrow',
    name: 'North arrow',
    marks: [
      circle(cx, cy, r, 'thin', 'paper'),
      poly([[cx, cy - r + 0.5 * k], [cx - 1.5 * k, cy + 1.6 * k], [cx, cy + 0.6 * k]], 'thin', 'solid'),
      poly([[cx, cy - r + 0.5 * k], [cx + 1.5 * k, cy + 1.6 * k], [cx, cy + 0.6 * k]], 'thin', 'paper'),
      text(cx, cy - r - 0.8 * k, 'N', 2.2 * k, { anchor: 'middle', bold: true }),
    ],
    hit: { t: 'circle', cx, cy, r: r + 1 },
  };
}

/** A graphic scale: alternating bars marked in feet. `step` is the first division in feet. */
export function scaleBar(x: number, y: number, step: number, k = 1): PlanElement {
  const h = 0.9 * k;
  const stops = [0, step, 2 * step, 4 * step];
  const marks: Mark[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    marks.push(rect(x + stops[i], y, stops[i + 1] - stops[i], h, 'thin', i % 2 === 0 ? 'solid' : 'paper'));
  }
  for (const s of stops) marks.push(text(x + s, y - 0.7 * k, `${s}'`, 1.3 * k, { anchor: 'middle' }));
  return { id: 'scale-bar', role: 'scale-bar', name: 'Graphic scale', marks, hit: hitRect(x - 2 * k, y - 2.6 * k, 4 * step + 4 * k, 4.4 * k) };
}

/** The split circle used for drawing titles and detail callouts: number on top, sheet below. */
export function bubble(cx: number, cy: number, top: string, bottom: string, k = 1): Mark[] {
  const r = 2.9 * k;
  return [
    circle(cx, cy, r, 'medium', 'paper'),
    line(cx - r, cy, cx + r, cy, 'thin'),
    text(cx, cy - 0.5 * k, top, 1.7 * k, { anchor: 'middle', bold: true }),
    text(cx, cy + 1.9 * k, bottom, 1.25 * k, { anchor: 'middle' }),
  ];
}

/** The title under a drawing: bubble, name and scale. */
export function drawingTitle(x: number, y: number, num: string, sheet: string, title: string, scaleLabel: string, k = 1): PlanElement {
  return {
    id: 'drawing-title',
    role: 'drawing-title',
    name: 'Drawing title and scale',
    marks: [
      ...bubble(x + 3 * k, y, num, sheet, k),
      text(x + 7.5 * k, y - 0.4 * k, title, 2.2 * k, { bold: true }),
      line(x + 7.5 * k, y + 0.4 * k, x + 7.5 * k + title.length * 1.45 * k, y + 0.4 * k, 'medium'),
      text(x + 7.5 * k, y + 2.6 * k, `SCALE: ${scaleLabel}`, 1.4 * k),
    ],
    hit: hitRect(x, y - 3.2 * k, 8 * k + title.length * 1.45 * k, 6.4 * k),
  };
}

/** The title block down the right-hand edge of a sheet. */
export function titleBlock(
  bounds: { x: number; y: number; w: number; h: number },
  info: { project: string; title: string; sheet: string; scale: string },
  k = 1,
): PlanElement[] {
  const w = 30 * k;
  const x = bounds.x + bounds.w - w - 2 * k;
  const y = bounds.y + 2 * k;
  const h = bounds.h - 4 * k;
  const cx = x + w / 2;
  const base = y + h;
  return [
    {
      id: 'title-block',
      role: 'title-block',
      name: 'Title block',
      marks: [
        rect(x, y, w, h, 'medium'),
        line(x, base - 30 * k, x + w, base - 30 * k, 'thin'),
        line(x, base - 20 * k, x + w, base - 20 * k, 'thin'),
        line(x, base - 10 * k, x + w, base - 10 * k, 'thin'),
        text(cx, y + 5 * k, info.project, 1.7 * k, { anchor: 'middle', bold: true }),
        text(cx, y + 8 * k, 'SAN DIEGO, CA (ILLUSTRATIVE)', 1.1 * k, { anchor: 'middle' }),
        text(cx, y + 14 * k, 'GENERATED TEACHING DRAWING', 1.1 * k, { anchor: 'middle' }),
        text(cx, y + 16.2 * k, 'NOT FOR CONSTRUCTION', 1.1 * k, { anchor: 'middle' }),
        text(x + 1.5 * k, base - 27.6 * k, 'SHEET TITLE', 0.95 * k),
        text(cx, base - 23.4 * k, info.title, 1.45 * k, { anchor: 'middle', bold: true }),
        text(x + 1.5 * k, base - 17.6 * k, 'SCALE', 0.95 * k),
        text(cx, base - 13.4 * k, info.scale, 1.45 * k, { anchor: 'middle' }),
        text(x + 1.5 * k, base - 7.6 * k, 'SHEET', 0.95 * k),
      ],
      hit: hitRect(x, y, w, h - 10 * k),
    },
    {
      id: 'sheet-number',
      role: 'sheet-number',
      name: 'Sheet number',
      marks: [text(cx, base - 2.6 * k, info.sheet, 4.6 * k, { anchor: 'middle', bold: true })],
      hit: hitRect(x, base - 10 * k, w, 10 * k),
    },
  ];
}

export function border(bounds: { x: number; y: number; w: number; h: number }, k = 1): PlanElement {
  return {
    id: 'border',
    role: 'border',
    name: 'Sheet border',
    marks: [rect(bounds.x + 2 * k, bounds.y + 2 * k, bounds.w - 4 * k, bounds.h - 4 * k, 'medium')],
  };
}

/**
 * A section cut marker: a split bubble (section letter over the sheet it is drawn on)
 * with a solid pointer showing which way the section looks.
 * `look` is a unit vector for the viewing direction.
 */
export function sectionHead(id: string, name: string, cx: number, cy: number, letter: string, sheet: string, look: Pt, k = 1, link?: string): PlanElement {
  const r = 2.9 * k;
  const [lx, ly] = look;
  // the pointer is a triangle whose tip sits beyond the bubble on the viewing side
  const tip: Pt = [cx + lx * r * 1.75, cy + ly * r * 1.75];
  const a: Pt = [cx - ly * r, cy + lx * r];
  const b: Pt = [cx + ly * r, cy - lx * r];
  return {
    id,
    role: 'section-marker',
    name,
    link,
    marks: [poly([a, tip, b], 'thin', 'solid'), ...bubble(cx, cy, letter, sheet, k)],
    hit: { t: 'circle', cx, cy, r: r * 1.4 },
  };
}

/** A revision delta: a small triangle holding the revision number. */
export function revisionDelta(id: string, cx: number, cy: number, num: string, k = 1): PlanElement {
  const h = 2.4 * k;
  return {
    id,
    role: 'revision-delta',
    name: `Revision delta (revision ${num})`,
    marks: [poly([[cx, cy - h * 0.62], [cx - h * 0.62, cy + h * 0.45], [cx + h * 0.62, cy + h * 0.45]], 'medium', 'paper'), text(cx, cy + h * 0.3, num, 1.3 * k, { anchor: 'middle', bold: true })],
    hit: { t: 'circle', cx, cy, r: h * 0.75 },
  };
}

/** An elevation marker: a bubble (drawing number over sheet) with a solid pointer toward the face being viewed. No cut line. */
export function elevationMarker(id: string, name: string, cx: number, cy: number, num: string, sheet: string, look: Pt, k = 1, link?: string): PlanElement {
  const head = sectionHead(id, name, cx, cy, num, sheet, look, k, link);
  return { ...head, role: 'elevation-marker' };
}

/** Level markers down the right-hand side of a section or elevation: a leader, a target and the level's name and height above grade. */
export function levelMarkers(x: number, storeys: number, floorToFloor: number): PlanElement[] {
  const out: PlanElement[] = [];
  for (let i = 0; i <= storeys; i++) {
    const y = -i * floorToFloor;
    const name = i === storeys ? 'ROOF' : `LEVEL ${i + 1}`;
    out.push({
      id: `level-${i === storeys ? 'roof' : i + 1}`,
      role: 'level-marker',
      name: `Level marker: ${name.toLowerCase()}, ${feetInches(i * floorToFloor)} above grade`,
      marks: [line(x + 2, y, x + 30, y, 'center'), circle(x + 31.5, y, 1.5, 'thin', 'paper'), line(x + 30, y, x + 33, y, 'thin'), text(x + 4, y - 0.8, `${name}   EL. +${feetInches(i * floorToFloor)}`, 1.4)],
      hit: hitRect(x + 2, y - 2.8, 31, 3.6),
    });
  }
  return out;
}
