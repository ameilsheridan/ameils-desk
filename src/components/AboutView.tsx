import Link from 'next/link';
import TopNav from '@/components/TopNav';
import ScrollTop from '@/components/ScrollTop';
import { asset } from '@/lib/asset';

const EXPERIENCE = [
  { when: 'Jul 2025 to now', org: 'Vistra', role: 'UI/UX Designer', body: 'Designing the Global Expansion Platform, an enterprise entity-management product used across many countries, and GeniOS, the design library behind its AI workflows.' },
  { when: 'Jan 2024 to Jul 2025', org: 'CMG Group Berhad', role: 'Head Designer, PhIS 3.0', body: 'Led the redesign of PhIS 3.0, the pharmacy information system built for the NPRA.' },
  { when: 'Apr 2022 to Jan 2024', org: 'Hummingsoft Sdn Bhd', role: 'GIS Analyst and UI/UX Designer', body: 'Mapping, analysis and interface design for map-based systems and dashboards.' },
];

const PRINCIPLES = [
  { t: 'Whole journeys, not single screens', b: 'I map how a task really flows before I draw a screen, so the parts fit together.' },
  { t: 'Earn complexity', b: 'Enterprise and clinical tools carry a lot. I add a feature or a step only when it pays for itself.' },
  { t: 'Systems over one-offs', b: 'Reusable components and tokens keep large products consistent as they grow.' },
  { t: 'AI where it genuinely helps', b: 'I ask what a model makes easier for the user, not where it can be added.' },
];

const TOOLS = ['Figma', 'Framer', 'FlutterFlow', 'Penpot', 'Photoshop', 'After Effects', 'HTML, CSS and JavaScript', 'ArcGIS', 'QGIS'];

export default function AboutView() {
  return (
    <div className="case page" style={{ ['--brand' as string]: '#2b1d17' }}>
      <TopNav tone="light" current="about" />
      <main id="main" tabIndex={-1}>
        <section className="wrap case-hero-panel page-hero" aria-labelledby="about-title">
          <div className="chp-copy">
            <h1 id="about-title">About</h1>
            <p className="chp-summary">I&rsquo;m Ameil Sheridan, a product designer in Kuala Lumpur with 4+ years across enterprise SaaS, AI, healthcare and government.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <figure className="case-hero"><img src={asset('/poster.jpg')} alt="The café desk from this portfolio" /></figure>
        </section>

        <div className="wrap">
          <section className="intro-split" aria-labelledby="s-story">
            <h2 id="s-story" className="statement">I started in geography and GIS, <span>and still design the way a map works: whole journeys first, then the details people need at each turn.</span></h2>
            <div className="about-side">
              <p>Most of my work is on products that carry a lot of weight: entity management for global companies, a national pharmacy system, map-based monitoring tools. The job is to make them feel calm and obvious to the people who use them every day.</p>
              <div className="about-ctas">
                <Link className="proto-cta" href="/work"><span className="proto-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>See the work</Link>
                <Link className="btn-ghost" href="/contact">Say hello</Link>
              </div>
            </div>
          </section>

          <section className="case-section" aria-labelledby="s-exp">
            <div className="sec-head"><p>Where I&rsquo;ve worked</p><h2 id="s-exp">Experience</h2></div>
            <ol className="exp-list">
              {EXPERIENCE.map((e) => (
                <li key={e.org}>
                  <span className="exp-when">{e.when}</span>
                  <div><h3>{e.org}</h3><p className="exp-role">{e.role}</p></div>
                  <p>{e.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="case-section" aria-labelledby="s-how">
            <div className="sec-head"><p>Principles</p><h2 id="s-how">How I work</h2></div>
            <ul className="why-goals principles">
              {PRINCIPLES.map((p) => <li key={p.t}><p>{p.t}</p><span className="why-measure">{p.b}</span></li>)}
            </ul>
          </section>

          <section className="case-section about-grid" aria-label="Education and tools">
            <div className="tile tile--soft">
              <h2>Education</h2>
              <p><b>Bachelor of Arts (Geography)</b><br />University of Malaya, 2017 to 2022</p>
              <p><b>Certificates</b><br />Google UX Design Professional Certificate, 2023<br />Meta HTML and CSS, 2025</p>
            </div>
            <div className="tile tile--soft">
              <h2>Tools</h2>
              <ul className="pill-row">{TOOLS.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </section>
        </div>
      </main>
      <ScrollTop />
    </div>
  );
}
