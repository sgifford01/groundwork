/**
 * Plan to spreadsheet: a drawing above a grid. Some yellow cells are filled
 * with numbers read off the drawing (takeoffs); the rest are formulas built on
 * them. Grading is in src/grading/plangrid.ts and reuses the grid grader
 * unchanged.
 */
import { useCallback, useMemo, useState } from 'react';
import type { PlanGridItem } from '../../content/schema';
import { formatValue } from '../../engine/format';
import { newSeed } from '../../engine/rng';
import { renderTemplate } from '../../engine/variables';
import { collectTargets, type GridAttempt, type TargetStatus } from '../../grading/gridGrader';
import { displaySheets, figureFor, gradePlanGrid, type PlanGridResult, type TakeoffResult } from '../../grading/plangrid';
import { Grid } from '../grid/Grid';
import { PlanViewer } from '../plan/PlanViewer';
import { ConfidenceBar, Feedback, HintLadder, type QuestionProps } from './common';
import { clearStaleMarks } from './GridQuestion';
import { GridLegend, GridShortcutHelp, ResultsTable, STATUS_LABEL } from './gridShared';

function TakeoffTable({ rows }: { rows: TakeoffResult[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="plain results">
        <thead>
          <tr>
            <th>Cell</th>
            <th>Taken off the drawing</th>
            <th>Result</th>
            <th>Your entry</th>
            <th>The drawing gives</th>
            <th>What happened</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.id}</strong>
              </td>
              <td>{r.label}</td>
              <td>
                <span className={`status-pill ${r.status}`}>{r.status === 'correct' ? 'Correct' : STATUS_LABEL[r.status]}</span>
              </td>
              <td className="formula">
                {r.raw || <span className="muted">(empty)</span>}
                {r.raw.trim().startsWith('=') && <div className="muted">= {formatValue(r.studentValue, r.format)}</div>}
              </td>
              <td>{r.expectedText}</td>
              <td>{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlanGridQuestion({ item, seed, graded, onGraded }: QuestionProps<PlanGridItem>) {
  const set = useMemo(() => figureFor(item, seed), [item, seed]);
  const sheets = useMemo(() => displaySheets(item, set), [item, set]);
  const cellCount = useMemo(() => collectTargets(sheets).length, [sheets]);
  const [sheetId, setSheetId] = useState(item.figure.sheet);
  const [attempt, setAttempt] = useState<GridAttempt>({});
  const [result, setResult] = useState<PlanGridResult | null>(null);
  const [marks, setMarks] = useState<Record<string, TargetStatus>>({});
  const [showModel, setShowModel] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hints, setHints] = useState(0);
  const text = (s: string) => renderTemplate(s, set.facts, []);

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
    (confidence: number | null, gaveUp = false) => {
      const res = gradePlanGrid(item, set, attempt, { seed: newSeed() });
      setResult(res);
      setMarks(
        Object.fromEntries([
          ...res.grid.targets.map((t) => [`${t.sheet}!${t.addr}`, t.status] as const),
          ...res.takeoffs.map((t) => [`${t.sheet}!${t.addr}`, t.status] as const),
        ]),
      );
      if (gaveUp) setShowModel(true);
      if (graded) return; // later checks are for learning; only the first one is recorded
      const total = res.grid.targets.length + res.takeoffs.length;
      const right = res.grid.targets.filter((t) => t.credit === 1).length + res.takeoffs.filter((t) => t.correct).length;
      const firstWrongTakeoff = res.takeoffs.find((t) => !t.correct);
      const firstWrongCell = res.grid.targets.find((t) => t.status === 'wrong' || t.status === 'empty');
      onGraded({
        score: gaveUp ? 0 : res.score,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: gaveUp || res.passed ? undefined : res.mainCategory,
        given: `${right} of ${total} cells correct`,
        expected: `${total} of ${total}`,
        detail: gaveUp
          ? 'Viewed the solution.'
          : firstWrongTakeoff
            ? `${firstWrongTakeoff.id} (${firstWrongTakeoff.label}): ${firstWrongTakeoff.message}`
            : firstWrongCell
              ? `${firstWrongCell.id}: ${firstWrongCell.message}`
              : undefined,
      });
    },
    [item, set, attempt, graded, hints, onGraded],
  );

  const takeoffRows = result ? (showAll || showModel ? result.takeoffs : result.takeoffs.filter((t) => !t.correct)) : [];
  const wrongCells = result?.grid.targets.filter((t) => t.status !== 'correct') ?? [];
  const cellRows = result ? (showAll || showModel ? result.grid.targets : wrongCells) : [];
  const right = result ? result.grid.targets.filter((t) => t.credit === 1).length + result.takeoffs.filter((t) => t.correct).length : 0;
  const total = result ? result.grid.targets.length + result.takeoffs.length : 0;

  return (
    <>
      <div className="q-prompt compact">{text(item.prompt)}</div>
      <PlanViewer set={set} sheetId={sheetId} onSheetChange={setSheetId} tool="real" />

      <GridLegend />
      <Grid sheets={sheets} value={attempt} onChange={onChange} feedback={marks} />
      <GridShortcutHelp />

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => check(c)} disabled={filled === 0} label={`Check my work (${filled} of ${cellCount} cells filled). How sure are you?`} />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => check(null, true)} />
        </>
      )}

      {result && (
        <Feedback kind={result.passed ? 'ok' : right > 0 ? 'part' : 'bad'} title={result.passed ? `All ${total} cells correct` : `${right} of ${total} cells correct`}>
          <p className="small">
            Numbers taken off the drawing are checked against the drawing. Formula cells are checked three ways (value, real formula, stress test) as if
            every number from the drawing were right, so a miscount costs only its own cell.
          </p>
          {takeoffRows.length > 0 && (
            <>
              <h4 className="results-head">Numbers from the drawing</h4>
              <TakeoffTable rows={takeoffRows} />
            </>
          )}
          {cellRows.length > 0 && (
            <>
              <h4 className="results-head">Formula cells</h4>
              <ResultsTable rows={cellRows} showModel={showModel} />
            </>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            {graded && (
              <button type="button" className="btn small" onClick={() => check(null)}>
                Check again
              </button>
            )}
            {!showModel && (
              <button type="button" className="btn small" onClick={() => setShowModel(true)}>
                Show the answers
              </button>
            )}
            {!showModel && !result.passed && right > 0 && (
              <button type="button" className="btn small ghost" onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Show only problem cells' : 'Show every cell'}
              </button>
            )}
          </div>
          {(result.passed || showModel) && (
            <p className="explain small" style={{ marginTop: 10 }}>
              {text(item.explanation)}
            </p>
          )}
        </Feedback>
      )}
    </>
  );
}
