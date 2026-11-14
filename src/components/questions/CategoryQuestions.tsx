/**
 * The three question types used outside the core course:
 * scenario judgment, document review and plan reading.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { MISTAKE_LABELS, type DocReviewItem, type JudgmentItem, type PlanQItem } from '../../content/schema';
import { formatValue } from '../../engine/format';
import { seededRng } from '../../engine/rng';
import { renderTemplate, sampleVars } from '../../engine/variables';
import {
  gradeDocReview,
  gradeLocate,
  gradeMeasure,
  identifyOptions,
  JUDGMENT_LABEL,
  JUDGMENT_SCORE,
  judgmentOptions,
  matchingElements,
  planFor,
  renderDocument,
  type DocReviewResult,
  type LocateResult,
} from '../../grading/category';
import type { NumericResult } from '../../grading/simple';
import { PlanViewer } from '../plan/PlanViewer';
import { ConfidenceBar, Feedback, HintLadder, type QuestionProps } from './common';

// ---------------------------------------------------------------------------
// Scenario judgment: choose the best response; every option is explained after
// ---------------------------------------------------------------------------
export function JudgmentQuestion({ item, seed, graded, onGraded }: QuestionProps<JudgmentItem>) {
  const { values, options } = useMemo(() => {
    const rng = seededRng(item.id, seed);
    const v = sampleVars(item.vars, rng);
    return { values: v, options: judgmentOptions(item, v, rng) };
  }, [item, seed]);
  const [picked, setPicked] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const best = options.find((o) => o.rating === 'best')!;

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const opt = picked !== null ? options[picked] : null;
      const score = gaveUp || !opt ? 0 : JUDGMENT_SCORE[opt.rating];
      onGraded({
        score,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: score === 1 || gaveUp ? undefined : (opt?.category ?? 'concept'),
        given: opt?.text,
        expected: best.text,
        detail: gaveUp ? 'Viewed the solution.' : score === 1 ? undefined : opt?.why,
      });
    },
    [graded, picked, options, hints, best.text, onGraded],
  );

  const pickedOpt = picked !== null ? options[picked] : null;

  return (
    <>
      <div className="q-prompt">{renderTemplate(item.prompt, values, item.vars)}</div>
      <div className="options" role="radiogroup" aria-label="Possible responses">
        {options.map((o, i) => {
          const cls = ['option'];
          if (graded) cls.push(o.rating === 'best' ? 'right' : o.rating === 'acceptable' ? 'partial' : i === picked ? 'wrong' : '');
          else if (i === picked) cls.push('picked');
          return (
            <button key={i} type="button" role="radio" aria-checked={i === picked} className={cls.join(' ')} disabled={graded} onClick={() => setPicked(i)}>
              <span className="option-key">{'ABCDE'[i]}</span>
              <span>
                {o.text}
                {graded && (
                  <div className="option-why">
                    <strong>
                      {JUDGMENT_LABEL[o.rating]}
                      {i === picked ? ' (your choice)' : ''}.
                    </strong>{' '}
                    {o.why}
                  </div>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => submit(c)} disabled={picked === null} hotkeys={picked !== null} />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => submit(null, true)} />
        </>
      )}

      {graded && (
        <Feedback
          kind={pickedOpt?.rating === 'best' ? 'ok' : pickedOpt?.rating === 'acceptable' ? 'part' : 'bad'}
          title={pickedOpt?.rating === 'best' ? 'Best response' : pickedOpt?.rating === 'acceptable' ? 'Workable, half credit' : 'Not the best response'}
        >
          <div className="explain">{renderTemplate(item.explanation, values, item.vars)}</div>
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Document review: flag the lines that contain a problem
// ---------------------------------------------------------------------------
export function DocReviewQuestion({ item, seed, graded, onGraded }: QuestionProps<DocReviewItem>) {
  const doc = useMemo(() => renderDocument(item, seed), [item, seed]);
  const [flags, setFlags] = useState<string[]>([]);
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<DocReviewResult | null>(null);
  const columns = item.document.columns;
  const issueOf = (lineId: string) => item.issues.findIndex((i) => i.lines.includes(lineId));

  const toggle = (id: string) => setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const res = gradeDocReview(item, gaveUp ? [] : flags);
      setResult(res);
      const missed = item.issues.findIndex((_, i) => !res.found[i]);
      const text = (id: string) => doc.lines.find((l) => l.id === id)?.text ?? id;
      onGraded({
        score: gaveUp ? 0 : res.score,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: gaveUp || res.score >= 0.999 ? undefined : missed >= 0 ? item.issues[missed].category : 'concept',
        given: flags.length ? flags.map(text).join('; ') : '(nothing flagged)',
        expected: item.issues.map((i) => text(i.lines[0])).join('; '),
        detail: gaveUp
          ? 'Viewed the solution.'
          : res.score >= 0.999
            ? undefined
            : missed >= 0
              ? `Missed: ${doc.issues[missed].label}`
              : `Flagged ${res.falseFlags.length} line${res.falseFlags.length === 1 ? '' : 's'} that had no problem.`,
      });
    },
    [graded, item, flags, hints, doc, onGraded],
  );

  const rowClass = (id: string): string => {
    const flagged = flags.includes(id);
    if (!graded) return flagged ? 'flagged' : '';
    const issue = issueOf(id);
    if (issue >= 0) return flagged ? 'hit' : result && !result.found[issue] ? 'missed' : 'issue';
    return flagged ? 'false-flag' : '';
  };

  const flagButton = (id: string, label: string) => (
    <button
      type="button"
      className={`flag${flags.includes(id) ? ' on' : ''}`}
      aria-pressed={flags.includes(id)}
      aria-label={`Flag: ${label}`}
      disabled={graded}
      onClick={() => toggle(id)}
    >
      ⚑
    </button>
  );

  return (
    <>
      <div className="q-prompt">{renderTemplate(item.prompt, doc.values, item.vars)}</div>
      <div className="doc" role="group" aria-label={item.document.title}>
        <div className="doc-head">
          <span className="doc-kind">{item.document.kind}</span>
          <strong>{item.document.title}</strong>
        </div>
        {columns ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="doc-table">
              <thead>
                <tr>
                  <th aria-label="Flag" />
                  {columns.map((c, i) => (
                    <th key={c} className={i === 0 || i === columns.length - 1 ? 'left' : ''}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((l) => (
                  <tr key={l.id} className={`${l.heading ? 'heading ' : ''}${rowClass(l.id)}`}>
                    <td>{!l.heading && flagButton(l.id, l.text)}</td>
                    <td className="left">{l.text}</td>
                    {l.cells.map((c, i) => (
                      <td key={i} className={i === l.cells.length - 1 && columns.length > 2 ? 'left note' : ''}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ol className="doc-lines">
            {doc.lines.map((l) => (
              <li key={l.id} className={`${l.heading ? 'heading ' : ''}${rowClass(l.id)}`}>
                {!l.heading && flagButton(l.id, l.text)}
                <span>{l.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {!graded && (
        <>
          <p className="muted small" style={{ margin: '10px 0 0' }}>
            Flag every line with a problem. A wrong flag cancels a right one, so flag only what you can explain.
            {` ${flags.length} flagged.`}
          </p>
          <ConfidenceBar onPick={(c) => submit(c)} disabled={flags.length === 0} />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => submit(null, true)} />
        </>
      )}

      {graded && result && (
        <Feedback
          kind={result.score >= 0.999 ? 'ok' : result.score > 0 ? 'part' : 'bad'}
          title={`Found ${result.found.filter(Boolean).length} of ${item.issues.length} problems${result.falseFlags.length ? `, with ${result.falseFlags.length} wrong flag${result.falseFlags.length === 1 ? '' : 's'}` : ''}`}
        >
          <ul className="doc-issues">
            {doc.issues.map((issue, i) => (
              <li key={i} className={result.found[i] ? 'found' : 'missed'}>
                <strong>
                  {result.found[i] ? 'Found' : 'Missed'} · {doc.lines.find((l) => l.id === issue.lines[0])?.text} ({MISTAKE_LABELS[issue.category]}).
                </strong>{' '}
                {issue.label}
              </li>
            ))}
          </ul>
          <div className="explain">{renderTemplate(item.explanation, doc.values, item.vars)}</div>
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Plan reading: click, measure or name something on a generated drawing
// ---------------------------------------------------------------------------
const PREFIX: Record<string, string> = { usd: '$', usd2: '$' };
const SUFFIX: Record<string, string> = { pct: '%', pct1: '%', pct2: '%', mult: 'x' };

export function PlanQuestion({ item, seed, graded, onGraded }: QuestionProps<PlanQItem>) {
  const set = useMemo(() => planFor(item, seed), [item, seed]);
  const task = item.task;
  const [sheetId, setSheetId] = useState(item.plan.sheet);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const [locate, setLocate] = useState<LocateResult | null>(null);
  const [numeric, setNumeric] = useState<NumericResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => (task.kind === 'identify' ? identifyOptions(item, seededRng(item.id, seed, 'options')) : []), [item, seed, task.kind]);
  const targets = useMemo(() => (task.kind === 'locate' ? matchingElements(set, task.targets) : []), [set, task]);
  const highlighted = useMemo(() => (task.kind === 'identify' ? matchingElements(set, [task.highlight]).map((e) => e.id) : []), [set, task]);
  const text = (s: string) => renderTemplate(s, set.facts, []);

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const common = { confidence, hints, sawSolution: gaveUp };
      if (task.kind === 'locate') {
        const res = gradeLocate(item, set, gaveUp ? null : picked);
        setLocate(res);
        const right = res.correct && !gaveUp;
        onGraded({
          ...common,
          score: right ? 1 : 0,
          category: right || gaveUp ? undefined : res.category,
          given: res.picked,
          expected: targets[0]?.name,
          detail: gaveUp ? 'Viewed the solution.' : right ? undefined : res.message,
        });
        const first = targets[0];
        if (first && !right) {
          const home = set.sheets.find((s) => s.elements.includes(first));
          if (home) setSheetId(home.id);
        }
      } else if (task.kind === 'measure') {
        const res = gradeMeasure(item, set, gaveUp ? '' : typed);
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
      } else {
        const opt = choice !== null ? options[choice] : null;
        const right = !gaveUp && Boolean(opt?.correct);
        onGraded({
          ...common,
          score: right ? 1 : 0,
          category: right || gaveUp ? undefined : opt?.category,
          given: opt?.text,
          expected: task.correct,
          detail: gaveUp ? 'Viewed the solution.' : right ? undefined : opt?.why,
        });
      }
    },
    [graded, task, item, set, picked, typed, choice, options, hints, targets, onGraded],
  );

  const reveal = !graded
    ? null
    : task.kind === 'locate'
      ? { good: targets.map((t) => t.id), bad: picked && !locate?.correct ? [picked] : [] }
      : { good: highlighted, bad: [] };
  const ready = task.kind === 'locate' ? picked !== null : task.kind === 'measure' ? typed.trim() !== '' : choice !== null;
  const chosen = choice !== null ? options[choice] : null;
  const right = task.kind === 'locate' ? Boolean(locate?.correct) : task.kind === 'measure' ? Boolean(numeric?.correct) : Boolean(chosen?.correct);

  return (
    <>
      <div className="q-prompt">{text(item.prompt)}</div>
      <PlanViewer
        set={set}
        sheetId={sheetId}
        onSheetChange={setSheetId}
        pick={task.kind === 'locate'}
        selected={picked}
        onPick={setPicked}
        highlight={highlighted}
        reveal={reveal}
        tool={task.kind === 'measure' ? task.tool : 'real'}
      />

      {task.kind === 'measure' && (
        <div className="num-row" style={{ marginTop: 14 }}>
          <div className="num-box">
            {PREFIX[task.format] && <span className="adorn">{PREFIX[task.format]}</span>}
            <input
              ref={inputRef}
              inputMode="decimal"
              value={typed}
              disabled={graded}
              placeholder="Your answer"
              aria-label="Your answer"
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
            {SUFFIX[task.format] && <span className="adorn">{SUFFIX[task.format]}</span>}
          </div>
          {task.unit && <span className="muted">{task.unit}</span>}
        </div>
      )}

      {task.kind === 'identify' && (
        <div className="options" role="radiogroup" aria-label="Answer options" style={{ marginTop: 14 }}>
          {options.map((o, i) => {
            const cls = ['option'];
            if (graded) {
              if (o.correct) cls.push('right');
              else if (i === choice) cls.push('wrong');
            } else if (i === choice) cls.push('picked');
            return (
              <button key={i} type="button" role="radio" aria-checked={i === choice} className={cls.join(' ')} disabled={graded} onClick={() => setChoice(i)}>
                <span className="option-key">{'ABCDE'[i]}</span>
                <span>
                  {o.text}
                  {graded && i === choice && !o.correct && o.why && <div className="option-why">{o.why}</div>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => submit(c)} disabled={!ready} />
          <HintLadder hints={item.hints} used={hints} onUse={() => setHints((h) => h + 1)} onShowSolution={() => submit(null, true)} />
        </>
      )}

      {graded && (
        <Feedback
          kind={right ? 'ok' : 'bad'}
          title={
            right
              ? 'Correct'
              : task.kind === 'locate'
                ? `Not quite. The right answer is outlined in green: ${targets[0]?.name ?? ''}`
                : task.kind === 'measure'
                  ? `The answer is ${numeric?.expectedText ?? ''}`
                  : `The answer is ${task.correct}`
          }
        >
          {!right && task.kind === 'locate' && locate?.message && <p>{locate.message}</p>}
          {!right && task.kind === 'measure' && numeric && numeric.parsed !== null && (
            <p>
              <strong>{numeric.category ? `${MISTAKE_LABELS[numeric.category]}: ` : ''}</strong>
              {numeric.message}
            </p>
          )}
          <div className="explain">{text(item.explanation)}</div>
        </Feedback>
      )}
    </>
  );
}
