import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './split-button';
import '../button/button.css';
import './split-button.css';

export interface SplitButtonProps { label: string; menuLabel: string; actions: Array<{ label: string; description?: string }>; onMain?: () => void; onAction?: (label: string) => void; className?: string }

export function SplitButton({ label, menuLabel, actions, onMain, onAction, className }: SplitButtonProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { action: string }>(enhance, (d) => onAction?.(d.action));
  return (
    <div ref={ref} className={cx('lt-split', className)}>
      <button type="button" className="lt-btn" data-variant="primary" data-part="main" onClick={onMain}><span data-part="label">{label}</span></button>
      <button type="button" className="lt-btn" data-variant="primary" data-part="toggle" data-icon-only aria-label={menuLabel} aria-haspopup="menu" aria-expanded={false} aria-controls={id}>
        <Icon name="chevron-down" />
      </button>
      <div data-part="menu" id={id} role="menu" aria-label={menuLabel} hidden>
        {actions.map((a) => (
          <button key={a.label} type="button" role="menuitem" tabIndex={-1}><strong>{a.label}</strong>{a.description && <span>{a.description}</span>}</button>
        ))}
      </div>
    </div>
  );
}
