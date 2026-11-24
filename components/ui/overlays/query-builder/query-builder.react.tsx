import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './query-builder';
import '../../controls/segmented-control/segmented-control.css';
import './query-builder.css';

/** Rule builder. Fields live in query-builder.ts (FIELDS); edit them for your schema. onChange gets the query string. */
export function QueryBuilder({ onChange, className }: { onChange?: (query: string) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { query: string }>(enhance, (d) => onChange?.(d.query));
  return (
    <div ref={ref} className={cx('lt-query', className)}>
      <div data-part="group" data-depth="0">
        <div data-part="group-head">
          <span>Match</span>
          <div className="lt-segmented" data-part="logic" role="radiogroup" aria-label="Combine rules with">
            <span data-part="indicator" aria-hidden="true" />
            <button type="button" role="radio" aria-checked tabIndex={0} data-value="AND">All (AND)</button>
            <button type="button" role="radio" aria-checked={false} tabIndex={-1} data-value="OR">Any (OR)</button>
          </div>
          <span>of these rules</span>
        </div>
        <ol data-part="rules" />
        <div data-part="group-actions">
          <button type="button" data-part="add-rule"><Icon name="plus" size={14} />Add rule</button>
          <button type="button" data-part="add-group"><Icon name="layers" size={14} />Add group</button>
        </div>
      </div>
      <output data-part="preview" aria-live="polite" />
    </div>
  );
}
