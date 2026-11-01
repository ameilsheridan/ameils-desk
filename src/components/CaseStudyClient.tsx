'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { engine, sfx } from '@/lib/audio';
import { peekReturn } from '@/lib/restore';
import { useTransitionStore } from '@/lib/transition';

/** Hero image that stays hidden until the shared transition image lands on it. */
export function CaseHero({ slug, src, alt }: { slug: string; src: string; alt: string }) {
  const phase = useTransitionStore((s) => s.phase);
  const tSlug = useTransitionStore((s) => s.slug);
  const incoming = tSlug === slug && (phase === 'expanding');
  return (
    <figure className="case-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img data-hero={slug} src={src} alt={alt} style={{ opacity: incoming ? 0 : 1 }} />
    </figure>
  );
}

/** Reveals page content after the transition settles and fades the café audio down. */
export function CaseReveal({ slug, children }: { slug: string; children: React.ReactNode }) {
  const phase = useTransitionStore((s) => s.phase);
  const tSlug = useTransitionStore((s) => s.slug);
  const waiting = tSlug === slug && phase === 'expanding';
  useEffect(() => {
    engine?.duck(true);
    return () => engine?.duck(false);
  }, []);
  return <div className={`case-body ${waiting ? '' : 'is-revealed'}`}>{children}</div>;
}

export function BackToDesk({ slug }: { slug: string }) {
  const router = useRouter();
  const inApp = useTransitionStore((s) => s.inApp);
  const [label, setLabel] = useState('Back to desk');
  const [target, setTarget] = useState('/');
  useEffect(() => {
    const ret = peekReturn();
    if (ret && ret.slug === slug) {
      if (ret.device === 'phone') setLabel('Back to phone');
      if (ret.device === 'laptop') setLabel('Back to laptop');
      if (ret.device === 'index') {
        setLabel('Back to all work');
        setTarget('/work');
      }
    }
  }, [slug]);
  return (
    <button
      type="button"
      className="back-link"
      onClick={() => {
        sfx('back');
        if (inApp && window.history.length > 1) router.back();
        else router.push(target);
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {label}
    </button>
  );
}

export function ResetTransitionOnMount() {
  useEffect(() => {
    const s = useTransitionStore.getState();
    if (s.phase === 'done') s.setPhase('idle');
  });
  return null;
}
