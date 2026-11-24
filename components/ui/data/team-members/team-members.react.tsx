import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './team-members';
import './team-members.css';

export interface Member { name: string; email?: string; role: string; status: 'Active' | 'Invited' }

/** Members table with invite, role select and remove. Owners cannot be changed here. */
export function TeamMembers({ members, roles = ['Admin', 'Editor', 'Viewer'], seats, className }: { members: Member[]; roles?: string[]; seats?: string; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance);
  return (
    <section ref={ref} className={cx('lt-members', className)} aria-label="Members">
      <header><div><h3>Members</h3>{seats && <p>{seats}</p>}</div><form data-part="invite" noValidate><input type="email" aria-label="Invite by email" placeholder="name@company.com" /><button type="submit" className="lt-btn" data-variant="primary" data-size="sm">Invite</button></form></header>
      <div data-part="scroll" role="region" tabIndex={0} aria-label="Members table"><table><thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Role</th><th scope="col"><span className="lt-visually-hidden">Actions</span></th></tr></thead>
        <tbody>{members.map((m) => <tr key={m.email ?? m.name}><td><span data-part="who"><span data-part="avatar" aria-hidden>{m.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{m.name}</strong>{m.email && <span>{m.email}</span>}</span></span></td><td><span data-part="status" data-s={m.status.toLowerCase()}>{m.status}</span></td><td>{m.role === 'Owner' ? <span data-part="role-fixed">Owner</span> : <select aria-label={`Role for ${m.name}`} defaultValue={m.role}>{roles.map((r) => <option key={r}>{r}</option>)}</select>}</td><td>{m.role !== 'Owner' && <button type="button" data-part="remove" aria-label={`Remove ${m.name}`}><Icon name="x" /></button>}</td></tr>)}</tbody>
      </table></div>
      <p data-part="msg" role="status" />
    </section>
  );
}
