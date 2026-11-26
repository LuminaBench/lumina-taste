import type { CSSProperties, ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './sticky-story';
import './sticky-story.css';

export interface StoryStep { title: string; text: string; visual: ReactNode; caption?: string }

/**
 * A pinned scroll scene: three or four steps scroll on the left while the picture on the right stays pinned
 * and changes with each step. Give each step's visual the same frame in a different state; put data-mark on
 * the part a step is about and it is ringed as the step arrives.
 */
export function StickyStory({ eyebrow, title, steps, className }: { eyebrow?: string; title: string; steps: StoryStep[]; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [steps.length]);
  return (
    <section ref={ref} className={cx('lt-story', className)} aria-label={title} style={{ '--steps': steps.length } as CSSProperties}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2></header>
      <ol data-part="steps">
        {steps.map((s, i) => (
          <li key={s.title} data-active={i === 0 ? '' : undefined}>
            <div data-part="text"><h3>{s.title}</h3><p>{s.text}</p></div>
            <figure data-part="visual">{s.visual}{s.caption && <figcaption className="lt-visually-hidden">{s.caption}</figcaption>}</figure>
          </li>
        ))}
      </ol>
    </section>
  );
}
