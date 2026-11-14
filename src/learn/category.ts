/**
 * Progress per category: how much is built, how much is due, how well it is
 * known. Everything is derived from the registry, the question lists and the
 * spaced-repetition cards, so a new category needs no code here.
 */
import { EVERY_ITEM, itemsOfCategory } from '../content';
import { CATEGORIES, CATEGORY_TOPICS, categoryTopic, CORE_CATEGORY, type Category } from '../content/categories/registry';
import type { Item } from '../content/schema';
import { TOPICS, topicById } from '../content/topics';
import type { Cards } from './mastery';
import { dueItems, type TopicRef } from './session';

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
      tier: c.tier,
      status: c.status,
      built,
      target: c.slug === CORE_CATEGORY ? built : c.targetItems,
      model: c.slug === CORE_CATEGORY ? '(built)' : `${c.build.model} ${c.build.effort}`,
    };
  });
}
