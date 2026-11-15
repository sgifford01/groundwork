/**
 * The lease engine. Every worked example in the ARGUS build spec is
 * reproduced through the engine, and the accounting identities are checked
 * under random inputs.
 */
import { describe, expect, it } from 'vitest';
import { SPEC_DATA, solveExample } from '../src/content/categories/specs';
import { mulberry32 } from '../src/engine/rng';
import {
  blended,
  CASH_FLOW_LINES,
  expensesIn,
  facts,
  marketRentIn,
  projectCashFlow,
  projectSuite,
  valuation,
  type Building,
  type MarketAssumptions,
  type Tenant,
} from '../src/leases/engine';

const example = (id: string) => {
  const ex = SPEC_DATA.argus.examples.find((e) => e.id === id)!;
  return { given: Object.fromEntries(ex.given.map((g) => [g.name, g.value])), values: solveExample(ex).values };
};

const building: Building = { sf: 60000, expensesYear1: 780000, expenseGrowth: 0.03, generalVacancy: 0.05, creditLoss: 0.01, reserves: 0.25 };
const mla: MarketAssumptions = {
  marketRent: 42,
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
};
const tenant = (over: Partial<Tenant> = {}): Tenant => ({ id: 'suite-100', name: 'Tenant', sf: 12000, startYear: 1, endYear: 10, baseRent: 36, escalation: 0.03, recovery: 'nnn', ...over });

describe('lease engine: the spec’s worked examples', () => {
  it('NNN recovery is the tenant’s share of expenses', () => {
    const { values } = example('argus-ex-nnn');
    const [y1] = projectSuite(building, tenant(), mla, 1);
    expect(y1.recovery).toBeCloseTo(values.recovery, 6);
    expect(y1.recovery / 12000).toBeCloseTo(values.recovery_psf, 6);
  });

  it('a base-year lease recovers only the increase, and never less than zero', () => {
    const { values, given } = example('argus-ex-base-year');
    const t = tenant({ recovery: 'base-year', baseYearExpenses: given.base_year });
    expect(projectSuite(building, t, mla, 1)[0].recovery).toBeCloseTo(values.recovery, 6);
    const low = projectSuite({ ...building, expensesYear1: given.opex_low }, t, mla, 1)[0];
    expect(low.recovery).toBe(values.recovery_low);
    expect(low.recovery).toBe(0);
  });

  it('an expense stop recovers the excess per SF on the tenant’s area', () => {
    const { values, given } = example('argus-ex-expense-stop');
    const t = tenant({ recovery: 'stop', stopPsf: given.stop });
    expect(projectSuite(building, t, mla, 1)[0].recovery).toBeCloseTo(values.recovery, 6);
    expect(projectSuite({ ...building, expensesYear1: 600000 }, t, mla, 1)[0].recovery).toBe(0);
  });

  it('a gross lease recovers nothing', () => {
    expect(projectSuite(building, tenant({ recovery: 'gross' }), mla, 3).every((y) => y.recovery === 0)).toBe(true);
  });

  it('escalations compound from lease year 1, which has none', () => {
    const { values, given } = example('argus-ex-escalation');
    const rows = projectSuite(building, tenant({ baseRent: given.rent, escalation: given.step }), mla, given.yr);
    expect(rows[0].baseRent).toBeCloseTo(given.tenant_sf * given.rent, 6);
    expect(rows[given.yr - 1].baseRent).toBeCloseTo(values.annual_rent, 6);
    // a lease already two years old at the start of the analysis is in lease year 3
    const older = projectSuite(building, tenant({ startYear: -1, baseRent: given.rent, escalation: given.step }), mla, 1)[0];
    expect(older.baseRent).toBeCloseTo(given.tenant_sf * given.rent * (1 + given.step) ** 2, 6);
  });

  it('market leasing assumptions blend by the renewal probability', () => {
    const { values } = example('argus-ex-mla');
    const b = blended(mla);
    expect(b.downtime).toBeCloseTo(values.downtime, 9);
    expect(b.ti).toBeCloseTo(values.ti, 9);
    expect(b.lc).toBeCloseTo(values.lc, 9);
    expect(b.free).toBeCloseTo(values.free, 9);
  });

  it('a rollover costs downtime, TI and commissions as in the spec', () => {
    const { values, given } = example('argus-ex-rollover');
    // expire at the end of year 0 so the space rolls in year 1, at year-1 market rent
    const t = tenant({ sf: given.tenant_sf, endYear: 0 });
    const roll = projectSuite(building, t, { ...mla, marketRent: given.market_rent, termYears: given.new_term }, 1)[0];
    expect(roll.status).toBe('rollover');
    expect(-roll.turnoverVacancy).toBeCloseTo(values.lost_rent, 6);
    expect(roll.tenantImprovements).toBeCloseTo(values.ti_cost, 6);
    expect(roll.leasingCommissions).toBeCloseTo(values.lc_cost, 6);
  });

  it('general vacancy is an allowance net of turnover vacancy', () => {
    // one big tenant rolling, so turnover vacancy is partly inside the allowance
    const cf = projectCashFlow(building, [tenant({ endYear: 0 }), tenant({ id: 'suite-200', sf: 48000 })], mla, 1)[0];
    const allowance = building.generalVacancy * cf.potentialGrossRevenue;
    expect(cf.generalVacancy).toBeCloseTo(-Math.max(0, allowance + cf.turnoverVacancy), 6);
    expect(cf.generalVacancy + cf.turnoverVacancy).toBeLessThanOrEqual(-allowance + 1e-6);
    // with no turnover, the whole allowance is charged
    const quiet = projectCashFlow(building, [tenant({ sf: 60000 })], mla, 1)[0];
    expect(quiet.generalVacancy).toBeCloseTo(-building.generalVacancy * quiet.potentialGrossRevenue, 6);
    // and the spec example's arithmetic is the same rule
    const { values, given } = example('argus-ex-vacancy');
    expect(values.general).toBe(Math.max(0, given.general_pct * given.pgr - given.turnover));
  });

  it('the valuation discounts each year and a resale on the NEXT year’s NOI', () => {
    const { values, given } = example('argus-ex-valuation');
    const row = (cashFlowBeforeDebt: number, noi = 0) => ({ cashFlowBeforeDebt, noi }) as ReturnType<typeof projectCashFlow>[number];
    const cf = [row(given.cf_a), row(given.cf_b), row(given.cf_c), row(given.cf_d), row(given.cf_e), row(0, given.noi_next)];
    const v = valuation(cf, 5, { discount: given.disc, exitCap: given.exit_cap, saleCost: given.sale_cost });
    expect(v.resale).toBeCloseTo(values.net_resale, 4);
    expect(v.pv).toBeCloseTo(values.pv, 2);
    expect(() => valuation(cf.slice(0, 5), 5, { discount: 0.08, exitCap: 0.065, saleCost: 0.02 })).toThrow();
  });
});

