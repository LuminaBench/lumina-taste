import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/navigation/navbar-mega/navbar-mega.css';
import '../../components/ui/navigation/site-footer/site-footer.css';
import '../../components/ui/data/bento-grid/bento-grid.css';
import '../../components/ui/data/stat-strip/stat-strip.css';
import '../../components/ui/blocks/faq-section/faq-section.css';
import '../../components/ui/blocks/sticky-story/sticky-story.css';
import '../../components/ui/data/device-frame/device-frame.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-mega/navbar-mega';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as story } from '../../components/ui/blocks/sticky-story/sticky-story';
import { render as multiLine } from '../../components/charts/multi-line-chart/multi-line-chart';
import { months, round, walk } from '../../components/charts/core/demo-data';

// One scroll moment: setting up, pinned (sticky-story). The hero enters; every section rises into place.
boot({ 'navbar-mega': navbar, 'segmented-control': segmented, 'sticky-story': story });

const all = months(24);
const series = [
  { name: 'Scale', values: round(walk(24, 60, 4.2, 9, 3), 0) },
  { name: 'Team', values: round(walk(24, 48, 2.6, 8, 8), 0) },
  { name: 'Starter', values: round(walk(24, 22, 0.6, 5, 21), 0) },
];
const slice = (n: number) => ({ x: all.slice(-n), series: series.map((s) => ({ ...s, values: s.values.slice(-n) })) });
const chart = multiLine(document.getElementById('hero-chart')!, slice(12), { title: 'Scale is now the biggest plan', subtitle: 'MRR by plan, £k', highlight: 'Scale', format: { prefix: '£', suffix: 'k' }, export: false });
document.getElementById('range')!.addEventListener('lt-change', (e) => chart.update(slice(+(e as CustomEvent).detail.value)));
