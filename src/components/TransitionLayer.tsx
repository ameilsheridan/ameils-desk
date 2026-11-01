'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { heroTarget, useTransitionStore } from '@/lib/transition';
import { prefersReducedMotion } from '@/lib/quality';

/**
 * Persistent layer (lives in the root layout, so it survives the route change) that keeps the
 * selected project image visually continuous from its device into the case-study hero.
 */
export default function TransitionLayer() {
  const { phase, src, from, slug } = useTransitionStore();
  const imgRef = useRef<HTMLImageElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const sawCase = useRef(false);
  const epoch = useRef(0); // bumped when the visitor leaves the case route; stale settle steps check it

  // The transition belongs to the case-study route. If the visitor leaves it (Back, even mid-animation),
  // stop everything and clear the layer so a stale image can never sit on top of the desk or block the next open.
  useEffect(() => {
    if (path.startsWith('/work/')) {
      sawCase.current = true;
      return;
    }
    if (sawCase.current) {
      sawCase.current = false;
      epoch.current++;
      gsap.killTweensOf([imgRef.current, backRef.current]);
      const s = useTransitionStore.getState();
      if (s.phase !== 'idle') s.setPhase('idle');
    }
  }, [path]);

  useEffect(() => {
    if (phase !== 'expanding' || !from || !imgRef.current || !backRef.current) return;
    const img = imgRef.current;
    const back = backRef.current;
    const reduce = prefersReducedMotion();
    const target = heroTarget();
    gsap.set(img, { x: from.x, y: from.y, width: from.w, height: from.h, borderRadius: from.r, opacity: 1 });
    gsap.set(back, { opacity: 0 });
    const my = epoch.current;
    const tl = gsap.timeline({
      onComplete: () => {
        // settle onto the real hero element once the case page has rendered it
        let tries = 0;
        const settle = () => {
          if (epoch.current !== my) return;
          const hero = document.querySelector<HTMLElement>(`[data-hero="${slug}"]`);
          if (!hero && tries++ < 60) return requestAnimationFrame(settle);
          if (hero) {
            const r = hero.getBoundingClientRect();
            gsap.to(img, { x: r.left, y: r.top, width: r.width, height: r.height, duration: 0.18, ease: 'power2.out' });
          }
          useTransitionStore.getState().setPhase('settling');
          gsap.to([img, back], {
            opacity: 0, duration: 0.3, delay: 0.2, ease: 'power1.out',
            onComplete: () => { if (epoch.current === my) useTransitionStore.getState().setPhase('done'); },
          });
        };
        settle();
      },
    });
    if (reduce) {
      tl.to(back, { opacity: 1, duration: 0.2 }).set(img, { x: target.x, y: target.y, width: target.w, height: target.h });
    } else {
      // lift: isolate the selected card, then expand into the hero
      tl.to(img, { scale: 1.03, duration: 0.14, ease: 'power2.out', transformOrigin: '50% 50%' })
        .to(back, { opacity: 1, duration: 0.45, ease: 'power2.inOut' }, 0.05)
        .to(img, {
          x: target.x, y: target.y, width: target.w, height: target.h, borderRadius: target.r, scale: 1,
          duration: 0.78, ease: 'power3.inOut',
        }, 0.12);
    }
    return () => {
      tl.kill();
    };
  }, [phase, from, slug]);

  if (phase === 'idle' || phase === 'done' || !src) return null;
  return (
    <div className="transition-layer" aria-hidden="true">
      <div ref={backRef} className="transition-backdrop" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt="" className="transition-image" />
    </div>
  );
}
