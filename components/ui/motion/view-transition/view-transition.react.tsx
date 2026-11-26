import { useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { nameTransitions, withViewTransition } from './view-transition';
import './view-transition.css';

/** Returns a function that runs a React state update inside a View Transition. */
export function useViewTransition() {
  return useCallback((update: () => void) => withViewTransition(() => flushSync(update)), []);
}

/**
 * Smooth page changes for a multi-page site: copies every data-vt-name on the page to view-transition-name
 * (for browsers without typed attr()). Put data-vt on <html> of every page that should take part; render the
 * same data-vt-name on the list picture and the detail page's picture and it morphs between them.
 */
export function usePageTransitions(deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => nameTransitions(document), deps);
}
