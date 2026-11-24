import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './range-slider';
import './range-slider.css';

export interface RangeSliderProps { label: string; min?: number; max?: number; step?: number; defaultValue?: number; detents?: number[]; unit?: string; disabled?: boolean; onChange?: (v: number) => void; className?: string }

export function RangeSlider({ label, min = 0, max = 100, step = 1, defaultValue = 50, detents = [], unit = '', disabled, onChange, className }: RangeSliderProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { value: number }>(enhance, (d) => onChange?.(d.value));
  return (
    <div ref={ref} className={cx('lt-range', className)} data-detents={detents.join(',')} data-unit={unit}>
      <div data-part="head"><label htmlFor={id}>{label}</label><output htmlFor={id} data-part="readout">{defaultValue}{unit}</output></div>
      <div data-part="track-wrap">
        <input id={id} type="range" min={min} max={max} step={step} defaultValue={defaultValue} disabled={disabled} />
        <span data-part="bubble" aria-hidden="true" />
        <span data-part="ticks" aria-hidden="true" />
      </div>
    </div>
  );
}
