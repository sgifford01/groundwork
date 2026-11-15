/**
 * The interactive plan viewer: shows one sheet of a generated plan set as SVG.
 *
 *  - drag to pan; pinch (trackpad or two fingers), Ctrl+scroll or the +/- buttons to zoom; "Fit" resets
 *  - sheet tabs switch sheets; callouts and index rows jump to the sheet they reference
 *  - the Measure tool snaps to corners and reports the distance at the sheet's scale
 *  - in pick mode, clicking an element selects it as the answer (hotspot grading)
 *
 * Without a pointer: Tab moves through the clickable elements in reading order
 * (top to bottom, left to right) and Enter picks; a focused element is panned
 * (and if tiny, zoomed) into view. "List elements" lists the same elements as
 * buttons described by position. While measuring, snap points can be chosen
 * from a list and placed with Enter. Selected, right and wrong elements differ
 * in line pattern and carry a tick or cross, not only in colour.
 *
 * The viewer never decides what is right: it reports the picked element id and
 * the parent question grades it (src/grading/category.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { distance, feetInches, paperInches, polygonArea, sheetById, type Mark, type PlanElement, type PlanSet, type PlanSheet, type Pt, type Shape } from '../../plans/model';
import './plan.css';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The bounding box of a hotspot. */
function boxOf(s: Shape): Box {
  if (s.t === 'rect' || s.t === 'cloud') return { x: s.x, y: s.y, w: s.w, h: s.h };
  if (s.t === 'circle' || s.t === 'arc') return { x: s.cx - s.r, y: s.cy - s.r, w: 2 * s.r, h: 2 * s.r };
  if (s.t === 'line') return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
  if (s.t === 'poly') {
    const xs = s.pts.map((p) => p[0]);
    const ys = s.pts.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  return { x: s.x, y: s.y, w: 0, h: 0 };
}

/** Elements in reading order: rows from the top of the sheet down, left to right within a row. */
function readingOrder(sheet: PlanSheet, els: PlanElement[]): PlanElement[] {
  const band = Math.max(3, sheet.bounds.h / 30);
  const row = (b: Box) => Math.floor((b.y + b.h / 2 - sheet.bounds.y) / band);
  return els
    .map((el) => ({ el, b: boxOf(el.hit!) }))
    .sort((p, q) => row(p.b) - row(q.b) || p.b.x + p.b.w / 2 - (q.b.x + q.b.w / 2))
    .map((o) => o.el);
}

interface GridLine {
  at: number;
  label: string;
}

/** The column grid drawn on a sheet (from its grid bubbles), for describing where things are. */
function gridLinesOf(sheet: PlanSheet): { v: GridLine[]; h: GridLine[] } {
  const v: GridLine[] = [];
  const h: GridLine[] = [];
  for (const el of sheet.elements) {
    if (el.role !== 'grid-bubble') continue;
    const ln = el.marks.find((m) => m.shape.t === 'line')?.shape;
    const tx = el.marks.find((m) => m.shape.t === 'text')?.shape;
    if (ln?.t !== 'line' || tx?.t !== 'text') continue;
    if (Math.abs(ln.x1 - ln.x2) < 1e-6) v.push({ at: ln.x1, label: tx.text });
    else if (Math.abs(ln.y1 - ln.y2) < 1e-6) h.push({ at: ln.y1, label: tx.text });
  }
  return { v, h };
}

/** A neutral description of a point: how far across and down the sheet, and the nearest grid lines if it is inside the grid. Never the element's name. */
function describePlace(sheet: PlanSheet, grids: { v: GridLine[]; h: GridLine[] }, [x, y]: Pt): string {
  const b = sheet.bounds;
  const where = `${Math.round(((x - b.x) / b.w) * 100)}% across, ${Math.round(((y - b.y) / b.h) * 100)}% down`;
  if (!grids.v.length || !grids.h.length) return where;
  const nearest = (lines: GridLine[], at: number) => lines.reduce((best, l) => (Math.abs(l.at - at) < Math.abs(best.at - at) ? l : best));
  const vs = grids.v.map((l) => l.at);
  const hs = grids.h.map((l) => l.at);
  const inside = x >= Math.min(...vs) - 4 && x <= Math.max(...vs) + 4 && y >= Math.min(...hs) - 4 && y <= Math.max(...hs) + 4;
  return inside ? `near grid ${nearest(grids.v, x).label}/${nearest(grids.h, y).label}, ${where}` : where;
}

const PEN_WIDTH: Record<string, number> = { wall: 0.6, medium: 0.22, thin: 0.09, dash: 0.14, center: 0.07, phantom: 0.16, none: 0 };

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlanViewerProps {
  set: PlanSet;
  sheetId: string;
  onSheetChange: (id: string) => void;
  /** Clicking an element selects it as the answer. */
  pick?: boolean;
  /** How many elements the answer needs. With 1, a new click replaces the old one. */
  pickCount?: number;
  /** Selected elements, as "<sheet>/<element id>" keys (element ids repeat between sheets). */
  selected?: string[];
  onPick?: (keys: string[]) => void;
  /** Keys ("<sheet>/<element id>") to outline before grading (for "what is this?" questions). */
  highlight?: string[];
  /** After grading: keys to show as right and wrong. Also turns on element names. */
  reveal?: { good: string[]; bad: string[] } | null;
  /** The ruler: real feet, inches on paper, an area tool (click the corners of a shape), or none. */
  tool?: 'real' | 'paper' | 'area' | 'none';
}

function arcPath(s: Extract<Shape, { t: 'arc' }>): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = s.cx + s.r * Math.cos(rad(s.from));
  const y1 = s.cy + s.r * Math.sin(rad(s.from));
  const x2 = s.cx + s.r * Math.cos(rad(s.to));
  const y2 = s.cy + s.r * Math.sin(rad(s.to));
  return `M${x1} ${y1} A${s.r} ${s.r} 0 0 ${s.to > s.from ? 1 : 0} ${x2} ${y2}`;
}

