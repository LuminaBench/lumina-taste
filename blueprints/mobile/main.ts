import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/feedback/empty-state/empty-state.css';
import '../../components/ui/navigation/mobile-app-bar/mobile-app-bar.css';
import '../../components/ui/navigation/bottom-nav/bottom-nav.css';
import '../../components/ui/overlays/bottom-sheet/bottom-sheet.css';
import '../../components/ui/controls/amount-input/amount-input.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as bottomNav } from '../../components/ui/navigation/bottom-nav/bottom-nav';
import { enhance as sheet } from '../../components/ui/overlays/bottom-sheet/bottom-sheet';
import { enhance as amount } from '../../components/ui/controls/amount-input/amount-input';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { openDialog } from '../../components/ui/_shared/dom';

pageStates();
boot({ 'mobile-app-bar': appbar, 'bottom-nav': bottomNav, 'bottom-sheet': sheet, 'amount-input': amount, 'segmented-control': segmented });

const dialog = document.querySelector<HTMLDialogElement>('#mb-sheet');
const input = document.querySelector<HTMLInputElement>('#mb-amount');
const toast = document.querySelector<HTMLElement>('#mb-toast');
let opener: HTMLElement | null = null;
for (const id of ['mb-add', 'mb-add-top', 'mb-add-empty']) document.getElementById(id)?.addEventListener('click', (e) => { if (!dialog) return; opener = e.currentTarget as HTMLElement; openDialog(dialog); input?.focus(); });
dialog?.addEventListener('close', () => opener?.focus());

// Sending: check the amount in words, close the sheet, confirm with a short status message.
document.querySelector<HTMLFormElement>('#mb-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = parseFloat((input?.value ?? '').replace(/[^\d.]/g, ''));
  const hint = document.querySelector<HTMLElement>('#mb-amount-hint');
  if (!Number.isFinite(value) || value <= 0) { input?.setAttribute('aria-invalid', 'true'); input?.closest('.lt-amount')?.setAttribute('data-state', 'error'); if (hint) hint.textContent = 'Enter an amount, for example 250.00.'; input?.focus(); return; }
  const client = document.querySelector<HTMLSelectElement>('#mb-client')?.value ?? '';
  dialog?.close();
  if (toast) { toast.textContent = `Invoice sent to ${client}`; window.setTimeout(() => { toast.textContent = ''; }, 4000); }
  if (input) input.value = '';
});
