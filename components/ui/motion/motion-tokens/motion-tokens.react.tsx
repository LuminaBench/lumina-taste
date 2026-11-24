/** Motion tokens are CSS custom properties (tokens/base.css). Use them directly in style props:
 *  transition: `scale var(--dur-1) var(--ease-out)`. This module exposes typed names for TS code. */
export const MOTION = {
  dur: { fast: 'var(--dur-1)', base: 'var(--dur-2)', slow: 'var(--dur-3)', sheet: 'var(--dur-4)' },
  ease: { out: 'var(--ease-out)', inOut: 'var(--ease-in-out)', spring: 'var(--ease-spring)' },
  pressScale: 'var(--press-scale)',
} as const;

export const transition = (props: string[], dur: keyof typeof MOTION.dur = 'base', ease: keyof typeof MOTION.ease = 'out') =>
  props.map((p) => `${p} ${MOTION.dur[dur]} ${MOTION.ease[ease]}`).join(', ');
