'use client';

export type Tier = 'high' | 'balanced' | 'light' | 'static';

export type QualitySettings = {
  tier: Tier;
  dpr: [number, number];
  shadowMap: number;
  postprocessing: boolean;
  multisampling: number;
  dof: boolean;
  bloom: boolean;
  practicalLights: number;
  contactShadowRes: number;
};

const SETTINGS: Record<Exclude<Tier, 'static'>, QualitySettings> = {
  high: { tier: 'high', dpr: [1, 2], shadowMap: 2048, postprocessing: true, multisampling: 4, dof: true, bloom: true, practicalLights: 5, contactShadowRes: 1024 },
  balanced: { tier: 'balanced', dpr: [1, 1.5], shadowMap: 1024, postprocessing: true, multisampling: 2, dof: true, bloom: true, practicalLights: 3, contactShadowRes: 512 },
  light: { tier: 'light', dpr: [1, 1], shadowMap: 512, postprocessing: false, multisampling: 0, dof: false, bloom: false, practicalLights: 2, contactShadowRes: 256 },
};

export function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

/** Picks a tier once at start-up. `?quality=high|balanced|light|static` overrides for testing. */
export function detectTier(): Tier {
  const forced = new URLSearchParams(location.search).get('quality') as Tier | null;
  if (forced && ['high', 'balanced', 'light', 'static'].includes(forced)) return forced;
  if (!hasWebGL2()) return 'static';
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  if (coarse && small) return 'light';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  if (cores <= 4 || mem <= 4 || coarse) return 'balanced';
  return 'high';
}

export function settingsFor(tier: Tier): QualitySettings {
  return SETTINGS[tier === 'static' ? 'light' : tier];
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
