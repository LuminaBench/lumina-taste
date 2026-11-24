import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './setup-checklist';
import './setup-checklist.css';

export interface ChecklistStep { title: string; sub?: string; done?: boolean }

/** Onboarding checklist with a progress ring. */
export function SetupChecklist({ title, steps, onChange, className }: { title: string; steps: ChecklistStep[]; onChange?: (done: number, total: number) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { done: number; total: number }>(enhance, (d) => onChange?.(d.done, d.total));
  return (
    <section ref={ref} className={cx('lt-checklist', className)} aria-label={title}>
      <header><div><h4>{title}</h4><p data-part="count" aria-live="polite" /></div><svg data-part="ring" viewBox="0 0 36 36" aria-hidden><circle cx="18" cy="18" r="15" pathLength={100} /><circle data-part="arc" cx="18" cy="18" r="15" pathLength={100} /></svg></header>
      <ol>
        {steps.map((s) => (
          <li key={s.title} data-part="step">
            <button type="button" data-part="tick" role="checkbox" aria-checked={!!s.done} aria-label={s.title}><svg className="lt-icon" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></button>
            <div><p data-part="title">{s.title}</p>{s.sub && <p data-part="sub">{s.sub}</p>}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
