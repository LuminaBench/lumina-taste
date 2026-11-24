import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import { toast as push } from './toast-stack';
import './toast-stack.css';

type ToastInput = Parameters<typeof push>[1];
const Ctx = createContext<(t: ToastInput) => void>(() => {});

/** Mount once near the root; call useToast()({ title, body, tone }) anywhere below it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const region = useRef<HTMLOListElement>(null);
  const show = useCallback((t: ToastInput) => { if (region.current) push(region.current, t); }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <ol ref={region} className="lt-toasts" aria-label="Notifications" aria-live="polite" />
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
