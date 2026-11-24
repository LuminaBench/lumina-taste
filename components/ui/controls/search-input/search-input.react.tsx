import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './search-input';
import './search-input.css';

export function SearchInput({ label = 'Search', placeholder = label, shortcut = 'k', onSearch, className }: { label?: string; placeholder?: string; shortcut?: string; onSearch?: (q: string) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { value: string }>(enhance, (d) => onSearch?.(d.value));
  return (
    <div ref={ref} className={cx('lt-search', className)} data-shortcut={shortcut}>
      <Icon name="search" />
      <label className="lt-visually-hidden" htmlFor={id}>{label}</label>
      <input id={id} type="search" placeholder={placeholder} autoComplete="off" spellCheck={false} />
      <button type="button" data-part="clear" aria-label="Clear search" hidden><Icon name="x" size={14} /></button>
      <kbd data-part="shortcut" aria-hidden="true"><span data-part="mod">⌘</span>{shortcut.toUpperCase()}</kbd>
    </div>
  );
}
