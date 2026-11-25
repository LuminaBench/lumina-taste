import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './task-list';
import './task-list.css';

export interface Task { id: string; title: string; meta?: string; value?: string; done?: boolean }

/** Tickable rows with a running count: <TaskList title="Today" tasks={tasks} onToggle={(id, done) => …} />. */
export function TaskList({ title, tasks, noun, onToggle, className }: { title: string; tasks: Task[]; noun?: string; onToggle?: (id: string, done: boolean) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { name: string; done: boolean }>(enhance, (d) => onToggle?.(d.name, d.done), [tasks.length]);
  return (
    <section ref={ref} className={cx('lt-tasks', className)} aria-label={title} data-noun={noun}>
      <header><h3>{title}</h3><p data-part="count" role="status" /></header>
      <div data-part="track" aria-hidden><span /></div>
      <ul>
        {tasks.map((t) => (
          <li key={t.id}><label><input type="checkbox" name={t.id} defaultChecked={t.done} /><span data-part="box" aria-hidden><svg viewBox="0 0 16 16"><path d="m3.5 8.5 3 3 6-7" /></svg></span><span data-part="title">{t.title}</span><span data-part="meta">{t.meta}</span><span data-part="value">{t.value}</span></label></li>
        ))}
      </ul>
    </section>
  );
}
