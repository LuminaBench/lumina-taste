import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/controls/search-input/search-input.css';
import '../../components/ui/navigation/app-sidebar/app-sidebar.css';
import '../../components/ui/navigation/account-menu/account-menu.css';
import '../../components/ui/data/filter-bar/filter-bar.css';
import '../../components/ui/data/data-table/data-table.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/feedback/empty-state/empty-state.css';
import './page.css';
import { enhance as sidebar } from '../../components/ui/navigation/app-sidebar/app-sidebar';
import { enhance as search } from '../../components/ui/controls/search-input/search-input';
import { enhance as account } from '../../components/ui/navigation/account-menu/account-menu';
import { enhance as filterBar } from '../../components/ui/data/filter-bar/filter-bar';
import { enhance as dataTable } from '../../components/ui/data/data-table/data-table';
import { render as multiLine } from '../../components/charts/multi-line-chart/multi-line-chart';
import { render as hbar } from '../../components/charts/horizontal-bar-chart/horizontal-bar-chart';
import { render as kpi } from '../../components/charts/kpi-card/kpi-card';
import { sparkSvg } from '../../components/charts/sparkline/sparkline';
import { months, round, walk } from '../../components/charts/core/demo-data';
import { rng } from '../../components/charts/core/scale';

// ------------------------------------------------------------------ accounts: 24 rows, rendered before the table enhancer runs
type Health = 'positive' | 'warning' | 'negative';
const NAMES = ['Harbour & Co', 'Juniper Health', 'Kestrel Labs', 'Fjord Mobility', 'Larkspur Studio', 'Moss Studio', 'Cobalt Freight', 'Halcyon Dental', 'Wren & Pike', 'Teal Street Bakery', 'Northgate Clinics', 'Bramble Legal', 'Saltmarsh Surveys', 'Ostler Freight', 'Pennant Labs', 'Quarry Lane Gym', 'Ridgeway Schools', 'Sable Analytics', 'Tamsin Cole Design', 'Umber Coffee', 'Vale Veterinary', 'Weir & Stone', 'Yarrow Home', 'Zephyr Bikes'];
const REGIONS = ['United Kingdom', 'Germany and Austria', 'Nordics', 'Benelux', 'United States (East)'];
const rand = rng(11);
const accounts = NAMES.map((name, i) => {
  const plan = i < 6 ? 'Scale' : i < 16 ? 'Team' : 'Starter';
  const base = plan === 'Scale' ? 6000 + rand() * 7000 : plan === 'Team' ? 1400 + rand() * 3600 : 180 + rand() * 600;
  const trend = round(walk(12, base * 0.78, base * 0.022, base * 0.06, i + 3), 0);
  const mrr = trend[11];
  const chg = +(((trend[11] - trend[10]) / trend[10]) * 100).toFixed(1);
  const health: [Health, string] = chg < -4 ? ['negative', 'Churning'] : chg < 0 ? ['warning', 'At risk'] : ['positive', 'Healthy'];
  return { name, plan, region: REGIONS[(i * 3) % 5], seats: Math.round(mrr / (plan === 'Scale' ? 48 : plan === 'Team' ? 32 : 18)), mrr, chg, trend, health };
});
const gbp = (v: number) => `£${Math.round(v).toLocaleString('en-GB')}`;
const esc = (t: string) => t.replace(/&/g, '&amp;');
document.getElementById('rows')!.innerHTML = accounts.sort((a, b) => b.mrr - a.mrr).map((a) => `<tr data-row>
  <td data-k="name">${esc(a.name)}</td><td data-k="plan">${a.plan}</td><td data-k="region" data-col="region">${a.region}</td>
  <td data-num data-k="seats" data-v="${a.seats}" data-col="seats">${a.seats}</td>
  <td data-num data-k="mrr" data-v="${a.mrr}">${gbp(a.mrr)}</td>
  <td data-num data-k="chg" data-v="${a.chg}"><span data-tone="${a.chg >= 0 ? 'positive' : 'negative'}">${a.chg >= 0 ? '+' : '−'}${Math.abs(a.chg).toFixed(1)}%</span></td>
  <td data-col="trend" data-spark="${a.trend.join(',')}"></td>
  <td data-k="status"><span class="lt-badge" data-tone="${a.health[0]}" data-dot>${a.health[1]}</span></td></tr>`).join('');
for (const td of document.querySelectorAll<HTMLElement>('[data-spark]')) {
  const vals = td.dataset.spark!.split(',').map(Number);
  td.append(sparkSvg(vals, { width: 96, height: 22, label: `${td.parentElement!.querySelector('[data-k="name"]')!.textContent} MRR, last 12 months`, format: { prefix: '£' }, color: vals[11] < vals[10] ? 'var(--status-negative)' : 'var(--chart-1)' }));
}

