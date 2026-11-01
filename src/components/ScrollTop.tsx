'use client';
import { useEffect, useState } from 'react';

/** Floating "back to top" button, shown once the reader is well down a long page. */
export default function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 900);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <button
      type="button"
      className={`scroll-top ${show ? 'is-visible' : ''}`}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      aria-label="Back to top"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        document.getElementById('main')?.focus({ preventScroll: true });
      }}
    >
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M10 15V5M5 9.5L10 4.5l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}
