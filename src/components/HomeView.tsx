import Link from 'next/link';
import TopNav from '@/components/TopNav';
import ExperienceLoader from '@/components/ExperienceLoader';
import IntroActions from '@/components/IntroActions';
import { projects } from '@/lib/projects';

export default function HomeView() {
  return (
    <div className="home">
      <TopNav />
      <main id="main">
        <div className="intro">
          <p className="intro-eyebrow"><i aria-hidden="true" />Product designer in Kuala Lumpur</p>
          <h1>Hi, I&rsquo;m Ameil.</h1>
          <p className="intro-motto"><span>Discover the problem.</span> <span>Design the solution.</span></p>
          <p className="intro-lede">I design calm, clear products for enterprise, AI and healthcare.</p>
          <p className="intro-proof">Currently designing at Vistra. Previously led design for PhIS&nbsp;3.0.</p>
          <IntroActions />
        </div>
        <ExperienceLoader />
        <noscript>
          <ul className="static-links">
            {projects.map((p) => <li key={p.slug}><Link href={`/work/${p.slug}`}>{p.name}</Link></li>)}
          </ul>
        </noscript>
      </main>
    </div>
  );
}
