import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import { MOTIFS } from './art-panel';
import './art-panel.css';

/**
 * Stands in for a photograph until there is one: the thing's name set large on a tinted panel, with an optional
 * spot illustration of the subject (motif="cup", "loaf", "crane"…; see MOTIFS in art-panel.ts) on a ground
 * (pattern: a "sun" disc by default, "arch", "floor" or "none"). Pass children (an <img>) and the photo takes
 * over. shot is the brief for the photographer.
 */
export function ArtPanel({ name, fact, index, label, shot, tone, ratio = '4/5', backdrop, motif, pattern, className, children }: { name: string; fact?: string; index?: string; label: string; shot?: string; tone?: 'accent' | 'ink'; ratio?: '4/5' | '1/1' | '3/2' | '16/9' | '3/4' | '5/4'; backdrop?: 'lines' | 'dots' | 'grid' | 'grain'; motif?: string; pattern?: 'sun' | 'arch' | 'floor' | 'bands' | 'steps' | 'split' | 'none'; className?: string; children?: ReactNode }) {
  const m = motif ? MOTIFS[motif] : undefined;
  return (
    <figure className={cx('lt-art', className)} data-tone={tone} data-ratio={ratio === '4/5' ? undefined : ratio} data-backdrop={backdrop} data-shot={shot} data-motif={m ? motif : undefined} data-pattern={pattern}>
      {children}
      {m && !children && <svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: m[1] }} />}
      {index && <p data-part="index">{index}</p>}
      <p data-part="name">{name}</p>
      {fact && <p data-part="fact">{fact}</p>}
      <figcaption className="lt-visually-hidden">{label}</figcaption>
    </figure>
  );
}
