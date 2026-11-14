/** Numbers for the dashboard, all derived from the attempt log. */
import type { MistakeCategory } from '../content/schema';
import type { Attempt } from '../store/progress';
import { CONFIDENCE_LEVELS, startOfDay } from './sm2';

const DAY = 24 * 60 * 60 * 1000;

/** Consecutive days with at least one attempt, counting today (or yesterday if today is still empty). */
export function streak(attempts: Attempt[], now: number): number {
  const days = new Set(attempts.map((a) => startOfDay(a.ts)));
  let day = startOfDay(now);
  if (!days.has(day)) day -= DAY;
  let n = 0;
  while (days.has(day)) {
    n++;
    day = startOfDay(day - DAY / 2); // step back safely across daylight-saving changes
  }
  return n;
}

export interface DayStat {
  day: number;
  label: string;
  attempts: number;
  accuracy: number | null; // average score, null when no attempts
}

export function accuracyByDay(attempts: Attempt[], now: number, days = 14): DayStat[] {
  const out: DayStat[] = [];
  let day = startOfDay(now);
  for (let i = 0; i < days; i++) {
    const end = day + DAY;
    const mine = attempts.filter((a) => a.ts >= day && a.ts < end);
    const d = new Date(day);
    out.unshift({
      day,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      attempts: mine.length,
      accuracy: mine.length ? mine.reduce((s, a) => s + a.score, 0) / mine.length : null,
    });
    day = startOfDay(day - DAY / 2);
  }
  return out;
}

export function mistakeCounts(attempts: Attempt[]): { category: MistakeCategory; count: number }[] {
  const counts = new Map<MistakeCategory, number>();
  for (const a of attempts) {
    if (!a.correct && a.category) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

/** Items whose most recent attempt was not fully correct, newest first. */
export function recentMisses(attempts: Attempt[]): string[] {
  const latest = new Map<string, Attempt>();
  for (const a of attempts) latest.set(a.itemId, a);
  return [...latest.values()]
    .filter((a) => !a.correct)
    .sort((a, b) => b.ts - a.ts)
    .map((a) => a.itemId);
}

export interface CalibrationPoint {
  label: string;
  stated: number; // the confidence chosen, as a probability
  actual: number | null; // how often those answers were right
  count: number;
}

export function calibration(attempts: Attempt[]): CalibrationPoint[] {
  return CONFIDENCE_LEVELS.map((level) => {
    const mine = attempts.filter((a) => a.confidence === level.value);
    return {
      label: level.label,
      stated: level.probability,
      actual: mine.length ? mine.filter((a) => a.correct).length / mine.length : null,
      count: mine.length,
    };
  });
}

export function overallAccuracy(attempts: Attempt[]): number | null {
  if (!attempts.length) return null;
  return attempts.reduce((s, a) => s + a.score, 0) / attempts.length;
}
