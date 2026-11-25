import { useId, useState, type ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './showcase-tabs.css';

export interface Example { label: string; url?: string; palette?: string; mode?: 'light' | 'dark'; type?: string; content: ReactNode }

/** Tabs over framed examples. Give each example its own palette, mode and type to show range. */
export function ShowcaseTabs({ title, lede, examples, className }: { title: string; lede?: string; examples: Example[]; className?: string }) {
  const [on, setOn] = useState(0);
  const id = useId();
  return (
    <section className={cx('lt-showcase', className)} aria-label={title}>
      <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <div role="tablist" aria-label="Examples" data-part="tabs"
        onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = (on + (e.key === 'ArrowRight' ? 1 : -1) + examples.length) % examples.length; setOn(n); document.getElementById(`${id}-t-${n}`)?.focus(); } }}>
        {examples.map((x, i) => <button key={x.label} type="button" role="tab" id={`${id}-t-${i}`} aria-controls={`${id}-p-${i}`} aria-selected={i === on} tabIndex={i === on ? 0 : -1} onClick={() => setOn(i)}>{x.label}</button>)}
      </div>
      {examples.map((x, i) => (
        <div key={x.label} role="tabpanel" id={`${id}-p-${i}`} aria-labelledby={`${id}-t-${i}`} data-part="frame" data-mock data-palette={x.palette} data-mode={x.mode} data-type={x.type} hidden={i !== on}>
          <div data-part="bar" aria-hidden><i /><i /><i />{x.url && <span>{x.url}</span>}</div>
          <div data-part="screen">{x.content}</div>
        </div>))}
    </section>
  );
}
