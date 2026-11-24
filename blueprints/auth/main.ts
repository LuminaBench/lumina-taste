import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/text-field/text-field.css';
import '../../components/ui/controls/otp-input/otp-input.css';
import '../../components/ui/controls/radio-cards/radio-cards.css';
import './page.css';
import { enhance as textField } from '../../components/ui/controls/text-field/text-field';
import { enhance as otp } from '../../components/ui/controls/otp-input/otp-input';
import { setLoading } from '../../components/ui/controls/button/button';

boot({ 'text-field': textField, 'otp-input': otp });

const show = (id: string) => {
  for (const s of document.querySelectorAll<HTMLElement>('.au-card')) s.hidden = s.id !== id;
  document.querySelector<HTMLElement>(`#${id} input, #${id} h1`)?.focus();
};
const emailForm = document.getElementById('email-form')!;
emailForm.addEventListener('lt-change', (e) => {
  if (!(e as CustomEvent).detail.valid) return;
  const btn = document.getElementById('send')!;
  setLoading(btn, true);
  setTimeout(() => {
    setLoading(btn, false);
    document.getElementById('sent-to')!.textContent = (document.getElementById('au-email') as HTMLInputElement).value;
    show('step-code');
  }, 600);
});
document.getElementById('back')!.addEventListener('click', () => show('step-email'));
document.getElementById('resend')!.addEventListener('click', (e) => { (e.target as HTMLElement).textContent = 'Code sent again'; });
document.getElementById('otp')!.addEventListener('lt-change', (e) => { if ((e as CustomEvent).detail.complete) setTimeout(() => show('step-setup'), 500); });
document.getElementById('ws-form')!.addEventListener('lt-change', (e) => {
  if (!(e as CustomEvent).detail.valid) return;
  document.getElementById('ws-name')!.textContent = (document.getElementById('au-ws') as HTMLInputElement).value;
  show('step-done');
});
document.getElementById('restart')!.addEventListener('click', () => {
  document.querySelectorAll<HTMLFormElement>('form').forEach((f) => f.reset());
  document.querySelectorAll<HTMLInputElement>('#otp input').forEach((i) => (i.value = ''));
  show('step-email');
});
