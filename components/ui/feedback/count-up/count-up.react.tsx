import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './count-up';
import './count-up.css';

export interface CountUpProps { value: number; format?: 'number' | 'currency'; currency?: string; compact?: boolean; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string }

export function CountUp({ value, format = 'number', currency, compact, decimals, prefix, suffix, duration, className }: CountUpProps) {
  const ref = useEnhance<HTMLDataElement>(enhance, undefined, [value]);
  return (
    <data ref={ref} className={cx('lt-countup', className)} value={value} data-format={format} data-currency={currency} data-compact={compact || undefined}
      data-decimals={decimals} data-prefix={prefix} data-suffix={suffix} data-duration={duration}>
      0
    </data>
  );
}
