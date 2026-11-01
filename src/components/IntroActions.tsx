'use client';
import Link from 'next/link';

type Desk = Record<'openLaptop' | 'openPhone' | 'openNotebook' | 'sipCoffee', () => Promise<void>> & { store: { getState: () => { mode: string } } };

const ICON: Record<string, React.ReactNode> = {
  laptop: <path d="M4 6h12v8H4zM2 16h16" />,
  phone: <path d="M7 3h6v14H7zM9.5 14.5h1" />,
  note: <path d="M5 3h9v14H5zM8 7h4M8 10h4" />,
  cup: <path d="M4 8h10v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM14 9h1.5a2 2 0 0 1 0 4H14M7 4v2M10 4v2" />,
};

/** Shortcuts into the desk interactions (also the keyboard and screen-reader route to them). */
export default function IntroActions() {
  const run = (k: keyof Omit<Desk, 'store'>, fallback: string) => (e: React.MouseEvent) => {
    const d = (window as unknown as { __desk?: Desk }).__desk;
    if (d && d.store.getState().mode === 'desk' && d[k]) {
      e.preventDefault();
      void d[k]();
    } else if (d) e.preventDefault();
    else if (!fallback) e.preventDefault();
  };
  const item = (k: keyof Omit<Desk, 'store'>, icon: string, label: string, href: string) => (
    <li>
      <Link href={href || '#'} onClick={run(k, href)}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{ICON[icon]}</svg>
        {label}
      </Link>
    </li>
  );
  return (
    <ul className="intro-actions" aria-label="Things to try on the desk">
      {item('openLaptop', 'laptop', 'Browse work', '/work')}
      {item('openPhone', 'phone', 'Case studies', '/work')}
      {item('openNotebook', 'note', 'Say hello', '/contact')}
      {item('sipCoffee', 'cup', 'Take a sip', '')}
    </ul>
  );
}
