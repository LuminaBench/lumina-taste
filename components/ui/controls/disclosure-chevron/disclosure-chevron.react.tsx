import { useId, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './disclosure-chevron';
import './disclosure-chevron.css';

export interface DisclosureProps { label: ReactNode; children: ReactNode; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; className?: string }

export function Disclosure({ label, children, defaultOpen = false, onOpenChange, className }: DisclosureProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { open: boolean }>(enhance, (d) => onOpenChange?.(d.open));
  return (
    <div ref={ref} className={cx('lt-disclosure', className)}>
      <button type="button" data-part="trigger" aria-expanded={defaultOpen} aria-controls={id}>
        <span data-part="chevron"><Icon name="chevron-right" /></span>
        <span>{label}</span>
      </button>
      <div data-part="panel" id={id} data-state={defaultOpen ? 'open' : 'closed'}>
        <div data-part="inner">{children}</div>
      </div>
    </div>
  );
}
