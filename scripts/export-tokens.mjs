#!/usr/bin/env node
// Export a lumina-taste palette and type pairing for the stack an agent is already in.
//
//   node scripts/export-tokens.mjs --format shadcn    --palette navy-sand --type financial      > app/globals.css
//   node scripts/export-tokens.mjs --format tailwind4 --palette slate-forest                    > src/theme.css
//   node scripts/export-tokens.mjs --format tailwind3 --palette ice-cobalt                      > tailwind.preset.js
//   node scripts/export-tokens.mjs --format json      --palette paper-ink
//   node scripts/export-tokens.mjs --format swiftui   --palette petrol-peach --type financial  > LuminaTokens.swift
//   node scripts/export-tokens.mjs --format compose   --palette petrol-peach --package com.halyard.ui > LuminaTokens.kt
//   node scripts/export-tokens.mjs --format figma     --palette petrol-peach                    > lumina.tokens.json
//   (--profile taste-profile.json reads palette, type, radius and motion from a profile instead)
//
// shadcn:    :root and .dark blocks with every shadcn/ui variable (background, card, primary, ring, chart-1…5…),
//            filled with this palette's contrast-checked OKLCH values, plus --radius and font stacks.
// tailwind4: an @theme block (colours, fonts, radii) with concrete values, and .dark overrides.
// tailwind3: a preset for tailwind.config.js (presets: [require('./tailwind.preset.js')]); colours read
//            CSS variables, so include the :root/.dark blocks it prints at the top as a comment.
// swiftui:   one Swift file: Color.Lumina.* that follow light and dark without an asset catalogue (a dynamic
//            UIColor / NSColor per token), Font.Lumina.* on Dynamic Type text styles, Lumina.Space / Radius / Motion.
// compose:   one Kotlin file, no MaterialTheme: LuminaColors (light and dark), LuminaTypography, LuminaShapes,
//            LuminaSpacing, a LocalLuminaColors and a LuminaTheme { } that picks the mode from the system.
// figma:     Tokens Studio / W3C design-tokens JSON ($type, $value): sets core, light and dark, and $themes
//            Light and Dark, which import as Figma variable modes.
// Every native and Figma export re-checks the palette's contrast pairs (scripts/lib/contrast-rules.mjs) on the
// 8-bit colours it writes, and refuses to write a palette that fails one.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from './lib/contrast-rules.mjs';
import { contrastRgb } from './lib/color.mjs';
import { formatJson } from './lib/json.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
let profile = {};
if (opt('profile', null)) {
  if (!existsSync(opt('profile'))) { console.error(`No profile at ${opt('profile')}`); process.exit(2); }
  profile = JSON.parse(readFileSync(opt('profile'), 'utf8'));
}
const format = opt('format', 'shadcn');
const paletteId = opt('palette', profile.palette ?? 'slate-forest');
const typeId = opt('type', profile.typography ?? 'precision');
const radiusAxis = opt('radius', profile.radius ?? 'balanced');
const motionAxis = opt('motion', profile.motion ?? 'snappy');
const pkg = opt('package', 'lumina.tokens');

const palettes = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
const pairings = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings;
const pal = palettes.find((p) => p.id === paletteId);
const type = pairings.find((p) => p.id === typeId);
if (!pal) { console.error(`Unknown palette "${paletteId}". One of: ${palettes.map((p) => p.id).join(', ')}`); process.exit(2); }
if (!type) { console.error(`Unknown type pairing "${typeId}". One of: ${pairings.map((p) => p.id).join(', ')}`); process.exit(2); }
const FORMATS = ['shadcn', 'tailwind4', 'tailwind3', 'json', 'swiftui', 'compose', 'figma'];
if (!FORMATS.includes(format)) { console.error(`--format must be one of ${FORMATS.join(', ')}`); process.exit(2); }
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/.test(pkg)) { console.error('--package must be a Kotlin package name (com.example.ui)'); process.exit(2); }

const RADIUS = { sharp: '0.25rem', balanced: '0.5rem', soft: '0.875rem' }[radiusAxis] ?? '0.5rem';
const v = (mode, k) => pal.modes[mode].tokens[k].oklch;

