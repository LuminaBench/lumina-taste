// OKLCH <-> sRGB math and WCAG 2.x contrast. Pure functions, no dependencies.
// Verification renders each token to the 8-bit sRGB a browser paints, then applies
// the WCAG relative-luminance formula, so the numbers match browser contrast tools.

const DEG = Math.PI / 180;

/** OKLCH -> linear-light sRGB (may fall outside [0,1] when out of gamut). */
export function oklchToLinear([L, C, H]) {
  const a = C * Math.cos(H * DEG);
  const b = C * Math.sin(H * DEG);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function inGamut(lch, eps = 1e-4) {
  return oklchToLinear(lch).every((v) => v >= -eps && v <= 1 + eps);
}

/** Reduce chroma (keeping L and H) until the colour fits sRGB. */
export function clampChroma([L, C, H]) {
  let c = C;
  while (c > 0 && !inGamut([L, c, H])) c = Math.max(0, c - 0.001);
  return [L, c, H];
}

const encode = (v) => {
  const x = Math.min(1, Math.max(0, v));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};

/** OKLCH -> 8-bit sRGB triplet, as painted by a browser. */
export function oklchToRgb8(lch) {
  return oklchToLinear(lch).map((v) => Math.round(encode(v) * 255));
}

export function rgb8ToHex(rgb) {
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** WCAG 2.x relative luminance from an 8-bit sRGB triplet. */
export function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRgb(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function contrast(lchA, lchB) {
  return contrastRgb(oklchToRgb8(lchA), oklchToRgb8(lchB));
}

/** Round to the precision written into CSS so verification uses the shipped value. */
export function round(lch) {
  return [+lch[0].toFixed(3), +lch[1].toFixed(3), +lch[2].toFixed(1)];
}

export function toCss(lch) {
  const [L, C, H] = round(lch);
  return `oklch(${L} ${C} ${H})`;
}

export function parseOklch(str) {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(str);
  if (!m) throw new Error(`Not an oklch() colour: ${str}`);
  return [+m[1], +m[2], +m[3]];
}
