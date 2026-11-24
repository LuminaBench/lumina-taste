import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './typewriter';
import './typewriter.css';

export interface TypewriterProps { prefix: string; words: string[]; className?: string }

/** Headline with a rotating word that types itself. Screen readers hear the full sentence once. */
export function Typewriter({ prefix, words, className }: TypewriterProps) {
  const ref = useEnhance<HTMLParagraphElement>(enhance, undefined, [words.join('|')]);
  const spoken = words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0];
  return (
    <p ref={ref} className={cx('lt-typewriter', className)} data-words={words.join('|')}>
      <span aria-hidden>{prefix} <span data-part="word">{words[0]}</span><span data-part="caret" /></span>
      <span className="lt-visually-hidden">{prefix} {spoken}.</span>
    </p>
  );
}