// shadcn/ui variable names → lumina-taste tokens. shadcn's "accent" is a hover surface, not the brand colour.
const SHADCN = {
  background: 'bg-canvas', foreground: 'text-primary',
  card: 'bg-surface-1', 'card-foreground': 'text-primary',
  popover: 'bg-surface-1', 'popover-foreground': 'text-primary',
  primary: 'accent-solid', 'primary-foreground': 'accent-ink',
  secondary: 'bg-surface-2', 'secondary-foreground': 'text-primary',
  muted: 'bg-surface-2', 'muted-foreground': 'text-muted',
  accent: 'bg-surface-3', 'accent-foreground': 'text-primary',
  destructive: 'status-negative', 'destructive-foreground': 'bg-canvas',
  border: 'border-hairline', input: 'border-strong', ring: 'focus-ring',
  'chart-1': 'chart-1', 'chart-2': 'chart-2', 'chart-3': 'chart-3', 'chart-4': 'chart-4', 'chart-5': 'chart-5',
  sidebar: 'bg-surface-1', 'sidebar-foreground': 'text-primary', 'sidebar-primary': 'accent-solid', 'sidebar-primary-foreground': 'accent-ink',
  'sidebar-accent': 'bg-surface-3', 'sidebar-accent-foreground': 'text-primary', 'sidebar-border': 'border-hairline', 'sidebar-ring': 'focus-ring',
};
// Semantic Tailwind colour names, so classes read like the design: bg-canvas, bg-surface, text-ink, text-ink-muted, bg-accent…
const TW = {
  canvas: 'bg-canvas', surface: 'bg-surface-1', 'surface-2': 'bg-surface-2', 'surface-3': 'bg-surface-3',
  ink: 'text-primary', 'ink-2': 'text-secondary', 'ink-muted': 'text-muted',
  line: 'border-hairline', 'line-strong': 'border-strong',
  accent: 'accent-solid', 'accent-hover': 'accent-hover', 'accent-ink': 'accent-ink', 'accent-soft': 'accent-soft', 'accent-text': 'accent-text',
  positive: 'status-positive', 'positive-soft': 'status-positive-soft', negative: 'status-negative', 'negative-soft': 'status-negative-soft',
  warning: 'status-warning', 'warning-soft': 'status-warning-soft', info: 'status-info', 'info-soft': 'status-info-soft',
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`chart-${i + 1}`, `chart-${i + 1}`])),
};
const fonts = { sans: type.body, display: type.display, mono: type.mono };
const head = `/* lumina-taste · palette ${pal.id} (${pal.name}) · type ${type.id} · radius ${radiusAxis}. Every text/surface pair here passes WCAG AA (primary text AAA). */`;
const block = (sel, map, mode, prefix = '--') => `${sel} {\n${Object.entries(map).map(([k, t]) => `  ${prefix}${k}: ${v(mode, t)};`).join('\n')}\n}`;

let out = '';
if (format === 'shadcn') {
  out = `${head}\n${type.webfont ? `@import url("${type.webfont}");\n` : ''}\n${block(':root', SHADCN, 'light').replace(/\n}$/, `\n  --radius: ${RADIUS};\n  --font-sans: ${fonts.sans};\n  --font-display: ${fonts.display};\n  --font-mono: ${fonts.mono};\n}`)}\n\n${block('.dark', SHADCN, 'dark')}\n`;
} else if (format === 'tailwind4') {
  const theme = Object.entries(TW).map(([k, t]) => `  --color-${k}: ${v('light', t)};`).join('\n');
  out = `${head}\n${type.webfont ? `@import url("${type.webfont}");\n` : ''}@import "tailwindcss";\n\n@custom-variant dark (&:where(.dark, .dark *));\n\n@theme {\n${theme}\n  --font-sans: ${fonts.sans};\n  --font-display: ${fonts.display};\n  --font-mono: ${fonts.mono};\n  --radius-sm: calc(${RADIUS} * 0.75);\n  --radius-md: ${RADIUS};\n  --radius-lg: calc(${RADIUS} * 1.5);\n  --radius-xl: calc(${RADIUS} * 2);\n}\n\n${block('.dark', Object.fromEntries(Object.entries(TW).map(([k, t]) => [`color-${k}`, t])), 'dark')}\n`;
} else if (format === 'tailwind3') {
  const vars = (mode) => Object.entries(TW).map(([k, t]) => `     --lt-${k}: ${v(mode, t)};`).join('\n');
  out = `${head.replace('/*', '/**').replace('*/', '')}\n * Add these CSS variables to your global stylesheet:\n *   :root {\n${vars('light').replace(/^/gm, ' *')}\n *   }\n *   .dark {\n${vars('dark').replace(/^/gm, ' *')}\n *   }\n */\nmodule.exports = {\n  darkMode: 'class',\n  theme: {\n    extend: {\n      colors: {\n${Object.keys(TW).map((k) => `        '${k}': 'var(--lt-${k})',`).join('\n')}\n      },\n      fontFamily: {\n        sans: [${JSON.stringify(fonts.sans)}],\n        display: [${JSON.stringify(fonts.display)}],\n        mono: [${JSON.stringify(fonts.mono)}],\n      },\n      borderRadius: { sm: 'calc(${RADIUS} * 0.75)', DEFAULT: '${RADIUS}', md: '${RADIUS}', lg: 'calc(${RADIUS} * 1.5)', xl: 'calc(${RADIUS} * 2)' },\n    },\n  },\n};\n`;
} else if (format === 'swiftui') {
  out = swiftui(nativeTokens());
} else if (format === 'compose') {
  out = compose(nativeTokens());
} else if (format === 'figma') {
  out = figma(nativeTokens());
} else {
  out = JSON.stringify({ palette: pal.id, type: type.id, radius: RADIUS, fonts, light: Object.fromEntries(Object.keys(pal.modes.light.tokens).map((k) => [k, v('light', k)])), dark: Object.fromEntries(Object.keys(pal.modes.dark.tokens).map((k) => [k, v('dark', k)])) }, null, 2) + '\n';
}
process.stdout.write(out);

