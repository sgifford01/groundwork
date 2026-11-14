/**
 * Spaced repetition, SM-2 style.
 *
 * Each question has a card. After every attempt the card gets a quality score
 * from 0 to 5. Good answers push the next review further out (1 day, 6 days,
 * then multiplied by the card's "ease"). A miss resets the card so it comes
 * back within minutes.
 */

export interface CardState {
  ease: number; // how quickly intervals grow (starts at 2.5, never below 1.3)
  interval: number; // days until the next review
  reps: number; // successful reviews in a row
  lapses: number; // times it was missed after being learned
  due: number; // when it is next due (ms since 1970)
  last: number; // when it was last reviewed
  seen: number; // total attempts
  correct: number; // total fully-correct attempts
  mastery: number; // 0..1, recent performance with hint penalties applied
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

const DAY = 24 * 60 * 60 * 1000;
const RETRY_DELAY = 10 * 60 * 1000;

export function newCard(): CardState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0, last: 0, seen: 0, correct: 0, mastery: 0 };
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * @param quality 0-5 (below 3 counts as a miss)
 * @param credit  0-1 mastery credit for this attempt (score x hint penalty)
 */
export function review(card: CardState, quality: Quality, credit: number, now: number): CardState {
  const next: CardState = { ...card, last: now, seen: card.seen + 1 };
  if (credit >= 0.999) next.correct = card.correct + 1;

  next.ease = Math.max(1.3, card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality < 3) {
    if (card.reps > 0) next.lapses = card.lapses + 1;
    next.reps = 0;
    next.interval = 0;
    next.due = now + RETRY_DELAY;
  } else {
    if (card.reps === 0) next.interval = 1;
    else if (card.reps === 1) next.interval = 6;
    else next.interval = Math.round(card.interval * next.ease);
    if (quality === 3 && card.reps >= 1) next.interval = Math.max(1, Math.round(next.interval * 0.6));
    if (quality === 5) next.interval = Math.round(next.interval * 1.3) || 1;
    next.reps = card.reps + 1;
    next.due = startOfDay(now) + next.interval * DAY;
  }

  // Mastery follows recent results: the first attempt sets it, later ones blend in.
  next.mastery = card.seen === 0 ? credit : 0.6 * credit + 0.4 * card.mastery;
  return next;
}

/** Hint ladder penalty: each rung used lowers the credit; seeing the solution earns none. */
export const HINT_CREDIT = [1, 0.75, 0.5, 0.25];

export function creditFor(score: number, hintsUsed: number, sawSolution: boolean): number {
  if (sawSolution) return 0;
  return score * (HINT_CREDIT[Math.min(hintsUsed, HINT_CREDIT.length - 1)] ?? 0.25);
}

export const CONFIDENCE_LEVELS = [
  { value: 1, label: 'Guessing', probability: 0.3 },
  { value: 2, label: 'Unsure', probability: 0.55 },
  { value: 3, label: 'Fairly sure', probability: 0.8 },
  { value: 4, label: 'Certain', probability: 0.97 },
] as const;

/** Turn an auto-graded result into an SM-2 quality. */
export function qualityFor(credit: number, confidence: number | null): Quality {
  if (credit >= 0.95) {
    if (confidence === 1) return 3; // right, but a guess: see it again sooner
    return confidence !== null && confidence >= 4 ? 5 : 4;
  }
  if (credit >= 0.7) return 3;
  if (credit >= 0.4) return 2;
  return 1;
}

export const FLASHCARD_RATINGS = [
  { key: 'again', label: 'Again', quality: 1 as Quality, credit: 0, hint: 'Missed it' },
  { key: 'hard', label: 'Hard', quality: 3 as Quality, credit: 0.6, hint: 'Got it, with effort' },
  { key: 'good', label: 'Good', quality: 4 as Quality, credit: 1, hint: 'Got it' },
  { key: 'easy', label: 'Easy', quality: 5 as Quality, credit: 1, hint: 'Instant' },
] as const;

export function describeInterval(card: CardState, now: number): string {
  const ms = card.due - now;
  if (ms <= 0) return 'now';
  if (ms < 60 * 60 * 1000) return `in ${Math.max(1, Math.round(ms / 60000))} min`;
  const days = Math.round((startOfDay(card.due) - startOfDay(now)) / DAY);
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  if (days < 30) return `in ${days} days`;
  return `in ${Math.round(days / 30)} mo`;
}
