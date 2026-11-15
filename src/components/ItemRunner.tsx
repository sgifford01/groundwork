/**
 * Runs one question from start to finish: shows it, records the graded result
 * (spaced-repetition card + attempt log), then offers "Next".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_TYPE_LABELS, type Item, type ItemType } from '../content/schema';
import { CATEGORY_LEVELS, categoryBySlug, CORE_CATEGORY } from '../content/categories/registry';
import { LEVELS } from '../content/topics';
import { topicLabel } from '../learn/category';
import { describeInterval, type CardState } from '../learn/sm2';
import { useProgress } from '../store/progress';
import type { Outcome } from './questions/common';
import { DocReviewQuestion, JudgmentQuestion, PlanQuestion } from './questions/CategoryQuestions';
import { GridQuestion } from './questions/GridQuestion';
import { LeaseSimQuestion } from './questions/LeaseQuestion';
import {
  EstimateQuestion,
  ExplainQuestion,
  GoNoGoQuestion,
  OrderQuestion,
  PredictQuestion,
  ShortcutQuestion,
} from './questions/OtherQuestions';
import { CaseQuestion, ErrorHuntQuestion, FormulaQuestion } from './questions/SheetQuestions';
import { FlashcardQuestion, McqQuestion, NumericQuestion } from './questions/SimpleQuestions';

/** Types where the keyboard should stay with the sheet or text box after grading. */
const KEEP_FOCUS: ItemType[] = ['grid', 'timed', 'errorhunt', 'case', 'formula', 'plan', 'docreview', 'leasesim'];

export interface RunnerResult {
  itemId: string;
  score: number;
  credit: number;
  ms: number;
  nextDue: string;
}

export function ItemRunner({
  item,
  seed,
  onNext,
  nextLabel = 'Next',
  onSkip,
  onResult,
}: {
  item: Item;
  seed: number;
  onNext: () => void;
  nextLabel?: string;
  onSkip?: () => void;
  onResult?: (r: RunnerResult) => void;
}) {
  const record = useProgress((s) => s.record);
  const [done, setDone] = useState<{ card: CardState; outcome: Outcome } | null>(null);
  const started = useRef(Date.now());
  const nextRef = useRef<HTMLButtonElement>(null);

  const onGraded = useCallback(
    (outcome: Outcome) => {
      if (done) return;
      const ms = Date.now() - started.current;
      const card = record({
        itemId: item.id,
        topic: item.topic,
        type: item.type,
        level: item.level,
        score: outcome.score,
        confidence: outcome.confidence,
        hints: outcome.hints,
        sawSolution: outcome.sawSolution,
        ms,
        category: outcome.category,
        given: outcome.given,
        expected: outcome.expected,
        detail: outcome.detail,
        quality: outcome.quality,
        credit: outcome.credit,
      });
      setDone({ card, outcome });
      onResult?.({
        itemId: item.id,
        score: outcome.score,
        credit: card.mastery,
        ms,
        nextDue: describeInterval(card, Date.now()),
      });
    },
    [done, item, record, onResult],
  );

  // After grading, Enter moves on (except where Enter belongs to a sheet or a text box).
  useEffect(() => {
    if (!done) return;
    if (!KEEP_FOCUS.includes(item.type)) nextRef.current?.focus({ preventScroll: true });
  }, [done, item.type]);

  const graded = done !== null;
  const isCore = item.category === CORE_CATEGORY;
  const levelName = isCore ? LEVELS.find((l) => l.level === item.level)?.name : CATEGORY_LEVELS[item.level];

  return (
    <div className="q">
      <div className="q-head">
        <span className="chip accent">{isCore ? `L${item.level}` : (categoryBySlug(item.category)?.title ?? item.category)}</span>
        <span className="chip">{topicLabel(item.topic)}</span>
        <span className="chip">{ALL_TYPE_LABELS[item.type]}</span>
        <span className="q-title">{item.title}</span>
        <span className="muted small" style={{ marginLeft: 'auto' }}>
          {levelName}
        </span>
      </div>

      {item.type === 'flashcard' && <FlashcardQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'mcq' && <McqQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'numeric' && <NumericQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {(item.type === 'grid' || item.type === 'timed') && <GridQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'formula' && <FormulaQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'errorhunt' && <ErrorHuntQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'case' && <CaseQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'predict' && <PredictQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'estimate' && <EstimateQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'order' && <OrderQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'explain' && <ExplainQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'gonogo' && <GoNoGoQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'shortcut' && <ShortcutQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'judgment' && <JudgmentQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'docreview' && <DocReviewQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'plan' && <PlanQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}
      {item.type === 'leasesim' && <LeaseSimQuestion item={item} seed={seed} graded={graded} onGraded={onGraded} />}

      {item.verifiedAsOf && item.sourceUrl && (
        <div className="q-source">
          Checked on {item.verifiedAsOf} against{' '}
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            this source
          </a>
          . Rules and conventions change, so confirm before relying on it.
        </div>
      )}

      <div className="q-foot">
        <span className="muted small">
          {done ? `Comes back ${describeInterval(done.card, Date.now())}.` : ''}
        </span>
        <div className="row">
          {!graded && onSkip && (
            <button type="button" className="btn ghost" onClick={onSkip}>
              Skip
            </button>
          )}
          {graded && (
            <button ref={nextRef} type="button" className="btn primary" onClick={onNext}>
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
