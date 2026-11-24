import { cx } from '../../_shared/react';
import './review-summary.css';

/** Average rating with a star row and a 5-to-1 distribution of bars. */
export function ReviewSummary({ average, counts, className }: { average: number; counts: [number, number, number, number, number]; className?: string }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const star = <svg className="lt-icon" width={16} height={16} viewBox="0 0 24 24" aria-hidden><path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" /></svg>;
  return (
    <section className={cx('lt-reviews', className)} aria-label="Customer reviews">
      <div data-part="score"><p data-part="big">{average.toFixed(1)}</p><p data-part="stars" aria-label={`${average.toFixed(1)} out of 5 stars`}><span>{star}{star}{star}{star}{star}</span></p><p data-part="count">{total.toLocaleString('en-GB')} reviews</p></div>
      <ol data-part="dist" aria-label="Rating distribution">{counts.map((c, i) => { const p = Math.round((c / total) * 100); return <li key={i}><span>{5 - i} star</span><span data-part="bar" style={{ ['--p' as string]: `${p}%` }}><i /></span><span>{p}%</span></li>; })}</ol>
    </section>
  );
}
