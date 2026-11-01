'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { projects } from '@/lib/projects';
import { useDesk } from '@/lib/store';
import { sfx } from '@/lib/audio';
import { startProjectTransition } from '@/lib/transition';
import { handBus } from '../handBus';
import { overlayEls, overlaySize } from '../overlaySync';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Project carousel rendered as real DOM on the phone screen. The visitor stays in control:
 * nothing advances automatically. Swipe, drag, wheel, arrow buttons or ←/→, Enter opens, Esc returns.
 */
export default function PhoneUI({ sizeKey }: { sizeKey: string }) {
  const router = useRouter();
  const mode = useDesk((s) => s.mode);
  const visible = useDesk((s) => s.overlayVisible) && mode === 'phone';
  const index = useDesk((s) => s.carousel);
  const setIndex = useDesk((s) => s.setCarousel);
  const [drag, setDrag] = useState(0);
  const [pressed, setPressed] = useState<number | null>(null);
  const busy = useRef(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const wheelAcc = useRef(0);
  const root = useRef<HTMLDivElement | null>(null);
  const openBtns = useRef<(HTMLButtonElement | null)[]>([]);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const { w, h } = overlaySize.phone;

  const go = useCallback((dir: 1 | -1) => {
    const next = useDesk.getState().carousel + dir;
    if (next < 0 || next >= projects.length) {
      setDrag(dir * -18);
      setTimeout(() => setDrag(0), 160);
      return;
    }
    setIndex(next);
    sfx('swipe', 0.35);
    void handBus.swipe(dir);
  }, [setIndex]);

  const open = useCallback(async (i: number) => {
    if (busy.current) return;
    busy.current = true;
    const btn = openBtns.current[i];
    const img = imgs.current[i];
    if (btn) {
      const r = btn.getBoundingClientRect();
      await handBus.tap(r.left + r.width / 2, r.top + r.height / 2);
    }
    setPressed(i);
    sfx('tap', 0.35);
    await wait(110);
    if (img) {
      startProjectTransition(projects[i].slug, img, { device: 'phone', carousel: i }, (href) => router.push(href));
    }
    setTimeout(() => {
      busy.current = false;
      setPressed(null);
    }, 900);
  }, [router]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (useDesk.getState().paused) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        void open(useDesk.getState().carousel);
      }
    };
    window.addEventListener('keydown', onKey);
    // move focus into the phone for keyboard and screen-reader users
    const t = setTimeout(() => root.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true }), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [visible, go, open]);

  const setRoot = (el: HTMLDivElement | null) => {
    root.current = el;
    overlayEls.phone = el;
  };

  return (
    <div
      ref={setRoot}
      key={sizeKey}
      className={`screen-overlay phone-ui ${visible ? 'is-visible' : ''}`}
      style={{ width: w, height: h, ['--u' as string]: w / 300 } as React.CSSProperties}
      role="region"
      aria-label="Projects on phone"
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="phone-status" aria-hidden="true">
        <span>21:40</span>
        <span className="phone-island" />
        <span className="phone-sig">
          <i /><i /><i />
        </span>
      </div>
      <header className="phone-head">
        <p>Ameil Sheridan</p>
        <h2 tabIndex={-1} data-autofocus>Projects</h2>
      </header>
      <div
        className="phone-viewport"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          setDrag(e.clientX - start.current.x);
        }}
        onPointerUp={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x;
          start.current = null;
          setDrag(0);
          if (Math.abs(dx) > w * 0.12) go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(0);
        }}
        onWheel={(e) => {
          const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          wheelAcc.current += d;
          if (Math.abs(wheelAcc.current) > 60) {
            go(wheelAcc.current > 0 ? 1 : -1);
            wheelAcc.current = 0;
          }
        }}
      >
        <ul
          className="phone-track"
          style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))`, transition: drag ? 'none' : undefined }}
          aria-live="polite"
        >
          {projects.map((p, i) => (
            <li key={p.slug} className={`phone-card ${i === index ? 'is-current' : ''}`} aria-hidden={i !== index} style={{ ['--brand' as string]: p.brand }}
              aria-roledescription="slide" aria-label={`${i + 1} of ${projects.length}: ${p.name}`}>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={(el) => { imgs.current[i] = el; }} src={p.cover} alt="" draggable={false} />
              </figure>
              <span className="chip">{p.category}</span>
              <h3>{p.name}</h3>
              <p>{p.summary}</p>
              <button
                ref={(el) => { openBtns.current[i] = el; }}
                type="button"
                className={`phone-open ${pressed === i ? 'is-pressed' : ''}`}
                tabIndex={i === index ? 0 : -1}
                onClick={() => open(i)}
              >
                Open project
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="phone-nav">
        <button type="button" aria-label="Previous project" onClick={() => go(-1)} disabled={index === 0}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <div className="phone-dots" aria-hidden="true">
          {projects.map((p, i) => <i key={p.slug} className={i === index ? 'on' : ''} />)}
        </div>
        <button type="button" aria-label="Next project" onClick={() => go(1)} disabled={index === projects.length - 1}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
        </button>
      </div>
      <div className="phone-home" aria-hidden="true" />
    </div>
  );
}