describe('lease engine: rollover behaviour', () => {
  it('certain renewal means no downtime; certain departure means all of it', () => {
    const t = tenant({ endYear: 2 });
    const stay = projectSuite(building, t, { ...mla, renewalProbability: 1 }, 3)[2];
    expect(stay.turnoverVacancy).toBeCloseTo(0, 9);
    expect(stay.tenantImprovements).toBeCloseTo(t.sf * mla.tiRenew, 6);
    const go = projectSuite(building, t, { ...mla, renewalProbability: 0 }, 3)[2];
    const rent = marketRentIn(mla, 3);
    expect(-go.turnoverVacancy).toBeCloseTo((t.sf * rent * mla.downtimeMonths) / 12, 6);
    expect(go.tenantImprovements).toBeCloseTo(t.sf * mla.tiNew, 6);
    expect(-go.freeRent).toBeCloseTo((t.sf * rent * Math.min(12 - mla.downtimeMonths, mla.freeNew)) / 12, 6);
  });

  it('the new lease starts at that year’s market rent and then escalates', () => {
    const rows = projectSuite(building, tenant({ endYear: 2 }), mla, 5);
    expect(rows.map((r) => r.status)).toEqual(['in-place', 'in-place', 'rollover', 'speculative', 'speculative']);
    expect(rows[2].baseRent).toBeCloseTo(12000 * marketRentIn(mla, 3), 6);
    expect(rows[3].baseRent).toBeCloseTo(12000 * marketRentIn(mla, 3) * (1 + mla.escalation), 6);
    expect(rows[3].tenantImprovements + rows[3].leasingCommissions).toBe(0);
  });

  it('a suite vacant at the start rolls in year 1; a second expiry rolls again', () => {
    const rows = projectSuite(building, tenant({ endYear: 0 }), { ...mla, termYears: 3 }, 5);
    expect(rows.map((r) => r.status)).toEqual(['rollover', 'speculative', 'speculative', 'rollover', 'speculative']);
    expect(rows[3].baseRent).toBeCloseTo(12000 * marketRentIn(mla, 4), 6);
  });

  it('a new base-year or stop lease resets its threshold to the rollover year', () => {
    for (const recovery of ['base-year', 'stop'] as const) {
      const rows = projectSuite(building, tenant({ endYear: 1 }), { ...mla, recovery, renewalProbability: 1 }, 4);
      expect(rows[1].recovery).toBeCloseTo(0, 6);
      const growth = expensesIn(building, 3) - expensesIn(building, 2);
      expect(rows[2].recovery).toBeCloseTo((growth * 12000) / 60000, 6);
    }
  });

  it('recoveries are prorated for downtime in the rollover year', () => {
    const roll = projectSuite(building, tenant({ endYear: 0 }), { ...mla, renewalProbability: 0, downtimeMonths: 6 }, 1)[0];
    expect(roll.recovery).toBeCloseTo((expensesIn(building, 1) * 12000) / 60000 / 2, 6);
  });
});

