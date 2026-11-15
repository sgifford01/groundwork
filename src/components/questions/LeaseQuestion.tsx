/**
 * Lease simulator questions. Three kinds of task share one simulator:
 *   read       answer with a number taken or computed from the report
 *   configure  correct the inputs so the cash flow matches the lease or assumptions described
 *   shock      predict what a change to one input does, then watch it happen
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { MISTAKE_LABELS, type LeaseSimItem } from '../../content/schema';
import { formatValue } from '../../engine/format';
import { renderTemplate } from '../../engine/variables';
import {
  configureKey,
  getPath,
  gradeLeaseConfigure,
  gradeLeaseRead,
  gradeLeaseShock,
  runScenario,
  scenarioFor,
  shockTruth,
  type ConfigureResult,
  type LeaseScenario,
  type ShockDirection,
} from '../../grading/leases';
import type { NumericResult } from '../../grading/simple';
import { LeaseSimulator } from '../leases/LeaseSimulator';
import { ConfidenceBar, Feedback, HintLadder, type QuestionProps } from './common';

const PREFIX: Record<string, string> = { usd: '$', usd2: '$' };
const SUFFIX: Record<string, string> = { pct: '%', pct1: '%', pct2: '%', mult: 'x' };
const DIRECTIONS: { value: ShockDirection; label: string }[] = [
  { value: 'up', label: 'Goes up' },
  { value: 'down', label: 'Goes down' },
  { value: 'none', label: 'No change' },
];

export function LeaseSimQuestion({ item, seed, graded, onGraded }: QuestionProps<LeaseSimItem>) {
  const start = useMemo(() => scenarioFor(item, seed), [item, seed]);
  const startRun = useMemo(() => runScenario(start), [start]);
  const task = item.task;
  const [scenario, setScenario] = useState<LeaseScenario>(start);
  const [typed, setTyped] = useState('');
  const [direction, setDirection] = useState<ShockDirection | null>(null);
  const [size, setSize] = useState('');
  const [hints, setHints] = useState(0);
  const [numeric, setNumeric] = useState<NumericResult | null>(null);
  const [configured, setConfigured] = useState<ConfigureResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const truth = useMemo(() => (task.kind === 'shock' ? shockTruth(item, start) : null), [item, start, task.kind]);
  const [shockScore, setShockScore] = useState<{ directionRight: boolean; sizeRight: boolean } | null>(null);
  const text = (s: string) => renderTemplate(s, startRun.facts, []);

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const common = { confidence, hints, sawSolution: gaveUp };
      if (task.kind === 'read') {
        // a read question is about the scenario as given, whatever the student has tried in the simulator
        const res = gradeLeaseRead(item, startRun, gaveUp ? '' : typed);
        setNumeric(res);
        const right = res.correct && !gaveUp;
        onGraded({
          ...common,
          score: right ? 1 : 0,
          category: right || gaveUp ? undefined : res.category,
          given: res.parsed === null ? typed.trim() || undefined : formatValue(res.parsed, task.format),
          expected: res.expectedText,
          detail: gaveUp ? 'Viewed the solution.' : right ? undefined : res.message,
        });
      } else if (task.kind === 'configure') {
        const res = gradeLeaseConfigure(item, start, gaveUp ? start : scenario);
        setConfigured(res);
        const missed = res.checks.find((c) => !c.pass);
        onGraded({
          ...common,
          score: gaveUp ? 0 : res.score,
          category: gaveUp || res.score >= 0.999 ? undefined : 'concept',
          given: Object.keys(task.target)
            .map((p) => `${p.split('.').pop()} ${getPath(scenario, p)}`)
            .join(', '),
          expected: Object.entries(task.target)
            .map(([p, v]) => `${p.split('.').pop()} ${v}`)
            .join(', '),
          detail: gaveUp ? 'Viewed the solution.' : missed ? `Did not match: ${missed.label}.` : undefined,
        });
        setScenario(configureKey(item, start));
      } else if (truth) {
        const n = size.trim() === '' ? null : Number(size.replace(/[%\s]/g, ''));
        const res = gradeLeaseShock(item, truth, gaveUp || !direction ? (truth.direction === 'up' ? 'down' : 'up') : direction, n !== null && Number.isFinite(n) ? n : null);
        setShockScore(res);
        onGraded({
          ...common,
          score: gaveUp ? 0 : res.score,
          category: gaveUp || res.score >= 0.999 ? undefined : res.directionRight ? 'arithmetic' : 'concept',
          given: direction ? `${direction}${size ? ` ${size}%` : ''}` : undefined,
          expected: `${truth.direction} ${(Math.abs(truth.change) * 100).toFixed(1)}%`,
          detail: gaveUp ? 'Viewed the solution.' : res.score >= 0.999 ? undefined : res.directionRight ? 'Right direction, but the size was outside the band.' : task.trap,
        });
        setScenario(truth.shocked);
      }
    },
    [graded, task, item, start, startRun, scenario, typed, direction, size, hints, truth, onGraded],
  );

  const ready = task.kind === 'read' ? typed.trim() !== '' : task.kind === 'configure' ? true : direction !== null;
  const editable = graded || task.kind === 'shock' ? [] : item.editable;

  return (
    <>
      <div className="q-prompt">{text(item.prompt)}</div>
      {task.kind === 'shock' && !graded && (
        <p className="muted" style={{ margin: 0 }}>
          <strong>The change:</strong> {task.change.label}. <strong>Predict:</strong> what happens to {task.output.label.toLowerCase()}?
        </p>
      )}

      <LeaseSimulator scenario={scenario} editable={editable} onChange={graded ? undefined : setScenario} baseline={start} />

      {task.kind === 'read' && (
        <div className="num-row">
          <div className="num-box">
            {PREFIX[task.format] && <span className="adorn">{PREFIX[task.format]}</span>}
            <input ref={inputRef} inputMode="decimal" value={typed} disabled={graded} placeholder="Your answer" aria-label="Your answer" onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            {SUFFIX[task.format] && <span className="adorn">{SUFFIX[task.format]}</span>}
          </div>
          {task.unit && <span className="muted">{task.unit}</span>}
        </div>
      )}

      {task.kind === 'shock' && !graded && (
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="seg" role="radiogroup" aria-label="Direction of the change">
            {DIRECTIONS.map((d) => (
              <button key={d.value} type="button" role="radio" aria-checked={direction === d.value} className={direction === d.value ? 'on' : ''} onClick={() => setDirection(d.value)}>
                {d.label}
              </button>
            ))}
          </div>
          <label className="field">
            By roughly how much? (optional, for full credit)
            <span className="num-box" style={{ maxWidth: 140 }}>
              <input inputMode="decimal" value={size} placeholder="e.g. 12" aria-label="Size of the change in percent" onChange={(e) => setSize(e.target.value)} autoComplete="off" />
              <span className="adorn">%</span>
            </span>
          </label>
        </div>
      )}

      {!graded && (
        <>
          {task.kind === 'configure' && (
            <p className="muted small" style={{ margin: 0 }}>
              Edit the yellow inputs, then lock in. You are graded on whether the cash flow matches, on {task.checks.length} lines.
            </p>
          )}
          <ConfidenceBar onPick={(c) => submit(c)} disabled={!ready} label={task.kind === 'configure' ? 'Lock in your inputs. How sure are you?' : undefined} />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => submit(null, true)} />
        </>
      )}

      {graded && task.kind === 'read' && numeric && (
        <Feedback kind={numeric.correct ? 'ok' : 'bad'} title={numeric.correct ? 'Correct' : `The answer is ${numeric.expectedText}`}>
          {!numeric.correct && numeric.parsed !== null && (
            <p>
              <strong>{numeric.category ? `${MISTAKE_LABELS[numeric.category]}: ` : ''}</strong>
              {numeric.message}
            </p>
          )}
          <div className="explain">{text(item.explanation)}</div>
        </Feedback>
      )}

      {graded && task.kind === 'configure' && configured && (
        <Feedback
          kind={configured.score >= 0.999 ? 'ok' : configured.score > 0 ? 'part' : 'bad'}
          title={configured.score >= 0.999 ? 'The cash flow matches' : `${configured.checks.filter((c) => c.pass).length} of ${configured.checks.length} lines match`}
        >
          <ul className="ls-checks">
            {configured.checks.map((c) => (
              <li key={c.fact} className={c.pass ? 'pass' : 'fail'}>
                <strong>{c.pass ? '✓' : '✗'}</strong> {c.label}: should be {formatValue(c.expected, 'usd')}
                {!c.pass && `, yours gave ${formatValue(c.got, 'usd')}`}
              </li>
            ))}
          </ul>
          <p className="muted small">The simulator above now shows the correct inputs (marked with a bar).</p>
          <div className="explain">{text(item.explanation)}</div>
        </Feedback>
      )}

      {graded && task.kind === 'shock' && truth && shockScore && (
        <Feedback
          kind={shockScore.sizeRight || (shockScore.directionRight && truth.direction === 'none') ? 'ok' : shockScore.directionRight ? 'part' : 'bad'}
          title={`${task.output.label} ${truth.direction === 'none' ? 'does not change' : `goes ${truth.direction} ${(Math.abs(truth.change) * 100).toFixed(1)}%`}: ${formatValue(truth.before, task.output.format)} to ${formatValue(truth.after, task.output.format)}`}
        >
          {!shockScore.directionRight && <p>{task.trap}</p>}
          {shockScore.directionRight && !shockScore.sizeRight && truth.direction !== 'none' && <p>Right direction. Half credit: the size was outside the band (or left blank).</p>}
          <p className="muted small">The simulator above now shows the change applied; the cells that moved are marked.</p>
          <div className="explain">{text(item.explanation)}</div>
        </Feedback>
      )}
    </>
  );
}