// ------------------------------------------------------------------ native and Figma exports
/** Everything a native theme needs, read from the same sources as the CSS: palette, pairing and tokens/base.css. */
function nativeTokens() {
  const base = readFileSync(join(root, 'tokens/base.css'), 'utf8');
  const block = (sel) => { const i = base.indexOf(sel); if (i < 0) return ''; return base.slice(base.indexOf('{', i) + 1, base.indexOf('}', i)); };
  const vars = (css) => Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const defaults = vars(block(':where([data-palette]) {'));
  const radius = { ...defaults, ...(radiusAxis === 'balanced' ? {} : vars(block(`[data-radius="${radiusAxis}"] {`))) };
  const motion = { ...defaults, ...(motionAxis === 'snappy' ? {} : vars(block(`[data-motion="${motionAxis}"] {`))) };
  const px = (v) => parseFloat(v);
  const space = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`space-${i + 1}`, px(defaults[`space-${i + 1}`])]));
  const radii = Object.fromEntries(['xs', 'sm', 'md', 'lg', 'xl'].map((k) => [k, px(radius[`radius-${k}`])]).concat([['pill', 999]]));
  const durations = Object.fromEntries([1, 2, 3, 4].map((n) => [`dur-${n}`, px(motion[`dur-${n}`])]));
  const curve = (v) => (/cubic-bezier\(([^)]+)\)/.exec(v ?? '')?.[1] ?? '0, 0, 1, 1').split(',').map(Number);
  const easing = { 'ease-out': curve(motion['ease-out']), 'ease-in-out': curve(motion['ease-in-out']), 'ease-spring': curve(motion['ease-spring']) };
  // Colours: the 8-bit sRGB a browser paints for each OKLCH token, light and dark.
  const colours = {};
  for (const mode of ['light', 'dark']) colours[mode] = Object.fromEntries(Object.entries(pal.modes[mode].tokens).map(([k, t]) => [k, { hex: t.hex.toLowerCase(), oklch: t.oklch }]));
  // Contrast: every rule the kit's palettes are verified against, recomputed on the hex values written here.
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const checks = [];
  for (const mode of ['light', 'dark']) for (const [fg, bgs, min] of RULES) for (const bg of bgs) {
    const a = colours[mode][fg], b = colours[mode][bg];
    if (!a || !b) continue;
    checks.push({ mode, fg, bg, min, ratio: +contrastRgb(rgb(a.hex), rgb(b.hex)).toFixed(2) });
  }
  const fails = checks.filter((c) => c.ratio < c.min);
  if (fails.length) { console.error(`Palette ${pal.id} fails ${fails.length} contrast pair(s): ${fails.slice(0, 5).map((f) => `${f.fg} on ${f.bg} (${f.mode}) ${f.ratio}:1 < ${f.min}`).join(', ')}`); process.exit(1); }
  // Type: the pairing's steps at the phone end (compact) and the wide end (regular), in points / sp.
  const family = (role) => { const f = (type.fonts ?? []).find((x) => x.roles.includes(role)) ?? (type.fonts ?? [])[0]; return { name: f?.family ?? 'System', fallback: f?.fallback ?? 'sans' }; };
  const STEPS = [['caption', -2, 'body', 'caption'], ['footnote', -1, 'body', 'footnote'], ['body', 0, 'body', 'body'], ['headline', 1, 'body', 'title3'], ['title', 2, 'display', 'title2'], ['title1', 3, 'display', 'title'], ['largeTitle', 4, 'display', 'largeTitle'], ['display', 5, 'display', 'largeTitle']];
  // Apps read at the platform's own body size (17pt on iOS, 16sp on Android: references/apps.md, "phone type, not page
  // type"), stepped by the pairing's own ratios, so the rhythm is the web's and nothing is smaller than 11.
  const r2 = (v) => Math.round(v * 2) / 2;
  const bodyPt = format === 'compose' ? 16 : 17;
  const styles = STEPS.map(([name, n, role, textStyle]) => {
    const display = role === 'display';
    return { name, step: n, role, textStyle, compact: Math.max(11, r2(bodyPt * type.ratio[0] ** n)), regular: Math.max(11, r2(bodyPt * type.ratio[1] ** n)), web: [r2(type.base[0] * type.ratio[0] ** n), r2(type.base[1] * type.ratio[1] ** n)], weight: display ? type.displayWeight : type.bodyWeight, leading: display ? type.displayLeading : n < 0 ? 1.4 : 1.5, tracking: display ? type.displayTracking : 0 };
  });
  return { space, radii, durations, easing, colours, checks: checks.length, styles, families: { display: family('display'), body: family('body'), mono: family('mono') } };
}

