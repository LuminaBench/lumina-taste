import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './mobile-app-bar';
import './mobile-app-bar.css';

/** The top bar of a phone screen: back, title, one action. large shows a big title that collapses on scroll. */
export function MobileAppBar({ title, back, action, large, className }: { title: string; back?: { label: string; onClick: () => void }; action?: { label: string; onClick: () => void }; large?: boolean; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [large]);
  return (
    <header ref={ref} className={cx('lt-appbar', className)} data-size={large ? 'large' : undefined}>
      <div data-part="row">
        {back ? <button type="button" data-part="back" aria-label={`Back to ${back.label}`} onClick={back.onClick}><Icon name="chevron-left" size={20} /><span>{back.label}</span></button> : <span />}
        {large ? <p data-part="small" aria-hidden>{title}</p> : <h1 data-part="small">{title}</h1>}
        {action ? <button type="button" data-part="action" onClick={action.onClick}>{action.label}</button> : <span />}
      </div>
      {large && <h1 data-part="large">{title}</h1>}
    </header>
  );
}
