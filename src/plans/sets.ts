/**
 * Every plan set the app can draw. A `plan` question names one by id and
 * supplies parameter variants; the generator does the rest.
 *
 * To add a set: write a generator file like mfDoubleLoaded.ts, export a
 * PlanSetDef and add it to PLAN_SETS. tests/plans.test.ts then checks its
 * geometry at the limits of every parameter.
 */
import { MF_DOUBLE_LOADED } from './mfDoubleLoaded';
import { OFFICE_FLOOR } from './officeFloor';
import { PODIUM_MIXED_USE } from './podium';
import { RETAIL_STRIP } from './retailStrip';
import type { PlanSet, PlanSetDef } from './model';

export const PLAN_SETS: PlanSetDef[] = [MF_DOUBLE_LOADED, RETAIL_STRIP, OFFICE_FLOOR, PODIUM_MIXED_USE];

export function planSetDef(id: string): PlanSetDef | undefined {
  return PLAN_SETS.find((s) => s.id === id);
}

/** Build a set from its defaults plus overrides. Throws on an unknown set, an unknown parameter or a value outside its limits. */
export function buildPlanSet(id: string, overrides: Record<string, number> = {}): PlanSet {
  const def = planSetDef(id);
  if (!def) throw new Error(`Unknown plan set "${id}"`);
  for (const [name, value] of Object.entries(overrides)) {
    const lim = def.limits[name];
    if (!lim) throw new Error(`Plan set "${id}" has no parameter "${name}"`);
    if (value < lim[0] || value > lim[1]) throw new Error(`Plan set "${id}": ${name}=${value} is outside ${lim[0]} to ${lim[1]}`);
  }
  return def.build({ ...def.defaults, ...overrides });
}
