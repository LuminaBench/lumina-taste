import { Fragment } from 'react';
import { cx } from '../../_shared/react';
import './kbd.css';

/** Kbd keys="⌘ K" renders two caps. Use "then" sequences as separate <Kbd> groups. */
export function Kbd({ keys, className }: { keys: string; className?: string }) {
  return <>{keys.split(' ').map((k, i) => <Fragment key={i}><kbd className={cx('lt-kbd', className)}>{k}</kbd></Fragment>)}</>;
}
