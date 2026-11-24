import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './code-block';
import '../../controls/copy-button/copy-button.css';
import './code-block.css';

/** Code block with language tabs and copy. Pass pre-highlighted text or plain strings. */
export function CodeBlock({ file, snippets, className }: { file?: string; snippets: Array<{ language: string; code: string }>; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLElement>(enhance);
  return (
    <figure ref={ref} className={cx('lt-code', className)}>
      <figcaption data-part="bar">
        <div role="tablist" aria-label="Language" data-part="tabs">
          {snippets.map((s, i) => <button key={s.language} type="button" role="tab" aria-selected={i === 0} aria-controls={`${id}${i}`} id={`${id}${i}t`} tabIndex={i === 0 ? 0 : -1}>{s.language}</button>)}
        </div>
        {file && <span data-part="file">{file}</span>}
        <button type="button" className="lt-copy" data-part="copy" aria-label="Copy code"><span data-part="icons" aria-hidden="true"><span data-part="copy"><Icon name="copy" /></span><span data-part="done"><Icon name="check" /></span></span><span data-part="text">Copy</span><span data-part="live" className="lt-visually-hidden" role="status" aria-live="polite" /></button>
      </figcaption>
      {snippets.map((s, i) => <div key={s.language} role="tabpanel" id={`${id}${i}`} aria-labelledby={`${id}${i}t`} hidden={i !== 0}><pre tabIndex={0}><code>{s.code}</code></pre></div>)}
    </figure>
  );
}
