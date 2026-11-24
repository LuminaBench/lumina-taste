import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './comment-thread';
import './comment-thread.css';

export interface Comment { id: string; name: string; initials: string; time: string; text: string; replies?: Comment[] }

/** Threaded comments with +1 and inline replies (one level deep, the readable maximum). */
export function CommentThread({ comments, onComment, className }: { comments: Comment[]; onComment?: (text: string) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { text: string }>(enhance, (d) => onComment?.(d.text));
  const C = (c: Comment, reply = false) => <article data-part="comment"><span data-part="avatar" aria-hidden>{c.initials}</span><div><p data-part="head"><strong>{c.name}</strong><time>{c.time}</time></p><p>{c.text}</p><div data-part="acts"><button type="button" data-part="react" aria-pressed="false"><span aria-hidden>+1</span> <span data-part="n">0</span></button>{!reply && <button type="button" data-part="reply">Reply</button>}</div></div></article>;
  return (
    <section ref={ref} className={cx('lt-comments', className)} aria-label="Comments">
      <h3>Comments</h3>
      <ul data-part="list">{comments.map((c) => <li key={c.id}>{C(c)}{c.replies?.length ? <ul data-part="replies">{c.replies.map((r) => <li key={r.id}>{C(r, true)}</li>)}</ul> : null}</li>)}</ul>
      <form data-part="new"><textarea rows={2} aria-label="Add a comment" placeholder="Add a comment…" /><button type="submit" className="lt-btn" data-variant="primary" data-size="sm">Comment</button></form>
    </section>
  );
}
