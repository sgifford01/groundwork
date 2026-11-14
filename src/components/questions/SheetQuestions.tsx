/** Write-the-formula, error hunt and guided case: the other question types that use the spreadsheet. */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { CaseQItem, ErrorHuntItem, FormulaQItem } from '../../content/schema';
import { MISTAKE_LABELS } from '../../content/schema';
import { normalizeCellInput } from '../../engine/format';
import { cycleRefAt } from '../../engine/refs';
import { newSeed } from '../../engine/rng';
import {
  buggyAttempt,
  CASE_STAGE_LABELS,
  caseSheets,
  caseStageFor,
  gradeErrorHunt,
  solvedSheets,
  studentSteps,
  type CaseStage,
  type ErrorHuntResult,
} from '../../grading/advanced';
import {
  collectTargets,
  gradeGrid,
  type GridAttempt,
  type GridGradeResult,
  type TargetStatus,
} from '../../grading/gridGrader';
import { useProgress } from '../../store/progress';
import type { ImportedTask } from '../../xlsx/taskFile';
import { AssistPopup, useFormulaAssist } from '../FormulaAssist';
import { Grid } from '../grid/Grid';
import { ConfidenceBar, Feedback, HintLadder, type QuestionProps } from './common';
import { clearStaleMarks } from './GridQuestion';
import { ExcelRoundTrip, GridLegend, GridShortcutHelp, ImportNotes, ResultsTable } from './gridShared';

// ---------------------------------------------------------------------------
// Write the formula: one cell, typed into a box
// ---------------------------------------------------------------------------

