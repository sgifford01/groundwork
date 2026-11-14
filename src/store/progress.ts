/**
 * Everything the app remembers lives here and is saved to the browser's
 * localStorage: your profile, a spaced-repetition card per question, and a
 * log of every attempt (which also feeds the mistake journal and dashboard).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItemType, MistakeCategory } from '../content/schema';
import { creditFor, newCard, qualityFor, review, type CardState, type Quality } from '../learn/sm2';

export const STORAGE_KEY = 'pro-forma-gym/v1';
const MAX_ATTEMPTS = 5000;

export interface Settings {
  os: 'mac' | 'win';
  excel: '365' | '2021' | '2019' | 'none';
  excelComfort: number; // 1-5
  reComfort: number; // 1-5
  theme: 'system' | 'light' | 'dark';
  /** Levels up to this one are open regardless of mastery (set by you or by placement). */
  manualLevel: number;
  onboarded: boolean;
}

/** Defaults reflect the answers given when the app was set up: Mac, Microsoft 365, Excel 3/5, RE finance 2/5. */
export const DEFAULT_SETTINGS: Settings = {
  os: 'mac',
  excel: '365',
  excelComfort: 3,
  reComfort: 2,
  theme: 'system',
  manualLevel: 1,
  onboarded: false,
};

/** Where to start, from the two comfort ratings. */
export function startingLevel(excelComfort: number, reComfort: number): number {
  if (excelComfort >= 4 && reComfort >= 3) return 2;
  if (excelComfort >= 3) return 1;
  return 0;
}

export interface Attempt {
  itemId: string;
  topic: string;
  type: ItemType;
  level: number;
  ts: number;
  score: number; // 0..1 before hint penalties
  credit: number; // 0..1 after hint penalties
  correct: boolean;
  confidence: number | null; // 1-4, chosen before seeing the answer
  hints: number;
  sawSolution: boolean;
  ms: number; // time spent
  category?: MistakeCategory;
  given?: string; // what the student answered
  expected?: string; // the right answer
  detail?: string; // one-line explanation of the mistake
}

export interface AttemptInput {
  itemId: string;
  topic: string;
  type: ItemType;
  level: number;
  score: number;
  confidence: number | null;
  hints: number;
  sawSolution: boolean;
  ms: number;
  category?: MistakeCategory;
  given?: string;
  expected?: string;
  detail?: string;
  /** Flashcards rate themselves, so they pass quality and credit directly. */
  quality?: Quality;
  credit?: number;
}

export interface ProgressData {
  settings: Settings;
  cards: Record<string, CardState>;
  attempts: Attempt[];
}

interface ProgressState extends ProgressData {
  record: (input: AttemptInput) => CardState;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (data: ProgressData) => void;
  resetProgress: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      cards: {},
      attempts: [],

      record: (input) => {
        const now = Date.now();
        const credit = input.credit ?? creditFor(input.score, input.hints, input.sawSolution);
        const quality = input.quality ?? qualityFor(credit, input.confidence);
        const card = review(get().cards[input.itemId] ?? newCard(), quality, credit, now);
        const attempt: Attempt = {
          itemId: input.itemId,
          topic: input.topic,
          type: input.type,
          level: input.level,
          ts: now,
          score: input.score,
          credit,
          correct: input.score >= 0.999,
          confidence: input.confidence,
          hints: input.hints,
          sawSolution: input.sawSolution,
          ms: input.ms,
          category: input.category,
          given: input.given,
          expected: input.expected,
          detail: input.detail,
        };
        set((s) => ({
          cards: { ...s.cards, [input.itemId]: card },
          attempts: [...s.attempts, attempt].slice(-MAX_ATTEMPTS),
        }));
        return card;
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      replaceAll: (data) =>
        set({ settings: { ...DEFAULT_SETTINGS, ...data.settings }, cards: data.cards, attempts: data.attempts }),

      resetProgress: () => set((s) => ({ cards: {}, attempts: [], settings: { ...s.settings } })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ settings: s.settings, cards: s.cards, attempts: s.attempts }),
    },
  ),
);
