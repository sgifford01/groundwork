/**
 * The lease-by-lease simulator: a rent roll and market leasing assumptions on
 * top, the cash flow they generate underneath. Change an input and the cash
 * flow recalculates at once; the cells that moved are marked.
 *
 * This is an original design that reproduces the LOGIC of lease-by-lease
 * software. It does not imitate any product's screens or reports.
 *
 * The component only displays and edits a scenario. Grading lives in
 * src/grading/leases.ts.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { getPath, runScenario, setPath, type LeaseScenario } from '../../grading/leases';
import { CASH_FLOW_LINES, RECOVERY_LABELS, type CashFlowYear, type SuiteStatus } from '../../leases/engine';
import './leases.css';

type FieldKind = 'int' | 'money' | 'pct' | 'months' | 'psf';

interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  help?: string;
}

const TENANT_FIELDS: Field[] = [
  { key: 'sf', label: 'SF', kind: 'int' },
  { key: 'startYear', label: 'Lease began (year)', kind: 'int', help: '1 = the first year shown. 0 or less = before the analysis starts.' },
  { key: 'endYear', label: 'Lease ends (year)', kind: 'int', help: 'The last year of the lease. The space rolls the year after.' },
  { key: 'baseRent', label: 'Rent $/SF, lease yr 1', kind: 'psf' },
  { key: 'escalation', label: 'Escalation', kind: 'pct' },
];

const MLA_FIELDS: Field[] = [
  { key: 'marketRent', label: 'Market rent, year 1 ($/SF)', kind: 'psf' },
  { key: 'marketGrowth', label: 'Market rent growth', kind: 'pct' },
  { key: 'renewalProbability', label: 'Renewal probability', kind: 'pct' },
  { key: 'downtimeMonths', label: 'Downtime if the tenant leaves (months)', kind: 'months' },
  { key: 'termYears', label: 'New lease term (years)', kind: 'int' },
  { key: 'escalation', label: 'Escalation in new leases', kind: 'pct' },
  { key: 'tiNew', label: 'TI, new tenant ($/SF)', kind: 'psf' },
  { key: 'tiRenew', label: 'TI, renewal ($/SF)', kind: 'psf' },
  { key: 'lcNew', label: 'Commission, new lease', kind: 'pct' },
  { key: 'lcRenew', label: 'Commission, renewal', kind: 'pct' },
  { key: 'freeNew', label: 'Free rent, new lease (months)', kind: 'months' },
  { key: 'freeRenew', label: 'Free rent, renewal (months)', kind: 'months' },
];

const BUILDING_FIELDS: Field[] = [
  { key: 'expensesYear1', label: 'Operating expenses, year 1', kind: 'money' },
  { key: 'expenseGrowth', label: 'Expense growth', kind: 'pct' },
  { key: 'generalVacancy', label: 'General vacancy allowance', kind: 'pct' },
  { key: 'creditLoss', label: 'Credit loss', kind: 'pct' },
  { key: 'reserves', label: 'Capital reserves ($/SF)', kind: 'psf' },
];

const STATUS_TAG: Record<SuiteStatus, string> = { 'in-place': '', rollover: 'rolls', speculative: 'new lease', vacant: 'vacant' };

const usd = (n: number) => {
  const r = Math.round(n);
  const text = Math.abs(r).toLocaleString('en-US');
  return r < 0 ? `(${text})` : text;
};

function show(value: number, kind: FieldKind): string {
  if (kind === 'pct') return `${+(value * 100).toFixed(2)}%`;
  if (kind === 'money') return `$${Math.round(value).toLocaleString('en-US')}`;
  if (kind === 'psf') return `$${value.toFixed(2)}`;
  if (kind === 'months') return `${+value.toFixed(2)}`;
  return value.toLocaleString('en-US');
}

/** One input. Percent fields are typed as percentages (65 for 65%). */
function NumberCell({ path, field, scenario, editable, changed, onEdit, ariaLabel }: { path: string; field: Field; scenario: LeaseScenario; editable: boolean; changed: boolean; onEdit: (path: string, value: number) => void; ariaLabel: string }) {
  const value = getPath(scenario, path) ?? 0;
  const shown = field.kind === 'pct' ? +(value * 100).toFixed(4) : value;
  const [draft, setDraft] = useState<string | null>(null);
  if (!editable) return <span className={`ls-value${changed ? ' ls-edited' : ''}`}>{show(value, field.kind)}</span>;
  const commit = (text: string) => {
    const n = Number(text.replace(/[$,%\s]/g, ''));
    if (text.trim() !== '' && Number.isFinite(n)) onEdit(path, field.kind === 'pct' ? n / 100 : n);
    setDraft(null);
  };
  return (
    <span className={`ls-input${changed ? ' ls-edited' : ''}`}>
      <input
        inputMode="decimal"
        aria-label={ariaLabel}
        value={draft ?? String(shown)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => draft !== null && commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
          if (e.key === 'Escape') setDraft(null);
        }}
        autoComplete="off"
      />
      {field.kind === 'pct' && <span className="ls-unit">%</span>}
    </span>
  );
}

