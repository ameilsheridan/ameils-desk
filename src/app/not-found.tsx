import Link from 'next/link';
import TopNav from '@/components/TopNav';

export default function NotFound() {
  return (
    <div className="case page">
      <TopNav tone="light" />
      <main id="main" className="wrap not-found">
        <h1>This page isn&rsquo;t on the desk.</h1>
        <p className="lede">The link may be old, or the page has moved.</p>
        <p className="about-ctas"><Link className="proto-cta" href="/">Back to the desk</Link><Link className="btn-ghost" href="/work">See all work</Link></p>
      </main>
    </div>
  );
}
