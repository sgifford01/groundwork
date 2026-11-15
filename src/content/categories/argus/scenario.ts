/**
 * The building used by the lease simulator questions: a four-tenant suburban
 * office building. Everything here is illustrative: invented tenants, invented
 * rents. Questions take this scenario and override a few inputs.
 */
import type { LeaseScenarioSpec } from '../../schema';

export const SORRENTO_OFFICE: LeaseScenarioSpec = {
  building: { sf: 40000, expensesYear1: 520000, expenseGrowth: 0.03, generalVacancy: 0.05, creditLoss: 0.01, reserves: 0.25 },
  tenants: [
    { id: 'suite-100', name: 'Harbor Dental Group', sf: 12000, startYear: -1, endYear: 3, baseRent: 36, escalation: 0.03, recovery: 'nnn' },
    { id: 'suite-200', name: 'Coastline Engineering', sf: 10000, startYear: 1, endYear: 7, baseRent: 42, escalation: 0.03, recovery: 'base-year', baseYearExpenses: 520000 },
    { id: 'suite-300', name: 'Mesa Title Co.', sf: 8000, startYear: -2, endYear: 2, baseRent: 34, escalation: 0.025, recovery: 'stop', stopPsf: 12 },
    { id: 'suite-400', name: 'Torrey Analytics', sf: 10000, startYear: 0, endYear: 6, baseRent: 38, escalation: 0.03, recovery: 'gross' },
  ],
  mla: {
    marketRent: 40,
    marketGrowth: 0.03,
    renewalProbability: 0.65,
    downtimeMonths: 9,
    termYears: 5,
    escalation: 0.03,
    tiNew: 45,
    tiRenew: 15,
    lcNew: 0.06,
    lcRenew: 0.03,
    freeNew: 6,
    freeRenew: 2,
    recovery: 'nnn',
  },
  years: 5,
  valuation: { discount: 0.08, exitCap: 0.065, saleCost: 0.02 },
};

/** The same building with some inputs changed. */
export function withInputs(changes: { tenants?: Record<string, Partial<LeaseScenarioSpec['tenants'][number]>>; mla?: Partial<LeaseScenarioSpec['mla']>; building?: Partial<LeaseScenarioSpec['building']> }): LeaseScenarioSpec {
  return {
    ...SORRENTO_OFFICE,
    building: { ...SORRENTO_OFFICE.building, ...changes.building },
    mla: { ...SORRENTO_OFFICE.mla, ...changes.mla },
    tenants: SORRENTO_OFFICE.tenants.map((t) => ({ ...t, ...changes.tenants?.[t.id] })),
  };
}
