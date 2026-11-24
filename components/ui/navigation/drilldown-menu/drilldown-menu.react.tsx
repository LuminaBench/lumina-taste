import { Fragment, useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './drilldown-menu';
import './drilldown-menu.css';

export interface DrillItem { label: string; href?: string; children?: DrillItem[] }
export interface DrilldownMenuProps { label?: string; items: DrillItem[]; className?: string }

/** Drill-down navigation: submenus slide in over the parent with a back row. */
export function DrilldownMenu({ label = 'Main', items, className }: DrilldownMenuProps) {
  const base = useId().replace(/:/g, '');
  const ref = useEnhance<HTMLElement>(enhance);
  const levels: Array<{ id: string; title: string; items: DrillItem[]; depth: number }> = [];
  const walk = (list: DrillItem[], id: string, title: string, depth: number) => {
    levels.push({ id, title, items: list, depth });
    list.forEach((it, i) => it.children && walk(it.children, `${id}-${i}`, it.label, depth + 1));
  };
  walk(items, `${base}-root`, 'Menu', 0);
  return (
    <nav ref={ref} className={cx('lt-drill', className)} aria-label={label}>
      <div data-part="viewport">
        {levels.map((lv) => (
          <section key={lv.id} id={lv.id} data-part="level" data-level={lv.depth} aria-label={lv.title} hidden={lv.depth > 0}>
            {lv.depth > 0 && <button type="button" data-part="back"><Icon name="chevron-left" />{lv.title}</button>}
            <ul>
              {lv.items.map((it, i) => (
                <Fragment key={it.label}>
                  <li>{it.children
                    ? <button type="button" data-part="forward" aria-controls={`${lv.id}-${i}`}>{it.label}<Icon name="chevron-right" /></button>
                    : <a href={it.href ?? '#'}>{it.label}</a>}</li>
                </Fragment>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