function camel(k) { return k.replace(/-(\w)/g, (_, c) => c.toUpperCase()); }
function header(n, c) { return `${c} lumina-taste · palette ${pal.id} (${pal.name}) · type ${type.id} · radius ${radiusAxis} · motion ${motionAxis}.
${c} Generated by scripts/export-tokens.mjs. Light and dark come from the same OKLCH tokens as the web kit;
${c} ${n.checks} contrast pairs were re-checked on these 8-bit colours (primary text 7:1, other text 4.5:1, UI 3:1).`; }

function swiftui(n) {
  const hex = (h) => `0x${h.slice(1).toUpperCase()}`;
  const keys = Object.keys(n.colours.light);
  const weight = (w) => (w >= 750 ? '.heavy' : w >= 650 ? '.bold' : w >= 550 ? '.semibold' : w >= 480 ? '.medium' : w >= 340 ? '.regular' : '.light');
  const fam = (role) => n.families[role === 'display' ? 'display' : 'body'].name;
  return `${header(n, '//')}
// Use: Text("Sailings").font(.Lumina.title).foregroundStyle(Color.Lumina.textPrimary)
//      .padding(Lumina.Space.s4).background(Color.Lumina.bgSurface1, in: .rect(cornerRadius: Lumina.Radius.lg))
// Fonts are looked up by family name: bundle the faces (UIAppFonts) or the system face is used, at the same size.
import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

public extension Color {
    /// A colour that follows light and dark mode with no asset catalogue: one dynamic platform colour per token.
    init(luminaLight light: UInt32, dark: UInt32) {
        func rgb(_ v: UInt32) -> (CGFloat, CGFloat, CGFloat) { (CGFloat((v >> 16) & 0xFF) / 255, CGFloat((v >> 8) & 0xFF) / 255, CGFloat(v & 0xFF) / 255) }
        let (lr, lg, lb) = rgb(light), (dr, dg, db) = rgb(dark)
        #if canImport(UIKit)
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(red: dr, green: dg, blue: db, alpha: 1) : UIColor(red: lr, green: lg, blue: lb, alpha: 1)
        })
        #elseif canImport(AppKit)
        self.init(nsColor: NSColor(name: nil) { appearance in
            appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? NSColor(srgbRed: dr, green: dg, blue: db, alpha: 1) : NSColor(srgbRed: lr, green: lg, blue: lb, alpha: 1)
        })
        #else
        self.init(.sRGB, red: Double(lr), green: Double(lg), blue: Double(lb), opacity: 1)
        #endif
    }

    /// The palette's semantic colours: surfaces, text, borders, the one accent, status and chart series.
    enum Lumina {
${keys.map((k) => `        public static let ${camel(k)} = Color(luminaLight: ${hex(n.colours.light[k].hex)}, dark: ${hex(n.colours.dark[k].hex)})`).join('\n')}
    }
}

public extension Font {
    /// The pairing's type steps on Dynamic Type text styles, so they grow with the reader's text size.
    enum Lumina {
${n.styles.map((s) => `        public static let ${s.name} = Font.custom(${JSON.stringify(fam(s.role))}, size: ${s.compact}, relativeTo: .${s.textStyle}).weight(${weight(s.weight)})`).join('\n')}
        public static let mono = Font.custom(${JSON.stringify(n.families.mono.name)}, size: ${n.styles[1].compact}, relativeTo: .body)
    }
}

/// Spacing, corner radii, type metrics and motion, the same values as the web tokens.
public enum Lumina {
    public enum Space {
${Object.entries(n.space).map(([k, v]) => `        public static let s${k.split('-')[1]}: CGFloat = ${v}`).join('\n')}
    }
    public enum Radius {
${Object.entries(n.radii).map(([k, v]) => `        public static let ${k}: CGFloat = ${v}`).join('\n')}
    }
    public enum TypeScale {
        /// Point sizes at phone width (compact) and on a tablet or desktop (regular), step -2 to 5.
${n.styles.map((s) => `        public static let ${s.name} = (compact: ${s.compact.toFixed(1)} as CGFloat, regular: ${s.regular.toFixed(1)} as CGFloat, leading: ${s.leading} as CGFloat, trackingEm: ${s.tracking} as CGFloat)`).join('\n')}
    }
    public enum Motion {
${Object.entries(n.durations).map(([k, v]) => `        public static let ${camel(k)}: Double = ${(v / 1000).toFixed(3)}`).join('\n')}
${Object.entries(n.easing).map(([k, v]) => `        public static let ${camel(k)} = Animation.timingCurve(${v.join(', ')}, duration: ${(n.durations['dur-3'] / 1000).toFixed(3)})`).join('\n')}
    }
    /// The smallest touch target, in points.
    public static let hit: CGFloat = 44
}
`;
}

