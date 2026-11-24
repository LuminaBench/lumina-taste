import { useEffect, useRef } from 'react';
import { cx } from '../../_shared/react';
import { setOdometer } from './odometer';
import './odometer.css';

/** Rolling-digit number. Re-renders roll from the previous value. */
export function Odometer({ value, label, className }: { value: number; label: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) setOdometer(ref.current, value); }, [value]);
  return <span ref={ref} className={cx('lt-odometer', className)} role="img" aria-label={`${label}: ${value}`} />;
}
