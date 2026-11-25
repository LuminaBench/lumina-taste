import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './api-endpoint.css';

export interface Param { name: string; type: string; required?: boolean; description: ReactNode }

/** One API endpoint as a disclosure row: method, path, what it does; parameters and a sample response inside. */
export function ApiEndpoint({ method, path, summary, params = [], paramsTitle = 'Parameters', status, statusText, sample, defaultOpen, className }: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; summary: string; params?: Param[]; paramsTitle?: string; status?: number; statusText?: string; sample?: string; defaultOpen?: boolean; className?: string }) {
  // {id} segments are path variables.
  const parts = path.split(/(\{[^}]+\})/g).map((p, i) => (p.startsWith('{') ? <var key={i}>{p}</var> : p));
  return (
    <details className={cx('lt-endpoint', className)} open={defaultOpen}>
      <summary><span data-part="method" data-m={method.toLowerCase()}>{method}</span><code data-part="path">{parts}</code><span data-part="what">{summary}</span><Icon name="chevron-down" size={16} /></summary>
      <div data-part="body">
        {params.length > 0 && (
          <table><caption>{paramsTitle}</caption><thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Description</th></tr></thead>
            <tbody>{params.map((p) => <tr key={p.name}><th scope="row"><code>{p.name}</code>{p.required && <span data-part="req">required</span>}</th><td>{p.type}</td><td>{p.description}</td></tr>)}</tbody></table>
        )}
        {sample && <figure data-part="sample"><figcaption><span data-part="status" data-ok={status && status < 400 ? '' : undefined}>{status}</span> {statusText}</figcaption><pre tabIndex={0}><code>{sample}</code></pre></figure>}
      </div>
    </details>
  );
}
