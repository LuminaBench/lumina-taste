import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Pricing calculator: sliders and a billing switch update the total and show the sum in words. */
export function enhance(root: HTMLElement, seat = 24, perMillion = 17): Cleanup {
  const seats = part<HTMLInputElement>(root, 'seats')!;
  const rows = part<HTMLInputElement>(root, 'rows')!;
  const sync = () => {
    const yearly = root.querySelector<HTMLInputElement>('input[value="y"]')?.checked ?? false;
    const s = +seats.value, r = +rows.value;
    const seatPrice = yearly ? Math.round(seat * 0.8) : seat;
    const total = s * seatPrice + r * perMillion;
    part(root, 'seats-out')!.textContent = String(s);
    part(root, 'rows-out')!.textContent = `${r} million`;
    part(root, 'total')!.textContent = `£${total.toLocaleString('en-GB')}`;
    part(root, 'breakdown')!.textContent = `${s} seat${s === 1 ? '' : 's'} × £${seatPrice} + ${r}m rows × £${perMillion}${yearly ? ', billed yearly' : ''}`;
    emit(root, { seats: s, rows: r, yearly, total });
  };
  sync();
  return combine(on(root, 'input', sync), on(root, 'change', sync));
}
