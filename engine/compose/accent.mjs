// The accent solver every palette shares: given a brand or seed colour, the lightness nearest it at which
// text on the accent (one of the inks) passes 4.5:1, its hover passes too, and the accent passes 3:1 on every
// ground it sits on. build-tokens.mjs solves each shipped palette with it; brand.mjs solves a
// brand colour onto a palette's ground with it (for both modes at once, by passing both grounds).
import { clampChroma, contrast, round } from '../../scripts/lib/color.mjs';

export const MARGIN = 0.05; // solve slightly past each threshold so rounding never tips a pair under
export const fix = (lch) => round(clampChroma(lch));

/**
 * @param {number[]} seed  [L, C, H] the colour to stay nearest to
 * @param {{ inks?: number[][], grounds: number[][] }} opts  inks to try (default: near-white and near-black in
 *   the seed's hue); grounds the accent must stand out from at 3:1 (a page and its first surface, per mode)
 * @returns {{ ink: number[], solid: number[], hover: number[] } | null}
 */
export function pickAccent([aL, aC, aH], { inks = null, grounds }) {
  const tryInks = inks ?? [fix([0.985, 0.008, aH]), fix([0.17, 0.02, aH])];
  let best = null;
  for (const ink of tryInks) {
    for (let L = 0.1; L <= 0.97; L += 0.005) {
      const solid = fix([L, aC, aH]);
      const away = ink[0] > solid[0] ? -1 : 1;
      const hover = fix([L + away * 0.045, aC, aH]);
      const ok =
        contrast(ink, solid) >= 4.5 + MARGIN &&
        contrast(ink, hover) >= 4.5 + MARGIN &&
        grounds.every((g) => contrast(solid, g) >= 3 + MARGIN);
      if (!ok) continue;
      const score = Math.abs(L - aL) - contrast(ink, solid) * 0.0005;
      if (!best || score < best.score) best = { score, ink, solid, hover };
    }
  }
  return best ? { ink: best.ink, solid: best.solid, hover: best.hover } : null;
}
