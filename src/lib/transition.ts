'use client';
import { create } from 'zustand';
import { engine, sfx } from './audio';
import { saveReturn, type ReturnContext } from './restore';
import { asset } from './asset';

export type Rect = { x: number; y: number; w: number; h: number; r: number };

type TState = {
  phase: 'idle' | 'expanding' | 'settling' | 'done';
  slug: string | null;
  src: string | null;
  from: Rect | null;
  /** true once any in-app project transition happened in this page session */
  inApp: boolean;
  begin: (slug: string, src: string, from: Rect) => void;
  setPhase: (p: TState['phase']) => void;
};

export const useTransitionStore = create<TState>((set) => ({
  phase: 'idle',
  slug: null,
  src: null,
  from: null,
  inApp: false,
  begin: (slug, src, from) => set({ phase: 'expanding', slug, src, from, inApp: true }),
  setPhase: (phase) => set({ phase }),
}));

/** Where the case-study hero sits (kept in sync with .case-hero in globals.css). */
export function heroTarget(): Rect {
  const vw = window.innerWidth;
  const w = Math.min(1120, vw - (vw < 640 ? 24 : 48));
  return { x: (vw - w) / 2, y: vw < 640 ? 76 : 96, w, h: w / 1.6, r: vw < 640 ? 14 : 20 };
}

/**
 * Shared expansion used by the laptop browser, the phone carousel and /work.
 * Captures the selected cover's on-screen rect, then the TransitionLayer expands it into
 * the case-study hero while the route changes underneath.
 */
export function startProjectTransition(
  slug: string,
  img: HTMLElement,
  ctx: Omit<ReturnContext, 'at' | 'slug'>,
  navigate: (href: string) => void,
) {
  const store = useTransitionStore.getState();
  if (store.phase === 'expanding' || store.phase === 'settling') return;
  const r = img.getBoundingClientRect();
  const radius = parseFloat(getComputedStyle(img).borderTopLeftRadius) || 8;
  const src = (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src || asset(`/projects/${slug}.svg`);
  saveReturn({ ...ctx, slug });
  store.begin(slug, src, { x: r.left, y: r.top, w: r.width, h: r.height, r: radius });
  sfx('expand');
  engine?.duck(true);
  navigate(`/work/${slug}`);
}
