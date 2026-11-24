import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './theme-switch';
import './theme-switch.css';

export interface ThemeSwitchProps { target?: string; label?: string; onModeChange?: (mode: 'light' | 'dark') => void; className?: string }

export function ThemeSwitch({ target, label = 'Dark mode', onModeChange, className }: ThemeSwitchProps) {
  const ref = useEnhance<HTMLButtonElement, { mode: 'light' | 'dark' }>(enhance, (d) => onModeChange?.(d.mode));
  return (
    <button ref={ref} type="button" className={cx('lt-theme-switch', className)} role="switch" aria-checked={false} aria-label={label} data-target={target}>
      <span data-part="track">
        <span data-part="glyph" data-glyph="sun"><Icon name="sun" size={14} /></span>
        <span data-part="glyph" data-glyph="moon"><Icon name="moon" size={14} /></span>
        <span data-part="thumb">
          <span data-part="thumb-icon" data-glyph="sun"><Icon name="sun" size={14} /></span>
          <span data-part="thumb-icon" data-glyph="moon"><Icon name="moon" size={14} /></span>
        </span>
      </span>
    </button>
  );
}
