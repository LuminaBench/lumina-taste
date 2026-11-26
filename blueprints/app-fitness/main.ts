import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import { appShell } from '../_shared/app';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/data/activity-rings/activity-rings.css';
import '../../components/ui/navigation/mobile-app-bar/mobile-app-bar.css';
import '../../components/ui/navigation/bottom-nav/bottom-nav.css';
import '../../components/ui/controls/settings-group/settings-group.css';
import '../_shared/app.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as settings } from '../../components/ui/controls/settings-group/settings-group';
import { render as bars } from '../../components/charts/bar-chart/bar-chart';

pageStates();
boot({ 'mobile-app-bar': appbar, 'settings-group': settings });
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const app = appShell({ home: 'today' });
const phone = (w: number) => Math.round(Math.min(170, w * 0.4));

// A week of exercise: one hue, today in the highlight; the bars carry their own minutes.
const days = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
bars($('#ft-week'), days.map((label, i) => ({ label, value: [34, 62, 12, 20, 32, 41, 18][i] })), { title: 'Four days over 30 minutes', subtitle: 'Minutes of exercise, last 7 days', highlight: 'Thu', format: { decimals: 0 }, axis: false, height: phone, export: false });
bars($('#ft-splits'), ['1', '2', '3', '4', '5'].map((label, i) => ({ label: `km ${label}`, value: [6.4, 6.1, 5.9, 6.3, 6.0][i] })), { title: 'Your third kilometre was the fastest', subtitle: 'Minutes per kilometre', highlight: 'km 3', format: { decimals: 1 }, axis: false, height: phone, export: false });

// The workout: the timer runs while the screen is open and not paused; one button pauses and resumes.
let secs = 12 * 60 + 48;
let running = true;
const time = $('#ft-time');
const pause = $<HTMLButtonElement>('#ft-pause');
const tick = () => { if (!running || document.body.dataset.screen !== 'workout') return; secs += 1; time.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`; };
setInterval(tick, 1000);
pause.addEventListener('click', () => {
  running = !running;
  pause.setAttribute('aria-pressed', String(!running));
  pause.querySelector('[data-part="label"]')!.textContent = running ? 'Pause' : 'Resume';
  app.say(running ? 'Going again' : 'Paused. Your time is kept.');
});
$('#ft-end').addEventListener('click', () => { app.say(`Saved: ${time.textContent} of intervals`); app.show('history', 'back'); });
