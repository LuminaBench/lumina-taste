import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './product-card';
import './product-card.css';

export interface ProductCardProps { name: string; href: string; sub?: string; price: string; was?: string; tag?: string; image?: ReactNode; colours?: Array<{ name: string; value: string }>; onAdd?: () => void; className?: string }

/** Shop card: image, favourite, name, price (with sale price), colour swatches and Add to basket. */
export function ProductCard({ name, href, sub, price, was, tag, image, colours = [], onAdd, className }: ProductCardProps) {
  const ref = useEnhance<HTMLElement, { added?: boolean }>(enhance, (d) => d.added && onAdd?.());
  return (
    <article ref={ref} className={cx('lt-product', className)} style={colours[0] ? { ['--c' as string]: colours[0].value } : undefined}>
      <div data-part="media" aria-hidden>{image ?? <span data-part="shape" />}{tag && <span data-part="tag">{tag}</span>}</div>
      <button type="button" data-part="fav" aria-pressed="false" aria-label={`Save ${name} to favourites`}><Icon name="star" /></button>
      <div data-part="body">
        <h3><a href={href}>{name}</a></h3>
        {sub && <p data-part="sub">{sub}</p>}
        <p data-part="price"><b>{price}</b>{was && <s aria-label={`was ${was}`}>{was}</s>}</p>
        {colours.length > 0 && <fieldset><legend className="lt-visually-hidden">Colour</legend>{colours.map((c, i) => <label key={c.name} data-part="sw" style={{ ['--c' as string]: c.value }}><input type="radio" name={`${name}-col`} value={c.name} defaultChecked={i === 0} /><span className="lt-visually-hidden">{c.name}</span></label>)}<span data-part="colname">{colours[0].name}</span></fieldset>}
        <button type="button" className="lt-btn" data-variant="secondary" data-part="add">Add to basket</button>
      </div>
    </article>
  );
}
