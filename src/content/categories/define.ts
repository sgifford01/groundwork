/** Helper for category question files: stamps every question with its category. */
import type { ItemInput } from '../schema';

export function categoryItems(slug: string, items: ItemInput[]): ItemInput[] {
  return items.map((item) => ({ ...item, category: slug }));
}
