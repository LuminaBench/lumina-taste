import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './session-list';
import './session-list.css';

export interface Session { id: string; title: string; time: string; state: 'running' | 'waiting' | 'done' | 'idle'; href?: string }
const LABEL = { running: 'Running', waiting: 'Needs you', done: 'Done', idle: 'Idle' } as const;

/** Sessions grouped by project, with a shape-coded state, for agent and chat sidebars. */
export function SessionList({ projects, current, onSelect, className }: { projects: Array<{ name: string; sessions: Session[] }>; current?: string; onSelect?: (title: string) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { session: string }>(enhance, (d) => onSelect?.(d.session));
  return (
    <nav ref={ref} className={cx('lt-sessions', className)} aria-label="Sessions">
      {projects.map((p) => (
        <section key={p.name} aria-label={p.name}><h3><Icon name="folder" size={14} />{p.name}</h3>
          <ul>{p.sessions.map((s) => <li key={s.id}><a href={s.href ?? `#${s.id}`} aria-current={s.id === current ? 'page' : undefined}><span data-part="state" data-s={s.state}><span className="lt-visually-hidden">{LABEL[s.state]}</span></span><span data-part="title">{s.title}</span><time>{s.time}</time></a></li>)}</ul>
        </section>))}
    </nav>
  );
}
