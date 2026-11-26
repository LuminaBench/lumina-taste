import { useEffect, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance, type RefreshDetail } from './pull-refresh';
import './pull-refresh.css';

/**
 * Pull to refresh around a list. `onRefresh` runs when the list is pulled past the mark or the Refresh
 * button is pressed; return a promise and the indicator spins until it settles (its value becomes the stamp).
 */
export function PullRefresh({ label, updated, onRefresh, children, className }: { label: string; updated: string; onRefresh: () => Promise<string | void>; children: ReactNode; className?: string }) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: Event) => {
      const ev = e as CustomEvent<RefreshDetail>;
      ev.preventDefault();
      onRefresh().then((s) => ev.detail.done(s || undefined), () => ev.detail.done('Could not refresh. Try again.'));
    };
    el.addEventListener('lt-refresh', handler);
    return () => el.removeEventListener('lt-refresh', handler);
  }, [onRefresh, ref]);
  return (
    <div ref={ref} className={cx('lt-pull', className)} role="region" aria-label={label}>
      <div data-part="indicator" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="9" data-part="track" /><circle cx="12" cy="12" r="9" data-part="arc" pathLength={1} /></svg></div>
      <div data-part="body">
        <p data-part="stamp"><span data-part="when">{updated}</span><button type="button" data-part="refresh"><Icon name="refresh" size={14} /><span>Refresh</span></button></p>
        {children}
      </div>
      <p data-part="live" role="status" className="lt-visually-hidden" />
    </div>
  );
}