function compose(n) {
  const keys = Object.keys(n.colours.light);
  const argb = (h) => `Color(0xFF${h.slice(1).toUpperCase()})`;
  const ff = (f) => (f.fallback === 'serif' ? 'FontFamily.Serif' : f.fallback === 'mono' ? 'FontFamily.Monospace' : 'FontFamily.SansSerif');
  const famOf = (role) => n.families[role === 'display' ? 'display' : 'body'];
  const colours = (mode) => `LuminaColors(\n${keys.map((k) => `        ${camel(k)} = ${argb(n.colours[mode][k].hex)},`).join('\n')}\n    )`;
  return `${header(n, '//')}
// Use: LuminaTheme { Text("Sailings", style = LuminaTheme.type.title, color = LuminaTheme.colors.textPrimary) }
// No MaterialTheme: map these onto one yourself if the app uses Material components.
// Fonts: the families below fall back to the platform's own; put the real faces in res/font and swap them in.
package ${pkg}

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/** The palette's semantic colours for one mode: surfaces, text, borders, the one accent, status and chart series. */
@Immutable
data class LuminaColors(
${keys.map((k) => `    val ${camel(k)}: Color,`).join('\n')}
)

/** The pairing's type steps (phone sizes; regular sizes are in LuminaTokens.regularSizes). */
@Immutable
data class LuminaTypography(
${n.styles.map((s) => `    val ${s.name}: TextStyle,`).join('\n')}
    val mono: TextStyle,
)

@Immutable
data class LuminaShapes(
${Object.keys(n.radii).map((k) => `    val ${k}: RoundedCornerShape = RoundedCornerShape(${n.radii[k]}.dp),`).join('\n')}
)

object LuminaSpacing {
${Object.entries(n.space).map(([k, v]) => `    val s${k.split('-')[1]} = ${v}.dp`).join('\n')}
    /** The smallest touch target. */
    val hit = 48.dp
}

object LuminaMotion {
${Object.entries(n.durations).map(([k, v]) => `    const val ${camel(k)}Ms = ${v}`).join('\n')}
${Object.entries(n.easing).map(([k, v]) => `    val ${camel(k)} = floatArrayOf(${v.map((x) => `${x}f`).join(', ')})`).join('\n')}
}

object LuminaTokens {
    val Light = ${colours('light')}
    val Dark = ${colours('dark')}
    val Display: FontFamily = ${ff(n.families.display)} // ${n.families.display.name}
    val Body: FontFamily = ${ff(n.families.body)} // ${n.families.body.name}
    val Mono: FontFamily = ${ff(n.families.mono)} // ${n.families.mono.name}
    val Type = LuminaTypography(
${n.styles.map((s) => `        ${s.name} = TextStyle(fontFamily = ${famOf(s.role) === n.families.display ? 'Display' : 'Body'}, fontWeight = FontWeight(${s.weight}), fontSize = ${s.compact}.sp, lineHeight = ${s.leading}.em, letterSpacing = ${s.tracking}.em),`).join('\n')}
        mono = TextStyle(fontFamily = Mono, fontWeight = FontWeight(400), fontSize = ${n.styles[1].compact}.sp, lineHeight = 1.5.em),
    )
    /** Sizes on a tablet or desktop window (sp), step -2 to 5. */
    val regularSizes = mapOf(${n.styles.map((s) => `"${s.name}" to ${s.regular}f`).join(', ')})
    val Shapes = LuminaShapes()
    fun colors(dark: Boolean): LuminaColors = if (dark) Dark else Light
}

val LocalLuminaColors = staticCompositionLocalOf { LuminaTokens.Light }

@Composable
fun LuminaTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalLuminaColors provides LuminaTokens.colors(dark), content = content)
}

object LuminaTheme {
    val colors: LuminaColors @Composable @ReadOnlyComposable get() = LocalLuminaColors.current
    val type: LuminaTypography get() = LuminaTokens.Type
    val shapes: LuminaShapes get() = LuminaTokens.Shapes
}
`;
}

