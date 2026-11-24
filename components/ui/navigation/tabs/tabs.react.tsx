import { useId, type ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './tabs';
import './tabs.css';

export function Tabs({ label, tabs, defaultIndex = 0, onChange, className }: { label: string; tabs: Array<{ label: string; count?: number; content: ReactNode }>; defaultIndex?: number; onChange?: (index: number) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { tab: string }>(enhance, (d) => onChange?.(+d.tab.split('t').pop()!));
  return (
    <div ref={ref} className={cx('lt-tabs', className)}>
      <div role="tablist" aria-label={label} data-part="list">
        {tabs.map((t, i) => (
          <button key={i} type="button" role="tab" id={`${id}t${i}`} aria-controls={`${id}p${i}`} aria-selected={i === defaultIndex} tabIndex={i === defaultIndex ? 0 : -1}>
            {t.label}{t.count != null && <span data-part="count">{t.count}</span>}
          </button>
        ))}
        <span data-part="indicator" aria-hidden="true" />
      </div>
      {tabs.map((t, i) => (
        <div key={i} role="tabpanel" id={`${id}p${i}`} aria-labelledby={`${id}t${i}`} tabIndex={0} hidden={i !== defaultIndex}>{t.content}</div>
      ))}
    </div>
  );
}
