import type { CSSProperties } from 'react';
import { cx } from '../../_shared/react';
import './meter.css';

export function SegmentedMeter({ label, unit, total, segments, className }: { label: string; unit: string; total: number; segments: Array<{ label: string; value: number }>; className?: string }) {
  const used = segments.reduce((s, x) => s + x.value, 0);
  const summary = `${label}: ${segments.map((s) => `${s.label.toLowerCase()} ${s.value} ${unit}`).join(', ')}, ${total - used} ${unit} free`;
  return (
    <figure className={cx('lt-meter', className)}>
      <figcaption data-part="head"><span>{label}</span><span data-part="total"><b>{used} {unit}</b> of {total} {unit}</span></figcaption>
      <div data-part="bar" role="img" aria-label={summary}>
        {segments.map((s, i) => <span key={s.label} style={{ '--w': `${(s.value / total) * 100}%`, '--c': `var(--chart-${i + 1})` } as CSSProperties} />)}
      </div>
      <ul data-part="legend">
        {segments.map((s, i) => <li key={s.label} style={{ '--c': `var(--chart-${i + 1})` } as CSSProperties}>{s.label} <data value={s.value}>{s.value} {unit}</data></li>)}
      </ul>
    </figure>
  );
}
