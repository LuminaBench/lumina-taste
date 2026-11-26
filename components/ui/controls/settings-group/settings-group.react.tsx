import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './settings-group';
import './settings-group.css';

export type SettingsRow =
  | { kind: 'switch'; label: string; desc?: string; checked?: boolean }
  | { kind: 'link'; label: string; desc?: string; value?: string; href: string }
  | { kind: 'danger'; label: string; onClick?: () => void };
export interface SettingsGroupsProps {
  groups: Array<{ title: string; hideTitle?: boolean; rows: SettingsRow[]; note?: string }>;
  /** Show the search field (worth it from about ten settings). */
  search?: boolean;
  onChange?: (detail: { label: string; checked: boolean }) => void;
  className?: string;
}

/** Grouped settings rows: switches, links with their value, one destructive action, and search. */
export function SettingsGroups({ groups, search = true, onChange, className }: SettingsGroupsProps) {
  const ref = useEnhance<HTMLDivElement, { label: string; checked: boolean }>(enhance, onChange);
  return (
    <div ref={ref} className={cx('lt-setgroups', className)}>
      {search && <label data-part="search"><input type="search" placeholder="Search settings" aria-label="Search settings" autoComplete="off" /></label>}
      {groups.map((g, gi) => (
        <section key={g.title} data-part="group" data-tone={g.rows.every((r) => r.kind === 'danger') ? 'danger' : undefined} aria-labelledby={`sg-${gi}`}>
          <h3 id={`sg-${gi}`} className={g.hideTitle ? 'lt-visually-hidden' : undefined}>{g.title}</h3>
          <ul>
            {g.rows.map((r) => (
              <li key={r.label} data-part="row">
                {r.kind === 'switch' && <label><span data-part="text"><span data-part="label">{r.label}</span>{r.desc && <span data-part="desc">{r.desc}</span>}</span><input type="checkbox" role="switch" defaultChecked={r.checked} /></label>}
                {r.kind === 'link' && <a href={r.href}><span data-part="text"><span data-part="label">{r.label}</span>{r.desc && <span data-part="desc">{r.desc}</span>}</span>{r.value && <span data-part="value">{r.value}</span>}</a>}
                {r.kind === 'danger' && <button type="button" data-part="danger" onClick={r.onClick}>{r.label}</button>}
              </li>
            ))}
          </ul>
          {g.note && <p data-part="note">{g.note}</p>}
        </section>
      ))}
      <p data-part="empty" role="status" hidden>No settings match “<span />”.</p>
    </div>
  );
}
