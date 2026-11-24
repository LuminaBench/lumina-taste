import { useId, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './accordion';
import './accordion.css';

export interface AccordionItem { title: ReactNode; content: ReactNode }
export interface AccordionProps { items: AccordionItem[]; multiple?: boolean; defaultOpen?: number[]; onChange?: (openIds: string[]) => void; className?: string }

export function Accordion({ items, multiple, defaultOpen = [], onChange, className }: AccordionProps) {
  const base = useId();
  const ref = useEnhance<HTMLDivElement, { open: string[] }>(enhance, (d) => onChange?.(d.open));
  return (
    <div ref={ref} className={cx('lt-accordion', className)} data-multiple={multiple || undefined}>
      {items.map((item, i) => {
        const open = defaultOpen.includes(i);
        return (
          <div data-part="item" key={i}>
            <h3 data-part="heading">
              <button type="button" data-part="trigger" id={`${base}t${i}`} aria-expanded={open} aria-controls={`${base}p${i}`}>
                {item.title}
                <Icon name="chevron-down" />
              </button>
            </h3>
            <div data-part="panel" id={`${base}p${i}`} role="region" aria-labelledby={`${base}t${i}`} data-state={open ? 'open' : 'closed'}>
              <div data-part="inner"><div>{item.content}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
