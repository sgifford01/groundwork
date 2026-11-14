/**
 * Grid build: fill the yellow cells, then get cell-by-cell grading.
 * Also runs timed challenges: the same task against a clock, with no hints.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { GridItem, TimedItem } from '../../content/schema';
import { newSeed } from '../../engine/rng';
import {
  collectTargets,
  gradeGrid,
  type GridAttempt,
  type GridGradeResult,
  type TargetStatus,
} from '../../grading/gridGrader';
import type { ImportedTask } from '../../xlsx/taskFile';
import { Grid } from '../grid/Grid';
import { ConfidenceBar, Feedback, HintLadder, type QuestionProps } from './common';
import { clock, ExcelRoundTrip, GridLegend, GridShortcutHelp, ImportNotes, ResultsTable, useCountdown } from './gridShared';

/** Drop the grading marks of any cell that has just been edited. */
export function clearStaleMarks(
  prev: Record<string, TargetStatus>,
  sheets: { name: string }[],
  before: GridAttempt,
  after: GridAttempt,
): Record<string, TargetStatus> {
  const out = { ...prev };
  for (const s of sheets) {
    const a = before[s.name] ?? {};
    const b = after[s.name] ?? {};
    for (const addr of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if ((a[addr] ?? '') !== (b[addr] ?? '')) delete out[`${s.name}!${addr}`];
    }
  }
  return out;
}

