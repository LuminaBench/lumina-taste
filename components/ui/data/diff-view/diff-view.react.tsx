import { cx } from '../../_shared/react';
import './diff-view.css';

export interface DiffLine { kind: 'ctx' | 'add' | 'del'; old?: number; new?: number; text: string }

/** Unified diff: line numbers, +/− signs, tinted rows, and the change in words for screen readers. */
export function DiffView({ file, lines, className }: { file: string; lines: DiffLine[]; className?: string }) {
  const add = lines.filter((l) => l.kind === 'add').length, del = lines.filter((l) => l.kind === 'del').length;
  return (
    <figure className={cx('lt-diff', className)}>
      <figcaption><span data-part="file">{file}</span><span data-part="stat"><b data-k="add">+{add}</b> <b data-k="del">−{del}</b></span></figcaption>
      <div data-part="scroll" tabIndex={0} role="region" aria-label={`Changes to ${file}`}>
        <table><caption className="lt-visually-hidden">Lines removed and added</caption><tbody>
          {lines.map((l, i) => <tr key={i} data-k={l.kind}><td data-part="n">{l.old ?? ''}</td><td data-part="n">{l.new ?? ''}</td><td data-part="sign" aria-hidden>{l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ''}</td><td><code>{l.text}</code></td><td className="lt-visually-hidden">{l.kind === 'add' ? 'added' : l.kind === 'del' ? 'removed' : ''}</td></tr>)}
        </tbody></table>
      </div>
    </figure>
  );
}