/** A scalloped outline: semicircular bumps marching clockwise round a rectangle. */
function cloudPath(s: Extract<Shape, { t: 'cloud' }>): string {
  const corners: Pt[] = [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]];
  let d = `M${s.x} ${s.y}`;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = corners[i];
    const [x2, y2] = corners[(i + 1) % 4];
    const length = Math.hypot(x2 - x1, y2 - y1);
    const bumps = Math.max(2, Math.round(length / (2 * s.r)));
    const r = length / bumps / 2;
    for (let b = 1; b <= bumps; b++) d += ` A${r} ${r} 0 0 1 ${x1 + ((x2 - x1) * b) / bumps} ${y1 + ((y2 - y1) * b) / bumps}`;
  }
  return `${d} Z`;
}

function MarkView({ mark, k }: { mark: Mark; k: number }) {
  const s = mark.shape;
  const cls = `pen-${mark.pen} fill-${mark.fill ?? 'none'}`;
  const sw = PEN_WIDTH[mark.pen] * k;
  if (s.t === 'rect') return <rect className={cls} x={s.x} y={s.y} width={s.w} height={s.h} strokeWidth={sw} />;
  if (s.t === 'line') return <line className={cls} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={sw} />;
  if (s.t === 'circle') return <circle className={cls} cx={s.cx} cy={s.cy} r={s.r} strokeWidth={sw} />;
  if (s.t === 'arc') return <path className={`pen-${mark.pen} fill-none`} d={arcPath(s)} strokeWidth={sw} />;
  if (s.t === 'cloud') return <path className={`pen-${mark.pen} fill-none`} d={cloudPath(s)} strokeWidth={sw} />;
  if (s.t === 'poly') {
    const pts = s.pts.map((p) => p.join(',')).join(' ');
    return s.closed === false ? (
      <polyline className={cls} points={pts} strokeWidth={sw} />
    ) : (
      <polygon className={cls} points={pts} strokeWidth={sw} />
    );
  }
  return (
    <text
      className="plan-text"
      x={s.x}
      y={s.y}
      fontSize={s.size}
      textAnchor={s.anchor ?? 'start'}
      fontWeight={s.bold ? 700 : 400}
      transform={s.rot ? `rotate(${s.rot} ${s.x} ${s.y})` : undefined}
    >
      {s.text}
    </text>
  );
}

