import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './bento-grid.css';

export function BentoGrid({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <section className={cx('lt-bento', className)} aria-label={label}>{children}</section>;
}
export function BentoTile({ span, eyebrow, title, children }: { span?: 'wide' | 'tall'; eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return <article data-span={span}>{eyebrow && <span className="lt-eyebrow">{eyebrow}</span>}<h3>{title}</h3>{children}</article>;
}
