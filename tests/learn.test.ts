/** Spaced repetition, mastery, the session builder and dashboard statistics. */
import { describe, expect, it } from 'vitest';
import { ALL_ITEMS } from '../src/content';
import { mulberry32 } from '../src/engine/rng';
import { evalFormula } from '../src/engine/workbook';
import { isLevelUnlocked, levelMastery, topicMastery, type Cards } from '../src/learn/mastery';
import { buildSession, dueItems, interleave, newItems } from '../src/learn/session';
import { creditFor, newCard, qualityFor, review, startOfDay, type CardState } from '../src/learn/sm2';
import { calibration, recentMisses, streak } from '../src/learn/stats';
import type { Attempt } from '../src/store/progress';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 12, 14, 0, 0).getTime();

function learned(mastery = 1, due = NOW + 5 * DAY): CardState {
  return { ...newCard(), seen: 1, correct: 1, reps: 1, interval: 1, mastery, due, last: NOW - DAY };
}

describe('SM-2 scheduling', () => {
  it('spaces out correct answers: 1 day, 6 days, then by ease', () => {
    let c = review(newCard(), 4, 1, NOW);
    expect(c.interval).toBe(1);
    expect(c.due).toBe(startOfDay(NOW) + DAY);
    c = review(c, 4, 1, NOW + DAY);
    expect(c.interval).toBe(6);
    c = review(c, 4, 1, NOW + 7 * DAY);
    expect(c.interval).toBe(Math.round(6 * c.ease));
    expect(c.reps).toBe(3);
    expect(c.mastery).toBe(1);
  });

  it('brings a missed card back within minutes and counts the lapse', () => {
    let c = review(newCard(), 4, 1, NOW);
    c = review(c, 1, 0, NOW + DAY);
    expect(c.reps).toBe(0);
    expect(c.lapses).toBe(1);
    expect(c.due - (NOW + DAY)).toBeLessThanOrEqual(15 * 60 * 1000);
    expect(c.mastery).toBeCloseTo(0.4);
  });

  it('never lets ease fall below 1.3', () => {
    let c = newCard();
    for (let i = 0; i < 20; i++) c = review(c, 0, 0, NOW + i * DAY);
    expect(c.ease).toBe(1.3);
  });

  it('easy answers go further out than hard ones', () => {
    const base = review(review(newCard(), 4, 1, NOW), 4, 1, NOW + DAY);
    const hard = review(base, 3, 0.75, NOW + 7 * DAY);
    const easy = review(base, 5, 1, NOW + 7 * DAY);
    expect(easy.interval).toBeGreaterThan(hard.interval);
  });

  it('hints reduce credit and the solution earns none', () => {
    expect(creditFor(1, 0, false)).toBe(1);
    expect(creditFor(1, 1, false)).toBe(0.75);
    expect(creditFor(1, 2, false)).toBe(0.5);
    expect(creditFor(1, 3, false)).toBe(0.25);
    expect(creditFor(1, 0, true)).toBe(0);
    expect(creditFor(0.5, 1, false)).toBeCloseTo(0.375);
  });

  it('maps results to quality scores', () => {
    expect(qualityFor(1, 4)).toBe(5);
    expect(qualityFor(1, 3)).toBe(4);
    expect(qualityFor(1, 1)).toBe(3); // right, but a guess
    expect(qualityFor(0.75, 3)).toBe(3);
    expect(qualityFor(0.5, 3)).toBe(2);
    expect(qualityFor(0, 4)).toBe(1);
  });
});

describe('mastery and unlocking', () => {
  const l0 = ALL_ITEMS.filter((i) => i.level === 0);

  it('counts unseen questions as zero', () => {
    const topic = l0[0].topic;
    const inTopic = ALL_ITEMS.filter((i) => i.topic === topic);
    const cards: Cards = { [inTopic[0].id]: learned(1) };
    expect(topicMastery(topic, ALL_ITEMS, cards)).toBeCloseTo(1 / inTopic.length);
  });

  it('opens the next level at 80% or by manual choice', () => {
    expect(isLevelUnlocked(0, 0, ALL_ITEMS, {})).toBe(true);
    expect(isLevelUnlocked(1, 0, ALL_ITEMS, {})).toBe(false);
    expect(isLevelUnlocked(1, 1, ALL_ITEMS, {})).toBe(true);
    const cards: Cards = Object.fromEntries(l0.map((i) => [i.id, learned(0.9)]));
    expect(levelMastery(0, ALL_ITEMS, cards)).toBeCloseTo(0.9);
    expect(isLevelUnlocked(1, 0, ALL_ITEMS, cards)).toBe(true);
  });
});

