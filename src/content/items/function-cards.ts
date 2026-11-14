/**
 * One flashcard per function marked with `card` in the function catalog
 * (src/content/functions.ts). Generated, so the card always matches the guide.
 * To add or remove a card, edit the catalog entry, not this file.
 */
import { defineItems } from '../build';
import { FUNCTIONS, syntaxOf } from '../functions';

export const FUNCTION_CARDS = defineItems(
  FUNCTIONS.filter((f) => f.card).map((f) => ({
    id: `l${f.card![0]}-fn-${f.name.toLowerCase()}`,
    type: 'flashcard' as const,
    level: f.card![0],
    topic: f.card![1],
    title: `${f.name}: what it does`,
    prompt: `What does the ${f.name} function do, and what are its arguments, in order?`,
    answer: [
      f.summary,
      `=${syntaxOf(f)}`,
      f.args.map((a) => `• ${a.name}${a.optional ? ' (optional)' : ''}: ${a.desc}`).join('\n'),
      `Watch out: ${f.pitfalls[0]}`,
    ].join('\n\n'),
    tags: [f.name, 'functions'],
    estMinutes: 0.5,
  })),
);
