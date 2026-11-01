import Link from 'next/link';
import TopNav from '@/components/TopNav';
import ScrollTop from '@/components/ScrollTop';
import { asset } from '@/lib/asset';
import { getProject } from '@/lib/projects';
import resume from '@/data/resume.json';
import contact from '@/data/contact.json';
import EmailMe from '@/components/EmailMe';

/* eslint-disable @next/next/no-img-element */

const BRING = [
  {
    t: 'Research that changes the design',
    b: 'I start with how the work really happens: interviews, benchmarks and journey maps, then design for the moments where time and confidence are lost.',
    proof: 'MedUP: benchmarked three health apps and cut booking to five steps.',
  },
  {
    t: 'AI that people can trust',
    b: 'I design AI-assisted flows that show where a value came from and how sure the system is, so users stay in control.',
    proof: 'Vistra: Smart Fill with confidence scores and provenance badges.',
  },
  {
    t: 'Systems, not one-off screens',
    b: 'Components, tokens and guidelines keep large products consistent as more teams build on them.',
    proof: 'Vistra: GeniOS design library for AI workflows.',
  },
  {
    t: 'Calm collaboration across borders',
    b: 'I work daily with product, engineering and business teams across Asia Pacific and Europe, and bring engineering constraints into the design early.',
    proof: 'Teams in Singapore, Hong Kong, India, Australia, the UK and more.',
  },
];

const STEPS = [
  { t: 'Discover', b: 'Talk to users, map the journey, find the real problem behind the request.' },
  { t: 'Define', b: 'Agree on the outcome, the constraints and what we will measure.' },
  { t: 'Design', b: 'Flows first, then high-fidelity screens and a clickable prototype to test.' },
  { t: 'Deliver', b: 'Specs, components and close work with engineers until it ships.' },
];

const RELATED: Record<string, string[]> = { Vistra: ['service-tracker', 'appoint-director', 'geni'], 'CMG Group Berhad': ['phis'], 'Hummingsoft Sdn Bhd': ['mrts-dashboard', 'jps-gis'] };