describe('session builder', () => {
  const opts = { minutes: 20, mode: 'mixed' as const, noGrids: false, manualLevel: 1, now: NOW };

  it('fills roughly the time asked for, with no repeats', () => {
    for (const minutes of [10, 20, 45]) {
      const s = buildSession(ALL_ITEMS, {}, { ...opts, minutes }, mulberry32(minutes));
      const total = s.reduce((sum, i) => sum + i.estMinutes, 0);
      expect(s.length).toBeGreaterThan(0);
      expect(new Set(s.map((i) => i.id)).size).toBe(s.length);
      expect(total).toBeLessThanOrEqual(minutes * 1.3);
      expect(total).toBeGreaterThanOrEqual(minutes * 0.6);
    }
  });

  it('respects locked levels', () => {
    const s = buildSession(ALL_ITEMS, {}, { ...opts, minutes: 45, manualLevel: 0, mode: 'new' }, mulberry32(3));
    expect(s.every((i) => i.level === 0)).toBe(true);
    expect(newItems(ALL_ITEMS, {}, 0).every((i) => i.level === 0)).toBe(true);
  });

  it('can leave out grid tasks', () => {
    const s = buildSession(ALL_ITEMS, {}, { ...opts, minutes: 45, noGrids: true }, mulberry32(4));
    expect(s.length).toBeGreaterThan(0);
    expect(s.some((i) => i.type === 'grid')).toBe(false);
  });

  it('"due" mode returns only due cards, most overdue first', () => {
    const [a, b, c] = ALL_ITEMS;
    const cards: Cards = {
      [a.id]: learned(1, NOW - 2 * DAY),
      [b.id]: learned(1, NOW - 5 * DAY),
      [c.id]: learned(1, NOW + 3 * DAY),
    };
    expect(dueItems(ALL_ITEMS, cards, NOW).map((i) => i.id)).toEqual([b.id, a.id]);
    const s = buildSession(ALL_ITEMS, cards, { ...opts, mode: 'due' }, mulberry32(5));
    expect(s.map((i) => i.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('"mistakes" mode drills recently missed questions', () => {
    const missed = [ALL_ITEMS[3].id, ALL_ITEMS[7].id];
    const s = buildSession(ALL_ITEMS, {}, { ...opts, mode: 'mistakes', recentMisses: missed }, mulberry32(6));
    expect(s.map((i) => i.id).sort()).toEqual([...missed].sort());
  });

  it('interleaves: neighbours differ in topic whenever that is possible', () => {
    const s = buildSession(ALL_ITEMS, {}, { ...opts, minutes: 45 }, mulberry32(7));
    const counts = new Map<string, number>();
    for (const i of s) counts.set(i.topic, (counts.get(i.topic) ?? 0) + 1);
    const possible = Math.max(...counts.values()) <= Math.ceil(s.length / 2);
    let clashes = 0;
    for (let i = 1; i < s.length; i++) if (s[i].topic === s[i - 1].topic) clashes++;
    if (possible) expect(clashes).toBeLessThanOrEqual(1);
    expect(interleave(s, mulberry32(8)).length).toBe(s.length);
  });
});

describe('dashboard statistics', () => {
  const attempt = (itemId: string, ts: number, correct: boolean, confidence: number | null = 3): Attempt => ({
    itemId,
    topic: 'l0-refs',
    type: 'mcq',
    level: 0,
    ts,
    score: correct ? 1 : 0,
    credit: correct ? 1 : 0,
    correct,
    confidence,
    hints: 0,
    sawSolution: false,
    ms: 1000,
  });

  it('counts a streak of consecutive days', () => {
    expect(streak([], NOW)).toBe(0);
    const a = [attempt('x', NOW, true), attempt('x', NOW - DAY, true), attempt('x', NOW - 2 * DAY, true), attempt('x', NOW - 4 * DAY, true)];
    expect(streak(a, NOW)).toBe(3);
    // not practiced yet today: yesterday's streak still stands
    expect(streak(a.slice(1), NOW)).toBe(2);
    expect(streak([attempt('x', NOW - 3 * DAY, true)], NOW)).toBe(0);
  });

  it('lists items whose latest attempt was a miss', () => {
    const a = [attempt('a', NOW - 3000, false), attempt('b', NOW - 2000, false), attempt('a', NOW - 1000, true)];
    expect(recentMisses(a)).toEqual(['b']);
  });

  it('compares stated confidence with actual accuracy', () => {
    const a = [attempt('a', NOW, true, 4), attempt('b', NOW, false, 4), attempt('c', NOW, true, 1)];
    const cal = calibration(a);
    expect(cal.find((c) => c.label === 'Certain')?.actual).toBe(0.5);
    expect(cal.find((c) => c.label === 'Guessing')?.actual).toBe(1);
    expect(cal.find((c) => c.label === 'Unsure')?.actual).toBeNull();
  });
});

describe('Excel compatibility of the engine', () => {
  it('accepts the bare words TRUE and FALSE', () => {
    expect(evalFormula('=IF(TRUE,1,2)')).toBe(1);
    expect(evalFormula('=IF(FALSE,1,2)')).toBe(2);
    expect(evalFormula('=AND(TRUE,units>10)', { units: 48 })).toBe(true);
  });

  it('treats an empty cell as zero in arithmetic', () => {
    expect(evalFormula('=1+A1')).toBe(1);
  });
});

describe('placement diagnostic', () => {
  it('asks three quick questions from each level that has enough of them, with no repeats', async () => {
    const { buildPlacement, PER_LEVEL } = await import('../src/learn/placement');
    for (const seed of [1, 2, 3, 4, 5]) {
      const quiz = buildPlacement(ALL_ITEMS, mulberry32(seed));
      expect(new Set(quiz.map((i) => i.id)).size).toBe(quiz.length);
      expect(quiz.length).toBeGreaterThanOrEqual(6);
      expect(quiz.length).toBeLessThanOrEqual(15);
      for (const level of [0, 1]) expect(quiz.filter((i) => i.level === level).length).toBe(PER_LEVEL);
      expect(quiz.every((i) => !['grid', 'case', 'timed', 'errorhunt', 'flashcard', 'explain', 'shortcut'].includes(i.type))).toBe(true);
      // levels come in order, easiest first
      const levels = quiz.map((i) => i.level);
      expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    }
  });

  it('starts you at the first level you did not pass', async () => {
    const { placementOutcome } = await import('../src/learn/placement');
    const run = (scores: number[][]) =>
      placementOutcome(scores.flatMap((row, level) => row.map((score) => ({ level, score })))).level;
    expect(run([[0, 0, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]])).toBe(0); // shaky on Excel: start at L0
    expect(run([[1, 1, 1], [1, 0, 0], [1, 1, 1], [1, 1, 1]])).toBe(1);
    expect(run([[1, 1, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0]])).toBe(2);
    expect(run([[1, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]])).toBe(3);
    expect(run([[1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]])).toBe(4); // passed everything tested
    expect(run([[1, 1, 1], [1, 1, 1]])).toBe(2); // nothing to test beyond L1 yet
  });
});

describe('phone-friendly sessions', () => {
  const opts = { minutes: 10, noGrids: false, manualLevel: 6, now: NOW };

  it('"Flashcards only" contains nothing but flashcards', () => {
    const s = buildSession(ALL_ITEMS, {}, { ...opts, mode: 'flash' }, mulberry32(11));
    expect(s.length).toBeGreaterThan(5);
    expect(s.every((i) => i.type === 'flashcard')).toBe(true);
  });

  it('"Cards and quick questions only" leaves out every spreadsheet task and shortcut drill', () => {
    const s = buildSession(ALL_ITEMS, {}, { ...opts, minutes: 45, mode: 'mixed', noGrids: true }, mulberry32(12));
    expect(s.length).toBeGreaterThan(5);
    const wide = ['grid', 'errorhunt', 'case', 'timed', 'shortcut', 'formula', 'predict'];
    expect(s.some((i) => wide.includes(i.type))).toBe(false);
  });

  it('never drops a 45-minute capstone into a short session', () => {
    for (const minutes of [10, 20]) {
      const s = buildSession(ALL_ITEMS, {}, { ...opts, minutes, mode: 'mixed' }, mulberry32(minutes));
      expect(s.reduce((sum, i) => sum + i.estMinutes, 0)).toBeLessThanOrEqual(minutes + 0.5);
    }
  });
});
