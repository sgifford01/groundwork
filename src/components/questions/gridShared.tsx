/** Pieces shared by every question that uses the spreadsheet. */
import { useEffect, useRef, useState } from 'react';
import { MISTAKE_LABELS, type SheetSpec } from '../../content/schema';
import { formatValue } from '../../engine/format';
import type { GridAttempt, TargetResult, TargetStatus } from '../../grading/gridGrader';
import { useProgress } from '../../store/progress';
import type { ImportedTask, TaskFileInfo } from '../../xlsx/taskFile';

export const STATUS_LABEL: Record<TargetStatus, string> = {
  correct: 'Correct',
  upstream: 'Formula OK',
  wrong: 'Wrong',
  empty: 'Blank',
};

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={ok ? 'pass' : 'fail'} title={`${label}: ${ok ? 'passed' : 'failed'}`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}

/** Cell-by-cell feedback: your entry, the three checks, what went wrong, and (optionally) a model formula. */
export function ResultsTable({ rows, showModel }: { rows: TargetResult[]; showModel: boolean }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="plain results">
        <thead>
          <tr>
            <th>Cell</th>
            <th>Result</th>
            <th>Your entry</th>
            <th>Checks</th>
            <th>What happened</th>
            {showModel && <th>A model formula</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.id}</strong>
              </td>
              <td>
                <span className={`status-pill ${r.status}`}>{STATUS_LABEL[r.status]}</span>
              </td>
              <td className="formula">
                {r.studentRaw || <span className="muted">(empty)</span>}
                {r.studentRaw.startsWith('=') && <div className="muted">= {formatValue(r.studentValue, r.format)}</div>}
              </td>
              <td>
                {r.status !== 'empty' && (
                  <div className="checklist">
                    <Check ok={r.checks.value} label="Value" />
                    <Check ok={r.checks.formula} label="Formula" />
                    <Check ok={r.checks.perturbation} label="Stress test" />
                  </div>
                )}
              </td>
              <td>
                {r.category && r.status === 'wrong' && <strong>{MISTAKE_LABELS[r.category]}. </strong>}
                {r.message}
              </td>
              {showModel && (
                <td className="formula">
                  {r.modelFormula}
                  <div className="muted">= {formatValue(r.keyValue, r.format)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GridLegend({ fill = true }: { fill?: boolean }) {
  return (
    <div className="legend" aria-label="Colour key">
      {fill && (
        <span>
          <i className="swatch" style={{ background: 'var(--cell-target)' }} /> Fill these in
        </span>
      )}
      <span>
        <i className="swatch" style={{ background: 'var(--cell-locked)' }} /> Locked
      </span>
      <span>
        <i className="swatch" style={{ color: 'var(--font-input)' }}>
          1
        </i>{' '}
        Blue: typed input
      </span>
      <span>
        <i className="swatch" style={{ color: 'var(--font-formula)' }}>
          f
        </i>{' '}
        Black: formula
      </span>
      <span>
        <i className="swatch" style={{ color: 'var(--font-link)' }}>
          f
        </i>{' '}
        Green: other sheet
      </span>
    </div>
  );
}

export function GridShortcutHelp() {
  const os = useProgress((s) => s.settings.os);
  const edit = os === 'mac' ? 'F2 or Ctrl+U' : 'F2';
  const f4 = os === 'mac' ? 'F4 (fn+F4 on a MacBook)' : 'F4';
  const cmd = os === 'mac' ? 'Cmd' : 'Ctrl';
  return (
    <details className="grid-help">
      <summary>Keyboard shortcuts</summary>
      <dl>
        <dt>
          <kbd>Enter</kbd> / <kbd>Tab</kbd>
        </dt>
        <dd>Commit and move down / right</dd>
        <dt>{edit}</dt>
        <dd>Edit the cell. Double-click works too.</dd>
        <dt>{f4}</dt>
        <dd>While editing, cycle $ anchors on the reference at the cursor. The $ button beside the formula bar does the same.</dd>
        <dt>Arrows or click</dt>
        <dd>After typing =, +, ( or a comma, point at a cell to insert its reference</dd>
        <dt>Ctrl+R / Ctrl+D</dt>
        <dd>Fill right / fill down across the selection (references shift like Excel)</dd>
        <dt>
          {cmd}+C, {cmd}+V
        </dt>
        <dd>Copy and paste, with references shifting</dd>
        <dt>{cmd}+Z</dt>
        <dd>Undo</dd>
        <dt>Ctrl+`</dt>
        <dd>Show formulas instead of values</dd>
        <dt>Function help</dt>
        <dd>
          Type = and the first letters of a function for a list (Tab inserts it). Inside the brackets, the argument template
          appears.{' '}
          <a href="#/functions" target="_blank" rel="noreferrer">
            Open the Functions guide
          </a>
        </dd>
      </dl>
    </details>
  );
}

/**
 * "Do it in real Excel": download the task as .xlsx, complete it in Excel,
 * save, and upload it here to be graded the same way as the in-app sheet.
 */
export function ExcelRoundTrip({
  info,
  sheets,
  prefill,
  onImported,
}: {
  info: TaskFileInfo;
  sheets: SheetSpec[];
  prefill?: GridAttempt;
  onImported: (task: ImportedTask) => void;
}) {
  const hasExcel = useProgress((s) => s.settings.excel !== 'none');
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function download() {
    setBusy(true);
    setError('');
    try {
      const { exportTask, saveFile } = await import('../../xlsx/taskFile');
      const data = await exportTask(info, sheets, prefill);
      saveFile(data, `${info.id}${info.variant ? `-${info.variant}` : ''}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the file.');
    }
    setBusy(false);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { importTask } = await import('../../xlsx/taskFile');
      onImported(await importTask(await file.arrayBuffer(), sheets, info.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    }
    if (fileRef.current) fileRef.current.value = '';
    setBusy(false);
  }

  return (
    <details className="grid-help">
      <summary>Do it in real Excel</summary>
      <p style={{ margin: '8px 0' }}>
        Download the task, fill in the yellow cells in Excel, save, then upload the file. Your formulas are graded
        exactly as they would be here, including the stress test.
        {!hasExcel && ' (Your profile says you have no desktop Excel. Excel for the web or LibreOffice also work.)'}
      </p>
      <div className="row">
        <button type="button" className="btn small" onClick={download} disabled={busy}>
          Download .xlsx
        </button>
        <button type="button" className="btn small" onClick={() => fileRef.current?.click()} disabled={busy}>
          Upload completed .xlsx
        </button>
        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => upload(e.target.files?.[0])} />
        {busy && <span className="muted small">Working…</span>}
      </div>
      {error && (
        <div className="toast error" style={{ marginTop: 8 }} role="alert">
          {error}
        </div>
      )}
    </details>
  );
}

/** Notes from reading an uploaded file: unevaluable formulas, changed inputs, value differences. */
export function ImportNotes({ notes }: { notes: string[] | null }) {
  if (notes === null) return null;
  return (
    <div className="toast" role="status">
      <strong>Graded from your Excel file.</strong>
      {notes.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Counts down from `seconds`; calls onDone once when it reaches zero. */
export function useCountdown(seconds: number, running: boolean, onDone: () => void): number {
  const [left, setLeft] = useState(seconds);
  const done = useRef(onDone);
  done.current = onDone;
  const fired = useRef(false);
  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const startLeft = left;
    const id = window.setInterval(() => {
      const next = Math.max(0, startLeft - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(next);
      if (next === 0 && !fired.current) {
        fired.current = true;
        done.current();
      }
    }, 250);
    return () => window.clearInterval(id);
    // restart only when `running` flips; `left` is read once at start on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  return left;
}

export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
