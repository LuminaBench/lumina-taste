import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './file-list.css';

export interface FileRow { name: string; type: string; size: string; owner: string; when: string; href: string }

/** File list: type tile, name with size and owner, date, and two quiet actions. */
export function FileList({ title = 'Files', files, onShare, onMore, className }: { title?: string; files: FileRow[]; onShare?: (f: FileRow) => void; onMore?: (f: FileRow) => void; className?: string }) {
  return (
    <section className={cx('lt-files', className)} aria-label={title}>
      <header><h3>{title}</h3><span data-part="meta">{files.length} files</span></header>
      <ul>{files.map((f) => <li key={f.href} data-part="file"><span data-part="type" data-t={f.type.toLowerCase()}>{f.type}</span><span data-part="name"><a href={f.href}>{f.name}</a><span>{f.size} · {f.owner}</span></span><time>{f.when}</time><span data-part="acts"><button type="button" aria-label={`Share ${f.name}`} onClick={() => onShare?.(f)}><Icon name="users" /></button><button type="button" aria-label={`More actions for ${f.name}`} onClick={() => onMore?.(f)}><Icon name="more" /></button></span></li>)}</ul>
    </section>
  );
}
