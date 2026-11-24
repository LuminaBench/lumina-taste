import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './rating';
import './rating.css';

export interface RatingProps { legend: string; defaultValue?: number; onChange?: (value: number) => void; className?: string }

const Star = () => (
  <svg className="lt-icon" width={22} height={22} viewBox="0 0 24 24" aria-hidden><path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" /></svg>
);

/** Five-star rating on native radios with a caption in words. */
export function Rating({ legend, defaultValue = 0, onChange, className }: RatingProps) {
  const id = useId();
  const ref = useEnhance<HTMLFieldSetElement, { value: number }>(enhance, (d) => onChange?.(d.value));
  return (
    <fieldset ref={ref} className={cx('lt-rating', className)}>
      <legend>{legend}</legend>
      <div data-part="stars">
        {[1, 2, 3, 4, 5].map((v) => (
          <span key={v} style={{ display: 'contents' }}>
            <input type="radio" name={id} id={`${id}-${v}`} value={v} defaultChecked={v === defaultValue} />
            <label htmlFor={`${id}-${v}`} data-part="star" data-v={v}><Star /><span className="lt-visually-hidden">{v} star{v > 1 ? 's' : ''}</span></label>
          </span>
        ))}
      </div>
      <output data-part="caption" />
    </fieldset>
  );
}
