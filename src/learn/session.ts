/**
 * Session builder: picks questions to fill a time box, then interleaves
 * them so the same topic (or question type) rarely appears twice in a row.
 */
import { DESKTOP_ONLY_TYPES, type Item } from '../content/schema';
import { TOPICS } from '../content/topics';
import type { Rng } from '../engine/rng';
import { isLevelUnlocked, topicMastery, type Cards } from './mastery';

export type SessionMode = 'mixed' | 'due' | 'weak' | 'new' | 'mistakes' | 'flash';

export const SESSION_MODES: { value: SessionMode; label: string; blurb: string }[] = [
  { value: 'mixed', label: 'Smart mix', blurb: 'Due reviews first, then new material, then weak spots.' },
  { value: 'due', label: 'Due reviews', blurb: 'Only questions whose review date has arrived.' },
  { value: 'weak', label: 'Weakest topics', blurb: 'Questions from your lowest-mastery topics.' },
  { value: 'new', label: 'New material', blurb: 'Questions you have not seen yet.' },
  { value: 'mistakes', label: 'Drill my mistakes', blurb: 'Questions you recently got wrong.' },
  { value: 'flash', label: 'Flashcards only', blurb: 'Just the recall cards: due ones first, then new ones. Good for a few minutes on a phone.' },
];

export interface SessionOptions {
  minutes: number;
  mode: SessionMode;
  /** Leave out grid tasks (for phones, or a quick session away from a keyboard). */
  noGrids: boolean;
  manualLevel: number;
  now: number;
  /** ids of items whose most recent attempt was wrong, newest first */
  recentMisses?: string[];
}

export function dueItems(items: Item[], cards: Cards, now: number): Item[] {
  return items
    .filter((i) => cards[i.id] && cards[i.id].seen > 0 && cards[i.id].due <= now)
    .sort((a, b) => cards[a.id].due - cards[b.id].due);
}

/** Unseen items in unlocked levels, lowest level first, rotating through topics. */
export function newItems(items: Item[], cards: Cards, manualLevel: number): Item[] {
  const unseen = items.filter(
    (i) => !cards[i.id]?.seen && isLevelUnlocked(i.level, manualLevel, items, cards),
  );
  const byTopic = new Map<string, Item[]>();
  for (const t of TOPICS) byTopic.set(t.id, []);
  for (const i of unseen) byTopic.get(i.topic)?.push(i);
  const out: Item[] = [];
  const levels = [...new Set(unseen.map((i) => i.level))].sort((a, b) => a - b);
  for (const level of levels) {
    const queues = TOPICS.filter((t) => t.level === level).map((t) => byTopic.get(t.id) ?? []);
    let added = true;
    while (added) {
      added = false;
      for (const q of queues) {
        const next = q.shift();
        if (next) {
          out.push(next);
          added = true;
        }
      }
    }
  }
  return out;
}

export function weakItems(items: Item[], cards: Cards): Item[] {
  const seenTopics = [...new Set(items.filter((i) => cards[i.id]?.seen).map((i) => i.topic))];
  const rank = new Map(seenTopics.map((t) => [t, topicMastery(t, items, cards)]));
  return items
    .filter((i) => rank.has(i.topic) && (cards[i.id]?.mastery ?? 0) < 0.9)
    .sort((a, b) => {
      const dt = (rank.get(a.topic) ?? 0) - (rank.get(b.topic) ?? 0);
      return dt !== 0 ? dt : (cards[a.id]?.mastery ?? 0) - (cards[b.id]?.mastery ?? 0);
    });
}

/**
 * Take items from the pool, in order, while they fit in the time budget.
 * An item that does not fit is skipped so a shorter one further down can.
 * `always` lets the very first item through even if it is longer than the budget,
 * so a session is never empty just because its first question is a long one.
 */
function takeMinutes(pool: Item[], budget: number, chosen: Set<string>, always = false): Item[] {
  const out: Item[] = [];
  let used = 0;
  for (const item of pool) {
    if (chosen.has(item.id)) continue;
    const fits = used + item.estMinutes <= budget + 0.25;
    if (!fits && !(always && out.length === 0)) continue;
    out.push(item);
    chosen.add(item.id);
    used += item.estMinutes;
  }
  return out;
}

/** Reorder so neighbours differ in topic, and in type where possible. */
export function interleave(items: Item[], rng: Rng): Item[] {
  const pool = [...items];
  const out: Item[] = [];
  while (pool.length) {
    const last = out[out.length - 1];
    let candidates = pool.map((_, i) => i);
    if (last) {
      const diffTopic = candidates.filter((i) => pool[i].topic !== last.topic);
      if (diffTopic.length) candidates = diffTopic;
      const diffType = candidates.filter((i) => pool[i].type !== last.type);
      if (diffType.length) candidates = diffType;
    }
    // prefer items earlier in the pool (they were chosen first) with a little randomness
    const pickFrom = candidates.slice(0, 3);
    const idx = pickFrom[Math.floor(rng() * pickFrom.length)];
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function buildSession(allItems: Item[], cards: Cards, opts: SessionOptions, rng: Rng): Item[] {
  const items = opts.noGrids ? allItems.filter((i) => !DESKTOP_ONLY_TYPES.includes(i.type)) : allItems;
  const due = dueItems(items, cards, opts.now);
  const fresh = newItems(items, cards, opts.manualLevel);
  const weak = weakItems(items, cards);
  const missed = (opts.recentMisses ?? [])
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is Item => Boolean(i));

  const chosen = new Set<string>();
  const budget = opts.minutes;
  let picked: Item[] = [];
  const minutesOf = (list: Item[]) => list.reduce((s, i) => s + i.estMinutes, 0);

  switch (opts.mode) {
    case 'due':
      picked = takeMinutes(due, budget, chosen, true);
      break;
    case 'new':
      picked = takeMinutes(fresh, budget, chosen, true);
      break;
    case 'weak':
      picked = takeMinutes(weak, budget, chosen, true);
      break;
    case 'mistakes':
      picked = takeMinutes(missed, budget, chosen, true);
      break;
    case 'flash': {
      const isCard = (i: Item) => i.type === 'flashcard';
      picked = takeMinutes([...due.filter(isCard), ...fresh.filter(isCard), ...weak.filter(isCard)], budget, chosen, true);
      break;
    }
    case 'mixed':
    default: {
      // Up to half the time on due reviews, most of the rest on new material,
      // then top up from weak spots and whatever is left.
      picked = takeMinutes(due, budget * 0.5, chosen);
      picked = picked.concat(takeMinutes(fresh, (budget - minutesOf(picked)) * 0.85, chosen));
      for (const pool of [weak, due, fresh]) {
        const left = budget - minutesOf(picked);
        if (left < 0.5) break;
        picked = picked.concat(takeMinutes(pool, left, chosen, picked.length === 0));
      }
    }
  }
  return interleave(picked, rng);
}
