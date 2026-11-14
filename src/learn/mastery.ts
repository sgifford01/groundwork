/**
 * Mastery per topic and level (0-1), and which levels are unlocked.
 * A topic's mastery is the average over ALL its questions, with unseen
 * questions counting as zero, so it only reaches 80% once most of the
 * topic has been answered well.
 */
import type { Item } from '../content/schema';
import { LEVELS, TOPICS } from '../content/topics';
import type { CardState } from './sm2';

export const UNLOCK_AT = 0.8;

export type Cards = Record<string, CardState>;

export function topicMastery(topicId: string, items: Item[], cards: Cards): number {
  const mine = items.filter((i) => i.topic === topicId);
  if (mine.length === 0) return 0;
  return mine.reduce((sum, i) => sum + (cards[i.id]?.mastery ?? 0), 0) / mine.length;
}

export function levelMastery(level: number, items: Item[], cards: Cards): number {
  const topics = TOPICS.filter((t) => t.level === level && items.some((i) => i.topic === t.id));
  if (topics.length === 0) return 0;
  return topics.reduce((sum, t) => sum + topicMastery(t.id, items, cards), 0) / topics.length;
}

export function levelHasContent(level: number, items: Item[]): boolean {
  return items.some((i) => i.level === level);
}

/**
 * A level is open if the student unlocked it by hand (or by placement), or if
 * every earlier level that has content is at 80% mastery or better.
 */
export function isLevelUnlocked(level: number, manualLevel: number, items: Item[], cards: Cards): boolean {
  if (level <= manualLevel) return true;
  for (const l of LEVELS) {
    if (l.level >= level) break;
    if (levelHasContent(l.level, items) && levelMastery(l.level, items, cards) < UNLOCK_AT) return false;
  }
  return true;
}

export function highestUnlocked(manualLevel: number, items: Item[], cards: Cards): number {
  let top = 0;
  for (const l of LEVELS) if (isLevelUnlocked(l.level, manualLevel, items, cards)) top = l.level;
  return top;
}
