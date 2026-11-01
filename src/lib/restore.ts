'use client';
import type { BrowserState, Device } from './store';

/** Where the visitor came from, so Back returns them to the same device, tab or card. */
export type ReturnContext = {
  device: Device | 'index';
  carousel?: number;
  browser?: BrowserState;
  slug: string;
  at: number;
};

const KEY = 'ameils-desk:return';

export function saveReturn(ctx: Omit<ReturnContext, 'at'>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...ctx, at: Date.now() }));
  } catch {}
}

export function peekReturn(): ReturnContext | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as ReturnContext;
    if (Date.now() - ctx.at > 1000 * 60 * 60) return null;
    return ctx;
  } catch {
    return null;
  }
}

export function consumeReturn(): ReturnContext | null {
  const ctx = peekReturn();
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  return ctx;
}
