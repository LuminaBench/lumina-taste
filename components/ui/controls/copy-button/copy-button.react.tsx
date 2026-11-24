import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './copy-button';
import './copy-button.css';

export function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const ref = useEnhance<HTMLButtonElement>(enhance, undefined, [value]);
  return (
    <button ref={ref} type="button" className={cx('lt-copy', className)} data-copy={value} aria-label={label}>
      <span data-part="icons" aria-hidden="true"><span data-part="copy"><Icon name="copy" /></span><span data-part="done"><Icon name="check" /></span></span>
      <span data-part="text">Copy</span>
      <span data-part="live" className="lt-visually-hidden" role="status" aria-live="polite" />
    </button>
  );
}
