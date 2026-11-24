import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './settings-list';
import './settings-list.css';

export interface SettingRow { id: string; label: string; description?: string; control?: ReactNode; defaultOn?: boolean }

/** A titled group of settings rows; toggles by default, any control via `control`. Saves on change. */
export function SettingsList({ title, description, rows, onChange, className }: { title: string; description?: string; rows: SettingRow[]; onChange?: (setting: string, value: string) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { setting: string; value: string }>(enhance, (d) => onChange?.(d.setting, d.value));
  return (
    <section ref={ref} className={cx('lt-settings-list', className)} aria-label={title}>
      <header><h3>{title}</h3>{description && <p>{description}</p>}</header>
      <ul>{rows.map((r) => <li key={r.id}><div><p data-part="label" id={`sl-${r.id}`}>{r.label}</p>{r.description && <p data-part="desc">{r.description}</p>}</div>{r.control ?? <label className="lt-switch-mini"><input type="checkbox" role="switch" aria-labelledby={`sl-${r.id}`} defaultChecked={r.defaultOn} /><span aria-hidden /></label>}</li>)}</ul>
      <p data-part="saved" role="status" />
    </section>
  );
}
