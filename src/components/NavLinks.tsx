'use client';
import Link from 'next/link';

type Desk = { openNotebook?: () => Promise<void>; store?: { getState: () => { mode: string } } };

/** Primary links. On the desk, Contact opens the notebook instead of leaving the scene. */
export default function NavLinks({ current }: { current?: 'work' | 'about' | 'contact' }) {
  return (
    <nav aria-label="Primary">
      <Link href="/work" aria-current={current === 'work' ? 'page' : undefined}>Work</Link>
      <Link href="/about" aria-current={current === 'about' ? 'page' : undefined}>About</Link>
      <Link
        href="/contact"
        aria-current={current === 'contact' ? 'page' : undefined}
        onClick={(e) => {
          const d = (window as unknown as { __desk?: Desk }).__desk;
          const home = document.querySelector('.home') && !document.querySelector('.spa-hidden .home');
          if (d?.openNotebook && home && d.store?.getState().mode === 'desk') {
            e.preventDefault();
            void d.openNotebook();
          }
        }}
      >
        Contact
      </Link>
    </nav>
  );
}
