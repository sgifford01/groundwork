/**
 * Collects every question file into one list and checks each item against
 * the schema. To add a new content file, import it here and add it to RAW.
 */
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

const BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));

export function itemById(id: string): Item | undefined {
  return BY_ID.get(id);
}

export function itemsByTopic(topic: string): Item[] {
  return ALL_ITEMS.filter((i) => i.topic === topic);
}

export function itemsByLevel(level: number): Item[] {
  return ALL_ITEMS.filter((i) => i.level === level);
}
