/** Machine-checked data for construction/BUILD_SPEC.md. After editing, run `npm run sync-specs`. Costs and terms are illustrative. */
import type { SpecData } from '../specs';

export const SPEC: SpecData = {
  examples: [
    {
      id: 'con-ex-budget',
      title: 'Hard costs, soft costs and cost per SF',
      concept:
        'Hard costs are the physical construction (site work, structure, finishes, the contractor’s fee and general conditions). Soft costs are everything else needed to deliver the building (design, permits and fees, legal, insurance, financing, developer fee). Land is separate.',
      given: [
        { name: 'gsf', label: 'Gross building area (SF)', value: 120000, format: 'int' },
        { name: 'units', label: 'Units', value: 140, format: 'int' },
        { name: 'hard_psf', label: 'Hard cost ($/GSF, illustrative)', value: 310, format: 'usd' },
        { name: 'soft_pct', label: 'Soft costs as % of hard', value: 0.25, format: 'pct' },
        { name: 'land', label: 'Land', value: 9000000, format: 'usd' },
      ],
      steps: [
        { name: 'hard', label: 'Hard costs', formula: '=gsf*hard_psf', format: 'usd' },
        { name: 'soft', label: 'Soft costs', formula: '=hard*soft_pct', format: 'usd' },
        { name: 'total', label: 'Total development cost', formula: '=land+hard+soft', format: 'usd' },
        { name: 'per_unit', label: 'Total cost per unit', formula: '=total/units', format: 'usd' },
        { name: 'per_sf', label: 'Total cost per GSF', formula: '=total/gsf', format: 'usd' },
      ],
    },
    {
      id: 'con-ex-contingency',
      title: 'Contingency by estimate stage',
      concept:
        'The earlier the estimate, the less is known and the larger the contingency. As drawings progress (concept, schematic design, design development, construction documents) the estimate narrows and contingency is released into known line items. Percentages here are illustrative.',
      given: [
        { name: 'base', label: 'Hard cost estimate before contingency', value: 37200000, format: 'usd' },
        { name: 'concept_pct', label: 'Contingency at concept stage', value: 0.15, format: 'pct' },
        { name: 'cd_pct', label: 'Contingency at construction documents', value: 0.05, format: 'pct' },
      ],
      steps: [
        { name: 'concept_budget', label: 'Budget at concept stage', formula: '=base*(1+concept_pct)', format: 'usd' },
        { name: 'cd_budget', label: 'Budget at construction documents', formula: '=base*(1+cd_pct)', format: 'usd' },
        { name: 'released', label: 'Contingency released if the base holds', formula: '=concept_budget-cd_budget', format: 'usd' },
      ],
    },
    {
      id: 'con-ex-drawdown',
      title: 'Contingency drawdown against progress',
      concept: 'Compare the share of contingency used with the share of work complete. A burn ratio above 1.0 means contingency is going faster than the building.',
      given: [
        { name: 'hard', label: 'Hard cost budget', value: 24000000, format: 'usd' },
        { name: 'contingency_pct', label: 'Contingency', value: 0.05, format: 'pct' },
        { name: 'complete', label: 'Work complete', value: 0.45, format: 'pct' },
        { name: 'approved', label: 'Approved change orders', value: 510000, format: 'usd' },
      ],
      steps: [
        { name: 'contingency', label: 'Original contingency', formula: '=hard*contingency_pct', format: 'usd' },
        { name: 'used', label: 'Share used', formula: '=approved/contingency', format: 'pct1' },
        { name: 'remaining', label: 'Contingency remaining', formula: '=contingency-approved', format: 'usd' },
        { name: 'burn', label: 'Burn ratio', formula: '=used/complete', format: 'num2' },
        { name: 'cushion', label: 'Remaining as % of work still to do', formula: '=remaining/(hard*(1-complete))', format: 'pct1' },
      ],
    },
    {
      id: 'con-ex-change-order',
      title: 'Pricing a change order',
      concept: 'A change order adds the direct cost of the changed work plus the contractor’s agreed markup for overhead and profit. The contract sets the markup; check that it is applied once.',
      given: [
        { name: 'direct', label: 'Direct cost of the change', value: 80000, format: 'usd' },
        { name: 'markup', label: 'Overhead and profit markup', value: 0.15, format: 'pct' },
        { name: 'contract_sum', label: 'Contract sum before the change', value: 24000000, format: 'usd' },
      ],
      steps: [
        { name: 'change', label: 'Change order amount', formula: '=direct*(1+markup)', format: 'usd' },
        { name: 'new_sum', label: 'Revised contract sum', formula: '=contract_sum+change', format: 'usd' },
        { name: 'pct', label: 'Change as % of the contract', formula: '=change/contract_sum', format: 'pct2' },
      ],
    },
    {
      id: 'con-ex-pay-app',
      title: 'Pay application: retainage and the amount due',
      concept:
        'Each month the contractor bills work completed to date. The owner holds back retainage (a percentage set by the contract and limited by law in some places) until the end. Amount due = completed to date - retainage - previous payments.',
      given: [
        { name: 'completed', label: 'Work completed and stored to date', value: 10000000, format: 'usd' },
        { name: 'retainage_pct', label: 'Retainage (per the contract)', value: 0.05, format: 'pct' },
        { name: 'previous', label: 'Previous payments', value: 7600000, format: 'usd' },
      ],
      steps: [
        { name: 'retainage', label: 'Retainage held', formula: '=completed*retainage_pct', format: 'usd' },
        { name: 'earned', label: 'Earned less retainage', formula: '=completed-retainage', format: 'usd' },
        { name: 'due', label: 'Current payment due', formula: '=earned-previous', format: 'usd' },
      ],
    },
    {
      id: 'con-ex-gmp',
      title: 'Guaranteed maximum price with shared savings',
      concept:
        'Under a GMP contract the owner pays the cost of the work plus a fee, up to a guaranteed maximum. If the final cost is below the GMP, savings are shared as the contract says. If it is above, the contractor bears the overrun (unless the scope changed).',
      given: [
        { name: 'gmp', label: 'Guaranteed maximum price', value: 30000000, format: 'usd' },
        { name: 'cost_plus_fee', label: 'Final cost of the work plus fee', value: 29200000, format: 'usd' },
        { name: 'owner_share', label: 'Owner’s share of savings', value: 0.5, format: 'pct' },
        { name: 'overrun_case', label: 'Final cost in an overrun case', value: 30900000, format: 'usd' },
      ],
      steps: [
        { name: 'savings', label: 'Savings', formula: '=MAX(0,gmp-cost_plus_fee)', format: 'usd' },
        { name: 'owner_pays', label: 'Owner pays', formula: '=MIN(gmp,cost_plus_fee)+savings*(1-owner_share)', format: 'usd' },
        { name: 'owner_pays_overrun', label: 'Owner pays in the overrun case', formula: '=MIN(gmp,overrun_case)', format: 'usd' },
        { name: 'contractor_loss', label: 'Contractor absorbs', formula: '=MAX(0,overrun_case-gmp)', format: 'usd' },
      ],
    },
    {
      id: 'con-ex-cost-plus',
      title: 'Cost-plus vs. lump sum',
      concept: 'Cost-plus: the owner pays actual cost plus a fee, and carries the cost risk. Lump sum: a fixed price, and the contractor carries the cost risk (and prices it in).',
      given: [
        { name: 'expected_cost', label: 'Expected cost of the work', value: 26000000, format: 'usd' },
        { name: 'fee_pct', label: 'Cost-plus fee', value: 0.05, format: 'pct' },
        { name: 'lump_sum', label: 'Lump-sum bid', value: 28100000, format: 'usd' },
        { name: 'overrun', label: 'Cost overrun scenario', value: 0.08, format: 'pct' },
      ],
      steps: [
        { name: 'cost_plus_expected', label: 'Cost-plus price if cost is as expected', formula: '=expected_cost*(1+fee_pct)', format: 'usd' },
        { name: 'cost_plus_overrun', label: 'Cost-plus price with the overrun', formula: '=expected_cost*(1+overrun)*(1+fee_pct)', format: 'usd' },
        { name: 'premium', label: 'What the lump sum charges for certainty', formula: '=lump_sum-cost_plus_expected', format: 'usd' },
        { name: 'overrun_gap', label: 'Lump sum saves in the overrun case', formula: '=cost_plus_overrun-lump_sum', format: 'usd' },
      ],
    },
    {
      id: 'con-ex-delay',
      title: 'The cost of a delay',
      concept: 'Each month of delay costs interest on the loan outstanding, the contractor’s and owner’s time-related costs, and the rent not yet earned.',
      given: [
        { name: 'loan', label: 'Loan outstanding', value: 28000000, format: 'usd' },
        { name: 'rate', label: 'Interest rate', value: 0.08, format: 'pct' },
        { name: 'gen_cond', label: 'General conditions and owner costs per month', value: 85000, format: 'usd' },
        { name: 'lost_noi', label: 'NOI deferred per month', value: 190000, format: 'usd' },
        { name: 'months', label: 'Months of delay', value: 3, format: 'int' },
      ],
      steps: [
        { name: 'interest', label: 'Extra interest', formula: '=loan*rate/12*months', format: 'usd' },
        { name: 'time_costs', label: 'Time-related costs', formula: '=gen_cond*months', format: 'usd' },
        { name: 'deferred', label: 'NOI deferred', formula: '=lost_noi*months', format: 'usd' },
        { name: 'total', label: 'Total cost of the delay', formula: '=interest+time_costs+deferred', format: 'usd' },
      ],
    },
    {
      id: 'con-ex-critical-path',
      title: 'Critical path and float',
      concept:
        'The critical path is the longest chain of dependent tasks; it sets the project duration. A task off the critical path has float: it can slip that long without delaying completion.',
      given: [
        { name: 'task_a', label: 'A: foundations (months)', value: 3, format: 'int' },
        { name: 'task_b', label: 'B: structure, after A', value: 5, format: 'int' },
        { name: 'task_c', label: 'C: interiors, after B', value: 4, format: 'int' },
        { name: 'task_d', label: 'D: site utilities, after A, must finish before C ends', value: 6, format: 'int' },
      ],
      steps: [
        { name: 'path_one', label: 'Path A-B-C', formula: '=task_a+task_b+task_c', format: 'int' },
        { name: 'path_two', label: 'Path A-D', formula: '=task_a+task_d', format: 'int' },
        { name: 'duration', label: 'Project duration', formula: '=MAX(path_one,path_two)', format: 'int' },
        { name: 'float_d', label: 'Float on task D', formula: '=duration-path_two', format: 'int' },
      ],
    },
  ],
  typeMix: {
    flashcard: 5,
    mcq: 4,
    numeric: 4,
    grid: 4,
    errorhunt: 2,
    order: 2,
    docreview: 2,
    judgment: 1,
  },
  chunks: [
    { title: 'Chunk 0: seeds (done)', items: 2, scope: 'construction-draws-docreview-pay-application, construction-changes-grid-contingency-drawdown' },
    { title: 'Chunk 1', items: 22, scope: 'Everything else: construction-costs (6), construction-delivery (5), construction-changes (3 more), construction-draws (4 more), construction-schedule (4); set status to built' },
  ],
};
