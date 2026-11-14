/** Pieces shared by every question type: confidence buttons, the hint ladder, feedback boxes. */
import { useEffect, type ReactNode } from 'react';
import type { Item, MistakeCategory } from '../../content/schema';
import { CONFIDENCE_LEVELS, HINT_CREDIT, type Quality } from '../../learn/sm2';

/** What a question reports when it has been graded. */
export interface Outcome {
  score: number; // 0..1 before hint penalties
  confidence: number | null;
  hints: number;
  sawSolution: boolean;
  category?: MistakeCategory;
  given?: string;
  expected?: string;
  detail?: string;
  /** Flashcards rate themselves. */
  quality?: Quality;
  credit?: number;
}

export interface QuestionProps<T extends Item> {
  item: T;
  /** Changes the random numbers. A new seed is a fresh attempt. */
  seed: number;
  graded: boolean;
  onGraded: (outcome: Outcome) => void;
}

function typingTarget(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.closest('.xl') !== null;
}

/**
 * "How sure are you?" Asked before the answer is revealed. Picking a level is
 * also what submits the answer, so it costs no extra click.
 */
export function ConfidenceBar({
  onPick,
  disabled = false,
  label = 'Lock in your answer. How sure are you?',
  hotkeys = false,
}: {
  onPick: (confidence: number) => void;
  disabled?: boolean;
  label?: string;
  hotkeys?: boolean;
}) {
  useEffect(() => {
    if (!hotkeys || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (typingTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= CONFIDENCE_LEVELS.length) {
        e.preventDefault();
        onPick(n);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkeys, disabled, onPick]);

  return (
    <div className="confidence" role="group" aria-label="Confidence">
      <span className="confidence-label">{label}</span>
      {CONFIDENCE_LEVELS.map((c) => (
        <button key={c.value} type="button" className="btn" disabled={disabled} onClick={() => onPick(c.value)}>
          {hotkeys && <kbd>{c.value}</kbd>}
          {c.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Hint ladder: nudge -> concept -> partial formula -> full solution.
 * Each rung lowers the mastery credit for this attempt; the solution earns none.
 */
export function HintLadder({
  hints,
  used,
  onUse,
  onShowSolution,
  disabled = false,
}: {
  hints: string[];
  used: number;
  onUse: () => void;
  onShowSolution: () => void;
  disabled?: boolean;
}) {
  const more = used < hints.length;
  const nextCredit = Math.round((HINT_CREDIT[Math.min(used + 1, HINT_CREDIT.length - 1)] ?? 0.25) * 100);
  return (
    <div className="hints">
      <div className="row">
        {more ? (
          <button type="button" className="btn small" onClick={onUse} disabled={disabled}>
            {used === 0 ? 'Need a hint?' : 'Another hint'} ({used + 1} of {hints.length})
          </button>
        ) : (
          <button type="button" className="btn small" onClick={onShowSolution} disabled={disabled}>
            Show the solution
          </button>
        )}
        <span className="muted small">
          {more ? `Using it caps this question at ${nextCredit}% credit.` : 'Seeing the solution earns no credit, and the question comes back soon.'}
        </span>
      </div>
      {used > 0 && (
        <ol>
          {hints.slice(0, used).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function Feedback({
  kind,
  title,
  children,
}: {
  kind: 'ok' | 'bad' | 'part' | 'info';
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`feedback ${kind === 'info' ? '' : kind}`} role="status">
      <div className="feedback-title">{title}</div>
      {children}
    </div>
  );
}
