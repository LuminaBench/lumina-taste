import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './quote-feature.css';

/** One customer quote set as a headline, with the results it led to at the side. */
export function QuoteFeature({ eyebrow = 'Customer story', quote, name, role, initials, story, results = [], className }: { eyebrow?: string; quote: string; name: string; role: string; initials: string; story?: { label: string; href: string }; results?: Array<{ label: string; value: string }>; className?: string }) {
  return (
    <section className={cx('lt-quote', className)} aria-label={eyebrow}>
      <h2 data-part="eyebrow">{eyebrow}</h2>
      <figure>
        <blockquote><p>{quote}</p></blockquote>
        <figcaption><span data-part="avatar" aria-hidden>{initials}</span><span data-part="who"><b>{name}</b><span>{role}</span></span>{story && <a href={story.href}>{story.label} <Icon name="arrow-right" size={14} /></a>}</figcaption>
      </figure>
      {results.length > 0 && <dl data-part="results">{results.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}</dl>}
    </section>
  );
}
