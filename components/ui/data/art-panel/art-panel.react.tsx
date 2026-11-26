import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import { MOTIFS, sceneSvg } from './art-panel';
import './art-panel.css';

/**
 * Stands in for a photograph until there is one: the thing's name set large on a tinted panel, with an optional
 * spot illustration of the subject (motif="cup", "loaf", "crane"…; see MOTIFS in art-panel.ts) on a ground
 * (pattern: a "sun" disc by default, "arch", "floor" or "none"). Pass children (an <img>) and the photo takes
 * over. shot is the brief for the photographer. scene="cup bag" draws two or three motifs on one ground for a
 * hero-sized panel instead (the first is the subject and carries the accent).
 */
export function ArtPanel({ name, fact, index, label, shot, tone, ratio = '4/5', backdrop, motif, scene, pattern, className, children }: { name: string; fact?: string; index?: string; label: string; shot?: string; tone?: 'accent' | 'ink'; ratio?: '4/5' | '1/1' | '3/2' | '16/9' | '3/4' | '5/4'; backdrop?: 'lines' | 'dots' | 'grid' | 'grain'; motif?: string; scene?: string; pattern?: 'sun' | 'arch' | 'floor' | 'bands' | 'steps' | 'split' | 'none'; className?: string; children?: ReactNode }) {
  const sc = scene && !children ? sceneSvg(scene) : '';
  const m = motif && !sc ? MOTIFS[motif] : undefined;
  return (
    <figure className={cx('lt-art', className)} data-tone={tone} data-ratio={ratio === '4/5' ? undefined : ratio} data-backdrop={backdrop} data-shot={shot} data-motif={m ? motif : undefined} data-scene={sc ? scene : undefined} data-pattern={pattern}>
      {children}
      {sc && <svg data-part="scene" viewBox={/viewBox="([^"]+)"/.exec(sc)![1]} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: sc.replace(/^<svg[^>]*>|<\/svg>$/g, '') }} />}
      {m && !children && <svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: m[1] }} />}
      {index && <p data-part="index">{index}</p>}
      <p data-part="name">{name}</p>
      {fact && <p data-part="fact">{fact}</p>}
      <figcaption className="lt-visually-hidden">{label}</figcaption>
    </figure>
  );
}
