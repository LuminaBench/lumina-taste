import { cx } from '../../_shared/react';
import '../../feedback/badge/badge.css';
import './timeline.css';

export function Timeline({ items, className }: { items: Array<{ date: string; label: string; title: string; body: string; latest?: boolean }>; className?: string }) {
  return (
    <ol className={cx('lt-timeline', className)}>
      {items.map((it) => (
        <li key={it.date} data-tone={it.latest ? 'accent' : undefined}>
          <time dateTime={it.date}>{it.label}</time>
          <h3>{it.title}{it.latest && <span className="lt-badge" data-tone="accent">Latest</span>}</h3>
          <p>{it.body}</p>
        </li>
      ))}
    </ol>
  );
}
