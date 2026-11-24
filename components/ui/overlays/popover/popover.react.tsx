import { useId, type ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './popover';
import '../../controls/button/button.css';
import './popover.css';

export function Popover({ trigger, title, children, className }: { trigger: ReactNode; title: string; children: ReactNode; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement>(enhance);
  return (
    <div ref={ref} className="lt-popover-demo">
      <button type="button" className="lt-btn" data-variant="secondary" popoverTarget={id} data-part="anchor" aria-expanded={false}>{trigger}</button>
      <div className={cx('lt-popover', className)} id={id} popover="auto" aria-labelledby={`${id}h`}>
        <h3 id={`${id}h`}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