function HitShape({ shape, ...rest }: { shape: Shape } & React.SVGProps<SVGElement>) {
  if (shape.t === 'rect' || shape.t === 'cloud') return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={0.4} {...(rest as React.SVGProps<SVGRectElement>)} />;
  if (shape.t === 'circle') return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...(rest as React.SVGProps<SVGCircleElement>)} />;
  if (shape.t === 'poly') return <polygon points={shape.pts.map((p) => p.join(',')).join(' ')} {...(rest as React.SVGProps<SVGPolygonElement>)} />;
  return null;
}

const NONE: string[] = [];

export function PlanViewer({ set, sheetId, onSheetChange, pick = false, pickCount = 1, selected = NONE, onPick, highlight = [], reveal = null, tool = 'real' }: PlanViewerProps) {
  const sheet = sheetById(set, sheetId) ?? set.sheets[0];
  const k = sheet.scale.ftPerInch / 8;
  const fit = useMemo<View>(() => ({ ...sheet.bounds }), [sheet]);
  const [view, setView] = useState<View>(fit);
  const [measuring, setMeasuring] = useState(false);
  const [points, setPoints] = useState<Pt[]>([]);
  const [closed, setClosed] = useState(false); // area tool: the outline has been closed
  const [listOpen, setListOpen] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null); // the element a list button refers to, outlined on the drawing
  const [snapFocus, setSnapFocus] = useState<number | null>(null); // the snap point a keyboard-ruler button refers to, ringed on the drawing
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; view: View; mid: Pt } | null>(null);
  const suppressClick = useRef(false);

  // a new sheet starts fitted, with the ruler cleared
  useEffect(() => {
    setView(fit);
    setPoints([]);
    setClosed(false);
    setSnapFocus(null);
    setFocusKey(null);
  }, [fit]);

  const toModel = useCallback((clientX: number, clientY: number): Pt => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return [0, 0];
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return [p.x, p.y];
  }, []);

  const pxPerFoot = useCallback((): number => svgRef.current?.getScreenCTM()?.a ?? 1, []);

  const minW = fit.w / 14;
  const maxW = fit.w * 1.25;

  const zoomBy = useCallback(
    (factor: number, about?: Pt) => {
      setView((v) => {
        const w = Math.min(maxW, Math.max(minW, v.w * factor));
        const f = w / v.w;
        const [ax, ay] = about ?? [v.x + v.w / 2, v.y + v.h / 2];
        return { x: ax - (ax - v.x) * f, y: ay - (ay - v.y) * f, w, h: v.h * f };
      });
    },
    [minW, maxW],
  );

  /** Keyboard focus on an element: pan it into view, and zoom in if it would be smaller than 24 px on screen. */
  const bringIntoView = useCallback(
    (el: PlanElement) => {
      const svg = svgRef.current;
      if (!svg || !el.hit) return;
      const b = boxOf(el.hit);
      const pxW = svg.clientWidth || 1;
      const pxH = svg.clientHeight || 1;
      setView((v) => {
        const scale = Math.min(pxW / v.w, pxH / v.h);
        const size = Math.max(b.w, b.h) * scale;
        const inside = b.x >= v.x && b.y >= v.y && b.x + b.w <= v.x + v.w && b.y + b.h <= v.y + v.h;
        if (inside && size >= 24) return v;
        let f = 1;
        if (size < 24) f = Math.max(size / 24, minW / v.w);
        if (b.w * 1.2 > v.w * f || b.h * 1.2 > v.h * f) f = Math.min(maxW / v.w, Math.max((b.w * 1.2) / v.w, (b.h * 1.2) / v.h));
        const w = v.w * f;
        const h = v.h * f;
        return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
      });
    },
    [minW, maxW],
  );

  // pinch / Ctrl+scroll zooms about the pointer (a plain scroll still scrolls the page)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(Math.exp(e.deltaY * 0.01), toModel(e.clientX, e.clientY));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomBy, toModel]);

  // one pointer drags; two (fingers on a touch screen) pinch to zoom about their midpoint
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, view, mid: toModel((a.x + b.x) / 2, (a.y + b.y) / 2) };
      drag.current = null;
      suppressClick.current = true;
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
    suppressClick.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = pinch.current;
    if (p && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const w = Math.min(maxW, Math.max(minW, p.view.w * (p.dist / d)));
      const f = w / p.view.w;
      const [mx, my] = p.mid;
      setView({ x: mx - (mx - p.view.x) * f, y: my - (my - p.view.y) * f, w, h: p.view.h * f });
      return;
    }
    const dr = drag.current;
    if (!dr) return;
    const dx = e.clientX - dr.x;
    const dy = e.clientY - dr.y;
    if (!dr.moved && Math.hypot(dx, dy) < 5) return;
    dr.moved = true;
    suppressClick.current = true;
    const s = pxPerFoot();
    setView({ ...dr.view, x: dr.view.x - dx / s, y: dr.view.y - dy / s });
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
  }

  /** Place a ruler point that is already exact (snapped). `reach` is how close counts as "the first corner again". */
  function placePoint(p: Pt, reach: number) {
    if (tool === 'area') {
      setPoints((prev) => {
        if (closed) return [p]; // a finished shape: the next point starts a new one
        // the first corner again closes the shape
        if (prev.length >= 3 && distance(prev[0], p) < reach) {
          setClosed(true);
          return prev;
        }
        return [...prev, p];
      });
      if (closed) setClosed(false);
      return;
    }
    setPoints((prev) => (prev.length >= 2 ? [p] : [...prev, p]));
  }

  function addMeasurePoint(clientX: number, clientY: number) {
    let p = toModel(clientX, clientY);
    const reach = 10 / pxPerFoot();
    let best = reach;
    for (const s of sheet.snaps) {
      const d = distance(s, p);
      if (d < best) {
        best = d;
        p = s;
      }
    }
    placePoint(p, reach);
  }

  // capture phase: while measuring, every click places a ruler point instead of picking
  function onClickCapture(e: React.MouseEvent) {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      return;
    }
    if (measuring) {
      e.stopPropagation();
      addMeasurePoint(e.clientX, e.clientY);
    }
  }

  const keyOf = (el: PlanElement) => `${sheet.id}/${el.id}`;

  function activate(el: PlanElement) {
    const key = keyOf(el);
    if (pick && !reveal) {
      if (selected.includes(key)) onPick?.(selected.filter((k) => k !== key));
      else if (pickCount <= 1) onPick?.([key]);
      else if (selected.length < pickCount) onPick?.([...selected, key]);
    } else if (el.link) onSheetChange(el.link);
  }

  /** Escape: jump from the drawing to whatever comes after the viewer, instead of tabbing through every element. */
  function leaveDrawing() {
    const root = rootRef.current;
    if (!root) return;
    const focusable = document.querySelectorAll<HTMLElement | SVGElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const next = [...focusable].find((n) => !root.contains(n) && root.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
    next?.focus();
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      leaveDrawing();
      return;
    }
    const step = view.w * 0.1;
    if (e.key === 'ArrowLeft') setView((v) => ({ ...v, x: v.x - step }));
    else if (e.key === 'ArrowRight') setView((v) => ({ ...v, x: v.x + step }));
    else if (e.key === 'ArrowUp') setView((v) => ({ ...v, y: v.y - step }));
    else if (e.key === 'ArrowDown') setView((v) => ({ ...v, y: v.y + step }));
    else if (e.key === '+' || e.key === '=') zoomBy(0.8);
    else if (e.key === '-') zoomBy(1.25);
    else if (e.key === '0') setView(fit);
    else return;
    e.preventDefault();
  }

  const hits = sheet.elements.filter((el) => el.hit);
  const isInteractive = (el: PlanElement) => (pick && !reveal) || Boolean(el.link);
  // elements in reading order, numbered: the numbers name them for keyboard and screen-reader users before grading
  const ordered = useMemo(() => readingOrder(sheet, sheet.elements.filter((el) => el.hit)), [sheet]);
  const numberOf = useMemo(() => new Map(ordered.map((el, i) => [el.id, i + 1])), [ordered]);
  const grids = useMemo(() => gridLinesOf(sheet), [sheet]);
  const placeOf = (el: PlanElement) => {
    const b = boxOf(el.hit!);
    return describePlace(sheet, grids, [b.x + b.w / 2, b.y + b.h / 2]);
  };
  const verdict = (key: string) => (reveal?.good.includes(key) ? 'good' : reveal?.bad.includes(key) ? 'bad' : null);
  const labelOf = (el: PlanElement): string => {
    const key = keyOf(el);
    if (reveal) {
      const v = verdict(key);
      return `${el.name}${v === 'good' ? ' (a right answer)' : v === 'bad' ? ' (not a right answer)' : ''}`;
    }
    if (el.link && !pick) return `Go to sheet ${el.link}`;
    return `Drawing element ${numberOf.get(el.id)}`;
  };
  const listed = ordered.filter((el) => isInteractive(el) || Boolean(reveal));

  // snap points for placing the ruler from the keyboard, top to bottom and left to right, measured from the top-left one
  const snapList = useMemo(() => {
    const seen = new Set<string>();
    const pts = [...sheet.snaps].filter((p) => {
      const key = `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    pts.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
    const ox = Math.min(...pts.map((p) => p[0]));
    const oy = Math.min(...pts.map((p) => p[1]));
    return pts.map((p, i) => ({ p, label: `Point ${i + 1}: ${feetInches(p[0] - ox)} across, ${feetInches(p[1] - oy)} down` }));
  }, [sheet]);
  const ringed = snapFocus !== null ? snapList[snapFocus]?.p : undefined;

  const selectedEl = selected.length === 1 ? hits.find((el) => `${sheet.id}/${el.id}` === selected[0]) : undefined;
  const measured = tool !== 'area' && points.length === 2 ? distance(points[0], points[1]) : null;
  const readout =
    tool === 'area'
      ? closed
        ? `${Math.round(polygonArea(points)).toLocaleString('en-US')} SF`
        : null
      : measured === null
        ? null
        : tool === 'paper'
          ? `${paperInches(measured / sheet.scale.ftPerInch)} on paper`
          : feetInches(measured);
  const centre: Pt | null = points.length ? [points.reduce((n, q) => n + q[0], 0) / points.length, points.reduce((n, q) => n + q[1], 0) / points.length] : null;
  const ui = view.w / 100; // sizes for overlay graphics, so they look the same at any zoom

  return (
    <div className="plan" ref={rootRef}>
      <div className="plan-bar">
        <div className="plan-tabs" role="tablist" aria-label="Sheets in this plan set">
          {set.sheets.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === sheet.id} className={s.id === sheet.id ? 'on' : ''} onClick={() => onSheetChange(s.id)} title={s.title}>
              {s.id}
            </button>
          ))}
        </div>
        <span className="plan-sheet-title">
          {sheet.title} · scale {sheet.scale.label}
        </span>
        <div className="plan-tools">
          {listed.length > 0 && (
            <button type="button" className={`btn small${listOpen ? ' primary' : ''}`} aria-expanded={listOpen} onClick={() => setListOpen((o) => !o)}>
              List elements
            </button>
          )}
          {tool !== 'none' && (
            <button
              type="button"
              className={`btn small${measuring ? ' primary' : ''}`}
              aria-pressed={measuring}
              onClick={() => {
                setMeasuring((m) => !m);
                setPoints([]);
                setClosed(false);
              }}
            >
              {tool === 'area' ? 'Measure area' : 'Measure'}
            </button>
          )}
          <button type="button" className="btn small" onClick={() => zoomBy(0.7)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="btn small" onClick={() => zoomBy(1 / 0.7)} aria-label="Zoom out">
            −
          </button>
          <button type="button" className="btn small" onClick={() => setView(fit)}>
            Fit
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        className={`plan-svg${measuring ? ' measuring' : ''}${pick && !reveal ? ' picking' : ''}`}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        tabIndex={0}
        role="group"
        aria-label={`Drawing ${sheet.id}: ${sheet.title}. Arrow keys pan, plus and minus zoom, 0 fits. Tab moves through the clickable elements, top to bottom and left to right; Escape leaves the drawing.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
      >
        <defs>
          <pattern id="plan-hatch" width={1.6 * k} height={1.6 * k} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2={1.6 * k} className="plan-hatch-line" strokeWidth={0.12 * k} />
          </pattern>
        </defs>
        <rect className="plan-paper" x={sheet.bounds.x} y={sheet.bounds.y} width={sheet.bounds.w} height={sheet.bounds.h} />
        <g className="plan-ink">
          {sheet.elements.map((el) => (
            <g key={el.id}>
              {el.marks.map((m, i) => (
                <MarkView key={i} mark={m} k={k} />
              ))}
            </g>
          ))}
        </g>
        {/* The keyboard layer: the same hotspots in reading order, so Tab goes top to bottom and left to right.
            It never takes the mouse (the layer above does), so click targets stay exactly as drawn. */}
        <g className="plan-keys">
          {ordered.map((el) => {
            if (!isInteractive(el)) return null;
            const key = keyOf(el);
            return (
              <HitShape
                key={el.id}
                shape={el.hit!}
                className="plan-key"
                tabIndex={0}
                role="button"
                aria-label={labelOf(el)}
                aria-pressed={pick && !reveal ? selected.includes(key) : undefined}
                onFocus={() => bringIntoView(el)}
                onKeyDown={(e: ReactKeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    activate(el);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    leaveDrawing();
                  }
                }}
              />
            );
          })}
        </g>
        {/* The pointer layer: hotspots in drawing order (later elements on top), with the visible states. */}
        <g aria-hidden="true">
          {hits.map((el) => {
            const cls = ['plan-hit'];
            if (el.link) cls.push('link');
            const key = keyOf(el);
            if (highlight.includes(key)) cls.push('hl');
            if (selected.includes(key)) cls.push('sel');
            const v = verdict(key);
            if (v) cls.push(v);
            if (focusKey === key) cls.push('focus');
            return (
              <HitShape key={el.id} shape={el.hit!} className={cls.join(' ')} onClick={() => activate(el)}>
                {reveal && <title>{el.name}</title>}
              </HitShape>
            );
          })}
        </g>
        {/* After grading: a tick or a cross on each element that was right or wrong, so the result never depends on colour alone. */}
        {reveal && (
          <g className="plan-verdicts" pointerEvents="none" aria-hidden="true">
            {hits.map((el) => {
              const v = verdict(keyOf(el));
              if (!v) return null;
              const b = boxOf(el.hit!);
              const r = ui * 1.3;
              return (
                <g key={el.id} className={v}>
                  <circle cx={b.x} cy={b.y} r={r} strokeWidth={ui * 0.25} />
                  <text x={b.x} y={b.y + r * 0.42} fontSize={r * 1.3} textAnchor="middle">
                    {v === 'good' ? '✓' : '✗'}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        {measuring && ringed && (
          <g className="plan-measure" pointerEvents="none">
            <circle className="plan-snap-ring" cx={ringed[0]} cy={ringed[1]} r={ui * 1.4} strokeWidth={ui * 0.3} />
          </g>
        )}
        {points.length > 0 && (
          <g className="plan-measure" pointerEvents="none">
            {tool === 'area' ? (
              closed ? (
                <polygon className="plan-area" points={points.map((q) => q.join(',')).join(' ')} strokeWidth={ui * 0.3} />
              ) : (
                points.length > 1 && <polyline className="plan-area-open" points={points.map((q) => q.join(',')).join(' ')} strokeWidth={ui * 0.3} />
              )
            ) : (
              points.length === 2 && <line x1={points[0][0]} y1={points[0][1]} x2={points[1][0]} y2={points[1][1]} strokeWidth={ui * 0.3} />
            )}
            {points.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={ui * 0.7} />
            ))}
            {readout && centre && (
              <text x={centre[0]} y={centre[1] - (tool === 'area' ? 0 : ui * 1.2)} fontSize={ui * 2.2} textAnchor="middle">
                {readout}
              </text>
            )}
          </g>
        )}
      </svg>

      {measuring && snapList.length > 0 && (
        <div className="plan-list" role="group" aria-label="Ruler points">
          <p className="small muted">
            Ruler from the keyboard: Tab to a snap point and press Enter to place a ruler point there
            {tool === 'area' ? ', corner by corner, then the first corner again (or Close the shape)' : ' (two points measure a distance)'}. Distances are from
            the top-left snap point.
          </p>
          <div className="row" style={{ marginBottom: 6 }}>
            {tool === 'area' && points.length >= 3 && !closed && (
              <button type="button" className="btn small" onClick={() => setClosed(true)}>
                Close the shape
              </button>
            )}
            <button
              type="button"
              className="btn small ghost"
              onClick={() => {
                setPoints([]);
                setClosed(false);
              }}
            >
              Clear the ruler
            </button>
          </div>
          <ol>
            {snapList.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="plan-list-item"
                  onClick={() => placePoint(s.p, 1e-6)}
                  onFocus={() => setSnapFocus(i)}
                  onBlur={() => setSnapFocus((f) => (f === i ? null : f))}
                  onMouseEnter={() => setSnapFocus(i)}
                  onMouseLeave={() => setSnapFocus((f) => (f === i ? null : f))}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {listOpen && listed.length > 0 && (
        <div className="plan-list">
          <p className="small muted">
            The clickable parts of {sheet.id}, top to bottom and left to right.
            {pick && !reveal ? ' Choose one to select it as your answer; choose it again to unselect it.' : ''}
          </p>
          <ol>
            {listed.map((el) => {
              const key = keyOf(el);
              const v = verdict(key);
              const sel = selected.includes(key);
              return (
                <li key={el.id}>
                  <button
                    type="button"
                    className={`plan-list-item${sel ? ' sel' : ''}${v ? ` ${v}` : ''}`}
                    aria-pressed={pick && !reveal ? sel : undefined}
                    disabled={!isInteractive(el)}
                    onClick={() => activate(el)}
                    onFocus={() => {
                      setFocusKey(key);
                      bringIntoView(el);
                    }}
                    onBlur={() => setFocusKey((f) => (f === key ? null : f))}
                    onMouseEnter={() => setFocusKey(key)}
                    onMouseLeave={() => setFocusKey((f) => (f === key ? null : f))}
                  >
                    <span aria-hidden="true" className="plan-list-mark">
                      {v === 'good' ? '✓' : v === 'bad' ? '✗' : sel ? '●' : ''}
                    </span>
                    {reveal ? labelOf(el) : el.link && !pick ? `Go to sheet ${el.link} (${placeOf(el)})` : `Element ${numberOf.get(el.id)}: ${placeOf(el)}`}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="plan-status" aria-live="polite">
        {measuring ? (
          <span>
            <strong>Measure:</strong>{' '}
            {readout ??
              (tool === 'area'
                ? points.length === 0
                  ? 'click each corner of the shape in turn, then click the first corner again to close it'
                  : `${points.length} corner${points.length === 1 ? '' : 's'} placed; click the first corner again to close the shape`
                : points.length === 1
                  ? 'click the second point'
                  : 'click two points (the ruler snaps to corners)')}
          </span>
        ) : pick && !reveal ? (
          <span>
            {pickCount > 1
              ? `${selected.length} of ${pickCount} selected. Click a selected element again to unselect it.`
              : selectedEl
                ? 'One element selected. Click another to change it.'
                : 'Click the drawing to answer (or Tab to an element and press Enter, or use List elements).'}
            {selectedEl?.link && (
              <button type="button" className="btn small ghost" style={{ marginLeft: 8 }} onClick={() => onSheetChange(selectedEl.link!)}>
                Open sheet {selectedEl.link}
              </button>
            )}
          </span>
        ) : (
          <span>Callouts and index rows open the sheet they reference.</span>
        )}
        <span className="muted">Drag to pan · pinch or Ctrl+scroll to zoom</span>
      </div>
    </div>
  );
}
