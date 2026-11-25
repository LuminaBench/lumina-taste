import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './scroll-statement';
import './scroll-statement.css';

/** One large sentence that lights up word by word as it scrolls past. Put the quieter half in `quiet`. */
export function ScrollStatement({ eyebrow, children, quiet, note, align, className }: { eyebrow?: string; children: ReactNode; quiet?: ReactNode; note?: ReactNode; align?: 'centre'; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, []);
  return (
    <section ref={ref} className={cx('lt-statement', className)} data-align={align}>
      {eyebrow && <p data-part="eyebrow">{eyebrow}</p>}
      <h2>{children}{quiet && <> <span data-part="quiet">{quiet}</span></>}</h2>
      {note && <p data-part="note">{note}</p>}
    </section>
  );
}
