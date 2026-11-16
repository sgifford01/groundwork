/**
 * Progress per category: how much is built, how much is due, how well it is
 * known. Everything is derived from the registry, the question lists and the
 * spaced-repetition cards, so a new category needs no code here.
 */
import { EVERY_ITEM, itemsOfCategory } from '../content';
import { CATEGORIES, CATEGORY_TOPICS, categoryBySlug, categoryTopic, CORE_CATEGORY, TIER_LABELS, type Category } from '../content/categories/registry';
import type { Item, ItemType } from '../content/schema';
import { TOPICS, topicById } from '../content/topics';
import type { Cards } from './mastery';
import { dueItems, type TopicRef } from './session';
import type { CardState } from './sm2';

/**
 * Within a topic, learn the idea before applying it: cards and quick questions
 * first, then judgment and reading tasks, then sheet builds, error hunts and
 * cases. Questions of the same kind keep the order they were written in.
 */
export const TYPE_RANK: Record<ItemType, number> = {
  flashcard: 0,
  mcq: 1,
  numeric: 2,
  estimate: 2,
  order: 3,
  explain: 3,
  shortcut: 3,
  judgment: 4,
  gonogo: 4,
  predict: 4,
  formula: 5,
  plan: 5,
  leasesim: 5,
  docreview: 6,
  grid: 7,
  plangrid: 7,
  errorhunt: 8,
  case: 9,
  timed: 10,
};

/** A question counts as solved once it has been answered fully right, or its mastery has reached this level. */
export const SOLVED_AT = 0.8;

export function isSolved(card: CardState | undefined): boolean {
  return Boolean(card && (card.correct > 0 || card.mastery >= SOLVED_AT));
}

/**
 * Every question of a category in the order to learn it: topics as the course
 * lists them (core levels, or the registry's subtopics, which run from
 * Foundations to the case), then by TYPE_RANK within each topic.
 */
export function learningOrder(slug: string): Item[] {
  const items = itemsOfCategory(slug);
  const topicIds = slug === CORE_CATEGORY ? TOPICS.map((t) => t.id) : (categoryBySlug(slug)?.subtopics.map((t) => t.id) ?? []);
  const topicIndex = (id: string) => {
    const i = topicIds.indexOf(id);
    return i === -1 ? topicIds.length : i;
  };
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => topicIndex(a.item.topic) - topicIndex(b.item.topic) || TYPE_RANK[a.item.type] - TYPE_RANK[b.item.type] || a.i - b.i)
    .map((x) => x.item);
}

/** The first question in learning order that has not been solved yet, if any. */
export function nextUnsolved(slug: string, cards: Cards): Item | undefined {
  return learningOrder(slug).find((i) => !isSolved(cards[i.id]));
}

/** The question after this one in its category's learning order, if any. */
export function nextInCategory(item: Item): Item | undefined {
  const order = learningOrder(item.category);
  return order[order.findIndex((i) => i.id === item.id) + 1];
}

/** Whether trying the question again shows new numbers or a new drawing, or the same question. */
export function retryKind(item: Item): 'numbers' | 'drawing' | 'same' {
  const random = (vars: { name: string }[]) => vars.some((v) => 'choices' in v || 'min' in v);
  switch (item.type) {
    case 'flashcard':
    case 'mcq':
    case 'numeric':
    case 'estimate':
    case 'gonogo':
    case 'judgment':
      return random(item.vars) ? 'numbers' : 'same';
    case 'docreview':
      return random(item.vars) || (item.figure?.variants.length ?? 0) > 1 ? 'numbers' : 'same';
    case 'predict':
      return 'numbers'; // the model's inputs are redrawn every attempt
    case 'leasesim':
      return item.variants.length > 1 ? 'numbers' : 'same';
    case 'plan':
      return item.plan.variants.length > 1 ? 'drawing' : 'same';
    case 'plangrid':
      return item.figure.variants.length > 1 ? 'drawing' : 'same';
    default:
      return 'same'; // sheet builds, error hunts, cases, ordering, explain, shortcuts: the same task again
  }
}

/** The label of the button that starts the same question again. */
export function retryLabel(item: Item): string {
  const kind = retryKind(item);
  if (kind === 'numbers') return 'Try again with new numbers';
  if (kind === 'drawing') return 'Try again with a new drawing';
  return item.type === 'flashcard' ? 'See the card again' : 'Try again';
}

/** Core topics and every category's subtopics, for sessions that span categories. */
export const ALL_TOPICS: TopicRef[] = [...TOPICS, ...CATEGORY_TOPICS];

/** The display name of any topic id, core or category. */
export function topicLabel(id: string): string {
  return topicById(id)?.name ?? categoryTopic(id)?.name ?? id;
}

export interface CategoryStats {
  /** Questions that exist today. */
  built: number;
  /** Questions the finished category will have. */
  target: number;
  /** Reviews due now. */
  due: number;
  /** Built questions answered at least once. */
  seen: number;
  /** Average mastery (0 to 1) over the BUILT questions; unseen ones count as zero. */
  mastery: number;
}

export function categoryStats(cat: Category, cards: Cards, now: number, items: Item[] = itemsOfCategory(cat.slug)): CategoryStats {
  const built = items.length;
  return {
    built,
    target: cat.slug === CORE_CATEGORY ? built : cat.targetItems,
    due: dueItems(items, cards, now).length,
    seen: items.filter((i) => cards[i.id]?.seen).length,
    mastery: built === 0 ? 0 : items.reduce((sum, i) => sum + (cards[i.id]?.mastery ?? 0), 0) / built,
  };
}

/** Reviews due across every category, soonest first. */
export function dueEverywhere(cards: Cards, now: number): Item[] {
  return dueItems(EVERY_ITEM, cards, now);
}

/** How many categories have at least one review due. */
export function categoriesWithDue(cards: Cards, now: number): number {
  return new Set(dueEverywhere(cards, now).map((i) => i.category)).size;
}

/** One line per category for `npm run category-status`. */
export function statusRows(): { slug: string; title: string; tier: string; status: string; built: number; target: number; model: string }[] {
  return CATEGORIES.map((c) => {
    const built = itemsOfCategory(c.slug).length;
    return {
      slug: c.slug,
      title: c.title,
      tier: TIER_LABELS[c.tier],
      status: c.status,
      built,
      target: c.slug === CORE_CATEGORY ? built : c.targetItems,
      model: c.slug === CORE_CATEGORY ? '(built)' : `${c.build.model} ${c.build.effort}`,
    };
  });
}
