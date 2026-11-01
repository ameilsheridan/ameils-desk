import Link from 'next/link';
import SoundControl from './SoundControl';
import NavLinks from './NavLinks';

export default function TopNav({ tone = 'dark', current }: { tone?: 'dark' | 'light'; current?: 'work' | 'about' | 'contact' }) {
  return (
    <header className={`topnav topnav--${tone}`}>
      <Link href="/" className="brand" aria-label="Ameil Sheridan, home">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span>Ameil Sheridan</span>
      </Link>
      <NavLinks current={current} />
      <SoundControl />
    </header>
  );
}
