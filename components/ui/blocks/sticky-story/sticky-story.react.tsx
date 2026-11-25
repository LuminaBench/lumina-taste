import type { CSSProperties, ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './sticky-story';
import './sticky-story.css';

export interface StoryStep { title: string; text: string; visual: ReactNode }

/** Three or four steps on the left; the visual for the step being read stays pinned on the right. */
export function StickyStory({ eyebrow, title, steps, className }: { eyebrow?: string; title: string; steps: StoryStep[]; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [steps.length]);
  return (
    <section ref={ref} className={cx('lt-story', className)} aria-label={title} style={{ '--steps': steps.length } as CSSProperties}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2></header>
      <ol data-part="steps">
        {steps.map((s, i) => (
          <li key={s.title} data-active={i === 0 ? '' : undefined}>
            <div data-part="text"><span data-part="n">{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></div>
            <figure>{s.visual}</figure>
          </li>
        ))}
      </ol>
    </section>
  );
}
