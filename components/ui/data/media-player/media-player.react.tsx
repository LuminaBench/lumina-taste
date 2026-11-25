import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './media-player';
import './media-player.css';

/** Audio controls. Pass src to play a file, or duration (seconds) alone to drive your own player from onChange. */
export function MediaPlayer({ title, subtitle, src, duration = 0, onChange, className }: { title: string; subtitle?: string; src?: string; duration?: number; onChange?: (state: { playing: boolean; time: number; speed: number }) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { playing: boolean; time: number; speed: number }>(enhance, onChange, [src]);
  return (
    <div ref={ref} className={cx('lt-player', className)} data-duration={duration} role="group" aria-label={`Audio: ${title}`}>
      {src && <audio src={src} preload="metadata" />}
      <button type="button" data-part="play" aria-label="Play"><Icon name="play" size={18} /></button>
      <div data-part="meta"><b>{title}</b>{subtitle && <span>{subtitle}</span>}</div>
      <button type="button" data-part="back" aria-label="Back 15 seconds">−15</button>
      <input type="range" data-part="seek" min={0} max={duration} step={1} defaultValue={0} aria-label="Position" />
      <span data-part="time"><span data-part="now">0:00</span><span aria-hidden> / </span><span data-part="total">0:00</span></span>
      <button type="button" data-part="speed" aria-label="Speed 1×">1×</button>
    </div>
  );
}
