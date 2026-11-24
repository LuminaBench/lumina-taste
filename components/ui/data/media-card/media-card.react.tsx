import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './media-card.css';

/** Media is cropped to a fixed aspect ratio so cards line up no matter the source image. */
export function MediaCard({ href, media, eyebrow, title, meta, square, className }: { href: string; media: ReactNode; eyebrow?: string; title: string; meta?: ReactNode; square?: boolean; className?: string }) {
  return (
    <a className={cx('lt-media-card', className)} href={href}>
      <span data-part="media" data-ratio={square ? '1/1' : '16/10'}>{media}</span>
      <span data-part="body">{eyebrow && <span className="lt-eyebrow">{eyebrow}</span>}<strong>{title}</strong>{meta && <span data-part="meta">{meta}</span>}</span>
    </a>
  );
}