function figma(n) {
  const colourSet = (mode) => {
    const groups = {};
    for (const [k, c] of Object.entries(n.colours[mode])) {
      const [group, ...rest] = k.split('-');
      (groups[group] ??= {})[rest.join('-') || 'default'] = { $type: 'color', $value: c.hex, $extensions: { 'lumina.oklch': c.oklch } };
    }
    return groups;
  };
  const famName = (f) => f.name;
  const core = {
    space: Object.fromEntries(Object.entries(n.space).map(([k, v]) => [k.split('-')[1], { $type: 'dimension', $value: `${v}px` }])),
    radius: Object.fromEntries(Object.entries(n.radii).map(([k, v]) => [k, { $type: 'dimension', $value: `${v}px` }])),
    font: {
      display: { $type: 'fontFamily', $value: famName(n.families.display) },
      body: { $type: 'fontFamily', $value: famName(n.families.body) },
      mono: { $type: 'fontFamily', $value: famName(n.families.mono) },
    },
    type: Object.fromEntries(n.styles.map((s) => [s.name, { $type: 'typography', $value: { fontFamily: `{font.${s.role}}`, fontWeight: s.weight, fontSize: `${s.web[0]}px`, lineHeight: s.leading, letterSpacing: `${s.tracking}em` }, $extensions: { 'lumina.step': s.step, 'lumina.webWide': `${s.web[1]}px`, 'lumina.appPhone': `${s.compact}px`, 'lumina.appTablet': `${s.regular}px` } }])),
    duration: Object.fromEntries(Object.entries(n.durations).map(([k, v]) => [k.split('-')[1], { $type: 'duration', $value: `${v}ms` }])),
    easing: Object.fromEntries(Object.entries(n.easing).map(([k, v]) => [k.replace(/^ease-/, ''), { $type: 'cubicBezier', $value: v }])),
  };
  const doc = {
    $description: `lumina-taste · palette ${pal.id} (${pal.name}) · type ${type.id} · radius ${radiusAxis} · motion ${motionAxis}. ${n.checks} contrast pairs re-checked.`,
    core, light: colourSet('light'), dark: colourSet('dark'),
    $themes: ['Light', 'Dark'].map((name) => ({ id: name.toLowerCase(), name, group: 'Mode', selectedTokenSets: { core: 'source', [name.toLowerCase()]: 'enabled' } })),
    $metadata: { tokenSetOrder: ['core', 'light', 'dark'] },
  };
  return formatJson(doc);
}