export interface LeaseSimulatorProps {
  scenario: LeaseScenario;
  /** Paths the student may edit. Leave empty for a read-only simulator. */
  editable?: string[];
  onChange?: (scenario: LeaseScenario) => void;
  /** Inputs that differ from this scenario are marked, and "Reset inputs" returns to it. */
  baseline?: LeaseScenario;
}

export function LeaseSimulator({ scenario, editable = [], onChange, baseline }: LeaseSimulatorProps) {
  const [view, setView] = useState<'building' | 'tenant'>('building');
  const [trace, setTrace] = useState('');
  const run = useMemo(() => runScenario(scenario), [scenario]);
  const cf = run.cf.slice(0, scenario.years);
  const next = run.cf[scenario.years];

  // remember the previous cash flow so the cells that moved can be marked
  const previous = useRef<CashFlowYear[] | null>(null);
  const [moved, setMoved] = useState<Record<string, 1 | -1>>({});
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    const before = previous.current;
    previous.current = run.cf;
    if (!before) return;
    const marks: Record<string, 1 | -1> = {};
    run.cf.forEach((row, i) => {
      for (const line of CASH_FLOW_LINES) {
        const d = row[line.key] - (before[i]?.[line.key] ?? row[line.key]);
        if (Math.abs(d) > 0.5) marks[`${line.key}-${i}`] = d > 0 ? 1 : -1;
      }
    });
    setMoved(marks);
    const count = Object.keys(marks).length;
    if (count === 0) return;
    // say which years moved, and what the bottom line of the first of them is now
    const years = [...new Set(Object.keys(marks).map((k) => Number(k.split('-')[1]) + 1))].sort((a, b) => a - b);
    const first = years[0];
    setAnnounce(`Cash flow recalculated. ${count} figures changed, in year${years.length === 1 ? '' : 's'} ${years.join(', ')}. Year ${first} cash flow before debt is now ${usd(run.cf[first - 1].cashFlowBeforeDebt)}.`);
  }, [run, scenario.years]);

  const canEdit = (path: string) => Boolean(onChange) && editable.includes(path);
  const edit = (path: string, value: number) => onChange?.(setPath(scenario, path, value));
  const differs = (path: string) => baseline !== undefined && getPath(baseline, path) !== getPath(scenario, path);
  const anyEdits = baseline !== undefined && [...editable].some(differs);

  return (
    <div className="ls">
      <div className="ls-inputs">
        <section>
          <h3>Rent roll</h3>
          <div className="ls-scroll">
            <table className="ls-table">
              <thead>
                <tr>
                  <th scope="col" className="left">Suite</th>
                  <th scope="col" className="left">Tenant</th>
                  {TENANT_FIELDS.map((f) => (
                    <th scope="col" key={f.key} title={f.help}>
                      {f.label}
                    </th>
                  ))}
                  <th scope="col" className="left">Recoveries</th>
                </tr>
              </thead>
              <tbody>
                {scenario.tenants.map((t) => {
                  const suite = t.id.replace(/^suite-/, '');
                  const extra = t.recovery === 'base-year' ? { key: 'baseYearExpenses', label: 'base year', kind: 'money' as const } : t.recovery === 'stop' ? { key: 'stopPsf', label: 'stop', kind: 'psf' as const } : null;
                  return (
                    <tr key={t.id}>
                      <th scope="row" className="left">
                        {suite}
                      </th>
                      <td className="left">{t.endYear === 0 ? <em>Vacant</em> : t.name}</td>
                      {TENANT_FIELDS.map((f) => {
                        const path = `tenants.${t.id}.${f.key}`;
                        return (
                          <td key={f.key}>
                            <NumberCell path={path} field={f} scenario={scenario} editable={canEdit(path)} changed={differs(path)} onEdit={edit} ariaLabel={`Suite ${suite}, ${f.label}`} />
                          </td>
                        );
                      })}
                      <td className="left">
                        {RECOVERY_LABELS[t.recovery]}
                        {extra && (
                          <>
                            {' · '}
                            {extra.label}{' '}
                            <NumberCell
                              path={`tenants.${t.id}.${extra.key}`}
                              field={extra}
                              scenario={scenario}
                              editable={canEdit(`tenants.${t.id}.${extra.key}`)}
                              changed={differs(`tenants.${t.id}.${extra.key}`)}
                              onEdit={edit}
                              ariaLabel={`Suite ${suite}, ${extra.label}`}
                            />
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="ls-forms">
          <section>
            <h3>Market leasing assumptions</h3>
            <dl className="ls-form">
              {MLA_FIELDS.map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>
                    <NumberCell path={`mla.${f.key}`} field={f} scenario={scenario} editable={canEdit(`mla.${f.key}`)} changed={differs(`mla.${f.key}`)} onEdit={edit} ariaLabel={f.label} />
                  </dd>
                </div>
              ))}
              <div>
                <dt>New leases recover</dt>
                <dd>
                  <span className="ls-value">{RECOVERY_LABELS[scenario.mla.recovery]}</span>
                </dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>Building</h3>
            <dl className="ls-form">
              <div>
                <dt>Rentable area</dt>
                <dd>
                  <span className="ls-value">{scenario.building.sf.toLocaleString('en-US')} SF</span>
                </dd>
              </div>
              {BUILDING_FIELDS.map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>
                    <NumberCell path={`building.${f.key}`} field={f} scenario={scenario} editable={canEdit(`building.${f.key}`)} changed={differs(`building.${f.key}`)} onEdit={edit} ariaLabel={f.label} />
                  </dd>
                </div>
              ))}
              {scenario.valuation && (
                <>
                  <div>
                    <dt>Discount rate</dt>
                    <dd>
                      <span className="ls-value">{show(scenario.valuation.discount, 'pct')}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Exit cap rate / selling costs</dt>
                    <dd>
                      <span className="ls-value">
                        {show(scenario.valuation.exitCap, 'pct')} / {show(scenario.valuation.saleCost, 'pct')}
                      </span>
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </section>
        </div>
      </div>

      <section>
        <div className="ls-cf-head">
          <h3>Cash flow</h3>
          <div className="seg" role="group" aria-label="Cash flow view">
            <button type="button" className={view === 'building' ? 'on' : ''} aria-pressed={view === 'building'} onClick={() => setView('building')}>
              Building
            </button>
            <button type="button" className={view === 'tenant' ? 'on' : ''} aria-pressed={view === 'tenant'} onClick={() => setView('tenant')}>
              Base rent by tenant
            </button>
          </div>
          {onChange && baseline && (
            <button type="button" className="btn small" disabled={!anyEdits} onClick={() => onChange(baseline)}>
              Reset inputs
            </button>
          )}
        </div>
        <div className="ls-scroll">
          <table className="ls-table ls-cf">
            <thead>
              <tr>
                <th scope="col" className="left">
                  {view === 'building' ? 'Line' : 'Suite'}
                </th>
                {cf.map((row) => (
                  <th scope="col" key={row.year}>
                    Year {row.year}
                  </th>
                ))}
                <th scope="col" className="ls-next" title="Projected only to value the resale at the end of the hold">
                  Year {next.year}
                </th>
              </tr>
            </thead>
            {view === 'building' ? (
              <tbody>
                {CASH_FLOW_LINES.map((line) => (
                  <tr key={line.key} className={`ls-${line.kind}`}>
                    <th scope="row" className="left">
                      {line.kind === 'cost' ? `Less: ${line.label.toLowerCase()}` : line.label}
                    </th>
                    {[...cf, next].map((row, i) => {
                      const mark = moved[`${line.key}-${i}`];
                      const value = line.kind === 'cost' ? -row[line.key] : row[line.key];
                      return (
                        <td key={i} className={`${i === cf.length ? 'ls-next ' : ''}${mark ? 'ls-moved' : ''}`}>
                          {usd(value)}
                          {mark && <span className="ls-mark" aria-label={mark > 0 ? 'went up' : 'went down'}>{mark > 0 ? '▲' : '▼'}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody>
                {scenario.tenants.map((t) => (
                  <tr key={t.id}>
                    <th scope="row" className="left">
                      {t.id.replace(/^suite-/, '')} <span className="muted">{t.endYear === 0 ? 'Vacant' : t.name}</span>
                    </th>
                    {[...cf, next].map((row, i) => {
                      const s = row.byTenant[t.id];
                      return (
                        <td key={i} className={`${i === cf.length ? 'ls-next ' : ''}ls-${s.status}`}>
                          <button type="button" className="ls-trace" title={s.note} onClick={() => setTrace(`Suite ${t.id.replace(/^suite-/, '')}, year ${row.year}: ${s.note}.`)}>
                            {usd(s.baseRent + s.freeRent + s.turnoverVacancy)}
                          </button>
                          {STATUS_TAG[s.status] && <span className="ls-tag">{STATUS_TAG[s.status]}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {view === 'tenant' && <p className="ls-note">{trace || 'Base rent after downtime and free rent. Click a figure to see how it was computed.'}</p>}
        {scenario.valuation && (
          <dl className="ls-valuation">
            <div>
              <dt>Net resale at the end of year {scenario.years}</dt>
              <dd>${usd(run.facts.resale)}</dd>
            </div>
            <div>
              <dt>Present value</dt>
              <dd>${usd(run.facts.present_value)}</dd>
            </div>
          </dl>
        )}
        <p className="ls-note">
          Whole years. A lease ends at the end of its last year and the space rolls the next year, with new and renewal outcomes blended by the
          renewal probability. Costs are shown as negatives. Year {next.year} is projected only to value the resale.
        </p>
      </section>
      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
