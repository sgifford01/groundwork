/**
 * Collects every question file into one list and checks each item against
 * the schema. To add a new content file, import it here and add it to RAW.
 *
 * ALL_ITEMS is the core Excel & Pro Forma course, exactly as before. The other
 * categories are collected in ./categories and exposed here as CATEGORY_ITEMS;
 * EVERY_ITEM is both together. Use itemsOfCategory(slug) for one category.
 */
import { CATEGORY_ITEMS } from './categories';
import { CORE_CATEGORY } from './categories/registry';
import { ItemSchema, type Item, type ItemInput } from './schema';
import { L0_ITEMS } from './items/l0-excel';
import { L0_MORE } from './items/l0-more';
import { L1_ITEMS } from './items/l1-re-math';
import { L1_MORE } from './items/l1-more';
import { L2_ITEMS } from './items/l2-acquisition';
import { L3_ITEMS } from './items/l3-development';
import { L4_ITEMS } from './items/l4-waterfall';
import { L5_ITEMS } from './items/l5-sensitivity';
import { CAPSTONE_ITEMS } from './items/capstone';
import { FUNCTION_CARDS } from './items/function-cards';

export const RAW_ITEMS: ItemInput[] = [
  ...L0_ITEMS,
  ...L0_MORE,
  ...L1_ITEMS,
  ...L1_MORE,
  ...L2_ITEMS,
  ...L3_ITEMS,
  ...L4_ITEMS,
  ...L5_ITEMS,
  ...CAPSTONE_ITEMS,
  ...FUNCTION_CARDS,
];

function parseAll(raw: ItemInput[]): Item[] {
  return raw.map((item) => {
    const result = ItemSchema.safeParse(item);
    if (!result.success) {
      const where = (item as { id?: string }).id ?? '(no id)';
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new Error(`Question "${where}" does not match the schema: ${issues}`);
    }
    return result.data;
  });
}

export const ALL_ITEMS: Item[] = parseAll(RAW_ITEMS);

export { CATEGORY_ITEMS };

/** The core course plus every other category. */
export const EVERY_ITEM: Item[] = [...ALL_ITEMS, ...CATEGORY_ITEMS];

const BY_ID = new Map(EVERY_ITEM.map((i) => [i.id, i]));
if (BY_ID.size !== EVERY_ITEM.length) {
  const seen = new Set<string>();
  for (const i of EVERY_ITEM) {
    if (seen.has(i.id)) throw new Error(`Two questions share the id "${i.id}"`);
    seen.add(i.id);
  }
}

export function itemsOfCategory(slug: string): Item[] {
  return slug === CORE_CATEGORY ? ALL_ITEMS : CATEGORY_ITEMS.filter((i) => i.category === slug);
}

export function itemById(id: string): Item | undefined {
  return BY_ID.get(id);
}

export function itemsByTopic(topic: string): Item[] {
  return ALL_ITEMS.filter((i) => i.topic === topic);
}

export function itemsByLevel(level: number): Item[] {
  return ALL_ITEMS.filter((i) => i.level === level);
}
