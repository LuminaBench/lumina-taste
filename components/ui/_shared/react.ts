import { useEffect, useRef } from 'react';
import type { Enhancer } from './dom';

/** Join class names, skipping falsy values. */
export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/**
 * Bind a vanilla enhancer to a React-rendered root. The markup is rendered by React,
 * the behaviour (keyboard, pointer, ARIA state) comes from the shared vanilla core, so
 * both implementations behave identically. `onChange` receives the lt-change detail.
 */
export function useEnhance<T extends HTMLElement, D = unknown>(enhance: Enhancer | null, onChange?: (detail: D) => void, deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cleanup = enhance?.(el);
    const listener = (e: Event) => {
      if (e.target === el) cb.current?.((e as CustomEvent<D>).detail);
    };
    el.addEventListener('lt-change', listener);
    return () => {
      el.removeEventListener('lt-change', listener);
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
