// Taste Profiles 1.0 — one small, deterministic JSON file that pins a product's look.
// Works in Node (CLI, installers) and in the browser (applyProfile). Zero dependencies.
import { PALETTES, STYLES, TYPOGRAPHY } from './options.mjs';

export const PROFILE_VERSION = 1;
export const AXES = ['palette', 'mode', 'typography', 'density', 'radius', 'motion', 'style', 'overrides', 'installMode', 'attachRoot'];
export const CHOICES = {
  palette: PALETTES.map((p) => p.id),
  mode: ['light', 'dark'],
  typography: TYPOGRAPHY.map((t) => t.id),
  density: ['spacious', 'balanced', 'dense'],
  radius: ['sharp', 'balanced', 'soft'],
  motion: ['snappy', 'calm', 'reduced'],
  /** Visual style layer (surfaces, borders, shadows). 'none' is the plain kit. */
  style: ['none', ...STYLES.map((s) => s.id)],
  installMode: ['greenfield', 'attach'],
};

export const DEFAULT_PROFILE = Object.freeze({
  profileVersion: PROFILE_VERSION,
  palette: 'slate-forest',
  mode: 'light',
  typography: 'precision',
  density: 'balanced',
  radius: 'balanced',
  motion: 'snappy',
  style: 'none',
  locks: [],
  overrides: {},
  installMode: 'greenfield',
  attachRoot: '.lt-root',
});

const TOKEN_NAME = /^[a-z][a-z0-9-]*$/;
const UNSAFE_VALUE = /[;{}<>]|url\(|expression\(/i;

/** Returns a list of human-readable problems. Empty list = valid. */
export function validateProfile(p) {
  const errors = [];
  if (!p || typeof p !== 'object') return ['Profile must be a JSON object.'];
  if (p.profileVersion !== PROFILE_VERSION) errors.push(`profileVersion must be ${PROFILE_VERSION}.`);
  for (const [axis, allowed] of Object.entries(CHOICES))
    if (p[axis] !== undefined && !allowed.includes(p[axis]))
      errors.push(`${axis} "${p[axis]}" is not one of: ${allowed.join(', ')}.`);
  if (p.locks !== undefined) {
    if (!Array.isArray(p.locks)) errors.push('locks must be an array.');
    else for (const l of p.locks) if (!AXES.includes(l) && !/^overrides\.[a-z][a-z0-9-]*$/.test(l)) errors.push(`Unknown lock "${l}".`);
  }
  if (p.overrides !== undefined) {
    if (typeof p.overrides !== 'object' || Array.isArray(p.overrides)) errors.push('overrides must be an object of token -> CSS value.');
    else
      for (const [k, v] of Object.entries(p.overrides)) {
        if (!TOKEN_NAME.test(k)) errors.push(`Override key "${k}" must be a bare token name such as "radius-md".`);
        if (typeof v !== 'string' || UNSAFE_VALUE.test(v)) errors.push(`Override "${k}" has an unsafe or non-string value.`);
      }
  }
  if (p.attachRoot !== undefined && (typeof p.attachRoot !== 'string' || UNSAFE_VALUE.test(p.attachRoot)))
    errors.push('attachRoot must be a plain CSS selector.');
  return errors;
}

/** Fill defaults and order keys so the same profile always serialises to the same bytes. */
export function normalizeProfile(p = {}) {
  const n = { ...DEFAULT_PROFILE, ...p, profileVersion: PROFILE_VERSION };
  n.locks = [...new Set(n.locks ?? [])].sort();
  n.overrides = Object.fromEntries(Object.entries(n.overrides ?? {}).sort(([a], [b]) => a.localeCompare(b)));
  const ordered = {};
  for (const k of ['profileVersion', 'palette', 'mode', 'typography', 'density', 'radius', 'motion', 'style', 'locks', 'overrides', 'installMode', 'attachRoot'])
    ordered[k] = n[k];
  return ordered;
}

export function serializeProfile(p) {
  return JSON.stringify(normalizeProfile(p), null, 2) + '\n';
}

const isLocked = (locks, key) => locks.includes(key) || (key.startsWith('overrides.') && locks.includes('overrides'));

/**
 * Apply a patch without touching locked fields.
 * @returns {{ profile: object, applied: string[], blocked: string[] }}
 */
export function mergeProfile(current, patch, { force = false } = {}) {
  const base = normalizeProfile(current);
  const next = structuredClone(base);
  const applied = [];
  const blocked = [];
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (key === 'profileVersion') continue;
    if (key === 'locks') {
      next.locks = [...new Set(value)].sort();
      applied.push('locks');
      continue;
    }
    if (key === 'overrides') {
      for (const [tk, tv] of Object.entries(value ?? {})) {
        const path = `overrides.${tk}`;
        if (!force && isLocked(base.locks, path)) { blocked.push(path); continue; }
        if (tv === null) delete next.overrides[tk];
        else next.overrides[tk] = tv;
        applied.push(path);
      }
      continue;
    }
    if (!force && isLocked(base.locks, key)) { if (base[key] !== value) blocked.push(key); continue; }
    if (base[key] !== value) applied.push(key);
    next[key] = value;
  }
  return { profile: normalizeProfile(next), applied, blocked };
}

/** The data-* attributes a taste root needs. */
export function profileAttributes(p) {
  const n = normalizeProfile(p);
  return {
    'data-palette': n.palette,
    'data-mode': n.mode,
    'data-type': n.typography,
    'data-density': n.density,
    'data-radius': n.radius,
    'data-motion': n.motion,
    ...(n.style !== 'none' ? { 'data-style': n.style } : {}),
  };
}

/**
 * Start a profile from a named style: its palette, mode, typography and radius come with it.
 * Locked axes in `current` are kept.
 */
export function profileFromStyle(styleId, current = {}) {
  const st = STYLES.find((s) => s.id === styleId);
  if (!st) throw new Error(`Unknown style "${styleId}". Choose one of: ${STYLES.map((s) => s.id).join(', ')}.`);
  return mergeProfile(current, { style: st.id, palette: st.palette, mode: st.mode, typography: st.typography, radius: st.radius });
}

/** Browser: apply a profile to <html> (greenfield) or to its attach root. Returns the element. */
export function applyProfile(p, doc = globalThis.document) {
  const n = normalizeProfile(p);
  const el = n.installMode === 'attach' ? doc.querySelector(n.attachRoot) : doc.documentElement;
  if (!el) throw new Error(`attachRoot "${n.attachRoot}" not found`);
  for (const [k, v] of Object.entries(profileAttributes(n))) el.setAttribute(k, v);
  for (const [k, v] of Object.entries(n.overrides)) el.style.setProperty(`--${k}`, v);
  return el;
}

/** Inline <head> snippet that applies the profile before first paint (no flash of wrong theme). */
export function bootstrapSnippet(p) {
  const attrs = profileAttributes(p);
  const n = normalizeProfile(p);
  const target = n.installMode === 'attach' ? `document.querySelector(${JSON.stringify(n.attachRoot)})` : 'document.documentElement';
  return `<script>(()=>{const e=${target};if(!e)return;const a=${JSON.stringify(attrs)};let m;try{m=localStorage.getItem("lt-mode")}catch{}if(m==="light"||m==="dark")a["data-mode"]=m;for(const k in a)e.setAttribute(k,a[k])})()</script>`;
}
