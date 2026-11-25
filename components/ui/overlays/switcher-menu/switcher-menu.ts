import { emit, type Cleanup } from '../../_shared/dom';
import { menuButton } from '../../_shared/menu';

/**
 * Grouped switcher (workspace, account, model, environment): a menu of radio items under group headings.
 * Choosing one ticks it, updates the trigger and emits lt-change with { value, group, label }.
 */
export function enhance(root: HTMLElement): Cleanup {
  const trigger = root.querySelector<HTMLElement>('[data-part="trigger"]');
  const menu = root.querySelector<HTMLElement>('[data-part="menu"]');
  if (!trigger || !menu) return () => {};
  return menuButton({
    trigger, menu, itemSelector: '[role="menuitemradio"]',
    onSelect: (item) => {
      for (const i of menu.querySelectorAll('[role="menuitemradio"]')) i.setAttribute('aria-checked', String(i === item));
      const group = item.closest('[role="group"]')?.querySelector<HTMLElement>('[data-part="group"]');
      const label = item.querySelector('[data-part="name"]')?.textContent ?? '';
      const groupName = [...(group?.childNodes ?? [])].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      const set = (part: string, text: string) => { const el = trigger.querySelector(`[data-part="${part}"]`); if (el && text) el.textContent = text; };
      set('current', groupName); set('meta', label);
      set('mark', group?.querySelector('[data-part="mark"]')?.textContent ?? '');
      emit(root, { value: item.dataset.value ?? label, group: groupName, label });
    },
  });
}
