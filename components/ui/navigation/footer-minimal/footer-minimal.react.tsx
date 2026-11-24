import { cx } from '../../_shared/react';
import './footer-minimal.css';

/** One-line footer for apps and small sites: copyright, four links, a short line. */
export function FooterMinimal({ owner, links, note, className }: { owner: string; links: Array<{ label: string; href: string }>; note?: string; className?: string }) {
  return (
    <footer className={cx('lt-footer-min', className)}>
      <p>© {new Date().getFullYear()} {owner}</p>
      <nav aria-label="Footer"><ul>{links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul></nav>
      {note && <p data-part="made">{note}</p>}
    </footer>
  );
}
