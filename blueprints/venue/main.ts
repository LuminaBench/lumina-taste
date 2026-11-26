import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/blocks/hero-board/hero-board.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/blocks/offer-cards/offer-cards.css';
import '../../components/ui/controls/date-picker/date-picker.css';
import '../../components/ui/controls/number-stepper/number-stepper.css';
import '../../components/ui/controls/booking-bar/booking-bar.css';
import '../../components/ui/blocks/visit-info/visit-info.css';
import '../../components/ui/blocks/faq-section/faq-section.css';
import '../../components/ui/navigation/site-footer/site-footer.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-simple/navbar-simple';
import { enhance as datePicker } from '../../components/ui/controls/date-picker/date-picker';
import { enhance as stepper } from '../../components/ui/controls/number-stepper/number-stepper';
import { enhance as booking } from '../../components/ui/controls/booking-bar/booking-bar';
import { enhance as visit } from '../../components/ui/blocks/visit-info/visit-info';
import { enhance as art } from '../../components/ui/data/art-panel/art-panel';

boot({ 'navbar-simple': navbar, 'date-picker': datePicker, 'number-stepper': stepper, 'booking-bar': booking, 'visit-info': visit, 'art-panel': art });

// Availability: a stand-in. Replace this handler with a call to your booking system and put its answer in
// the result line. Here tastings run at weekends, with eight places each.
document.querySelector('.lt-booking')?.addEventListener('lt-change', (e) => {
  const d = (e as CustomEvent).detail as { date?: string; time?: string; people?: number };
  if (!d?.date || !d.time || !d.people) return;
  e.preventDefault();
  const result = document.querySelector<HTMLElement>('.lt-booking [data-part="result"]');
  if (!result) return;
  const day = new Date(`${d.date}T12:00:00`);
  const when = day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  const left = 8 - ((day.getDate() * 3 + Number(d.time.slice(0, 2))) % 6);
  if (!weekend) { result.dataset.state = 'error'; result.textContent = `No tastings on ${when}. They run on Saturdays and Sundays.`; }
  else if (d.people > left) { result.dataset.state = 'error'; result.textContent = `${when} at ${d.time} has ${left} ${left === 1 ? 'place' : 'places'} left. Try another time or a smaller group.`; }
  else { result.dataset.state = 'ok'; result.textContent = `${when} at ${d.time}: ${left} places left. ${d.people} held for 10 minutes while you pay.`; }
});