pageStates();
boot({ 'app-sidebar': sidebar, 'search-input': search, 'account-menu': account, 'filter-bar': filterBar, 'data-table': dataTable });

// ------------------------------------------------------------------ the main chart and the one beside it
const all = months(24);
const plans = [
  { name: 'Scale', values: round(walk(24, 92, 5.1, 10, 3), 0) },
  { name: 'Team', values: round(walk(24, 70, 2.9, 9, 8), 0) },
  { name: 'Starter', values: round(walk(24, 28, 0.4, 6, 21), 0) },
];
const at = (n: number) => plans.reduce((a, s) => a + s.values[s.values.length - n], 0);
const view = (n: number) => ({ x: all.slice(-n), series: plans.map((s) => ({ ...s, values: s.values.slice(-n) })) });
const tall = 300;
const mrr = multiLine(document.getElementById('c-mrr')!, view(12), { title: 'Scale drove most of this year’s growth', subtitle: 'MRR by plan, £k', highlight: 'Scale', format: { prefix: '£', suffix: 'k' }, source: 'Billing ledger', height: tall });
hbar(document.getElementById('c-region')!, [{ label: 'United Kingdom', value: 96 }, { label: 'Germany and Austria', value: 64 }, { label: 'Nordics', value: 41 }, { label: 'United States (East)', value: 38 }, { label: 'Benelux', value: 22 }], { title: 'The UK is still half the business', subtitle: 'MRR by region, £k', format: { prefix: '£', suffix: 'k' } });

// ------------------------------------------------------------------ ten figures on one surface
const ser = (start: number, step: number, n = 12, wobble = 0.02, seed = 5) => round(walk(n, start, step, Math.abs(start) * wobble, seed), 3);
const kpis = (n: number) => {
  const now = at(1), before = at(Math.min(24, n));
  const total = plans[0].values.slice(-n).map((v, i) => v + plans[1].values.slice(-n)[i] + plans[2].values.slice(-n)[i]);
  const set: Array<[string, Parameters<typeof kpi>[1], Parameters<typeof kpi>[2]]> = [
    ['k1', { label: 'MRR', value: now * 1000, previous: before * 1000, spark: total }, { format: { prefix: '£', compact: true } }],
    ['k2', { label: 'ARR', value: now * 12000, previous: before * 12000, spark: total.map((v) => v * 12) }, { format: { prefix: '£', compact: true } }],
    ['k3', { label: 'Net new MRR', value: 14200, previous: 11800, spark: ser(9.8, 0.35, 12, 0.08, 4) }, { format: { prefix: '£', compact: true } }],
    ['k4', { label: 'Net revenue retention', value: 1.18, previous: 1.14, spark: [1.08, 1.1, 1.09, 1.12, 1.13, 1.14, 1.15, 1.16, 1.18] }, { format: { percent: true } }],
    ['k5', { label: 'Gross revenue churn', value: 0.012, previous: 0.014, spark: [1.7, 1.6, 1.6, 1.5, 1.5, 1.4, 1.4, 1.3, 1.2] }, { format: { percent: true, decimals: 1 }, upIsGood: false }],
    ['k6', { label: 'Logo churn', value: 0.019, previous: 0.022, spark: [2.6, 2.5, 2.4, 2.4, 2.3, 2.2, 2.1, 2.0, 1.9] }, { format: { percent: true, decimals: 1 }, upIsGood: false }],
    ['k7', { label: 'Paying accounts', value: 1284, previous: 1201, spark: ser(1120, 14, 12, 0.006, 9) }, {}],
    ['k8', { label: 'Revenue per account', value: (now * 1000) / 1284, previous: (before * 1000) / 1201, spark: ser(250, 2.4, 12, 0.01, 2) }, { format: { prefix: '£' } }],
    ['k9', { label: 'Trial to paid', value: 0.214, previous: 0.231, spark: [24.1, 23.8, 23.9, 23.4, 23.1, 22.9, 22.6, 21.9, 21.4] }, { format: { percent: true, decimals: 1 } }],
    ['k10', { label: 'Days sales outstanding', value: 31, previous: 34, spark: [38, 37, 36, 36, 35, 34, 33, 32, 31] }, { format: { suffix: ' days' }, upIsGood: false }],
  ];
  for (const [id, d, o] of set) kpi(document.getElementById(id)!, d, { ...o, size: 'compact' });
};
kpis(12);

// One global filter bar drives every card.
document.getElementById('filters')!.addEventListener('lt-filters', (e) => {
  const range = +((e as CustomEvent).detail.range ?? 12);
  mrr.update(view(range));
  kpis(range);
});
