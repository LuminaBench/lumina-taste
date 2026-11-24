import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './json-viewer';
import './json-viewer.css';

/** Collapsible JSON tree with keyboard navigation. */
export function JsonViewer({ name = 'data.json', value, className }: { name?: string; value: unknown; className?: string }) {
  const json = JSON.stringify(value);
  const ref = useEnhance<HTMLDivElement>(enhance, undefined, [json]);
  return (
    <div ref={ref} className={cx('lt-json', className)} data-json={json}>
      <div data-part="bar"><span>{name}</span><button type="button" data-part="toggle-all" aria-pressed="false">Collapse all</button></div>
      <div data-part="tree" role="tree" aria-label={name} />
    </div>
  );
}
