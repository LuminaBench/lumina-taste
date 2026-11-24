import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/controls/search-input/search-input.css';
import '../../components/ui/navigation/app-sidebar/app-sidebar.css';
import '../../components/ui/navigation/account-menu/account-menu.css';
import '../../components/ui/data/filter-bar/filter-bar.css';
import '../../components/ui/data/data-table/data-table.css';
import '../../components/ui/feedback/badge/badge.css';
import './page.css';
import { enhance as sidebar } from '../../components/ui/navigation/app-sidebar/app-sidebar';
import { enhance as search } from '../../components/ui/controls/search-input/search-input';
import { enhance as account } from '../../components/ui/navigation/account-menu/account-menu';
import { enhance as filterBar } from '../../components/ui/data/filter-bar/filter-bar';
import { enhance as dataTable } from '../../components/ui/data/data-table/data-table';
import { render as multiLine } from '../../components/charts/multi-line-chart/multi-line-chart';
import { render as stacked } from '../../components/charts/stacked-bar-chart/stacked-bar-chart';
import { render as donut } from '../../components/charts/donut-chart/donut-chart';
import { render as hbar } from '../../components/charts/horizontal-bar-chart/horizontal-bar-chart';
import { render as kpi } from '../../components/charts/kpi-card/kpi-card';
import { months, round, walk } from '../../components/charts/core/demo-data';

// Rows first, so the table enhancer sees them.
const accounts: Array<[string, string, number, number, 'positive' | 'warning' | 'negative', string]> = [
  ['Harbour & Co', 'Scale', 12400, 8.2, 'positive', 'Healthy'], ['Kestrel Labs', 'Team', 4820, -3.1, 'warning', 'At risk'], ['Moss Studio', 'Team', 2150, 14.6, 'positive', 'Healthy'],
  ['Juniper Health', 'Scale', 9310, 2.4, 'positive', 'Healthy'], ['Fjord Mobility', 'Scale', 7640, -8.9, 'negative', 'Churning'], ['Cobalt Freight', 'Team', 3380, 0.6, 'positive', 'Healthy'],
];
const gbp = (v: number) => `£${v.toLocaleString('en-GB')}`;
document.getElementById('rows')!.innerHTML = accounts.sort((a, b) => b[2] - a[2]).map(([n, p, m, c, tone, label]) => `<tr data-row><td data-k="name">${n.replace('&', '&amp;')}</td><td data-k="plan">${p}</td><td data-num data-k="mrr" data-v="${m}">${gbp(m)}</td><td data-num data-k="chg" data-v="${c}"><span data-tone="${c >= 0 ? 'positive' : 'negative'}">${c >= 0 ? '+' : '−'}${Math.abs(c).toFixed(1)}%</span></td><td data-k="status"><span class="lt-badge" data-tone="${tone}" data-dot>${label}</span></td></tr>`).join('');

boot({ 'app-sidebar': sidebar, 'search-input': search, 'account-menu': account, 'filter-bar': filterBar, 'data-table': dataTable });

const all = months(24);
const plans = [
  { name: 'Scale', values: round(walk(24, 92, 5.1, 10, 3), 0) },
  { name: 'Team', values: round(walk(24, 70, 2.9, 9, 8), 0) },
  { name: 'Starter', values: round(walk(24, 28, 0.4, 6, 21), 0) },
];
const sum = (n: number) => plans.reduce((a, s) => a + s.values[s.values.length - n], 0);
const view = (n: number) => ({ x: all.slice(-n), series: plans.map((s) => ({ ...s, values: s.values.slice(-n) })) });

const mrr = multiLine(document.getElementById('c-mrr')!, view(12), { title: 'Scale drove most of this year’s growth', subtitle: 'MRR by plan, £k', highlight: 'Scale', format: { prefix: '£', suffix: 'k' }, source: 'Billing ledger' });
const planMix = (n: number) => ({ categories: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'New', values: [42, 51, 48, 63].map((v) => Math.round(v * n / 12)) }, { name: 'Expansion', values: [18, 22, 29, 34].map((v) => Math.round(v * n / 12)) }, { name: 'Reactivated', values: [5, 4, 7, 6] }] });
const mix = stacked(document.getElementById('c-plan')!, planMix(12), { title: 'Expansion keeps rising', subtitle: 'New MRR by source, £k', format: { prefix: '£', suffix: 'k' } });
donut(document.getElementById('c-pay')!, [{ label: 'Card', value: 18240 }, { label: 'Direct debit', value: 9110 }, { label: 'Invoice', value: 4380 }, { label: 'Other', value: 1350 }], { title: 'Most revenue arrives by card', subtitle: 'Share of collected revenue', format: { prefix: '£', compact: true }, centerLabel: 'Collected' });
hbar(document.getElementById('c-region')!, [{ label: 'United Kingdom', value: 96 }, { label: 'Germany and Austria', value: 64 }, { label: 'Nordics', value: 41 }, { label: 'United States (East)', value: 38 }, { label: 'Benelux', value: 22 }], { title: 'The UK is still half the business', subtitle: 'MRR by region, £k', format: { prefix: '£', suffix: 'k' } });

const kpis = (n: number) => {
  const now = sum(1), before = sum(Math.min(24, n));
  kpi(document.getElementById('k1')!, { label: 'MRR', value: now * 1000, previous: before * 1000, spark: plans[0].values.slice(-n).map((v, i) => v + plans[1].values.slice(-n)[i]) }, { format: { prefix: '£', compact: true } });
  kpi(document.getElementById('k2')!, { label: 'Net revenue retention', value: 1.18, previous: 1.14, spark: [1.08, 1.1, 1.09, 1.12, 1.13, 1.14, 1.15, 1.16, 1.18] }, { format: { percent: true } });
  kpi(document.getElementById('k3')!, { label: 'Logo churn', value: 0.019, previous: 0.022, spark: [2.6, 2.5, 2.4, 2.4, 2.3, 2.2, 2.1, 2.0, 1.9] }, { format: { percent: true, decimals: 1 }, upIsGood: false });
  kpi(document.getElementById('k4')!, { label: 'Days sales outstanding', value: 31, previous: 34, spark: [38, 37, 36, 36, 35, 34, 33, 32, 31] }, { format: { suffix: ' days' }, upIsGood: false });
};
kpis(12);

// One global filter bar drives every card.
document.getElementById('filters')!.addEventListener('lt-filters', (e) => {
  const range = +((e as CustomEvent).detail.range ?? 12);
  mrr.update(view(range));
  mix.update(planMix(range));
  kpis(range);
});
