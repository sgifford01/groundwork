/**
 * Placement diagnostic: a short mixed quiz that sets the starting level.
 * Three quick questions from each of Levels 0 to 3. You start at the first
 * level where you scored under two-thirds (everything below it is unlocked).
 */
import type { Item, ItemType } from '../content/schema';
import { shuffle, type Rng } from '../engine/rng';

export const PLACEMENT_LEVELS = [0, 1, 2, 3];
export const PER_LEVEL = 3;
export const PASS_SHARE = 2 / 3;

/** Quick, auto-graded types that work without building a sheet. */
const QUICK: ItemType[] = ['mcq', 'numeric', 'formula', 'estimate', 'order', 'predict', 'gonogo'];

export function buildPlacement(items: Item[], rng: Rng): Item[] {
  const out: Item[] = [];
  for (const level of PLACEMENT_LEVELS) {
    const pool = shuffle(
      rng,
      items.filter((i) => i.level === level && QUICK.includes(i.type) && i.estMinutes <= 3),
    );
    // spread across topics and types before repeating either
    const picked: Item[] = [];
    for (const pass of [0, 1, 2]) {
      for (const item of pool) {
        if (picked.length >= PER_LEVEL) break;
        if (picked.includes(item)) continue;
        const topicUsed = picked.some((p) => p.topic === item.topic);
        const typeUsed = picked.some((p) => p.type === item.type);
        if (pass === 0 && (topicUsed || typeUsed)) continue;
        if (pass === 1 && topicUsed) continue;
        picked.push(item);
      }
    }
    out.push(...picked);
  }
  return out;
}

export interface PlacementOutcome {
  /** The level to start at: every level up to this one is unlocked. */
  level: number;
  byLevel: { level: number; asked: number; score: number }[];
}

export function placementOutcome(results: { level: number; score: number }[]): PlacementOutcome {
  const byLevel = PLACEMENT_LEVELS.map((level) => {
    const mine = results.filter((r) => r.level === level);
    return { level, asked: mine.length, score: mine.length ? mine.reduce((s, r) => s + r.score, 0) / mine.length : 0 };
  });
  let level = 0;
  for (const row of byLevel) {
    level = row.level;
    // stop at the first level that was not clearly passed (or had no questions to show it)
    if (row.asked === 0 || row.score < PASS_SHARE) break;
    level = Math.min(row.level + 1, PLACEMENT_LEVELS[PLACEMENT_LEVELS.length - 1] + 1);
  }
  return { level, byLevel };
}