/** Brackets and quotes are balanced and the formula does not end mid-expression. */
function looksComplete(raw: string): boolean {
  if (!raw.startsWith('=')) return true;
  let depth = 0;
  let inString = false;
  for (const ch of raw) {
    if (ch === '"') inString = !inString;
    else if (!inString && ch === '(') depth++;
    else if (!inString && ch === ')') depth--;
  }
  return depth === 0 && !inString && !/[=,+\-*/^(<>&]$/.test(raw.trim());
}
export function FormulaQuestion({ item, graded, onGraded }: QuestionProps<FormulaQItem>) {
  const sheets = item.workbook.sheets;
  const target = useMemo(() => collectTargets(sheets)[0], [sheets]);
  const [text, setText] = useState('=');
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<GridGradeResult | null>(null);
  const [showModel, setShowModel] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [caret, setCaret] = useState(1);
  const [focused, setFocused] = useState(false);
  const assistCtl = useFormulaAssist(text, caret, focused);
  const applyAssist = (result: { text: string; caret: number }) => {
    setText(result.text);
    setCaret(result.caret);
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(result.caret, result.caret));
  };

  const raw = normalizeCellInput(text === '=' ? '' : text);
  const attempt: GridAttempt = useMemo(() => ({ [target.sheet]: raw ? { [target.addr]: raw } : {} }), [target, raw]);
  // While a formula is half typed, keep the sheet blank instead of flashing an error (Excel shows nothing until you commit).
  const preview: GridAttempt = useMemo(() => (looksComplete(raw) ? attempt : { [target.sheet]: {} }), [attempt, raw, target]);

  const check = useCallback(
    (confidence: number | null, gaveUp = false) => {
      const res = gradeGrid(item, attempt, { seed: newSeed() });
      setResult(res);
      if (gaveUp) setShowModel(true);
      if (graded) return;
      const r = res.targets[0];
      onGraded({
        score: gaveUp ? 0 : res.score,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: gaveUp || res.passed ? undefined : r.category,
        given: raw || undefined,
        expected: r.modelFormula,
        detail: gaveUp ? 'Viewed the solution.' : res.passed ? undefined : r.message,
      });
    },
    [item, attempt, graded, hints, onGraded, raw],
  );

  const mark: Record<string, TargetStatus> = result ? { [`${target.sheet}!${target.addr}`]: result.targets[0].status } : {};

  return (
    <>
      <div className="q-prompt compact">{item.prompt}</div>
      <Grid sheets={sheets} value={result ? attempt : preview} onChange={() => undefined} feedback={mark} readOnly />
      <div className="num-row">
        <label className="confidence-label" htmlFor={`f-${item.id}`}>
          Formula for {target.id}
        </label>
        <div className="num-box" style={{ flex: 1, minWidth: 240 }}>
          <input
            id={`f-${item.id}`}
            ref={inputRef}
            className="mono"
            style={{ width: '100%' }}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
              if (graded) setResult(null);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              const used = assistCtl.handleKey(e.key);
              if (used) {
                e.preventDefault();
                if (used !== 'handled') applyAssist(used);
                return;
              }
              if (e.key === 'F4') {
                e.preventDefault();
                const el = e.currentTarget;
                const r = cycleRefAt(text, el.selectionStart ?? text.length);
                if (r) {
                  setText(r.text);
                  setCaret(r.caret);
                  requestAnimationFrame(() => el.setSelectionRange(r.caret, r.caret));
                }
              } else if (e.key === 'Enter' && graded) {
                e.preventDefault();
                check(null);
              }
            }}
            spellCheck={false}
            autoComplete="off"
            autoFocus
            aria-label={`Formula for ${target.id}`}
          />
        </div>
      </div>
      <AssistPopup controller={assistCtl} getAnchor={() => inputRef.current} onPick={applyAssist} />
      <p className="muted small" style={{ margin: 0 }}>
        The sheet shows your result as you type. Start typing a function name to see suggestions; F4 cycles the $ anchors on the
        reference at the cursor.
      </p>

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => check(c)} disabled={raw === ''} />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => check(null, true)} />
        </>
      )}

      {result && (
        <Feedback kind={result.passed ? 'ok' : 'bad'} title={result.passed ? 'Correct' : 'Not yet'}>
          <ResultsTable rows={result.targets} showModel={showModel} />
          <div className="row" style={{ marginTop: 10 }}>
            {graded && !result.passed && (
              <button type="button" className="btn small" onClick={() => check(null)}>
                Check again
              </button>
            )}
            {!showModel && (
              <button type="button" className="btn small" onClick={() => setShowModel(true)}>
                Show a model formula
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

// ---------------------------------------------------------------------------
// Error hunt: a finished model with planted bugs
// ---------------------------------------------------------------------------
export function ErrorHuntQuestion({ item, graded, onGraded }: QuestionProps<ErrorHuntItem>) {
  const sheets = item.workbook.sheets;
  const original = useMemo(() => buggyAttempt(item), [item]);
  const [attempt, setAttempt] = useState<GridAttempt>(original);
  const [result, setResult] = useState<ErrorHuntResult | null>(null);
  const [marks, setMarks] = useState<Record<string, TargetStatus>>({});
  const [hints, setHints] = useState(0);
  const [notes, setNotes] = useState<string[] | null>(null);

  const edited = useMemo(() => {
    let n = 0;
    for (const s of sheets) {
      const a = original[s.name] ?? {};
      const b = attempt[s.name] ?? {};
      for (const addr of Object.keys(a)) if ((a[addr] ?? '') !== (b[addr] ?? '')) n++;
    }
    return n;
  }, [sheets, original, attempt]);

  const onChange = useCallback(
    (next: GridAttempt) => {
      setMarks((prev) => clearStaleMarks(prev, sheets, attempt, next));
      setAttempt(next);
    },
    [sheets, attempt],
  );

  const check = useCallback(
    (confidence: number | null, opts: { gaveUp?: boolean; from?: GridAttempt } = {}) => {
      const res = gradeErrorHunt(item, opts.from ?? attempt, { seed: newSeed() });
      setResult(res);
      // Only mark the cells that matter: bug cells and anything the student broke.
      const show: Record<string, TargetStatus> = {};
      const first = sheets[0].name;
      for (const bug of item.bugs) {
        for (const c of Object.keys(bug.cells)) {
          const t = res.grid.targets.find((x) => x.sheet === (bug.sheet ?? first) && x.addr === c);
          if (t) show[`${t.sheet}!${t.addr}`] = t.status;
        }
      }
      for (const t of res.broken) show[`${t.sheet}!${t.addr}`] = t.status;
      setMarks(show);
      if (graded) return;
      const missed = res.bugs.find((b) => !b.fixed);
      const fixed = res.bugs.filter((b) => b.fixed).length;
      onGraded({
        score: opts.gaveUp ? 0 : res.score,
        confidence,
        hints,
        sawSolution: Boolean(opts.gaveUp),
        category: opts.gaveUp || res.score >= 0.999 ? undefined : (missed?.category ?? res.broken[0]?.category),
        given: `${fixed} of ${res.bugs.length} bugs fixed${res.broken.length ? `, ${res.broken.length} good cell${res.broken.length === 1 ? '' : 's'} broken` : ''}`,
        expected: `${res.bugs.length} of ${res.bugs.length} bugs fixed`,
        detail: opts.gaveUp
          ? 'Viewed the solution.'
          : missed
            ? `Missed in ${missed.cells.join(', ')}: ${missed.label}`
            : res.broken.length
              ? `${res.broken[0].id} was correct and is now wrong.`
              : undefined,
      });
    },
    [item, attempt, sheets, graded, hints, onGraded],
  );

  const onImported = useCallback(
    (task: ImportedTask) => {
      setNotes(task.warnings);
      setAttempt(task.attempt);
      check(null, { from: task.attempt });
    },
    [check],
  );

  const fixed = result?.bugs.filter((b) => b.fixed).length ?? 0;
  const n = item.bugs.length;

  return (
    <>
      <div className="q-prompt compact">{item.prompt}</div>
      <p className="muted" style={{ margin: 0 }}>
        This model has <strong>{n} bug{n === 1 ? '' : 's'}</strong>. A bug can cover several cells if a bad formula was filled
        across. Find each one and fix it in place. Turn on “Formulas” in the bar to audit quickly.
      </p>
      <GridLegend fill={false} />
      <Grid sheets={sheets} value={attempt} onChange={onChange} feedback={marks} plainTargets autoFocus />
      <GridShortcutHelp />
      <ExcelRoundTrip info={{ id: item.id, title: item.title }} sheets={sheets} prefill={original} onImported={onImported} />
      <ImportNotes notes={notes} />

      <div className="row">
        <button
          type="button"
          className="btn small ghost"
          onClick={() => {
            setAttempt(original);
            setMarks({});
          }}
          disabled={edited === 0}
        >
          Reset to the original model
        </button>
        <span className="muted small">
          {edited} cell{edited === 1 ? '' : 's'} changed so far
        </span>
      </div>

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => check(c)} disabled={edited === 0} label="Check my fixes. How sure are you that you found them all?" />
          <HintLadder
            hints={item.hints}
            used={hints}
            onUse={() => setHints((h) => h + 1)}
            onShowSolution={() => check(null, { gaveUp: true })}
          />
        </>
      )}

      {result && (
        <Feedback
          kind={result.score >= 0.999 ? 'ok' : fixed > 0 ? 'part' : 'bad'}
          title={`${fixed} of ${n} bug${n === 1 ? '' : 's'} fixed${result.broken.length ? `, and ${result.broken.length} good cell${result.broken.length === 1 ? '' : 's'} broken` : ''}`}
        >
          <table className="plain">
            <thead>
              <tr>
                <th>Bug</th>
                <th>Where</th>
                <th>What was wrong</th>
              </tr>
            </thead>
            <tbody>
              {result.bugs.map((b, i) => (
                <tr key={i}>
                  <td>
                    <span className={`status-pill ${b.fixed ? 'correct' : 'wrong'}`}>{b.fixed ? 'Fixed' : 'Missed'}</span>
                  </td>
                  <td>
                    <strong>{b.cells.length > 3 ? `${b.cells[0]} to ${b.cells[b.cells.length - 1]}` : b.cells.join(', ')}</strong>
                  </td>
                  <td>
                    <strong>{MISTAKE_LABELS[b.category]}. </strong>
                    {b.label}
                  </td>
                </tr>
              ))}
              {result.broken.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="status-pill wrong">Broken</span>
                  </td>
                  <td>
                    <strong>{t.id}</strong>
                  </td>
                  <td>
                    This cell was correct before you changed it. A model formula: <code>{t.modelFormula}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 10 }}>
            {graded && result.score < 0.999 && (
              <button type="button" className="btn small" onClick={() => check(null)}>
                Check again
              </button>
            )}
          </div>
          <p className="explain small" style={{ marginTop: 10 }}>
            {item.explanation}
          </p>
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Guided case: worked example -> partly filled -> blank sheet
// ---------------------------------------------------------------------------
export function CaseQuestion({ item, graded, onGraded }: QuestionProps<CaseQItem>) {
  const seen = useProgress((s) => s.cards[item.id]?.seen ?? 0);
  // The stage is fixed when the question opens; recording a result must not change it mid-attempt.
  const [stage, setStage] = useState<CaseStage>(() => caseStageFor(seen));
  const [stepIdx, setStepIdx] = useState(0);
  const [attempt, setAttempt] = useState<GridAttempt>({});
  const [result, setResult] = useState<GridGradeResult | null>(null);
  const [marks, setMarks] = useState<Record<string, TargetStatus>>({});
  const [showModel, setShowModel] = useState(false);
  const [hints, setHints] = useState(0);
  const [notes, setNotes] = useState<string[] | null>(null);

  const first = item.workbook.sheets[0].name;
  const sheets = useMemo(
    () => (stage === 'worked' ? solvedSheets(item.workbook.sheets) : caseSheets(item, stage)),
    [item, stage],
  );
  const mine = useMemo(() => new Set(studentSteps(item, stage)), [item, stage]);
  const gradeable = useMemo(() => ({ ...item, workbook: { sheets } }), [item, sheets]);
  const targetCount = useMemo(() => collectTargets(sheets).length, [sheets]);
  const filled = useMemo(
    () => collectTargets(sheets).filter((t) => (attempt[t.sheet]?.[t.addr] ?? '').trim() !== '').length,
    [sheets, attempt],
  );
  const step = item.steps[stepIdx];
  const stepSheet = step.sheet ?? first;
  const highlight = useMemo(() => new Set(step.cells.map((c) => `${stepSheet}!${c}`)), [step, stepSheet]);
  const stepFormulas = useMemo(() => {
    const spec = item.workbook.sheets.find((s) => s.name === stepSheet);
    return step.cells.slice(0, 6).map((c) => {
      const cell = spec?.cells[c];
      return { addr: c, formula: cell?.kind === 'target' ? cell.solution : '' };
    });
  }, [item, step, stepSheet]);

  const changeStage = (s: CaseStage) => {
    if (graded) return;
    setStage(s);
    setAttempt({});
    setMarks({});
    setResult(null);
    setStepIdx(0);
  };

  const onChange = useCallback(
    (next: GridAttempt) => {
      setMarks((prev) => clearStaleMarks(prev, sheets, attempt, next));
      setAttempt(next);
    },
    [sheets, attempt],
  );

  const check = useCallback(
    (confidence: number | null, opts: { gaveUp?: boolean; from?: GridAttempt } = {}) => {
      const res = gradeGrid(gradeable, opts.from ?? attempt, { seed: newSeed() });
      setResult(res);
      setMarks(Object.fromEntries(res.targets.map((t) => [`${t.sheet}!${t.addr}`, t.status])));
      if (opts.gaveUp) setShowModel(true);
      if (graded) return;
      const firstWrong = res.targets.find((t) => t.status === 'wrong' || t.status === 'empty');
      const right = res.targets.filter((t) => t.credit === 1).length;
      onGraded({
        score: opts.gaveUp ? 0 : res.score,
        confidence,
        hints,
        sawSolution: Boolean(opts.gaveUp),
        category: opts.gaveUp || res.passed ? undefined : res.mainCategory,
        given: `${CASE_STAGE_LABELS[stage]}: ${right} of ${res.targets.length} cells correct`,
        expected: `${res.targets.length} of ${res.targets.length}`,
        detail: opts.gaveUp ? 'Viewed the solution.' : firstWrong ? `${firstWrong.id}: ${firstWrong.message}` : undefined,
      });
    },
    [gradeable, attempt, graded, hints, onGraded, stage],
  );

  const onImported = useCallback(
    (task: ImportedTask) => {
      setNotes(task.warnings);
      setAttempt(task.attempt);
      check(null, { from: task.attempt });
    },
    [check],
  );

  const studied = () => {
    if (graded) return;
    // Reading a worked example is exposure, not mastery: partial credit, and it returns tomorrow partly filled.
    onGraded({ score: 0.5, credit: 0.5, quality: 3, confidence: null, hints: 0, sawSolution: false, given: 'Studied the worked example' });
  };

  const rightCount = result?.targets.filter((t) => t.credit === 1).length ?? 0;
  const wrongRows = result?.targets.filter((t) => t.status !== 'correct') ?? [];
  const lastStep = stepIdx === item.steps.length - 1;

  return (
    <>
      <div className="q-prompt compact">{item.prompt}</div>
      <div className="row">
        <span className="confidence-label">Scaffolding</span>
        <div className="seg" role="group" aria-label="Scaffolding level">
          {(['worked', 'partial', 'blank'] as const).map((s) => (
            <button key={s} type="button" className={stage === s ? 'on' : ''} onClick={() => changeStage(s)} disabled={graded}>
              {CASE_STAGE_LABELS[s]}
            </button>
          ))}
        </div>
        <span className="muted small">
          {stage === 'worked'
            ? 'First time: read each step and see how it is built.'
            : stage === 'partial'
              ? 'Second time: every other step is done for you.'
              : 'From now on: build the whole thing.'}
        </span>
      </div>

      <div className="case-layout">
        <div className="case-steps">
          <ol>
            {item.steps.map((s, i) => (
              <li key={i} className={i === stepIdx ? 'on' : ''}>
                <button type="button" onClick={() => setStepIdx(i)}>
                  <span className="case-step-n">{i + 1}</span>
                  <span>
                    {s.title}
                    {stage !== 'worked' && <small>{mine.has(i) ? 'Yours' : 'Done for you'}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="case-main">
          <div className="hints">
            <strong>
              Step {stepIdx + 1} of {item.steps.length}: {step.title}
            </strong>
            <p className="pre" style={{ margin: '6px 0 0' }}>
              {step.text}
            </p>
            {(stage === 'worked' || !mine.has(stepIdx) || showModel) && (
              <table className="plain" style={{ marginTop: 8 }}>
                <tbody>
                  {stepFormulas.map((f) => (
                    <tr key={f.addr}>
                      <td style={{ width: 60 }}>
                        <strong>{f.addr}</strong>
                      </td>
                      <td className="mono">{f.formula}</td>
                    </tr>
                  ))}
                  {step.cells.length > 6 && (
                    <tr>
                      <td colSpan={2} className="muted">
                        …and {step.cells.length - 6} more cells with the same pattern
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" className="btn small" onClick={() => setStepIdx((i) => Math.max(0, i - 1))} disabled={stepIdx === 0}>
                Previous step
              </button>
              <button type="button" className="btn small" onClick={() => setStepIdx((i) => Math.min(item.steps.length - 1, i + 1))} disabled={lastStep}>
                Next step
              </button>
            </div>
          </div>
          <GridLegend fill={stage !== 'worked'} />
          <Grid
            key={stage}
            sheets={sheets}
            value={attempt}
            onChange={onChange}
            feedback={marks}
            highlight={highlight}
            readOnly={stage === 'worked'}
          />
        </div>
      </div>

      {stage !== 'worked' && (
        <>
          <GridShortcutHelp />
          <ExcelRoundTrip info={{ id: item.id, title: item.title, variant: stage }} sheets={sheets} onImported={onImported} />
          <ImportNotes notes={notes} />
        </>
      )}

      {!graded && stage === 'worked' && (
        <div className="row">
          <button type="button" className="btn primary" onClick={studied} disabled={!lastStep}>
            I have worked through every step
          </button>
          {!lastStep && <span className="muted small">Go through all {item.steps.length} steps first.</span>}
        </div>
      )}

      {!graded && stage !== 'worked' && (
        <>
          <ConfidenceBar
            onPick={(c) => check(c)}
            disabled={filled === 0}
            label={`Check my work (${filled} of ${targetCount} cells filled). How sure are you?`}
          />
          <HintLadder
            hints={item.hints}
            used={hints}
            onUse={() => setHints((h) => h + 1)}
            onShowSolution={() => check(null, { gaveUp: true })}
          />
        </>
      )}

      {graded && stage === 'worked' && (
        <Feedback kind="info" title="Worked example studied">
          <p className="explain small">{item.explanation}</p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            It comes back tomorrow with every other step left for you, then as a blank sheet.
          </p>
        </Feedback>
      )}

      {result && (
        <Feedback
          kind={result.passed ? 'ok' : rightCount > 0 ? 'part' : 'bad'}
          title={result.passed ? `All ${result.targets.length} cells correct` : `${rightCount} of ${result.targets.length} cells correct`}
        >
          {(showModel ? result.targets : wrongRows).length > 0 && (
            <ResultsTable rows={showModel ? result.targets : wrongRows} showModel={showModel} />
          )}
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
