import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './kanban-board';
import './kanban-board.css';

export interface KanbanCard { id: string; title: string; tag?: string; who?: string }
export interface KanbanColumn { id: string; title: string; cards: KanbanCard[] }
export interface KanbanBoardProps { columns: KanbanColumn[]; onMove?: (card: string, column: string) => void; className?: string }

/** Kanban board with mouse drag and drop and a full keyboard path (Space, arrows, Space). */
export function KanbanBoard({ columns, onMove, className }: KanbanBoardProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { card: string; column: string }>(enhance, (d) => onMove?.(d.card, d.column));
  return (
    <div ref={ref} className={cx('lt-kanban', className)}>
      <p id={`${id}-help`} className="lt-visually-hidden">Press Space to pick up a card, arrow keys to move it, Space to drop, Escape to cancel.</p>
      <div data-part="board">
        {columns.map((col, ci) => (
          <section key={col.id} data-part="column" data-col={col.id} aria-labelledby={`${id}-${col.id}`}>
            <header><h4 id={`${id}-${col.id}`}>{col.title}</h4><span data-part="n">{col.cards.length}</span></header>
            <ul data-part="cards" aria-labelledby={`${id}-${col.id}`}>
              {col.cards.map((c, i) => (
                <li key={c.id} data-part="card" tabIndex={ci === 0 && i === 0 ? 0 : -1} draggable aria-describedby={`${id}-help`}>
                  <span data-part="title">{c.title}</span>
                  <span data-part="foot">{c.tag && <span data-part="tag" data-tag={c.tag.toLowerCase()}>{c.tag}</span>}{c.who && <span data-part="who" aria-label={`Assigned to ${c.who}`}>{c.who}</span>}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p data-part="live" className="lt-visually-hidden" aria-live="assertive" />
    </div>
  );
}
