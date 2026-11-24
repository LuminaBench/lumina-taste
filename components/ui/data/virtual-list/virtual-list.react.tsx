import { useEffect, useRef } from 'react';
import { cx } from '../../_shared/react';
import { virtualize } from './virtual-list';
import './virtual-list.css';

/** Windowed list for large datasets. `renderRow` returns trusted HTML for row i (escape user data yourself). */
export function VirtualList({ label, count, rowHeight = 36, renderRow, onActive, className }: { label: string; count: number; rowHeight?: number; renderRow: (i: number) => { level?: string; html: string }; onActive?: (i: number) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onActive);
  cb.current = onActive;
  useEffect(() => {
    const el = ref.current!;
    const off = virtualize(el, count, rowHeight, renderRow);
    const l = (e: Event) => cb.current?.((e as CustomEvent<{ index: number }>).detail.index);
    el.addEventListener('lt-change', l);
    return () => { off(); el.removeEventListener('lt-change', l); };
  }, [count, rowHeight, renderRow]);
  return <div ref={ref} className={cx('lt-vlist', className)} role="listbox" aria-label={label} tabIndex={0}><div data-part="spacer"><div data-part="window" /></div></div>;
}
