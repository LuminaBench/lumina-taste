import { type Cleanup } from '../../_shared/dom';
import { enhance as tabs } from '../../navigation/tabs/tabs';

/** Showcase tabs: standard tabs (arrow keys, automatic activation) over framed examples, each with its own theme. */
export function enhance(root: HTMLElement): Cleanup {
  return tabs(root);
}
