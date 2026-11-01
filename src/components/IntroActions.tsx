'use client';
import Link from 'next/link';

type Desk = Record<'openLaptop' | 'openNotebook' | 'sipCoffee', () => Promise<void>> & { store: { getState: () => { mode: string } } };

/** Primary calls to action, plus small shortcuts into the desk interactions. */
export default function IntroActions() {
  const run = (k: keyof Omit<Desk, 'store'>) => (e: React.MouseEvent) => {
    const d = (window as unknown as { __desk?: Desk }).__desk;
    if (!d) return; // no 3D: follow the link
    e.preventDefault();
    if (d.store.getState().mode === 'desk') void d[k]();
  };
  return (
    <div className="intro-cta">
      <div className="intro-buttons">
        <Link className="cta-primary" href="/work" onClick={run('openLaptop')}>
          Explore work
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M11 5l5 5-5 5" /></svg>
        </Link>
        <Link className="cta-ghost" href="/about">About me</Link>
      </div>
      <ul className="intro-try" aria-label="Things to try on the desk">
        <li><Link href="/contact" onClick={run('openNotebook')}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h9v14H5zM8 7h4M8 10h4" /></svg>
          Say hello</Link></li>
        <li><a href="#main" onClick={run('sipCoffee')}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h10v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM14 9h1.5a2 2 0 0 1 0 4H14M7 4v2M10 4v2" /></svg>
          Take a sip</a></li>
      </ul>
    </div>
  );
}
