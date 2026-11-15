/**
 * The lease engine: tenant inputs in, a lease-by-lease cash flow out.
 *
 * It reproduces the LOGIC of lease-by-lease cash flow software (base rent and
 * escalations, recoveries, rollover with blended market leasing assumptions,
 * vacancy, below-the-line costs, a resale and a present value). It is an
 * original, deliberately simplified model. No UI code here.
 *
 * Simplifications (also shown in the simulator's help text):
 *  - periods are whole years; year 1 is the first year of the analysis
 *  - a lease ends at the END of `endYear`; the space rolls at the start of the next year
 *  - downtime and free rent fall inside the rollover year (so downtime + free rent <= 12 months)
 *  - one set of market leasing assumptions for the whole building; new and renewal
 *    outcomes are blended by the renewal probability
 *  - leasing commissions are a % of the new lease's first-year rent x its term
 *
 * Sign convention in the output: revenue deductions (free rent, the vacancy
 * lines, credit loss) are zero or negative, so the revenue lines add up.
 * Costs (expenses, TI, commissions, reserves) are positive and are subtracted.
 */

export type RecoveryType = 'nnn' | 'gross' | 'base-year' | 'stop';

export const RECOVERY_LABELS: Record<RecoveryType, string> = {
  nnn: 'NNN',
  gross: 'Gross',
  'base-year': 'Base year',
  stop: 'Expense stop',
};

export interface Tenant {
  /** Stable id, e.g. "suite-200". */
  id: string;
  name: string;
  sf: number;
  /** Analysis year in which the current lease began. 1 = starts with the analysis; 0 or negative = already in place. */
  startYear: number;
  /** Last year of the current lease, inclusive. 0 = the suite is vacant when the analysis starts. */
  endYear: number;
  /** $/SF/yr in the lease's first year. */
  baseRent: number;
  /** Annual escalation, compounding. */
  escalation: number;
  recovery: RecoveryType;
  /** For 'base-year': the BUILDING's expenses in the base year. */
  baseYearExpenses?: number;
  /** For 'stop': $/SF. */
  stopPsf?: number;
}

export interface MarketAssumptions {
  /** $/SF/yr in analysis year 1. */
  marketRent: number;
  marketGrowth: number;
  renewalProbability: number;
  /** Months vacant if the tenant leaves. */
  downtimeMonths: number;
  termYears: number;
  /** Annual escalation in new leases. */
  escalation: number;
  tiNew: number;
  tiRenew: number;
  /** Commission, % of first-year rent x term. */
  lcNew: number;
  lcRenew: number;
  /** Months. */
  freeNew: number;
  freeRenew: number;
  /** Structure of the new lease. A base year or stop resets to the rollover year's expenses. */
  recovery: RecoveryType;
}

export interface Building {
  sf: number;
  /** Recoverable operating expenses in year 1, building total. */
  expensesYear1: number;
  expenseGrowth: number;
  /** Allowance as a % of potential gross revenue, net of turnover vacancy. */
  generalVacancy: number;
  /** % of potential gross revenue. */
  creditLoss: number;
  /** $/SF/yr, below NOI. */
  reserves: number;
}

export type SuiteStatus = 'in-place' | 'rollover' | 'speculative' | 'vacant';

export interface SuiteYear {
  baseRent: number;
  recovery: number;
  freeRent: number;
  turnoverVacancy: number;
  tenantImprovements: number;
  leasingCommissions: number;
  status: SuiteStatus;
  /** One line on how base rent was computed, for the simulator's trace. */
  note: string;
}

export interface CashFlowYear {
  year: number;
  baseRent: number;
  recoveries: number;
  /** Base rent plus recoveries, before free rent and vacancy. */
  potentialGrossRevenue: number;
  freeRent: number;
  turnoverVacancy: number;
  generalVacancy: number;
  creditLoss: number;
  effectiveGrossRevenue: number;
  operatingExpenses: number;
  noi: number;
  tenantImprovements: number;
  leasingCommissions: number;
  reserves: number;
  cashFlowBeforeDebt: number;
  byTenant: Record<string, SuiteYear>;
}

/** Blended market leasing assumptions: p x renewal + (1 - p) x new. Downtime only happens if the tenant leaves. */
export function blended(mla: MarketAssumptions) {
  const p = mla.renewalProbability;
  const downtime = Math.min(12, (1 - p) * mla.downtimeMonths);
  return {
    downtime,
    free: Math.min(12 - downtime, p * mla.freeRenew + (1 - p) * mla.freeNew),
    ti: p * mla.tiRenew + (1 - p) * mla.tiNew,
    lc: p * mla.lcRenew + (1 - p) * mla.lcNew,
  };
}

