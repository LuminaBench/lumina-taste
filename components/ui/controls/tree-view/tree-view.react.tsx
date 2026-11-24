import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './tree-view';
import './tree-view.css';

export interface TreeNode { label: string; children?: TreeNode[]; expanded?: boolean; selected?: boolean }

function Node({ node, first }: { node: TreeNode; first: boolean }) {
  const branch = !!node.children?.length;
  return (
    <li role="treeitem" aria-expanded={branch ? !!node.expanded : undefined} aria-selected={!!node.selected} tabIndex={first ? 0 : -1}>
      <span data-part="row">
        <span data-part="twisty">{branch && <Icon name="chevron-right" />}</span>
        <Icon name={branch ? 'folder' : 'file'} />
        <span>{node.label}</span>
      </span>
      {branch && <ul role="group">{node.children!.map((c, i) => <Node key={i} node={c} first={false} />)}</ul>}
    </li>
  );
}

export function TreeView({ nodes, label, onSelect, className }: { nodes: TreeNode[]; label: string; onSelect?: (label: string) => void; className?: string }) {
  const ref = useEnhance<HTMLUListElement, { label: string }>(enhance, (d) => onSelect?.(d.label));
  return (
    <ul ref={ref} className={cx('lt-tree', className)} role="tree" aria-label={label}>
      {nodes.map((n, i) => <Node key={i} node={n} first={i === 0} />)}
    </ul>
  );
}
