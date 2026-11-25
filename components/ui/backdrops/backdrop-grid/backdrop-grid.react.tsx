import type { ElementType, ReactNode } from 'react';
import { cx } from '../../_shared/react';

export type BackdropKind = 'grid' | 'dots' | 'lines' | 'ticks' | 'wash' | 'spot' | 'grain';

/** A section with a backdrop behind its children: <Backdrop kind={['grid', 'spot']}>…</Backdrop>. Styles live in tokens/backdrops.css. */
export function Backdrop({ kind, as: Tag = 'section', className, children }: { kind: BackdropKind | BackdropKind[]; as?: ElementType; className?: string; children: ReactNode }) {
  return <Tag className={cx(className)} data-backdrop={Array.isArray(kind) ? kind.join(' ') : kind}>{children}</Tag>;
}