export function expensesIn(building: Building, year: number): number {
  return building.expensesYear1 * (1 + building.expenseGrowth) ** (year - 1);
}

export function marketRentIn(mla: MarketAssumptions, year: number): number {
  return mla.marketRent * (1 + mla.marketGrowth) ** (year - 1);
}

interface Lease {
  start: number;
  end: number;
  rent: number;
  escalation: number;
  recovery: RecoveryType;
  baseYearExpenses?: number;
  stopPsf?: number;
}

function recoveryFor(building: Building, sf: number, lease: Lease, year: number): number {
  const expenses = expensesIn(building, year);
  const share = sf / building.sf;
  switch (lease.recovery) {
    case 'nnn':
      return expenses * share;
    case 'gross':
      return 0;
    case 'base-year':
      return Math.max(0, expenses - (lease.baseYearExpenses ?? expenses)) * share;
    case 'stop':
      return Math.max(0, expenses / building.sf - (lease.stopPsf ?? expenses / building.sf)) * sf;
  }
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const area = (n: number) => `${n.toLocaleString('en-US')} SF`;

/** One suite, year by year, through any number of rollovers. */
export function projectSuite(building: Building, tenant: Tenant, mla: MarketAssumptions, years: number): SuiteYear[] {
  let lease: Lease = {
    start: tenant.startYear,
    end: tenant.endYear,
    rent: tenant.baseRent,
    escalation: tenant.escalation,
    recovery: tenant.recovery,
    baseYearExpenses: tenant.baseYearExpenses,
    stopPsf: tenant.stopPsf,
  };
  let speculative = false;
  const out: SuiteYear[] = [];
  const none = { freeRent: 0, turnoverVacancy: 0, tenantImprovements: 0, leasingCommissions: 0 };

  for (let year = 1; year <= years; year++) {
    if (year > lease.end) {
      // The lease has ended: the space rolls this year under the market leasing assumptions.
      const b = blended(mla);
      const rent = marketRentIn(mla, year);
      const full = tenant.sf * rent;
      const expenses = expensesIn(building, year);
      lease = {
        start: year,
        end: year + mla.termYears - 1,
        rent,
        escalation: mla.escalation,
        recovery: mla.recovery,
        baseYearExpenses: expenses,
        stopPsf: expenses / building.sf,
      };
      speculative = true;
      out.push({
        baseRent: full,
        recovery: recoveryFor(building, tenant.sf, lease, year) * ((12 - b.downtime) / 12),
        freeRent: -full * (b.free / 12),
        turnoverVacancy: -full * (b.downtime / 12),
        tenantImprovements: tenant.sf * b.ti,
        leasingCommissions: b.lc * full * mla.termYears,
        status: 'rollover',
        note: `Rolls to market: ${area(tenant.sf)} x ${money(rent)}, less ${b.downtime.toFixed(2)} months of downtime and ${b.free.toFixed(2)} months free`,
      });
    } else if (year < lease.start) {
      out.push({ baseRent: 0, recovery: 0, ...none, status: 'vacant', note: 'Lease has not started' });
    } else {
      const rent = lease.rent * (1 + lease.escalation) ** (year - lease.start);
      out.push({
        baseRent: tenant.sf * rent,
        recovery: recoveryFor(building, tenant.sf, lease, year),
        ...none,
        status: speculative ? 'speculative' : 'in-place',
        note: `${area(tenant.sf)} x ${money(rent)} (lease year ${year - lease.start + 1})`,
      });
    }
  }
  return out;
}

export function projectCashFlow(building: Building, tenants: Tenant[], mla: MarketAssumptions, years: number): CashFlowYear[] {
  const suites = tenants.map((t) => ({ id: t.id, rows: projectSuite(building, t, mla, years) }));
  const out: CashFlowYear[] = [];
  for (let i = 0; i < years; i++) {
    const year = i + 1;
    const sum = (pick: (s: SuiteYear) => number) => suites.reduce((n, s) => n + pick(s.rows[i]), 0);
    const baseRent = sum((s) => s.baseRent);
    const recoveries = sum((s) => s.recovery);
    const potentialGrossRevenue = baseRent + recoveries;
    const freeRent = sum((s) => s.freeRent);
    const turnoverVacancy = sum((s) => s.turnoverVacancy);
    // The general allowance is reduced by the turnover vacancy already in the cash flow, never below zero.
    const generalVacancy = -Math.max(0, building.generalVacancy * potentialGrossRevenue + turnoverVacancy);
    const creditLoss = -building.creditLoss * potentialGrossRevenue;
    const effectiveGrossRevenue = potentialGrossRevenue + freeRent + turnoverVacancy + generalVacancy + creditLoss;
    const operatingExpenses = expensesIn(building, year);
    const noi = effectiveGrossRevenue - operatingExpenses;
    const tenantImprovements = sum((s) => s.tenantImprovements);
    const leasingCommissions = sum((s) => s.leasingCommissions);
    const reserves = building.reserves * building.sf;
    out.push({
      year,
      baseRent,
      recoveries,
      potentialGrossRevenue,
      freeRent,
      turnoverVacancy,
      generalVacancy,
      creditLoss,
      effectiveGrossRevenue,
      operatingExpenses,
      noi,
      tenantImprovements,
      leasingCommissions,
      reserves,
      cashFlowBeforeDebt: noi - tenantImprovements - leasingCommissions - reserves,
      byTenant: Object.fromEntries(suites.map((s) => [s.id, s.rows[i]])),
    });
  }
  return out;
}

export interface ValuationInputs {
  discount: number;
  exitCap: number;
  saleCost: number;
}

/**
 * Present value of `hold` years of cash flow plus a resale at the end of the
 * hold. The resale capitalises the NOI of the year AFTER the hold, so `cf`
 * must run at least one year past it.
 */
export function valuation(cf: CashFlowYear[], hold: number, v: ValuationInputs): { resale: number; pv: number } {
  if (cf.length <= hold) throw new Error(`A ${hold}-year hold needs ${hold + 1} years of cash flow for the resale`);
  const resale = (cf[hold].noi / v.exitCap) * (1 - v.saleCost);
  let pv = resale / (1 + v.discount) ** hold;
  for (let i = 0; i < hold; i++) pv += cf[i].cashFlowBeforeDebt / (1 + v.discount) ** (i + 1);
  return { resale, pv };
}

const YEAR_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** The lines of the cash flow, in report order, with the name each has in `facts`. */
export const CASH_FLOW_LINES: { key: keyof Omit<CashFlowYear, 'year' | 'byTenant'>; fact: string; label: string; kind: 'revenue' | 'deduction' | 'subtotal' | 'cost' }[] = [
  { key: 'baseRent', fact: 'base_rent', label: 'Base rent', kind: 'revenue' },
  { key: 'recoveries', fact: 'recoveries', label: 'Expense recoveries', kind: 'revenue' },
  { key: 'potentialGrossRevenue', fact: 'pgr', label: 'Potential gross revenue', kind: 'subtotal' },
  { key: 'freeRent', fact: 'free_rent', label: 'Free rent', kind: 'deduction' },
  { key: 'turnoverVacancy', fact: 'turnover_vacancy', label: 'Turnover vacancy', kind: 'deduction' },
  { key: 'generalVacancy', fact: 'general_vacancy', label: 'General vacancy', kind: 'deduction' },
  { key: 'creditLoss', fact: 'credit_loss', label: 'Credit loss', kind: 'deduction' },
  { key: 'effectiveGrossRevenue', fact: 'egr', label: 'Effective gross revenue', kind: 'subtotal' },
  { key: 'operatingExpenses', fact: 'expenses', label: 'Operating expenses', kind: 'cost' },
  { key: 'noi', fact: 'noi', label: 'Net operating income', kind: 'subtotal' },
  { key: 'tenantImprovements', fact: 'ti', label: 'Tenant improvements', kind: 'cost' },
  { key: 'leasingCommissions', fact: 'lc', label: 'Leasing commissions', kind: 'cost' },
  { key: 'reserves', fact: 'reserves', label: 'Capital reserves', kind: 'cost' },
  { key: 'cashFlowBeforeDebt', fact: 'cash_flow', label: 'Cash flow before debt', kind: 'subtotal' },
];

/**
 * Every number on the report under a name a formula can use:
 * `noi_year_three`, `recoveries_year_one`, `cash_flow_year_five`, and with a
 * valuation, `resale` and `present_value`.
 */
export function facts(cf: CashFlowYear[], hold?: number, v?: ValuationInputs): Record<string, number> {
  const out: Record<string, number> = {};
  cf.forEach((row, i) => {
    if (i >= YEAR_WORDS.length) return;
    for (const line of CASH_FLOW_LINES) out[`${line.fact}_year_${YEAR_WORDS[i]}`] = row[line.key];
  });
  if (hold !== undefined && v) {
    const val = valuation(cf, hold, v);
    out.resale = val.resale;
    out.present_value = val.pv;
  }
  return out;
}
