/** Build a session from the current progress and load it into the session store. */
import { ALL_ITEMS, EVERY_ITEM, itemsOfCategory } from '../content';
import { categoryBySlug, CORE_CATEGORY } from '../content/categories/registry';
import type { Item } from '../content/schema';
import { mulberry32, newSeed } from '../engine/rng';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { ALL_TOPICS } from './category';
import { isLevelUnlocked } from './mastery';
import { buildPlacement } from './placement';
import { buildSession, SESSION_MODES, type SessionMode } from './session';
import { recentMisses } from './stats';

/** Draw questions from every category at once. */
export const ALL_CATEGORIES = 'all';

export interface StartOptions {
  minutes: number;
  mode: SessionMode;
  noGrids: boolean;
  /** A category slug, or 'all'. Left out = the core Excel & Pro Forma course. */
  category?: string;
}

export function previewSession(opts: StartOptions, seed = 1) {
  const { cards, attempts, settings } = useProgress.getState();
  const category = opts.category ?? CORE_CATEGORY;
  const pool = category === ALL_CATEGORIES ? EVERY_ITEM : itemsOfCategory(category);
  // The core course opens level by level; the other categories are not gated.
  const unlocked = (i: Item) => i.category !== CORE_CATEGORY || isLevelUnlocked(i.level, settings.manualLevel, ALL_ITEMS, cards);
  return buildSession(
    pool,
    cards,
    {
      minutes: opts.minutes,
      mode: opts.mode,
      noGrids: opts.noGrids,
      manualLevel: settings.manualLevel,
      now: Date.now(),
      recentMisses: recentMisses(attempts),
      topics: ALL_TOPICS,
      unlocked,
    },
    mulberry32(seed),
  );
}

/** Returns the number of questions queued (0 means there was nothing to practice). */
export function startSession(opts: StartOptions): number {
  const items = previewSession(opts, newSeed());
  const label = SESSION_MODES.find((m) => m.value === opts.mode)?.label ?? 'Practice';
  const category = opts.category ?? CORE_CATEGORY;
  const where = category === ALL_CATEGORIES ? 'All categories' : category === CORE_CATEGORY ? '' : (categoryBySlug(category)?.title ?? '');
  useSession.getState().start(
    items.map((i) => i.id),
    `${where ? `${where} · ` : ''}${label} · ${opts.minutes} min`,
  );
  return items.length;
}

export function isNarrowScreen(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
}

/** Queue the placement diagnostic. Returns the number of questions. */
export function startPlacement(): number {
  const items = buildPlacement(ALL_ITEMS, mulberry32(newSeed()));
  useSession.getState().start(
    items.map((i) => i.id),
    'Placement diagnostic',
    'placement',
  );
  return items.length;
}
