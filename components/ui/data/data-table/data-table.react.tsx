import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './data-table.css';

export interface Column<R> { key: keyof R & string; label: string; numeric?: boolean; sortable?: boolean; render?: (r: R) => ReactNode }
export interface DataTableProps<R> { caption: string; columns: Column<R>[]; rows: R[]; rowKey: (r: R) => string; detail?: (r: R) => ReactNode; defaultSort?: { key: keyof R & string; dir: 'ascending' | 'descending' }; className?: string }

/** Idiomatic React data table: sorting and expansion are React state; markup and CSS match the vanilla version. */
export function DataTable<R extends Record<string, unknown>>({ caption, columns, rows, rowKey, detail, defaultSort, className }: DataTableProps<R>) {
  const [sort, setSort] = useState(defaultSort);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const s = [...rows].sort((a, b) => { const x = a[sort.key] as never, y = b[sort.key] as never; return x < y ? -1 : x > y ? 1 : 0; });
    return sort.dir === 'ascending' ? s : s.reverse();
  }, [rows, sort]);
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div className={cx('lt-table-wrap', className)} tabIndex={0} role="region" aria-label={caption}>
      <table className="lt-table">
        <caption className="lt-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {detail && <th scope="col" data-part="expander-col"><span className="lt-visually-hidden">Details</span></th>}
            {columns.map((c) => (
              <th key={c.key} scope="col" data-num={c.numeric || undefined} aria-sort={sort?.key === c.key ? sort.dir : c.sortable === false ? undefined : 'none'}>
                {c.sortable === false ? c.label : (
                  <button type="button" onClick={() => setSort({ key: c.key, dir: sort?.key === c.key && sort.dir === 'ascending' ? 'descending' : 'ascending' })}>
                    {c.label}<span data-part="sort" aria-hidden="true" />
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const k = rowKey(r);
            return (
              <Fragment key={k}>
                <tr data-row>
                  {detail && <td><button type="button" data-part="expand" aria-expanded={open.has(k)} aria-label={`Show details for ${k}`} onClick={() => toggle(k)}><Icon name="chevron-right" size={14} /></button></td>}
                  {columns.map((c) => <td key={c.key} data-num={c.numeric || undefined}>{c.render ? c.render(r) : String(r[c.key])}</td>)}
                </tr>
                {detail && open.has(k) && <tr data-detail><td colSpan={columns.length + 1}>{detail(r)}</td></tr>}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
