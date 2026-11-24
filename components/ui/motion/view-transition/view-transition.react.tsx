import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { withViewTransition } from './view-transition';
import './view-transition.css';

/** Returns a function that runs a React state update inside a View Transition. */
export function useViewTransition() {
  return useCallback((update: () => void) => withViewTransition(() => flushSync(update)), []);
}
