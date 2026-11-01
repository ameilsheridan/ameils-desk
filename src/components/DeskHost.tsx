'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import HomeView from '@/components/HomeView';
import { useDesk } from '@/lib/store';
import { consumeReturn } from '@/lib/restore';
import { useTransitionStore } from '@/lib/transition';
import { engine } from '@/lib/audio';

/**
 * Keeps the 3D desk alive across routes. It mounts the first time the visitor reaches "/", and from then on
 * stays mounted (paused and hidden) while other pages are open. Coming back to "/" is instant: no re-setup,
 * and the phone / laptop / notebook is exactly where it was left. A direct visit to a case study never loads WebGL.
 */
export default function DeskHost() {
  const path = usePathname();
  const onHome = path === '/';
  const [mounted, setMounted] = useState(onHome);

  useEffect(() => {
    if (onHome) setMounted(true);
  }, [onHome]);

  useEffect(() => {
    useDesk.getState().setPaused(!onHome);
    // the "came from" hint is only for the Back label on the case page; drop it once we are home again
    if (onHome) {
      consumeReturn();
      engine?.duck(false);
      const t = useTransitionStore.getState();
      if (t.phase !== 'idle') t.setPhase('idle'); // never leave a stale transition ghost over the desk
    }
  }, [onHome]);

  if (!mounted) return null;
  return (
    <div className={onHome ? undefined : 'spa-hidden'} aria-hidden={!onHome} inert={!onHome}>
      <HomeView active={onHome} />
    </div>
  );
}
