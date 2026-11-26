import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import { appShell } from '../_shared/app';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/navigation/mobile-app-bar/mobile-app-bar.css';
import '../../components/ui/navigation/bottom-nav/bottom-nav.css';
import '../../components/ui/controls/settings-group/settings-group.css';
import '../_shared/app.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as settings } from '../../components/ui/controls/settings-group/settings-group';

pageStates();
boot({ 'mobile-app-bar': appbar, 'settings-group': settings });
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const app = appShell({ home: 'invoices' });

// Switches act at once and say so; there is no Save button anywhere.
document.addEventListener('lt-change', (e) => {
  const d = (e as CustomEvent<{ label?: string; checked?: boolean }>).detail;
  if (d && typeof d.checked === 'boolean' && d.label) app.say(`${d.label}: ${d.checked ? 'on' : 'off'}`);
});
$('#se-remind').addEventListener('click', () => app.say('Reminder sent to Harrow and Finch'));
// Closing the account: the button wakes only when the word is typed.
const field = $<HTMLInputElement>('#se-confirm');
const go = $<HTMLButtonElement>('#se-close');
field.addEventListener('input', () => { go.disabled = field.value.trim().toUpperCase() !== 'CLOSE'; });
go.addEventListener('click', () => app.say('Account closed. We have emailed you a copy of every invoice.'));
