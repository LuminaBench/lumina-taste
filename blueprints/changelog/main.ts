import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/data/timeline/timeline.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as navbarSimple } from '../../components/ui/navigation/navbar-simple/navbar-simple';

boot({ 'segmented-control': segmented, 'navbar-simple': navbarSimple });

const items = [...document.querySelectorAll<HTMLLIElement>('.cl-list li')];
document.querySelector('#cl-filter')!.addEventListener('lt-change', (e) => {
  const v = String((e as CustomEvent).detail?.value ?? 'all');
  for (const li of items) li.hidden = v !== 'all' && li.dataset.tag !== v;
});
