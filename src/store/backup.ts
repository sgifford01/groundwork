/** Export / import all progress as a JSON file (a backup you can keep or move to another device). */
import { z } from 'zod';
import { DEFAULT_SETTINGS, useProgress, type ProgressData } from './progress';

const Card = z.object({
  ease: z.number(),
  interval: z.number(),
  reps: z.number(),
  lapses: z.number(),
  due: z.number(),
  last: z.number(),
  seen: z.number(),
  correct: z.number(),
  mastery: z.number(),
});

const Attempt = z
  .object({
    itemId: z.string(),
    topic: z.string(),
    type: z.string(),
    level: z.number(),
    ts: z.number(),
    score: z.number(),
    credit: z.number(),
    correct: z.boolean(),
    confidence: z.number().nullable(),
    hints: z.number(),
    sawSolution: z.boolean(),
    ms: z.number(),
  })
  .passthrough();

// The app id stays 'pro-forma-gym' (the app's original name) so that backups made before the rename still import.
const Backup = z.object({
  app: z.literal('pro-forma-gym'),
  version: z.number(),
  exportedAt: z.string(),
  settings: z.object({}).passthrough(),
  cards: z.record(z.string(), Card),
  attempts: z.array(Attempt),
});

export function exportProgress(): string {
  const { settings, cards, attempts } = useProgress.getState();
  return JSON.stringify(
    { app: 'pro-forma-gym', version: 1, exportedAt: new Date().toISOString(), settings, cards, attempts },
    null,
    2,
  );
}

export function downloadProgress(): void {
  const blob = new Blob([exportProgress()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `groundwork-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Returns a short summary on success, or throws with a readable message. */
export function importProgress(json: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON. Choose a file exported from Groundwork.');
  }
  const result = Backup.safeParse(parsed);
  if (!result.success) {
    throw new Error('That file does not look like a Groundwork backup.');
  }
  const data = result.data;
  useProgress.getState().replaceAll({
    settings: { ...DEFAULT_SETTINGS, ...(data.settings as Partial<ProgressData['settings']>) },
    cards: data.cards,
    attempts: data.attempts as unknown as ProgressData['attempts'],
  });
  return `Imported ${Object.keys(data.cards).length} cards and ${data.attempts.length} attempts.`;
}
