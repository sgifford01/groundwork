/** The practice session in progress (not saved: closing the tab ends it). */
import { create } from 'zustand';

export interface SessionResult {
  itemId: string;
  score: number;
  credit: number;
  ms: number;
  nextDue: string;
}

export type SessionKind = 'practice' | 'placement';

interface SessionState {
  kind: SessionKind;
  title: string;
  queue: string[]; // item ids
  index: number;
  results: SessionResult[];
  startedAt: number;
  active: boolean;
  start: (queue: string[], title: string, kind?: SessionKind) => void;
  addResult: (r: SessionResult) => void;
  next: () => void;
  end: () => void;
}

export const useSession = create<SessionState>()((set) => ({
  kind: 'practice',
  title: '',
  queue: [],
  index: 0,
  results: [],
  startedAt: 0,
  active: false,
  start: (queue, title, kind = 'practice') =>
    set({ queue, title, kind, index: 0, results: [], startedAt: Date.now(), active: queue.length > 0 }),
  addResult: (r) => set((s) => ({ results: [...s.results, r] })),
  next: () => set((s) => ({ index: s.index + 1 })),
  end: () => set({ active: false, queue: [], index: 0, results: [] }),
}));
