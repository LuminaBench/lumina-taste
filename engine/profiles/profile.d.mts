export type PaletteId = string;
export type Mode = 'light' | 'dark';
export type Density = 'spacious' | 'balanced' | 'dense';
export type Radius = 'sharp' | 'balanced' | 'soft';
export type Motion = 'snappy' | 'calm' | 'reduced';
export type InstallMode = 'greenfield' | 'attach';
export type Axis = 'palette' | 'mode' | 'typography' | 'density' | 'radius' | 'motion' | 'overrides' | 'installMode' | 'attachRoot';

export interface TasteProfile {
  profileVersion: 1;
  palette: PaletteId;
  mode: Mode;
  typography: string;
  density: Density;
  radius: Radius;
  motion: Motion;
  /** Fields agents must preserve on follow-up edits, e.g. ["palette", "overrides.accent-solid"]. */
  locks: Array<Axis | `overrides.${string}`>;
  /** Token name (without --) -> CSS value. */
  overrides: Record<string, string>;
  installMode: InstallMode;
  /** CSS selector of the wrapper that receives the tokens in attach mode. */
  attachRoot: string;
}

export declare const PROFILE_VERSION: 1;
export declare const AXES: readonly Axis[];
export declare const CHOICES: {
  palette: string[]; mode: Mode[]; typography: string[]; density: Density[]; radius: Radius[]; motion: Motion[]; installMode: InstallMode[];
};
export declare const DEFAULT_PROFILE: Readonly<TasteProfile>;
export declare function validateProfile(p: unknown): string[];
export declare function normalizeProfile(p?: Partial<TasteProfile>): TasteProfile;
export declare function serializeProfile(p: Partial<TasteProfile>): string;
export declare function mergeProfile(
  current: Partial<TasteProfile>,
  patch: Partial<Omit<TasteProfile, 'overrides'>> & { overrides?: Record<string, string | null> },
  options?: { force?: boolean },
): { profile: TasteProfile; applied: string[]; blocked: string[] };
export declare function profileAttributes(p: Partial<TasteProfile>): Record<string, string>;
export declare function applyProfile(p: Partial<TasteProfile>, doc?: Document): HTMLElement;
export declare function bootstrapSnippet(p: Partial<TasteProfile>): string;
