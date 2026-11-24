import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Members table: invite by email (validated), change roles, remove people; every change is announced. */
export function enhance(root: HTMLElement): Cleanup {
  const form = part<HTMLFormElement>(root, 'invite')!;
  const xIcon = root.querySelector('[data-part="remove"]')?.innerHTML ?? '×';
  const input = form.querySelector('input')!;
  const tbody = root.querySelector('tbody')!;
  const msg = part(root, 'msg')!;
  return combine(
    on(form, 'submit', (e) => {
      e.preventDefault();
      if (!input.value.trim() || !input.checkValidity()) { msg.textContent = 'Enter a full email address, for example name@company.com.'; input.focus(); return; }
      const email = esc(input.value.trim());
      tbody.insertAdjacentHTML('beforeend', `<tr><td><span data-part="who"><span data-part="avatar" aria-hidden="true">${email.slice(0, 2).toUpperCase()}</span><span><strong>${email}</strong></span></span></td><td><span data-part="status" data-s="invited">Invited</span></td><td><select aria-label="Role for ${email}"><option>Admin</option><option>Editor</option><option selected>Viewer</option></select></td><td><button type="button" data-part="remove" aria-label="Remove ${email}">${xIcon}</button></td></tr>`);
      msg.textContent = `Invite sent to ${input.value.trim()}.`;
      emit(root, { invited: input.value.trim() });
      input.value = '';
    }),
    on(root, 'change', (e) => { const s = e.target as HTMLSelectElement; if (s.tagName === 'SELECT') { msg.textContent = `${s.getAttribute('aria-label')?.replace('Role for ', '')} is now ${s.value}.`; emit(root, { role: s.value }); } }),
    on(root, 'click', (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>('[data-part="remove"]');
      if (!b) return;
      const name = b.getAttribute('aria-label')?.replace('Remove ', '') ?? 'Member';
      b.closest('tr')?.remove();
      msg.textContent = `Removed ${name}.`;
      emit(root, { removed: name });
    }),
  );
}
