import { describe, expect, it } from 'vitest';
import { evalNumber } from '../src/engine/workbook';
import { mulberry32 } from '../src/engine/rng';
import { dateToSerial } from '../src/engine/format';
import * as fin from './finance';

const rng = mulberry32(20261112);
const between = (lo: number, hi: number) => lo + rng() * (hi - lo);

function close(a: number, b: number, rel = 1e-7) {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(a), Math.abs(b)));
}

describe('engine finance functions match independent implementations', () => {
  it('PMT, IPMT, PPMT, PV over random loans', () => {
    for (let i = 0; i < 40; i++) {
      const loan = Math.round(between(1e6, 5e7));
      const rate = between(0.03, 0.09) / 12;
      const n = [120, 240, 300, 360][Math.floor(rng() * 4)];
      const per = 1 + Math.floor(rng() * n);
      close(evalNumber(`=PMT(${rate},${n},${loan})`), fin.pmt(rate, n, loan));
      close(evalNumber(`=IPMT(${rate},${per},${n},${loan})`), fin.ipmt(rate, per, n, loan), 1e-6);
      close(evalNumber(`=PPMT(${rate},${per},${n},${loan})`), fin.ppmt(rate, per, n, loan), 1e-6);
      const payment = between(5000, 200000);
      close(evalNumber(`=PV(${rate},${n},${-payment})`), -fin.pv(rate, n, payment), 1e-7);
    }
  });

  it('interest + principal = payment, and the loan fully amortizes', () => {
    const { payment, rows } = fin.schedule(0.06 / 12, 360, 1_000_000);
    close(rows[0].interest + rows[0].principal, payment);
    expect(Math.abs(rows[359].ending)).toBeLessThan(1e-4);
    close(payment, 5995.505, 1e-6);
  });

  it('NPV and IRR over random cash flows', () => {
    for (let i = 0; i < 40; i++) {
      const years = 3 + Math.floor(rng() * 8);
      const equity = -Math.round(between(2e6, 2e7));
      const flows = [equity];
      for (let y = 1; y <= years; y++) flows.push(Math.round(-equity * between(0.03, 0.1)));
      flows[years] += Math.round(-equity * between(0.9, 2.2));
      const list = flows.join(',');
      const rate = between(0.04, 0.15);
      close(evalNumber(`=NPV(${rate},${flows.slice(1).join(',')})+${flows[0]}`), fin.npv(rate, flows.slice(1)) + flows[0], 1e-7);
      const engineIrr = evalNumber(`=IRR({${list}})`);
      close(engineIrr, fin.irr(flows), 1e-6);
      // by definition, NPV at the IRR is zero
      expect(Math.abs(fin.npv(engineIrr, flows.slice(1)) + flows[0])).toBeLessThan(Math.abs(equity) * 1e-6);
    }
  });

  it('XNPV and XIRR over irregular dates', () => {
    for (let i = 0; i < 25; i++) {
      const start = dateToSerial(2026, 1 + Math.floor(rng() * 12), 1 + Math.floor(rng() * 28));
      const flows = [-Math.round(between(1e6, 1e7))];
      const dates = [start];
      const n = 3 + Math.floor(rng() * 5);
      for (let k = 1; k <= n; k++) {
        dates.push(dates[k - 1] + 60 + Math.floor(rng() * 400));
        flows.push(Math.round(-flows[0] * between(0.05, 0.5)));
      }
      flows[n] += -flows[0];
      const f = `{${flows.join(',')}}`;
      const d = `{${dates.join(',')}}`;
      const rate = between(0.05, 0.2);
      close(evalNumber(`=XNPV(${rate},${f},${d})`), fin.xnpv(rate, flows, dates), 1e-7);
      close(evalNumber(`=XIRR(${f},${d})`), fin.xirr(flows, dates), 1e-5);
    }
  });

  it('known textbook values', () => {
    close(evalNumber('=PMT(0.06/12,360,-500000)'), 2997.7526, 1e-7);
    close(evalNumber('=IRR({-1000,300,400,500})'), 0.0889634, 1e-6);
    close(evalNumber('=EOMONTH(DATE(2026,1,15),1)'), dateToSerial(2026, 2, 28));
    close(evalNumber('=EDATE(DATE(2026,1,31),1)'), dateToSerial(2026, 2, 28));
  });
});