export default function AboutView() {
  const collage = ['medup', 'phis', 'geni'].map((s) => getProject(s)).filter(Boolean);
  const resumeHref = contact.resume ? asset(`/${contact.resume}`) : null;
  return (
    <div className="case page about" style={{ ['--brand' as string]: '#2b1d17' }}>
      <TopNav tone="light" current="about" />
      <main id="main" tabIndex={-1}>
        {/* hero: who, in one breath, beside the work itself */}
        <section className="wrap case-hero-panel page-hero about-hero" aria-labelledby="about-title">
          <div className="chp-copy">
            <h1 id="about-title">About</h1>
            <p className="chp-summary">I&rsquo;m Ameil, a product designer who turns complex, high-stakes workflows into products that feel calm and obvious.</p>
          </div>
          <figure className="about-collage" aria-label="A few of the products I have designed">
            {collage.map((p, i) => (
              <img key={p!.slug} src={p!.cover} alt={`${p!.name} cover`} className={`c-${i}`} />
            ))}
            <figcaption>Discover the problem. Design the solution.</figcaption>
          </figure>
        </section>

        <div className="wrap">
          {/* the recruiter's first glance */}
          <section className="glance" aria-label="At a glance">
            <dl>
              <div><dt>Experience</dt><dd>4+ years in product and UX design</dd></div>
              <div><dt>Industries</dt><dd>Enterprise SaaS, AI, healthcare, government</dd></div>
              <div><dt>Based in</dt><dd>{resume.location} (UTC+8)</dd></div>
              <div><dt>Looking for</dt><dd>{resume.lookingFor.roles.join(' or ')}. {resume.lookingFor.setup}.</dd></div>
            </dl>
            <div className="glance-actions">
              {resumeHref ? <a className="proto-cta" href={resumeHref} download>Download résumé</a> : null}
              <EmailMe className={resumeHref ? 'btn-ghost' : 'proto-cta'} />
            </div>
          </section>

          {/* story: the design journey */}
          <section className="intro-split" aria-labelledby="s-story">
            <h2 id="s-story" className="statement">I design for people doing serious work, <span>where a confusing screen costs someone their time, a filing deadline or a patient&rsquo;s wait.</span></h2>
            <div className="about-side">
              <p>My path into product design started with data-heavy internal tools, where I learned that the hardest part is rarely the interface; it is understanding the workflow behind it.</p>
              <p>Since then I have led the redesign of a national pharmacy system and now design AI-assisted workflows for a global entity-management platform. Across all of it, my approach is the same: discover the real problem first, then design the simplest solution that holds up in production.</p>
            </div>
          </section>

          {/* experience with real detail */}
          <section className="case-section" aria-labelledby="s-exp">
            <div className="sec-head"><p>Where I&rsquo;ve worked</p><h2 id="s-exp">Experience</h2></div>
            <ol className="exp-cards">
              {resume.experience.map((e) => {
                const rel = (RELATED[e.org] ?? []).map((s) => getProject(s)).filter(Boolean);
                return (
                  <li key={e.org}>
                    <div className="exp-meta">
                      <span className="exp-when">{e.when}</span>
                      <h3>{e.org}</h3>
                      <p className="exp-role">{e.role}</p>
                    </div>
                    <div className="exp-body">
                      <p className="exp-about">{e.about}</p>
                      <ul>{e.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                      {rel.length ? (
                        <p className="exp-rel">Related work: {rel.map((p, i) => <span key={p!.slug}>{i ? ', ' : ''}<Link href={`/work/${p!.slug}`}>{p!.name}</Link></span>)}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* what a hiring team gets, with evidence */}
          <section className="case-section" aria-labelledby="s-bring">
            <div className="sec-head"><p>For hiring teams</p><h2 id="s-bring">What I bring</h2></div>
            <ul className="bring-grid">
              {BRING.map((x, i) => (
                <li key={x.t} className={i === 0 ? 'is-lead' : undefined}>
                  <h3>{x.t}</h3>
                  <p>{x.b}</p>
                  <span className="bring-proof"><b>Proof</b>{x.proof}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="case-section" aria-labelledby="s-process">
            <div className="sec-head"><p>Process</p><h2 id="s-process">How I work</h2></div>
            <ol className="process">
              {STEPS.map((s, i) => (
                <li key={s.t}><span className="process-n">{String(i + 1).padStart(2, '0')}</span><h3>{s.t}</h3><p>{s.b}</p></li>
              ))}
            </ol>
          </section>

          <section className="case-section" aria-labelledby="s-skills">
            <div className="sec-head"><p>Toolkit</p><h2 id="s-skills">Skills and tools</h2></div>
            <div className="skills-grid">
              {Object.entries(resume.skills).map(([k, v]) => (
                <div key={k} className="skills-card"><h3>{k}</h3><ul className="pill-row">{v.map((t) => <li key={t}>{t}</li>)}</ul></div>
              ))}
            </div>
          </section>

          <section className="case-section" aria-labelledby="s-edu">
            <div className="sec-head"><p>Learning</p><h2 id="s-edu">Education and certificates</h2></div>
            <ul className="edu-grid">
              {resume.education.map((e) => (
                <li key={e.title} className="edu-card is-degree">
                  <span className="edu-kind">Degree</span>
                  <h3>{e.title}</h3>
                  <p className="edu-org">{e.org}, {e.when}</p>
                  <p>{e.note}</p>
                </li>
              ))}
              {resume.certificates.map((c) => (
                <li key={c.title} className="edu-card">
                  <span className="edu-kind">Certificate</span>
                  <h3>{c.title}</h3>
                  <p className="edu-org">{c.org}, {c.when}</p>
                  <p>{c.note}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="case-section hire-band" aria-labelledby="s-hire">
            <h2 id="s-hire">Hiring for a product designer?</h2>
            <p>I&rsquo;d love to hear about the problem your team is solving.</p>
            <div className="glance-actions">
              <EmailMe className="proto-cta" />
              {resumeHref ? <a className="btn-ghost" href={resumeHref} download>Download résumé</a> : <Link className="btn-ghost" href="/work">See the work</Link>}
            </div>
          </section>
        </div>
      </main>
      <ScrollTop />
    </div>
  );
}
