'use client';
import { create } from 'zustand';

/** Interaction modes for the desk experience. "to*" modes are animated transitions. */
export type Mode = 'loading' | 'desk' | 'toLaptop' | 'laptop' | 'toPhone' | 'phone' | 'returning' | 'sipping' | 'toNote' | 'note';
export type Device = 'laptop' | 'phone';
/** Everything on the desk that reacts to a click. */
export type Prop = Device | 'cup' | 'notebook' | 'resume';
/** Sub-phase used by the director to sequence hands, device and camera. */
export type Phase = 'idle' | 'reach' | 'grip' | 'lift' | 'hold' | 'press' | 'zoom' | 'lower' | 'release';

export type BrowserState = {
  activeTab: string | null;
  closed: string[];
  collapsed: string[];
  history: string[];
  cursor: number;
  filter: string;
};

export const initialBrowser: BrowserState = {
  activeTab: 'portfolio',
  closed: [],
  collapsed: ['music', 'hobby', 'ideas'], // Work group open by default
  history: ['portfolio'],
  cursor: 0,
  filter: 'All',
};

type State = {
  mode: Mode;
  phase: Phase;
  hover: Prop | null;
  carousel: number;
  browser: BrowserState;
  overlayVisible: boolean;
  hintDismissed: boolean;
  /** desk kept alive but hidden (static preview keeps it mounted under case studies) */
  paused: boolean;
  /** which paper the camera leans over in 'note' mode */
  paper: 'notebook' | 'resume';
  setPaper: (p: 'notebook' | 'resume') => void;
  modeSince: number;
  setPaused: (p: boolean) => void;
  setMode: (m: Mode) => void;
  setPhase: (p: Phase) => void;
  setHover: (d: Prop | null) => void;
  setCarousel: (i: number) => void;
  setBrowser: (fn: (b: BrowserState) => BrowserState) => void;
  setOverlayVisible: (v: boolean) => void;
  dismissHint: () => void;
};

export const useDesk = create<State>((set) => ({
  mode: 'loading',
  phase: 'idle',
  hover: null,
  carousel: 0,
  browser: initialBrowser,
  overlayVisible: false,
  hintDismissed: false,
  paused: false,
  paper: 'notebook',
  setPaper: (paper) => set({ paper }),
  modeSince: 0,
  setPaused: (paused) => set({ paused }),
  setMode: (mode) => set({ mode, modeSince: typeof performance !== 'undefined' ? performance.now() : 0 }),
  setPhase: (phase) => set({ phase }),
  setHover: (hover) => set({ hover }),
  setCarousel: (carousel) => set({ carousel }),
  setBrowser: (fn) => set((s) => ({ browser: fn(s.browser) })),
  setOverlayVisible: (overlayVisible) => set({ overlayVisible }),
  dismissHint: () => set({ hintDismissed: true }),
}));
