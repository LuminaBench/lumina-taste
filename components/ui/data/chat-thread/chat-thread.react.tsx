import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './chat-thread.css';

export interface ChatMessage { id: string; from: 'me' | 'them'; text?: string; attachment?: { name: string; detail: string } }
export interface ChatGroup { id: string; from: 'me' | 'them'; name?: string; initials?: string; time: string; datetime?: string; messages: ChatMessage[]; status?: string }
export interface ChatThreadProps { label: string; day?: string; groups: ChatGroup[]; typing?: { initials: string; name: string } | null; className?: string }

/** Message thread: consecutive messages grouped, tails only on the last bubble, typing indicator. */
export function ChatThread({ label, day, groups, typing, className }: ChatThreadProps) {
  return (
    <section className={cx('lt-chat', className)} aria-label={label}>
      <ol data-part="log" role="log" aria-live="polite">
        {day && <li data-part="divider"><span>{day}</span></li>}
        {groups.map((g) => (
          <li key={g.id} data-part="group" data-from={g.from}>
            {g.from === 'them' && <span data-part="avatar" aria-hidden>{g.initials}</span>}
            <div data-part="stack">
              <p data-part="meta">{g.name && <strong>{g.name}</strong>} <time dateTime={g.datetime}>{g.time}</time></p>
              {g.messages.map((m) => m.attachment
                ? <p key={m.id} data-part="attachment"><Icon name="file" /><span><strong>{m.attachment.name}</strong><span>{m.attachment.detail}</span></span></p>
                : <p key={m.id} data-part="bubble">{m.text}</p>)}
              {g.status && <p data-part="status">{g.status}</p>}
            </div>
          </li>
        ))}
        {typing && (
          <li data-part="group" data-from="them">
            <span data-part="avatar" aria-hidden>{typing.initials}</span>
            <div data-part="stack"><p data-part="typing"><span className="lt-visually-hidden">{typing.name} is typing</span><i /><i /><i /></p></div>
          </li>
        )}
      </ol>
    </section>
  );
}
