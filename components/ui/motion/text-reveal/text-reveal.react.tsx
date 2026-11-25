import type { ElementType, ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './text-reveal';
import './text-reveal.css';

/** <TextReveal as="h1">Every number your team checks</TextReveal>: words rise in once, when first seen. */
export function TextReveal({ as: Tag = 'span', className, children }: { as?: ElementType; className?: string; children: ReactNode }) {
  const ref = useEnhance<HTMLElement>(enhance);
  return <Tag ref={ref} className={cx('lt-reveal', className)}>{children}</Tag>;
}
