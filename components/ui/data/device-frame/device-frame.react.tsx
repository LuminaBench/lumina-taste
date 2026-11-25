import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './device-frame.css';

/**
 * An outline device around a screenshot or live markup.
 * <DeviceFrame kind="browser" url="app.halyard.io" label="The reports page"><img … /></DeviceFrame>
 */
export function DeviceFrame({ kind = 'browser', url, title, label, width, className, children }: { kind?: 'browser' | 'window' | 'phone' | 'tablet'; url?: string; title?: string; label: string; width?: number; className?: string; children: ReactNode }) {
  const bar = kind === 'browser' || kind === 'window';
  return (
    <figure className={cx('lt-device', className)} data-kind={kind} style={width ? ({ '--device-w': `${width}px` } as React.CSSProperties) : undefined}>
      {bar && <div data-part="bar" aria-hidden><i /><i /><i />{kind === 'browser' ? url && <span data-part="url">{url}</span> : title && <span data-part="title">{title}</span>}</div>}
      <div data-part="screen">{children}</div>
      <figcaption className="lt-visually-hidden">{label}</figcaption>
    </figure>
  );
}
