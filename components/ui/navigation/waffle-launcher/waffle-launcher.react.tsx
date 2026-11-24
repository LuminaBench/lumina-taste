import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './waffle-launcher';
import './waffle-launcher.css';

export function WaffleLauncher({ apps, label = 'Apps', className }: { apps: Array<{ label: string; href: string; icon: IconName }>; label?: string; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement>(enhance);
  return (
    <div ref={ref} className={cx('lt-waffle', className)}>
      <button type="button" data-part="trigger" aria-label={label} aria-haspopup="menu" aria-expanded={false} aria-controls={id}><Icon name="waffle" size={20} /></button>
      <div data-part="panel" id={id} role="menu" aria-label={label} hidden>
        {apps.map((a) => <a key={a.href} role="menuitem" href={a.href} tabIndex={-1}><span data-part="tile"><Icon name={a.icon} size={20} /></span>{a.label}</a>)}
      </div>
    </div>
  );
}
