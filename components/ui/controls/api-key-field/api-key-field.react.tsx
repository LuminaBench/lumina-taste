import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './api-key-field';
import './api-key-field.css';

/** Secret field: masked, reveal, copy, and a two-step Roll. Pass the real rotate call via onRoll. */
export function ApiKeyField({ label, value, meta, onRoll, className }: { label: string; value: string; meta?: string; onRoll?: () => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { rolled: boolean }>(enhance, () => onRoll?.());
  const masked = `${value.slice(0, 8)}${'•'.repeat(16)}${value.slice(-4)}`;
  return (
    <div ref={ref} className={cx('lt-apikey', className)}>
      <p data-part="label">{label}</p>
      <div data-part="row"><code data-part="key" data-full={value} data-masked={masked}>{masked}</code><button type="button" data-part="reveal" aria-pressed="false" aria-label="Show key"><Icon name="eye" /></button><button type="button" data-part="copy" aria-label="Copy key"><Icon name="copy" /></button></div>
      {meta && <p data-part="meta">{meta}</p>}
      <div data-part="actions"><button type="button" className="lt-btn" data-variant="secondary" data-size="sm" data-part="roll">Roll key…</button></div>
      <p data-part="msg" role="status" />
    </div>
  );
}
