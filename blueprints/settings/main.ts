import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/text-field/text-field.css';
import '../../components/ui/controls/toggle-switch/toggle-switch.css';
import '../../components/ui/controls/radio-group/radio-group.css';
import '../../components/ui/data/description-list/description-list.css';
import '../../components/ui/feedback/toast-stack/toast-stack.css';
import '../../components/ui/overlays/modal-dialog/modal-dialog.css';
import './page.css';
import { enhance as textField } from '../../components/ui/controls/text-field/text-field';
import { enhance as modal } from '../../components/ui/overlays/modal-dialog/modal-dialog';
import { toast } from '../../components/ui/feedback/toast-stack/toast-stack';
import { setLoading } from '../../components/ui/controls/button/button';

boot({ 'text-field': textField, 'modal-dialog': modal });

const form = document.getElementById('settings') as HTMLFormElement;
const bar = document.getElementById('savebar')!;
const region = Object.assign(document.createElement('ol'), { className: 'lt-toasts' });
region.setAttribute('aria-label', 'Notifications');
document.body.append(region);

const snapshot = () => JSON.stringify([...form.querySelectorAll<HTMLInputElement>('input')].map((i) => (i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value)));
let saved = snapshot();
const sync = () => { bar.hidden = snapshot() === saved; };
form.addEventListener('input', sync);
form.addEventListener('change', sync);
document.getElementById('discard')!.addEventListener('click', () => { form.reset(); sync(); toast(region, { title: 'Changes discarded', tone: 'info' }); });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.querySelectorAll<HTMLInputElement>('input:invalid').length) {
    const btn = document.getElementById('save')!;
    setLoading(btn, true);
    setTimeout(() => {
      setLoading(btn, false);
      form.querySelectorAll<HTMLInputElement>('input').forEach((i) => { i.defaultValue = i.value; i.defaultChecked = i.checked; });
      saved = snapshot();
      sync();
      toast(region, { title: 'Settings saved', body: 'Your changes are live for the whole workspace.', tone: 'positive' });
    }, 700);
  }
});
window.addEventListener('beforeunload', (e) => { if (!bar.hidden) e.preventDefault(); });

// Section nav follows scroll.
const links = [...document.querySelectorAll<HTMLAnchorElement>('.st-nav a')];
const io = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) links.forEach((a) => (a.hash === `#${en.target.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
}, { rootMargin: '-20% 0px -70% 0px' });
document.querySelectorAll('.st-section').forEach((s) => io.observe(s));
