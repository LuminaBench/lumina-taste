import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './assistant-thread';
import './assistant-thread.css';

export interface Turn { role: 'user' | 'assistant'; content: ReactNode; state?: 'streaming' | 'error'; sources?: string }

/** AI assistant conversation: the person's turns as bubbles, answers as prose with Copy and Retry. */
export function AssistantThread({ turns, onRetry, className }: { turns: Turn[]; onRetry?: (turn: number) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { action: string; turn: number }>(enhance, (d) => { if (d.action === 'retry') onRetry?.(d.turn); });
  return (
    <section ref={ref} className={cx('lt-assistant', className)} aria-label="Conversation">
      <ol data-part="turns">
        {turns.map((t, i) => t.role === 'user'
          ? <li key={i} data-role="user"><p>{t.content}</p></li>
          : <li key={i} data-role="assistant" data-state={t.state}>
              {t.state === 'error'
                ? <p data-part="error"><Icon name="alert" />{t.content}<button type="button" data-action="retry">Try again</button></p>
                : <><div data-part="answer">{t.content}{t.state === 'streaming' && <span data-part="caret" aria-hidden />}</div>
                    <footer data-part="actions"><button type="button" data-action="copy"><Icon name="copy" size={14} /><span>Copy</span></button><button type="button" data-action="retry"><Icon name="refresh" size={14} /><span>Retry</span></button>{t.sources && <span data-part="sources">{t.sources}</span>}</footer></>}
            </li>)}
      </ol>
      <p className="lt-visually-hidden" role="status" data-part="live" />
    </section>
  );
}