describe('lease engine: accounting identities under random inputs', () => {
  it('a fully leased all-NNN building recovers exactly its expenses', () => {
    const tenants = [tenant({ sf: 20000 }), tenant({ id: 'suite-200', sf: 25000 }), tenant({ id: 'suite-300', sf: 15000 })];
    for (const row of projectCashFlow(building, tenants, mla, 6)) expect(row.recoveries).toBeCloseTo(row.operatingExpenses, 6);
  });

  it('lines add up, deductions are never positive, costs never negative', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = mulberry32(seed);
      const between = (lo: number, hi: number) => lo + r() * (hi - lo);
      const types = ['nnn', 'gross', 'base-year', 'stop'] as const;
      const b: Building = { sf: 50000, expensesYear1: between(400000, 900000), expenseGrowth: between(-0.02, 0.06), generalVacancy: between(0, 0.1), creditLoss: between(0, 0.02), reserves: between(0, 0.5) };
      const tenants: Tenant[] = [0, 1, 2, 3].map((i) => ({
        id: `suite-${i + 1}00`,
        name: `T${i}`,
        sf: 12500,
        startYear: Math.round(between(-3, 1)),
        endYear: Math.round(between(0, 8)),
        baseRent: between(24, 60),
        escalation: between(0, 0.04),
        recovery: types[Math.floor(r() * 4)],
        baseYearExpenses: between(400000, 900000),
        stopPsf: between(8, 18),
      }));
      const m: MarketAssumptions = { ...mla, renewalProbability: r(), downtimeMonths: between(0, 12), termYears: Math.round(between(3, 7)), freeNew: between(0, 8), freeRenew: between(0, 3), recovery: types[Math.floor(r() * 4)] };
      const cf = projectCashFlow(b, tenants, m, 7);
      for (const y of cf) {
        expect(y.potentialGrossRevenue).toBeCloseTo(y.baseRent + y.recoveries, 4);
        expect(y.effectiveGrossRevenue).toBeCloseTo(y.potentialGrossRevenue + y.freeRent + y.turnoverVacancy + y.generalVacancy + y.creditLoss, 4);
        expect(y.noi).toBeCloseTo(y.effectiveGrossRevenue - y.operatingExpenses, 2);
        expect(y.cashFlowBeforeDebt).toBeCloseTo(y.noi - y.tenantImprovements - y.leasingCommissions - y.reserves, 2);
        for (const v of [y.freeRent, y.turnoverVacancy, y.generalVacancy, y.creditLoss]) expect(v).toBeLessThanOrEqual(1e-9);
        for (const v of [y.operatingExpenses, y.tenantImprovements, y.leasingCommissions, y.reserves, y.recoveries, y.baseRent]) expect(v).toBeGreaterThanOrEqual(-1e-9);
        // building lines are the sum of the suites
        const suites = Object.values(y.byTenant);
        expect(suites.reduce((n, s) => n + s.baseRent, 0)).toBeCloseTo(y.baseRent, 4);
        expect(suites.reduce((n, s) => n + s.recovery, 0)).toBeCloseTo(y.recoveries, 4);
        // vacancy is never double counted: turnover plus general is at least the allowance, and no more than the larger of the two
        const allowance = b.generalVacancy * y.potentialGrossRevenue;
        expect(-(y.turnoverVacancy + y.generalVacancy)).toBeCloseTo(Math.max(allowance, -y.turnoverVacancy), 4);
        // free rent and downtime never exceed the year
        for (const s of suites) expect(-(s.freeRent + s.turnoverVacancy)).toBeLessThanOrEqual(s.baseRent + 1e-6);
      }
    }
  });

  it('facts name every line of every year, in names a formula can use', () => {
    const cf = projectCashFlow(building, [tenant({ endYear: 2 })], mla, 6);
    const f = facts(cf, 5, { discount: 0.08, exitCap: 0.065, saleCost: 0.02 });
    expect(Object.keys(f).length).toBe(CASH_FLOW_LINES.length * 6 + 2);
    for (const [name, value] of Object.entries(f)) {
      expect(/^[a-z][a-z_]*[a-z]$/.test(name), name).toBe(true);
      expect(Number.isFinite(value), name).toBe(true);
    }
    expect(f.noi_year_three).toBe(cf[2].noi);
    expect(f.cash_flow_year_one).toBe(cf[0].cashFlowBeforeDebt);
    expect(f.resale).toBeCloseTo((cf[5].noi / 0.065) * 0.98, 6);
    expect(facts(cf).resale).toBeUndefined();
  });
});