export function GridQuestion({ item, graded, onGraded }: QuestionProps<GridItem | TimedItem>) {
  const timed = item.type === 'timed';
  const sheets = item.workbook.sheets;
  const targetCount = useMemo(() => collectTargets(sheets).length, [sheets]);
  const [attempt, setAttempt] = useState<GridAttempt>({});
  const [result, setResult] = useState<GridGradeResult | null>(null);
  const [marks, setMarks] = useState<Record<string, TargetStatus>>({});
  const [showModel, setShowModel] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hints, setHints] = useState(0);
  const [notes, setNotes] = useState<string[] | null>(null);
  const [started, setStarted] = useState(!timed);
  const [usedSeconds, setUsedSeconds] = useState<number | null>(null);
  const startedAt = useRef(0);

  const filled = useMemo(
    () => collectTargets(sheets).filter((t) => (attempt[t.sheet]?.[t.addr] ?? '').trim() !== '').length,
    [sheets, attempt],
  );

  const onChange = useCallback(
    (next: GridAttempt) => {
      setMarks((prev) => clearStaleMarks(prev, sheets, attempt, next));
      setAttempt(next);
    },
    [sheets, attempt],
  );

  const check = useCallback(
    (confidence: number | null, opts: { gaveUp?: boolean; from?: GridAttempt } = {}) => {
      const work = opts.from ?? attempt;
      const res = gradeGrid(item, work, { seed: newSeed() });
      setResult(res);
      setMarks(Object.fromEntries(res.targets.map((t) => [`${t.sheet}!${t.addr}`, t.status])));
      if (opts.gaveUp) setShowModel(true);
      if (graded) return; // later checks are for learning; only the first one is recorded
      if (timed) setUsedSeconds(Math.round((Date.now() - startedAt.current) / 1000));
      const firstWrong = res.targets.find((t) => t.status === 'wrong' || t.status === 'empty');
      const right = res.targets.filter((t) => t.credit === 1).length;
      onGraded({
        score: opts.gaveUp ? 0 : res.score,
        confidence,
        hints,
        sawSolution: Boolean(opts.gaveUp),
        category: opts.gaveUp || res.passed ? undefined : res.mainCategory,
        given: `${right} of ${res.targets.length} cells correct`,
        expected: `${res.targets.length} of ${res.targets.length}`,
        detail: opts.gaveUp ? 'Viewed the solution.' : firstWrong ? `${firstWrong.id}: ${firstWrong.message}` : undefined,
      });
    },
    [item, attempt, graded, hints, onGraded, timed],
  );

  const secondsLeft = useCountdown(timed ? Math.round(item.minutes * 60) : 0, timed && started && !graded, () => check(null));

  const onImported = useCallback(
    (task: ImportedTask) => {
      setNotes(task.warnings);
      setMarks({});
      setAttempt(task.attempt);
      check(null, { from: task.attempt });
    },
    [check],
  );

  const wrongRows = result?.targets.filter((t) => t.status !== 'correct') ?? [];
  const rightCount = result?.targets.filter((t) => t.credit === 1).length ?? 0;
  const rows = result ? (showAll || showModel ? result.targets : wrongRows) : [];
  const passed = timed && result ? result.score >= item.passMark : false;

  if (timed && !started) {
    return (
      <>
        <div className="q-prompt compact">{item.prompt}</div>
        {item.brief.length > 0 && (
          <div className="hints">
            <strong>What the model must do</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
              {item.brief.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="muted">
          {item.minutes} minutes, {targetCount} cells, no hints. Pass mark {Math.round(item.passMark * 100)}%. The sheet is
          graded automatically when time runs out.
        </p>
        <div className="row">
          <button
            type="button"
            className="btn primary big"
            onClick={() => {
              startedAt.current = Date.now();
              setStarted(true);
            }}
          >
            Start the clock
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="q-prompt compact">{item.prompt}</div>
      {timed && (
        <div className="spread">
          {item.brief.length > 0 ? (
            <details className="grid-help" open>
              <summary>What the model must do</summary>
              <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                {item.brief.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </details>
          ) : (
            <span />
          )}
          <span className={`timer${!graded && secondsLeft <= 60 ? ' low' : ''}`} role="timer" aria-live="off">
            {graded ? `Time used ${clock(usedSeconds ?? 0)}` : clock(secondsLeft)}
          </span>
        </div>
      )}

      <GridLegend />
      <Grid sheets={sheets} value={attempt} onChange={onChange} feedback={marks} autoFocus />
      <GridShortcutHelp />
      <ExcelRoundTrip info={{ id: item.id, title: item.title }} sheets={sheets} onImported={onImported} />
      <ImportNotes notes={notes} />

      {!graded && (
        <>
          <ConfidenceBar
            onPick={(c) => check(c)}
            disabled={filled === 0}
            label={`${timed ? 'Hand in' : 'Check my work'} (${filled} of ${targetCount} cells filled). How sure are you?`}
          />
          {!timed && (
            <HintLadder
              hints={item.hints}
              used={hints}
              onUse={() => setHints((h) => h + 1)}
              onShowSolution={() => check(null, { gaveUp: true })}
            />
          )}
        </>
      )}

      {result && (
        <Feedback
          kind={timed ? (passed ? 'ok' : 'bad') : result.passed ? 'ok' : rightCount > 0 ? 'part' : 'bad'}
          title={
            timed
              ? `${passed ? 'Pass' : 'Not yet'}: ${Math.round(result.score * 100)}% (${rightCount} of ${result.targets.length} cells), pass mark ${Math.round(item.passMark * 100)}%`
              : result.passed
                ? `All ${result.targets.length} cells correct`
                : `${rightCount} of ${result.targets.length} cells correct`
          }
        >
          <p className="small">
            Each cell was checked three ways: its value today, whether it is a real formula, and whether it still
            matches the answer key after the blue inputs were changed ({result.scenarioCount - 1} alternate input sets).
          </p>
          {rows.length > 0 && <ResultsTable rows={rows} showModel={showModel} />}
          <div className="row" style={{ marginTop: 10 }}>
            {graded && (
              <button type="button" className="btn small" onClick={() => check(null)}>
                Check again
              </button>
            )}
            {!showModel && (
              <button type="button" className="btn small" onClick={() => setShowModel(true)}>
                Show model formulas
              </button>
            )}
            {!showModel && result.targets.length > wrongRows.length && wrongRows.length > 0 && (
              <button type="button" className="btn small ghost" onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Show only problem cells' : 'Show every cell'}
              </button>
            )}
          </div>
          {(result.passed || showModel) && (
            <p className="explain small" style={{ marginTop: 10 }}>
              {item.explanation}
            </p>
          )}
        </Feedback>
      )}
    </>
  );
}
