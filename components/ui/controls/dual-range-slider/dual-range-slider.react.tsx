import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './dual-range-slider';
import './dual-range-slider.css';

export interface DualRangeSliderProps { label: string; min?: number; max?: number; step?: number; defaultValue?: [number, number]; gap?: number; prefix?: string; onChange?: (v: { min: number; max: number }) => void; className?: string }

export function DualRangeSlider({ label, min = 0, max = 100, step = 1, defaultValue = [min, max], gap = 0, prefix = '', onChange, className }: DualRangeSliderProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { min: number; max: number }>(enhance, onChange);
  return (
    <div ref={ref} className={cx('lt-dual-range', className)} data-prefix={prefix} data-gap={gap}>
      <div data-part="head"><span id={id}>{label}</span><output data-part="readout" /></div>
      <div data-part="track">
        <span data-part="fill" />
        <input type="range" min={min} max={max} step={step} defaultValue={defaultValue[0]} aria-labelledby={id} aria-label={`Minimum ${label.toLowerCase()}`} />
        <input type="range" min={min} max={max} step={step} defaultValue={defaultValue[1]} aria-labelledby={id} aria-label={`Maximum ${label.toLowerCase()}`} />
      </div>
      <div data-part="scale" aria-hidden="true"><span>{prefix}{min.toLocaleString('en-GB')}</span><span>{prefix}{max.toLocaleString('en-GB')}</span></div>
    </div>
  );
}
