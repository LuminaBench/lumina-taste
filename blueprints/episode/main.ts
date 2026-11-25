import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/navigation/reading-progress/reading-progress.css';
import '../../components/ui/data/media-player/media-player.css';
import '../../components/ui/blocks/newsletter-signup/newsletter-signup.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-simple/navbar-simple';
import { enhance as progress } from '../../components/ui/navigation/reading-progress/reading-progress';
import { enhance as player } from '../../components/ui/data/media-player/media-player';
import { enhance as newsletter } from '../../components/ui/blocks/newsletter-signup/newsletter-signup';

boot({ 'navbar-simple': navbar, 'reading-progress': progress, 'media-player': player, 'newsletter-signup': newsletter });

// Chapters seek the player through its own scrubber, so the two can never disagree. The current chapter
// follows playback. With a real file, put an <audio src> inside the player and this keeps working.
const seek = document.querySelector<HTMLInputElement>('#ep-player [data-part="seek"]');
const chapters = [...document.querySelectorAll<HTMLButtonElement>('#ep-chapters [data-seek]')];
const mark = (time: number) => {
  let current = chapters[0];
  for (const c of chapters) if (Number(c.dataset.seek) <= time) current = c;
  for (const c of chapters) { if (c === current) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current'); }
};
for (const c of chapters) c.addEventListener('click', () => {
  if (!seek) return;
  seek.value = c.dataset.seek ?? '0';
  seek.dispatchEvent(new Event('input', { bubbles: true }));
  mark(Number(seek.value));
});
document.querySelector('#ep-player')?.addEventListener('lt-change', (e) => mark(Number((e as CustomEvent).detail?.time ?? 0)));
seek?.addEventListener('input', () => mark(Number(seek.value)));
