import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './device-frame.css';

/**
 * A device around a screenshot or a live screen, drawn as a product shot.
 * <DeviceFrame kind="laptop" label="The payouts overview"><img … /></DeviceFrame>
 * Pass app="phone" or app="desktop" to wrap the children in an inert screen drawn at the device's own width
 * (390 or 1280 px) and zoomed to fit, for a screen built from the kit's parts.
 */
export function DeviceFrame({ kind = 'browser', url, title, label, width, app, className, children }: { kind?: 'browser' | 'window' | 'laptop' | 'phone' | 'tablet'; url?: string; title?: string; label: string; width?: number; app?: 'phone' | 'desktop'; className?: string; children: ReactNode }) {
  const bar = kind === 'browser' || kind === 'window';
  return (
    <figure className={cx('lt-device', className)} data-kind={kind} data-audit-ignore="" style={width ? ({ '--device-w': `${width}px` } as React.CSSProperties) : undefined}>
      {bar && <div data-part="bar" aria-hidden><i /><i /><i />{kind === 'browser' ? url && <span data-part="url">{url}</span> : title && <span data-part="title">{title}</span>}</div>}
      <div data-part="screen">{app ? <div data-app={app} inert>{children}</div> : children}</div>
      <figcaption className="lt-visually-hidden">{label}</figcaption>
    </figure>
  );
}
