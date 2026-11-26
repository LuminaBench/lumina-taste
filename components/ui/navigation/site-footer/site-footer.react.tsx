import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './site-footer.css';

export interface SiteFooterProps {
  brand: ReactNode; blurb?: string;
  columns?: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
  legal: ReactNode[];
  /** wordmark: the name set across the column under the links. contact: phone and email set large. */
  variant?: 'wordmark' | 'contact';
  /** wordmark: the name as text (sized from its length). */
  wordmark?: string;
  /** contact: a short line, then the ways to reach a person; the address and hours beside them. */
  reach?: { line?: string; links: Array<{ label: string; href: string }>; address?: ReactNode; hours?: string };
  tone?: 'dark'; className?: string;
}

/** Footer: link columns and one legal line, or a wordmark across the column, or the contact details set large. */
export function SiteFooter({ brand, blurb, columns = [], legal, variant, wordmark, reach, tone, className }: SiteFooterProps) {
  return (
    <footer className={cx('lt-footer', className)} data-variant={variant} data-tone={tone}>
      <div data-part="top">
        {variant === 'contact' && reach ? (
          <>
            <div data-part="reach">{reach.line && <p>{reach.line}</p>}{reach.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}</div>
            <div data-part="where">{reach.address && <address>{reach.address}</address>}{reach.hours && <p>{reach.hours}</p>}</div>
          </>
        ) : (
          <>
            <div data-part="about"><a data-part="brand" href="/">{brand}</a>{blurb && <p>{blurb}</p>}</div>
            {columns.length > 0 && <nav data-part="cols" aria-label="Footer">
              {columns.map((c) => (
                <div key={c.title}><h2>{c.title}</h2><ul>{c.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul></div>
              ))}
            </nav>}
          </>
        )}
      </div>
      {variant === 'wordmark' && wordmark && <p data-part="wordmark" aria-hidden="true" style={{ ['--wordmark-len' as string]: wordmark.length }}>{wordmark}</p>}
      <div data-part="legal">{legal.map((l, i) => <span key={i}>{l}</span>)}</div>
    </footer>
  );
}
