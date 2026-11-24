import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Cookie consent: "Essential only" and "Accept all" carry equal weight (no dark pattern), and
 * Customise reveals per-category switches. The choice is emitted; storing it is up to the app.
 */
export function enhance(root: HTMLElement): Cleanup {
  const banner = part(root, 'banner')!;
  const prefs = part(root, 'prefs')!;
  const customise = part<HTMLButtonElement>(root, 'customise')!;
  const done = part(root, 'done')!;
  const analytics = prefs.querySelector<HTMLInputElement>('[name="analytics"]')!;
  const finish = (choice: { analytics: boolean }) => {
    banner.hidden = true;
    done.hidden = false;
    done.textContent = choice.analytics ? 'Saved: essential and analytics cookies.' : 'Saved: essential cookies only.';
    emit(root, choice);
  };
  return combine(
    on(customise, 'click', () => {
      const open = prefs.hidden;
      prefs.hidden = !open;
      customise.setAttribute('aria-expanded', String(open));
      customise.textContent = open ? 'Save choices' : 'Customise';
      if (!open) finish({ analytics: analytics.checked });
    }),
    on(banner, 'click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-choice]');
      if (b) finish({ analytics: b.dataset.choice === 'all' });
    }),
  );
}
