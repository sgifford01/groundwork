/** Flashcard, multiple-choice and numeric questions. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlashcardItem, McqItem, NumericItem } from '../../content/schema';
import { MISTAKE_LABELS } from '../../content/schema';
import { formatValue } from '../../engine/format';
import { seededRng } from '../../engine/rng';
import { renderTemplate, sampleVars } from '../../engine/variables';
import { buildMcqOptions, gradeNumeric, type NumericResult } from '../../grading/simple';
import { FLASHCARD_RATINGS } from '../../learn/sm2';
import { ConfidenceBar, Feedback, HintLadder, type QuestionProps } from './common';

// ---------------------------------------------------------------------------
// Flashcard: recall, flip, rate yourself
// ---------------------------------------------------------------------------
export function FlashcardQuestion({ item, seed, graded, onGraded }: QuestionProps<FlashcardItem>) {
  const values = useMemo(() => sampleVars(item.vars, seededRng(item.id, seed)), [item, seed]);
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState('');
  const [rated, setRated] = useState<string | null>(null);

  const rate = useCallback(
    (key: string) => {
      const r = FLASHCARD_RATINGS.find((x) => x.key === key);
      if (!r || graded) return;
      setRated(r.label);
      onGraded({
        score: r.credit,
        credit: r.credit,
        quality: r.quality,
        confidence: null,
        hints: 0,
        sawSolution: false,
        given: typed.trim() || undefined,
        category: r.credit === 0 ? 'concept' : undefined,
        detail: r.credit === 0 ? 'Could not recall this card.' : undefined,
      });
    },
    [graded, onGraded, typed],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && !graded) {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) {
          e.preventDefault();
          rate(FLASHCARD_RATINGS[n - 1].key);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, graded, rate]);

  return (
    <>
      <div className="flash">
        <div className="flash-side">Question</div>
        <div className="flash-text">{renderTemplate(item.prompt, values, item.vars)}</div>
        {!shown && (
          <textarea
            placeholder="Optional: type your answer before you flip. Answering in your head works too."
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Your answer (optional)"
          />
        )}
        {shown && (
          <>
            {typed.trim() && (
              <>
                <hr className="flash-divider" />
                <div className="flash-side">You wrote</div>
                <div className="flash-text muted">{typed}</div>
              </>
            )}
            <hr className="flash-divider" />
            <div className="flash-side">Answer</div>
            <div className="flash-text">{renderTemplate(item.answer, values, item.vars)}</div>
          </>
        )}
      </div>
      {!shown && (
        <div className="row">
          <button type="button" className="btn primary" onClick={() => setShown(true)}>
            Show answer
          </button>
          <span className="muted small">
            or press <kbd>Space</kbd>
          </span>
        </div>
      )}
      {shown && !graded && (
        <div>
          <div className="confidence-label" style={{ marginBottom: 8 }}>
            How did you do?
          </div>
          <div className="ratings">
            {FLASHCARD_RATINGS.map((r, i) => (
              <button key={r.key} type="button" className="btn rating" onClick={() => rate(r.key)}>
                <span>
                  <kbd>{i + 1}</kbd> {r.label}
                </span>
                <small>{r.hint}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {graded && rated && <div className="muted small">You rated this: {rated}</div>}
    </>
  );
}

// ---------------------------------------------------------------------------
// Multiple choice: every wrong option is a real misconception
// ---------------------------------------------------------------------------
export function McqQuestion({ item, seed, graded, onGraded }: QuestionProps<McqItem>) {
  const { values, options } = useMemo(() => {
    const rng = seededRng(item.id, seed);
    const v = sampleVars(item.vars, rng);
    return { values: v, options: buildMcqOptions(item, v, rng) };
  }, [item, seed]);
  const [picked, setPicked] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const correct = options.find((o) => o.correct)!;

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const opt = picked !== null ? options[picked] : null;
      const right = !gaveUp && opt !== null && opt.correct;
      onGraded({
        score: right ? 1 : 0,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: right || gaveUp ? undefined : opt?.category,
        given: opt?.text,
        expected: correct.text,
        detail: gaveUp ? 'Viewed the solution.' : right ? undefined : opt?.why,
      });
    },
    [graded, picked, options, hints, correct.text, onGraded],
  );

  useEffect(() => {
    if (graded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const i = 'abcdef'.indexOf(e.key.toLowerCase());
      if (i >= 0 && i < options.length) {
        e.preventDefault();
        setPicked(i);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [graded, options.length]);

  const pickedOpt = picked !== null ? options[picked] : null;

  return (
    <>
      <div className="q-prompt">{renderTemplate(item.prompt, values, item.vars)}</div>
      <div className="options" role="radiogroup" aria-label="Answer options">
        {options.map((o, i) => {
          const cls = ['option'];
          if (graded) {
            if (o.correct) cls.push('right');
            else if (i === picked) cls.push('wrong');
          } else if (i === picked) cls.push('picked');
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === picked}
              className={cls.join(' ')}
              disabled={graded}
              onClick={() => setPicked(i)}
            >
              <span className="option-key">{'ABCDEF'[i]}</span>
              <span>
                {o.text}
                {graded && i === picked && !o.correct && o.why && <div className="option-why">{o.why}</div>}
              </span>
            </button>
          );
        })}
      </div>

      {!graded && (
        <>
          <ConfidenceBar onPick={(c) => submit(c)} disabled={picked === null} hotkeys={picked !== null} />
          <HintLadder
            hints={item.hints}
            used={hints}
            onUse={() => setHints((h) => h + 1)}
            onShowSolution={() => submit(null, true)}
          />
        </>
      )}

      {graded && (
        <Feedback
          kind={pickedOpt?.correct ? 'ok' : 'bad'}
          title={pickedOpt?.correct ? 'Correct' : `The answer is ${correct.text}`}
        >
          <div className="explain">{renderTemplate(item.explanation, values, item.vars)}</div>
        </Feedback>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Numeric: fresh numbers every attempt, graded with a tolerance
// ---------------------------------------------------------------------------
const PREFIX: Record<string, string> = { usd: '$', usd2: '$' };
const SUFFIX: Record<string, string> = { pct: '%', pct1: '%', pct2: '%', mult: 'x' };

export function NumericQuestion({ item, seed, graded, onGraded }: QuestionProps<NumericItem>) {
  const values = useMemo(() => sampleVars(item.vars, seededRng(item.id, seed)), [item, seed]);
  const [typed, setTyped] = useState('');
  const [armed, setArmed] = useState(false);
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<NumericResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const submit = useCallback(
    (confidence: number | null, gaveUp = false) => {
      if (graded) return;
      const res = gradeNumeric(item, values, gaveUp ? '' : typed);
      setResult(res);
      const right = res.correct && !gaveUp;
      onGraded({
        score: right ? 1 : 0,
        confidence,
        hints,
        sawSolution: gaveUp,
        category: right || gaveUp ? undefined : res.category,
        given: res.parsed === null ? typed.trim() || undefined : formatValue(res.parsed, item.format),
        expected: res.expectedText,
        detail: gaveUp ? 'Viewed the solution.' : right ? undefined : res.message,
      });
    },
    [graded, item, values, typed, hints, onGraded],
  );

  return (
    <>
      <div className="q-prompt">{renderTemplate(item.prompt, values, item.vars)}</div>
      <div className="num-row">
        <div className="num-box">
          {PREFIX[item.format] && <span className="adorn">{PREFIX[item.format]}</span>}
          <input
            ref={inputRef}
            inputMode="decimal"
            value={typed}
            disabled={graded}
            placeholder="Your answer"
            aria-label="Your answer"
            onChange={(e) => {
              setTyped(e.target.value);
              setArmed(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && typed.trim()) {
                e.preventDefault();
                setArmed(true);
                inputRef.current?.blur();
              }
            }}
            autoComplete="off"
          />
          {SUFFIX[item.format] && <span className="adorn">{SUFFIX[item.format]}</span>}
        </div>
        {item.unit && <span className="muted">{item.unit}</span>}
      </div>

      {!graded && (
        <>
          <ConfidenceBar
            onPick={(c) => submit(c)}
            disabled={!typed.trim()}
            hotkeys={armed}
            label={armed ? 'How sure are you? Press 1 to 4.' : 'Lock in your answer. How sure are you?'}
          />
          <HintLadder
            hints={item.hints}
            used={hints}
            onUse={() => setHints((h) => h + 1)}
            onShowSolution={() => submit(null, true)}
          />
        </>
      )}

      {graded && result && (
        <Feedback kind={result.correct ? 'ok' : 'bad'} title={result.correct ? 'Correct' : `The answer is ${result.expectedText}`}>
          {!result.correct && result.parsed !== null && (
            <p>
              <strong>{result.category ? `${MISTAKE_LABELS[result.category]}: ` : ''}</strong>
              {result.message}
            </p>
          )}
          <div className="explain">{renderTemplate(item.explanation, values, item.vars)}</div>
        </Feedback>
      )}
    </>
  );
}
