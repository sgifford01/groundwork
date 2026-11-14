/**
 * Dashboard charts. All single-series, so one hue carries the data and text
 * stays in the normal text colours. Each chart has a hover readout and a
 * plain table view underneath.
 */
import { useState } from 'react';
import type { CalibrationPoint, DayStat } from '../learn/stats';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** A name, a bar and a figure per row: mastery against 100%. */
export function MeterRow({ name, value, locked = false }: { name: string; value: number; locked?: boolean }) {
  return (
    <div className={`meter-row${locked ? ' locked' : ''}`} title={`${name}: ${pct(value)} mastery`}>
      <span>{name}</span>
      <div className="meter-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={`${name} mastery`}>
        <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      </div>
      <span className="meter-figure">{pct(value)}</span>
    </div>
  );
}

/** Horizontal bars with the value at the tip. */
export function HBarList({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      {rows.map((r) => (
        <div className="hbar-row" key={r.label} title={`${r.label}: ${r.value} ${unit}`}>
          <span>{r.label}</span>
          <div className="hbar-slot">
            <div className="hbar" style={{ width: `${(r.value / max) * 82}%` }} />
            <span className="hbar-value">{r.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Daily accuracy as a line; days with no practice are gaps, not zeros. */
export function TrendChart({ data }: { data: DayStat[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 190;
  const m = { top: 14, right: 44, bottom: 24, left: 34 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const x = (i: number) => m.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => m.top + (1 - v) * ih;

  // Split into runs of consecutive days that have data.
  const runs: number[][] = [];
  let run: number[] = [];
  data.forEach((d, i) => {
    if (d.accuracy === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push(i);
  });
  if (run.length) runs.push(run);
  const points = data.map((d, i) => (d.accuracy === null ? null : { x: x(i), y: y(d.accuracy) }));
  const lastIdx = runs.length ? runs[runs.length - 1][runs[runs.length - 1].length - 1] : -1;
  const step = data.length > 1 ? iw / (data.length - 1) : iw;
  const ticks = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Accuracy by day over the last two weeks">
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={m.left} x2={W - m.right} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={m.left - 6} y={y(v) + 4} textAnchor="end">
              {pct(v)}
            </text>
          </g>
        ))}
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle">
            {data[i]?.label}
          </text>
        ))}
        {runs.map((r, k) => {
          const line = r.map((i) => `${points[i]!.x},${points[i]!.y}`).join(' ');
          const area = `${points[r[0]]!.x},${y(0)} ${line} ${points[r[r.length - 1]]!.x},${y(0)}`;
          return (
            <g key={k}>
              {r.length > 1 && <polygon points={area} fill="var(--series)" opacity={0.1} />}
              {r.length > 1 && (
                <polyline points={line} fill="none" stroke="var(--series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              )}
              {r.length === 1 && <circle cx={points[r[0]]!.x} cy={points[r[0]]!.y} r={4} fill="var(--series)" stroke="var(--surface)" strokeWidth={2} />}
            </g>
          );
        })}
        {lastIdx >= 0 && (
          <g>
            <circle cx={points[lastIdx]!.x} cy={points[lastIdx]!.y} r={4.5} fill="var(--series)" stroke="var(--surface)" strokeWidth={2} />
            <text x={points[lastIdx]!.x + 8} y={points[lastIdx]!.y + 4} style={{ fill: 'var(--text)', fontWeight: 600 }}>
              {pct(data[lastIdx].accuracy ?? 0)}
            </text>
          </g>
        )}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={y(0)} stroke="var(--muted)" strokeWidth={1} />
        )}
        {hover !== null && points[hover] && (
          <circle cx={points[hover]!.x} cy={points[hover]!.y} r={5} fill="var(--series)" stroke="var(--surface)" strokeWidth={2} />
        )}
        {data.map((_, i) => (
          <rect
            key={i}
            x={x(i) - step / 2}
            y={m.top}
            width={step}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {h && hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(m.top / H) * 100}%` }}>
          {h.label}: {h.accuracy === null ? 'no practice' : `${pct(h.accuracy)} over ${h.attempts} question${h.attempts === 1 ? '' : 's'}`}
        </div>
      )}
      <details className="table-view">
        <summary>View as table</summary>
        <table className="plain">
          <thead>
            <tr>
              <th>Day</th>
              <th className="num">Questions</th>
              <th className="num">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter((d) => d.attempts > 0)
              .map((d) => (
                <tr key={d.day}>
                  <td>{d.label}</td>
                  <td className="num">{d.attempts}</td>
                  <td className="num">{pct(d.accuracy ?? 0)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/**
 * Calibration: for each confidence level, how often you were actually right
 * (the bar) against how sure you said you were (the tick). A bar that stops
 * short of its tick means overconfidence.
 */
export function CalibrationChart({ data }: { data: CalibrationPoint[] }) {
  const rated = data.filter((d) => d.count > 0);
  const worst = rated
    .filter((d) => d.count >= 3 && d.actual !== null)
    .sort((a, b) => Math.abs((b.actual ?? 0) - b.stated) - Math.abs((a.actual ?? 0) - a.stated))[0];
  const gap = worst && worst.actual !== null ? worst.actual - worst.stated : 0;
  return (
    <div>
      {data.map((d) => (
        <div
          className="meter-row calib-row"
          key={d.label}
          title={
            d.actual === null
              ? `${d.label}: no answers yet`
              : `${d.label}: right ${pct(d.actual)} of the time over ${d.count} answers; you implied about ${pct(d.stated)}`
          }
        >
          <span>{d.label}</span>
          <div className="calib-track">
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${(d.actual ?? 0) * 100}%` }} />
            </div>
            <i className="calib-tick" style={{ left: `${d.stated * 100}%` }} aria-hidden="true" />
          </div>
          <span className="meter-figure">{d.actual === null ? '–' : pct(d.actual)}</span>
        </div>
      ))}
      <p className="muted small" style={{ margin: '8px 0 0' }}>
        Bar = how often you were right. Tick = how sure that answer implies.{' '}
        {worst && Math.abs(gap) >= 0.1
          ? gap < 0
            ? `When you say “${worst.label}” you are right ${pct(worst.actual ?? 0)} of the time: slow down on those.`
            : `When you say “${worst.label}” you are right ${pct(worst.actual ?? 0)} of the time: you know more than you think.`
          : rated.length
            ? 'Your confidence is tracking your accuracy well so far.'
            : ''}
      </p>
      <details className="table-view">
        <summary>View as table</summary>
        <table className="plain">
          <thead>
            <tr>
              <th>Confidence</th>
              <th className="num">Answers</th>
              <th className="num">Implied</th>
              <th className="num">Actually right</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td className="num">{d.count}</td>
                <td className="num">{pct(d.stated)}</td>
                <td className="num">{d.actual === null ? '–' : pct(d.actual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
