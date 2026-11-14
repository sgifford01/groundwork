/**
 * Independent finance implementations, written from the textbook definitions
 * and deliberately sharing no code with the formula engine. The tests compare
 * the engine's PMT / IPMT / PPMT / PV / NPV / IRR / XNPV / XIRR against these.
 */

/** Level payment on a loan (Excel sign convention: positive pv -> negative payment). */
export function pmt(rate: number, nper: number, pv: number): number {
  if (rate === 0) return -pv / nper;
  const g = (1 + rate) ** nper;
  return (-pv * rate * g) / (g - 1);
}

/** Walk the loan balance forward one period at a time. */
export function schedule(rate: number, nper: number, pv: number) {
  const payment = -pmt(rate, nper, pv);
  const rows: { interest: number; principal: number; ending: number }[] = [];
  let balance = pv;
  for (let k = 0; k < nper; k++) {
    const interest = balance * rate;
    const principal = payment - interest;
    balance -= principal;
    rows.push({ interest, principal, ending: balance });
  }
  return { payment, rows };
}

export function ipmt(rate: number, per: number, nper: number, pv: number): number {
  return -schedule(rate, nper, pv).rows[per - 1].interest;
}

export function ppmt(rate: number, per: number, nper: number, pv: number): number {
  return -schedule(rate, nper, pv).rows[per - 1].principal;
}

/** Present value of a level payment stream. */
export function pv(rate: number, nper: number, payment: number): number {
  let total = 0;
  for (let k = 1; k <= nper; k++) total += payment / (1 + rate) ** k;
  return -total;
}

/** Excel's NPV: the first cash flow is discounted one full period. */
export function npv(rate: number, flows: number[]): number {
  return flows.reduce((sum, cf, i) => sum + cf / (1 + rate) ** (i + 1), 0);
}

function bisect(f: (r: number) => number, lo = -0.95, hi = 5): number {
  let flo = f(lo);
  const fhi = f(hi);
  if (flo * fhi > 0) throw new Error('no sign change: IRR not bracketed');
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (flo * fmid <= 0) hi = mid;
    else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

/** IRR: the rate at which the time-0-based NPV is zero. */
export function irr(flows: number[]): number {
  return bisect((r) => flows.reduce((sum, cf, i) => sum + cf / (1 + r) ** i, 0));
}

/** XNPV with actual day counts over a 365-day year. `dates` are day serials. */
export function xnpv(rate: number, flows: number[], dates: number[]): number {
  return flows.reduce((sum, cf, i) => sum + cf / (1 + rate) ** ((dates[i] - dates[0]) / 365), 0);
}

export function xirr(flows: number[], dates: number[]): number {
  return bisect((r) => xnpv(r, flows, dates));
}
