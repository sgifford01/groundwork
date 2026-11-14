/** Build a session from the current progress and load it into the session store. */
import { ALL_ITEMS } from '../content';
import { mulberry32, newSeed } from '../engine/rng';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { buildPlacement } from './placement';
import { buildSession, SESSION_MODES, type SessionMode } from './session';
import { recentMisses } from './stats';

export interface StartOptions {
  minutes: number;
  mode: SessionMode;
  noGrids: boolean;
}

export function previewSession(opts: StartOptions, seed = 1) {
  const { cards, attempts, settings } = useProgress.getState();
  return buildSession(
    ALL_ITEMS,
    cards,
    { ...opts, manualLevel: settings.manualLevel, now: Date.now(), recentMisses: recentMisses(attempts) },
    mulberry32(seed),
  );
}

/** Returns the number of questions queued (0 means there was nothing to practice). */
export function startSession(opts: StartOptions): number {
  const items = previewSession(opts, newSeed());
  const label = SESSION_MODES.find((m) => m.value === opts.mode)?.label ?? 'Practice';
  useSession.getState().start(
    items.map((i) => i.id),
    `${label} · ${opts.minutes} min`,
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
