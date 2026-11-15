/**
 * The interactive plan viewer: shows one sheet of a generated plan set as SVG.
 *
 *  - drag to pan; pinch, Ctrl+scroll or the +/- buttons to zoom; "Fit" resets
 *  - sheet tabs switch sheets; callouts and index rows jump to the sheet they reference
 *  - the Measure tool snaps to corners and reports the distance at the sheet's scale
 *  - in pick mode, clicking an element selects it as the answer (hotspot grading)
 *
 * The viewer never decides what is right: it reports the picked element id and
 * the parent question grades it (src/grading/category.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { distance, feetInches, paperInches, polygonArea, sheetById, type Mark, type PlanElement, type PlanSet, type Pt, type Shape } from '../../plans/model';
import './plan.css';

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
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // a new sheet starts fitted, with the ruler cleared
  useEffect(() => {
    setView(fit);
    setPoints([]);
    setClosed(false);
  }, [fit]);

  const toModel = useCallback((clientX: number, clientY: number): Pt => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return [0, 0];
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return [p.x, p.y];
  }, []);

  const pxPerFoot = useCallback((): number => svgRef.current?.getScreenCTM()?.a ?? 1, []);

  const zoomBy = useCallback(
    (factor: number, about?: Pt) => {
      setView((v) => {
        const w = Math.min(fit.w * 1.25, Math.max(fit.w / 14, v.w * factor));
        const f = w / v.w;
        const [ax, ay] = about ?? [v.x + v.w / 2, v.y + v.h / 2];
        return { x: ax - (ax - v.x) * f, y: ay - (ay - v.y) * f, w, h: v.h * f };
      });
    },
    [fit.w],
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

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
    suppressClick.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    suppressClick.current = true;
    const s = pxPerFoot();
    setView({ ...d.view, x: d.view.x - dx / s, y: d.view.y - dy / s });
  }
  function onPointerUp() {
    drag.current = null;
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
    if (tool === 'area') {
      setPoints((prev) => {
        if (closed) return [p]; // a finished shape: the next click starts a new one
        // clicking the first corner again closes the shape
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

  function onKeyDown(e: ReactKeyboardEvent) {
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
    <div className="plan">
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
          {tool !== 'none' && (
            <button type="button" className={`btn small${measuring ? ' primary' : ''}`} aria-pressed={measuring} onClick={() => { setMeasuring((m) => !m); setPoints([]); setClosed(false); }}>
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
        aria-label={`Drawing ${sheet.id}: ${sheet.title}. Arrow keys pan, plus and minus zoom, 0 fits. Tab moves through the clickable elements.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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
        <g>
          {hits.map((el, i) => {
            const cls = ['plan-hit'];
            if (el.link) cls.push('link');
            const key = keyOf(el);
            if (highlight.includes(key)) cls.push('hl');
            if (selected.includes(key)) cls.push('sel');
            if (reveal?.good.includes(key)) cls.push('good');
            if (reveal?.bad.includes(key)) cls.push('bad');
            const interactive = (pick && !reveal) || Boolean(el.link);
            // before grading, names would give answers away, so elements are only numbered
            const label = reveal ? el.name : el.link && !pick ? `Go to sheet ${el.link}` : `Drawing element ${i + 1}`;
            return (
              <HitShape
                key={el.id}
                shape={el.hit!}
                className={cls.join(' ')}
                strokeWidth={ui * 0.35}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? 'button' : undefined}
                aria-label={label}
                aria-pressed={pick && !reveal ? selected.includes(key) : undefined}
                onClick={() => activate(el)}
                onKeyDown={(e: ReactKeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    activate(el);
                  }
                }}
              >
                {reveal && <title>{el.name}</title>}
              </HitShape>
            );
          })}
        </g>
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
                : 'Click the drawing to answer.'}
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
