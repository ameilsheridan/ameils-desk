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
          <h1>Hi, I&rsquo;m<br />Ameil.</h1>
          <p className="intro-lede">I make complex enterprise, AI and healthcare products feel calm, clear and human.</p>
          <p className="intro-proof">Now designing at Vistra. Previously Head Designer on PhIS&nbsp;3.0.</p>
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
