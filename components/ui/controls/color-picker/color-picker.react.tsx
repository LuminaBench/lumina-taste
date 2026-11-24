import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './color-picker';
import './color-picker.css';

export interface ColorPickerProps { legend: string; swatches: Array<{ name: string; value: string }>; defaultValue?: string; previewLabel?: string; onChange?: (color: string) => void; className?: string }

/** Swatch radios plus a hex field, with a live preview tag. */
export function ColorPicker({ legend, swatches, defaultValue = swatches[0]?.value, previewLabel = 'Preview', onChange, className }: ColorPickerProps) {
  const id = useId();
  const ref = useEnhance<HTMLFieldSetElement, { color: string }>(enhance, (d) => onChange?.(d.color));
  return (
    <fieldset ref={ref} className={cx('lt-color', className)} style={{ ['--pick' as string]: defaultValue }}>
      <legend>{legend}</legend>
      <div data-part="swatches">
        {swatches.map((s) => (
          <label key={s.value} data-part="swatch" style={{ ['--sw' as string]: s.value }}>
            <input type="radio" name={id} value={s.value} defaultChecked={s.value === defaultValue} />
            <span className="lt-visually-hidden">{s.name}</span>
          </label>
        ))}
      </div>
      <div data-part="custom">
        <span data-part="chip" aria-hidden />
        <label htmlFor={`${id}-hex`} className="lt-visually-hidden">Hex colour</label>
        <input id={`${id}-hex`} type="text" defaultValue={defaultValue} spellCheck={false} autoComplete="off" maxLength={7} aria-describedby={`${id}-msg`} />
        <span data-part="preview"><span data-part="tag">{previewLabel}</span></span>
      </div>
      <p id={`${id}-msg`} data-part="msg" aria-live="polite" />
    </fieldset>
  );
}
