import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './description-list.css';

export function DescriptionList({ items, className }: { items: Array<{ term: string; value: ReactNode }>; className?: string }) {
  return <dl className={cx('lt-dl', className)}>{items.map((i) => <div key={i.term}><dt>{i.term}</dt><dd>{i.value}</dd></div>)}</dl>;
}
