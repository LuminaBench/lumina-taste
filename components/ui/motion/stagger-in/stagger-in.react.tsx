import { Children, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './stagger-in.css';

export function Stagger({ children, as: Tag = 'ul', className }: { children: ReactNode; as?: 'ul' | 'ol' | 'div'; className?: string }) {
  return (
    <Tag className={cx('lt-stagger', className)}>
      {Children.map(children, (c, i) => (Tag === 'div' ? <div style={{ '--i': i } as CSSProperties}>{c}</div> : <li style={{ '--i': i } as CSSProperties}>{c}</li>))}
    </Tag>
  );
}
