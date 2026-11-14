/** Predict-then-check, estimate-first, ordering, explain-why, go/no-go and shortcut drills. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  EstimateItem,
  ExplainItem,
  GoNoGoItem,
  OrderItem,
  PredictItem,
  ShortcutItem,
} from '../../content/schema';
import { MISTAKE_LABELS } from '../../content/schema';
import { formatValue, parseTypedNumber } from '../../engine/format';
import { seededRng, shuffle } from '../../engine/rng';
import { renderTemplate, sampleVars } from '../../engine/variables';
import {
  goNoGoTruth,
  gradeEstimate,
  gradeGoNoGo,
  gradePredict,
  isCapturable,
  matchesCombo,
  orderScore,
  parseCombo,
  predictTruth,
  type Direction,
  type EstimateGrade,
  type PredictGrade,
} from '../../grading/advanced';
import { qualityFor } from '../../learn/sm2';
import { useProgress } from '../../store/progress';
import { Grid } from '../grid/Grid';
import { ConfidenceBar, Feedback, HintLadder, type QuestionProps } from './common';
import { clock } from './gridShared';

const PCT_FORMATS = ['pct', 'pct1', 'pct2'];
const PREFIX: Record<string, string> = { usd: '$', usd2: '$' };
const SUFFIX: Record<string, string> = { pct: '%', pct1: '%', pct2: '%', mult: 'x' };

// ---------------------------------------------------------------------------
// Predict, then check
// ---------------------------------------------------------------------------
export function PredictQuestion({ item, seed, graded, onGraded }: QuestionProps<PredictItem>) {
  const truth = useMemo(() => predictTruth(item, seed), [item, seed]);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [size, setSize] = useState('');
  const [hints, setHints] = useState(0);
  const [grade, setGrade] = useState<PredictGrade | null>(null);

  const pctOutput = PCT_FORMATS.includes(item.output.format);
  const unit = item.measure === 'pct' ? '%' : pctOutput ? 'percentage points' : item.output.format === 'mult' ? 'x' : '';
  const prefix = item.measure === 'abs' ? (PREFIX[item.output.format] ?? '') : '';

  /** The size the student typed, in the same units as truth.change. */
  const typedSize = (): number | null => {
    const p = parseTypedNumber(size);
    if (!p) return null;
    if (item.measure === 'pct') return p.hadPercent ? Math.abs(p.value) : Math.abs(p.value) / 100;
    if (pctOutput) return p.hadPercent ? Math.abs(p.value) : Math.abs(p.value) / 100; // typed in percentage points
    return Math.abs(p.value);
  };

  const showChange = (x: number): string => {
    if (item.measure === 'pct') return `${(Math.abs(x) * 100).toFixed(1)}%`;
    if (pctOutput) return `${(Math.abs(x) * 100).toFixed(2)} percentage points`;
    return formatValue(Math.abs(x), item.output.format);
  };

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded || (!gaveUp && direction === null)) return;
      const g = gradePredict(item, truth, direction ?? 'none', gaveUp ? null : typedSize());
      setGrade(g);
      const said = direction === 'none' ? 'no change' : `${direction} by about ${size || '?'}${unit ? ` ${unit}` : ''}`;
      const actual = truth.direction === 'none' ? 'no change' : `${truth.direction} by ${showChange(truth.change)}`;
      onGraded({
        score: gaveUp ? 0 : g.score,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: gaveUp || g.score >= 0.999 ? undefined : g.directionRight ? 'arithmetic' : 'concept',
        given: gaveUp ? undefined : said,
        expected: actual,
        detail: gaveUp
          ? 'Viewed the solution.'
          : g.score >= 0.999
            ? undefined
            : g.directionRight
              ? `Right direction, but the size was off: it moves ${showChange(truth.change)}.`
              : item.trap,
      });
    },
    // typedSize and showChange read current state directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graded, direction, size, item, truth, hints, onGraded, unit],
  );

  const needsSize = direction !== null && direction !== 'none';

  return (
    <>
      <div className="q-prompt compact">{item.prompt}</div>
      <Grid sheets={graded ? truth.shockedSheets : truth.sheets} value={{}} onChange={() => undefined} readOnly />
      {graded && <p className="muted small" style={{ margin: 0 }}>The sheet above now shows the model after the change.</p>}

      <div className="hints">
        <strong>{item.shock.label}.</strong> What happens to <strong>{item.output.label}</strong> (now{' '}
        {formatValue(truth.base, item.output.format)})?
      </div>

      <div className="row">
        <span className="confidence-label">Direction</span>
        <div className="seg" role="group" aria-label="Direction">
          {(
            [
              ['up', 'Goes up'],
              ['down', 'Goes down'],
              ['none', 'No change'],
            ] as const
          ).map(([d, label]) => (
            <button key={d} type="button" className={direction === d ? 'on' : ''} disabled={graded} onClick={() => setDirection(d)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {needsSize && (
        <div className="num-row">
          <span className="confidence-label">By roughly how much?</span>
          <div className="num-box">
            {prefix && <span className="adorn">{prefix}</span>}
            <input
              inputMode="decimal"
              value={size}
              disabled={graded}
              placeholder="Size of the change"
              aria-label="Size of the change"
              onChange={(e) => setSize(e.target.value)}
              autoComplete="off"
            />
            {unit && <span className="adorn">{unit}</span>}
          </div>
          <span className="muted small">A rough figure is fine: within {Math.round(item.band * 100)}% of the true change counts.</span>
        </div>
      )}

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => submit(c)} disabled={direction === null || (needsSize && !parseTypedNumber(size))} />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => submit(null, true)} />
        </>
      )}

      {graded && grade && (
        <Feedback
          kind={grade.score >= 0.999 ? 'ok' : grade.score > 0 ? 'part' : 'bad'}
          title={
            truth.direction === 'none'
              ? `${item.output.label} does not change`
              : `${item.output.label} goes ${truth.direction} ${showChange(truth.change)}: ${formatValue(truth.base, item.output.format)} → ${formatValue(truth.shocked, item.output.format)}`
          }
        >
          <p>
            Direction: <strong>{grade.directionRight ? 'right' : 'wrong'}</strong>
            {truth.direction !== 'none' && (
              <>
                . Size: <strong>{grade.sizeRight ? 'close enough' : grade.directionRight ? 'off' : 'not counted'}</strong>
              </>
            )}
            .
          </p>
          {!grade.directionRight && <p>{item.trap}</p>}
          <div className="explain">{item.explanation}</div>
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Estimate first: a ballpark, then the exact answer
// ---------------------------------------------------------------------------
export function EstimateQuestion({ item, seed, graded, onGraded }: QuestionProps<EstimateItem>) {
  const values = useMemo(() => sampleVars(item.vars, seededRng(item.id, seed)), [item, seed]);
  const [ballpark, setBallpark] = useState('');
  const [locked, setLocked] = useState(false);
  const [exact, setExact] = useState('');
  const [hints, setHints] = useState(0);
  const [grade, setGrade] = useState<EstimateGrade | null>(null);
  const exactRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const g = gradeEstimate(item, values, ballpark, gaveUp ? '' : exact);
      setGrade(g);
      onGraded({
        score: gaveUp ? 0 : g.score,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: gaveUp || g.score >= 0.999 ? undefined : g.category,
        given: `ballpark ${ballpark || '-'}, exact ${exact || '-'}`,
        expected: g.expectedText,
        detail: gaveUp ? 'Viewed the solution.' : g.score >= 0.999 ? undefined : g.message,
      });
    },
    [graded, item, values, ballpark, exact, hints, onGraded],
  );

  const lockBallpark = () => {
    if (!parseTypedNumber(ballpark)) return;
    setLocked(true);
    requestAnimationFrame(() => exactRef.current?.focus());
  };

  const box = (value: string, set: (v: string) => void, disabled: boolean, label: string, onEnter?: () => void, ref?: React.Ref<HTMLInputElement>) => (
    <div className="num-box">
      {PREFIX[item.format] && <span className="adorn">{PREFIX[item.format]}</span>}
      <input
        ref={ref}
        inputMode="decimal"
        value={value}
        disabled={disabled}
        placeholder={label}
        aria-label={label}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        autoComplete="off"
      />
      {SUFFIX[item.format] && <span className="adorn">{SUFFIX[item.format]}</span>}
    </div>
  );

  return (
    <>
      <div className="q-prompt">{renderTemplate(item.prompt, values, item.vars)}</div>

      <div className="num-row">
        <span className="confidence-label" style={{ width: 150 }}>
          1. Ballpark
        </span>
        {box(ballpark, setBallpark, locked || graded, 'Quick estimate', lockBallpark)}
        {item.unit && <span className="muted">{item.unit}</span>}
        {!locked && !graded && (
          <button type="button" className="btn" onClick={lockBallpark} disabled={!parseTypedNumber(ballpark)}>
            Lock it in
          </button>
        )}
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        In your head, ten seconds, no calculator. Within {Math.round(item.ballpark * 100)}% counts.
      </p>

      {(locked || graded) && (
        <div className="num-row">
          <span className="confidence-label" style={{ width: 150 }}>
            2. Exact answer
          </span>
          {box(exact, setExact, graded, 'Worked answer', undefined, exactRef)}
          {item.unit && <span className="muted">{item.unit}</span>}
        </div>
      )}

      {!graded && (
        <>
          {locked && <ConfidenceBar onPick={(c) => submit(c)} disabled={!parseTypedNumber(exact)} />}
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => submit(null, true)} />
        </>
      )}

      {graded && grade && (
        <Feedback kind={grade.score >= 0.999 ? 'ok' : grade.score > 0 ? 'part' : 'bad'} title={`The answer is ${grade.expectedText}`}>
          <p>
            Ballpark: <strong>{grade.ballparkRight ? 'in range' : 'out of range'}</strong>. Exact:{' '}
            <strong>{grade.exactRight ? 'correct' : 'not correct'}</strong>.
          </p>
          {grade.message && (
            <p>
              {grade.category && !grade.exactRight && <strong>{MISTAKE_LABELS[grade.category]}: </strong>}
              {grade.message}
            </p>
          )}
          <p>
            <strong>The quick route: </strong>
            {renderTemplate(item.shortcut, values, item.vars)}
          </p>
          <div className="explain">{renderTemplate(item.explanation, values, item.vars)}</div>
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Ordering: drag the lines, or use the arrows
// ---------------------------------------------------------------------------
export function OrderQuestion({ item, seed, graded, onGraded }: QuestionProps<OrderItem>) {
  const start = useMemo(() => {
    const rng = seededRng(item.id, seed);
    let lines = shuffle(rng, item.lines);
    for (let i = 0; i < 5 && lines.every((l, k) => l === item.lines[k]); i++) lines = shuffle(rng, item.lines);
    return lines;
  }, [item, seed]);
  const [lines, setLines] = useState(start);
  const [hints, setHints] = useState(0);
  const dragFrom = useRef<number | null>(null);

  const move = (from: number, to: number) => {
    if (graded || to < 0 || to >= lines.length || from === to) return;
    setLines((prev) => {
      const next = [...prev];
      const [line] = next.splice(from, 1);
      next.splice(to, 0, line);
      return next;
    });
  };

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const score = orderScore(item.lines, lines);
      const right = score >= 0.999;
      onGraded({
        score: gaveUp ? 0 : right ? 1 : score >= 0.75 ? 0.5 : 0,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: gaveUp || right ? undefined : 'concept',
        given: lines.join(' → '),
        expected: item.lines.join(' → '),
        detail: gaveUp ? 'Viewed the solution.' : right ? undefined : item.trap,
      });
    },
    [graded, item, lines, hints, onGraded],
  );

  const allRight = lines.every((l, i) => l === item.lines[i]);

  return (
    <>
      <div className="q-prompt">{item.prompt}</div>
      <ol className="order-list">
        {lines.map((line, i) => {
          const ok = graded && line === item.lines[i];
          return (
            <li
              key={line}
              className={graded ? (ok ? 'right' : 'wrong') : ''}
              draggable={!graded}
              onDragStart={() => {
                dragFrom.current = i;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragFrom.current !== null && dragFrom.current !== i) {
                  move(dragFrom.current, i);
                  dragFrom.current = i;
                }
              }}
              onDragEnd={() => {
                dragFrom.current = null;
              }}
            >
              <span className="order-grip" aria-hidden="true">
                ⋮⋮
              </span>
              <span className="order-text">{line}</span>
              {!graded && (
                <span className="order-buttons">
                  <button type="button" className="btn small" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move "${line}" up`}>
                    ↑
                  </button>
                  <button type="button" className="btn small" onClick={() => move(i, i + 1)} disabled={i === lines.length - 1} aria-label={`Move "${line}" down`}>
                    ↓
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => submit(c)} hotkeys />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => submit(null, true)} />
        </>
      )}

      {graded && (
        <Feedback kind={allRight ? 'ok' : 'bad'} title={allRight ? 'Correct order' : 'The correct order'}>
          {!allRight && (
            <ol style={{ margin: '4px 0 10px', paddingLeft: 22 }}>
              {item.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ol>
          )}
          {!allRight && <p>{item.trap}</p>}
          <div className="explain">{item.explanation}</div>
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Explain why: write it, then grade yourself against a rubric
// ---------------------------------------------------------------------------
export function ExplainQuestion({ item, graded, onGraded }: QuestionProps<ExplainItem>) {
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [ticks, setTicks] = useState<boolean[]>(() => item.rubric.map(() => false));
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const hit = ticks.filter(Boolean).length;

  const record = () => {
    if (graded) return;
    const score = hit / item.rubric.length;
    const missed = item.rubric.filter((_, i) => !ticks[i]);
    onGraded({
      score,
      credit: score,
      quality: qualityFor(score, null),
      confidence: null,
      hints: 0,
      sawSolution: false,
      category: score >= 0.999 ? undefined : 'concept',
      given: text.trim(),
      expected: item.model,
      detail: score >= 0.999 ? undefined : `Left out: ${missed.join(' ')}`,
    });
  };

  return (
    <>
      <div className="q-prompt">{item.prompt}</div>
      <textarea
        className="input explain-box"
        placeholder="Explain it in two or three sentences, as if to a classmate. No notes."
        value={text}
        disabled={revealed}
        onChange={(e) => setText(e.target.value)}
        aria-label="Your explanation"
      />
      {!revealed && (
        <div className="row">
          <button type="button" className="btn primary" onClick={() => setRevealed(true)} disabled={words < 8}>
            Compare with the rubric
          </button>
          <span className="muted small">{words < 8 ? `Write at least a sentence first (${words} of 8 words).` : `${words} words`}</span>
        </div>
      )}
      {revealed && (
        <Feedback kind="info" title="Grade yourself: tick each point your answer actually made">
          <div className="rubric">
            {item.rubric.map((r, i) => (
              <label key={i} className="check">
                <input
                  type="checkbox"
                  checked={ticks[i]}
                  disabled={graded}
                  onChange={(e) => setTicks((t) => t.map((v, k) => (k === i ? e.target.checked : v)))}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
          <p style={{ marginTop: 10 }}>
            <strong>A model answer: </strong>
            {item.model}
          </p>
          <p className="muted small">
            <strong>Where weak answers go wrong: </strong>
            {item.trap}
          </p>
          {!graded ? (
            <button type="button" className="btn primary" onClick={record}>
              Record {hit} of {item.rubric.length}
            </button>
          ) : (
            <span className="muted small">
              Recorded {hit} of {item.rubric.length}.
            </span>
          )}
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Go / no-go: judge each test, then make the call
// ---------------------------------------------------------------------------
export function GoNoGoQuestion({ item, seed, graded, onGraded }: QuestionProps<GoNoGoItem>) {
  const values = useMemo(() => sampleVars(item.vars, seededRng(item.id, seed)), [item, seed]);
  const truth = useMemo(() => goNoGoTruth(item, values), [item, values]);
  const [marks, setMarks] = useState<(boolean | null)[]>(() => item.criteria.map(() => null));
  const [call, setCall] = useState<boolean | null>(null);
  const [hints, setHints] = useState(0);

  const ready = call !== null && marks.every((m) => m !== null);

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const score = gaveUp ? 0 : gradeGoNoGo(truth, call as boolean, marks as boolean[]);
      const failing = truth.criteria.filter((c) => !c.pass).map((c) => c.label);
      const callRight = call === truth.go;
      onGraded({
        score,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: gaveUp || score >= 0.999 ? undefined : callRight ? 'arithmetic' : 'concept',
        given: gaveUp ? undefined : call ? 'Go' : 'No-go',
        expected: truth.go ? 'Go' : `No-go (${failing.join('; ')})`,
        detail: gaveUp
          ? 'Viewed the solution.'
          : score >= 0.999
            ? undefined
            : callRight
              ? 'Right call, but at least one test was judged wrongly.'
              : truth.go
                ? 'Every test passes, so this is a Go.'
                : `Fails: ${failing.join('; ')}.`,
      });
    },
    [graded, truth, call, marks, hints, onGraded],
  );

  return (
    <>
      <div className="q-prompt">{renderTemplate(item.prompt, values, item.vars)}</div>
      <div className="cols-2">
        <div>
          <table className="plain">
            <thead>
              <tr>
                <th>Deal output</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {truth.metrics.map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td className="num">{m.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <table className="plain">
            <thead>
              <tr>
                <th>Investment test</th>
                <th>Your verdict</th>
              </tr>
            </thead>
            <tbody>
              {truth.criteria.map((c, i) => (
                <tr key={c.label}>
                  <td>
                    {c.label}
                    {graded && (
                      <div className="option-why">
                        <span className={`status-pill ${marks[i] === c.pass ? 'correct' : 'wrong'}`}>{c.pass ? 'Passes' : 'Fails'}</span> {c.note}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="seg">
                      <button type="button" className={marks[i] === true ? 'on' : ''} disabled={graded} onClick={() => setMarks((m) => m.map((v, k) => (k === i ? true : v)))}>
                        Passes
                      </button>
                      <button type="button" className={marks[i] === false ? 'on' : ''} disabled={graded} onClick={() => setMarks((m) => m.map((v, k) => (k === i ? false : v)))}>
                        Fails
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row">
        <span className="confidence-label">Your call</span>
        <div className="seg" role="group" aria-label="Investment call">
          <button type="button" className={call === true ? 'on' : ''} disabled={graded} onClick={() => setCall(true)}>
            Go
          </button>
          <button type="button" className={call === false ? 'on' : ''} disabled={graded} onClick={() => setCall(false)}>
            No-go
          </button>
        </div>
      </div>

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => submit(c)} disabled={!ready} hotkeys={ready} />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => submit(null, true)} />
        </>
      )}

      {graded && (
        <Feedback kind={call === truth.go ? 'ok' : 'bad'} title={truth.go ? 'This deal is a Go' : 'This deal is a No-go'}>
          <div className="explain">{renderTemplate(item.explanation, values, item.vars)}</div>
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shortcut drill: press the keys, against the clock
// ---------------------------------------------------------------------------
function Keys({ combo }: { combo: string }) {
  const seq = combo.split(',').map((s) => s.trim());
  return (
    <span className="keys">
      {seq.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="muted"> then </span>}
          {part.split('+').map((k, j) => (
            <span key={j}>
              {j > 0 && ' + '}
              <kbd>{k === '' ? '+' : k}</kbd>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

interface DrillResult {
  action: string;
  combo: string;
  right: boolean;
}

export function ShortcutQuestion({ item, seed, graded, onGraded }: QuestionProps<ShortcutItem>) {
  const profileOs = useProgress((s) => s.settings.os);
  const [os, setOs] = useState<'mac' | 'win'>(profileOs);
  const order = useMemo(() => shuffle(seededRng(item.id, seed), item.drills), [item, seed]);
  const [index, setIndex] = useState(-1); // -1 = not started
  const [results, setResults] = useState<DrillResult[]>([]);
  const [flash, setFlash] = useState<{ right: boolean; combo: string } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const busy = useRef(false);

  const drill = index >= 0 && index < order.length ? order[index] : null;
  const combo = drill ? drill[os] : '';
  const capture = drill ? isCapturable(combo, os) : false;

  // multiple-choice fallback for keys a browser can never receive
  const choices = useMemo(() => {
    if (!drill || capture) return [];
    const others = shuffle(
      seededRng(item.id, seed, index),
      item.drills.map((d) => d[os]).filter((c) => c !== combo),
    ).slice(0, 3);
    return shuffle(seededRng(item.id, seed, index, 'c'), [combo, ...others]);
  }, [drill, capture, item, seed, index, os, combo]);

  const answer = useCallback(
    (right: boolean) => {
      if (!drill || busy.current) return;
      busy.current = true;
      const next = [...results, { action: drill.action, combo, right }];
      setResults(next);
      setFlash({ right, combo });
      window.setTimeout(
        () => {
          setFlash(null);
          busy.current = false;
          if (index + 1 >= order.length) {
            const secs = Math.round((Date.now() - startedAt.current) / 1000);
            setElapsed(secs);
            setIndex(order.length);
            const correct = next.filter((r) => r.right).length;
            const score = correct / next.length;
            const missed = next.filter((r) => !r.right);
            onGraded({
              score,
              credit: score,
              quality: score >= 0.999 ? (secs <= item.seconds ? 5 : 4) : score >= 0.7 ? 3 : 1,
              confidence: null,
              hints: 0,
              sawSolution: false,
              category: score >= 0.999 ? undefined : 'function',
              given: `${correct} of ${next.length} in ${clock(secs)}`,
              expected: `${next.length} of ${next.length} within ${clock(item.seconds)}`,
              detail: missed.length ? `Missed: ${missed.map((m) => `${m.action} (${m.combo})`).join('; ')}` : undefined,
            });
          } else setIndex(index + 1);
        },
        right ? 450 : 1400,
      );
    },
    [drill, results, combo, index, order.length, item.seconds, onGraded],
  );

  useEffect(() => {
    if (!drill || !capture || graded) return;
    const parsed = parseCombo(combo);
    if (!parsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      answer(matchesCombo(e, parsed));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [drill, capture, combo, graded, answer]);

  useEffect(() => {
    if (index < 0 || index >= order.length) return;
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [index, order.length]);

  const correct = results.filter((r) => r.right).length;

  if (index < 0) {
    return (
      <>
        <div className="q-prompt">{item.prompt}</div>
        <div className="row">
          <span className="confidence-label">Keyboard</span>
          <div className="seg" role="group" aria-label="Keyboard layout">
            <button type="button" className={os === 'mac' ? 'on' : ''} onClick={() => setOs('mac')}>
              Mac
            </button>
            <button type="button" className={os === 'win' ? 'on' : ''} onClick={() => setOs('win')}>
              Windows
            </button>
          </div>
        </div>
        <p className="muted">
          {item.drills.length} shortcuts. Press the real keys for each action. Target: {clock(item.seconds)}. A few shortcuts
          belong to the browser itself and cannot be captured, so those appear as multiple choice.
        </p>
        <div className="row">
          <button
            type="button"
            className="btn primary big"
            onClick={() => {
              startedAt.current = Date.now();
              setIndex(0);
            }}
          >
            Start the drill
          </button>
        </div>
      </>
    );
  }

  if (drill) {
    return (
      <>
        <div className="spread">
          <span className="muted small">
            {index + 1} of {order.length} · {os === 'mac' ? 'Mac' : 'Windows'} Excel
          </span>
          <span className={`timer${elapsed > item.seconds ? ' low' : ''}`} role="timer">
            {clock(elapsed)}
          </span>
        </div>
        <div className={`drill${flash ? (flash.right ? ' right' : ' wrong') : ''}`}>
          <div className="drill-action">{drill.action}</div>
          {flash ? (
            <div className="drill-answer">
              {flash.right ? 'Yes: ' : 'It is '}
              <Keys combo={flash.combo} />
            </div>
          ) : capture ? (
            <div className="muted">Press the keys now</div>
          ) : (
            <div className="row" style={{ justifyContent: 'center' }}>
              {choices.map((c) => (
                <button key={c} type="button" className="btn" onClick={() => answer(c === combo)}>
                  <Keys combo={c} />
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <Feedback
      kind={correct === results.length ? 'ok' : correct > 0 ? 'part' : 'bad'}
      title={`${correct} of ${results.length} correct in ${clock(elapsed)} (target ${clock(item.seconds)})`}
    >
      <table className="plain">
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td style={{ width: 70 }}>
                <span className={`status-pill ${r.right ? 'correct' : 'wrong'}`}>{r.right ? 'Right' : 'Missed'}</span>
              </td>
              <td>{r.action}</td>
              <td>
                <Keys combo={r.combo} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {item.explanation && (
        <p className="explain small" style={{ marginTop: 10 }}>
          {item.explanation}
        </p>
      )}
    </Feedback>
  );
}
