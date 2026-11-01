import Link from 'next/link';
import TopNav from '@/components/TopNav';
import ScrollTop from '@/components/ScrollTop';
import { BackToDesk, CaseHero, CaseReveal } from '@/components/CaseStudyClient';
import { neighbours, type Project } from '@/lib/projects';
import { Components, JourneyMap, Stack, Walkthrough, WhyItMatters } from '@/components/CaseSections';

/**
 * Case study page. All content comes from src/data/projects.json (see CONTENT.md).
 * Core sections show a short italic placeholder until they are written; the richer
 * sections (research, journey, feature, style) only appear when they have content.
 * Renders without WebGL so every project URL works on its own.
 */
function Paragraphs({ items, placeholder }: { items?: string[]; placeholder: string }) {
  if (!items?.length) return <p className="placeholder">{placeholder}</p>;
  return <>{items.map((t, i) => <p key={i}>{t}</p>)}</>;
}

/* eslint-disable @next/next/no-img-element */
export default function CaseStudyView({ p }: { p: Project }) {
  const { prev, next } = neighbours(p.slug);
  const cs = p.caseStudy ?? {};
  const hasYear = p.year && p.year !== '—';
  const steps = cs.approach?.length
    ? cs.approach
    : [{ title: 'Understand', body: '' }, { title: 'Shape', body: '' }, { title: 'Refine', body: '' }];
  const [firstShot, ...restShots] = cs.gallery ?? [];

  return (
    <div className="case" style={{ ['--brand' as string]: p.brand }}>
      <TopNav tone="light" current="work" />
      <main id="main" tabIndex={-1}>
        <div className="wrap case-top">
          <BackToDesk slug={p.slug} />
        </div>

        {/* ── hero: the project's colour, its name set huge, artwork breaking out of the panel */}
        <section className={`wrap case-hero-panel ${cs.heroImage ? 'has-art' : ''}`} aria-labelledby="case-title">
          <span className="chp-guides" aria-hidden="true"><i /><i /><i /><i /></span>
          <ul className="chp-tags" aria-label="Project type">
            <li>{p.category}</li>
            <li>{p.role}</li>
          </ul>
          <div className="chp-copy">
            <h1 id="case-title" className={p.name.length > 14 ? 'is-long' : undefined}>{p.name}</h1>
            <p className="chp-summary">{p.summary}</p>
          </div>
          {cs.heroImage ? (
            <>
              <figure className="chp-art"><img src={cs.heroImage.src} alt={cs.heroImage.alt} /></figure>
              {/* the cover still receives the shared device-to-page transition */}
              <div className="chp-transition-target"><CaseHero slug={p.slug} src={p.cover} alt="" /></div>
            </>
          ) : (
            <CaseHero slug={p.slug} src={p.cover} alt={`${p.name} cover`} />
          )}
          {hasYear ? <span className="chp-year">{p.year}</span> : null}
        </section>

        <CaseReveal slug={p.slug}>
          <div className="wrap">
            {/* ── intro: statement + project facts, beside a device on a tinted tile */}
            <section className={`intro-split reveal ${cs.statement?.image ? 'has-image' : ''} ${cs.statement ? '' : 'is-plain'}`} aria-labelledby="s-intro">
              {cs.statement?.image ? (
                <figure className="intro-device"><img src={cs.statement.image.src} alt={cs.statement.image.alt} loading="lazy" /></figure>
              ) : null}
              <div className="intro-text">
                {cs.statement ? (
                  <h2 id="s-intro" className="statement">
                    {cs.statement.lead} {cs.statement.rest ? <span>{cs.statement.rest}</span> : null}
                  </h2>
                ) : <h2 id="s-intro" className="facts-title">Project details</h2>}
                <dl className="facts">
                  {hasYear ? <div><dt>Year</dt><dd>{p.year}</dd></div> : null}
                  <div><dt>Industry</dt><dd>{p.category}</dd></div>
                  <div><dt>Role</dt><dd>{p.role}</dd></div>
                  <div><dt>Context</dt><dd>{p.client}</dd></div>
                  {cs.tools?.length ? <div><dt>Tools</dt><dd>{cs.tools.join(' / ')}</dd></div> : null}
                </dl>
                {p.nda && <p className="nda">Client details are generalised to respect confidentiality.</p>}
                {cs.prototype ? (
                  <a className="proto-cta" href={cs.prototype.href} target="_blank" rel="noopener noreferrer">
                    <span className="proto-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
                    {cs.prototype.label}<span className="sr-only"> (opens Figma in a new tab)</span>
                  </a>
                ) : null}
              </div>
            </section>

            {cs.impact?.length ? (
              <ul className="case-impact reveal" aria-label="Impact">
                {cs.impact.map((m) => <li key={m.label}><strong>{m.value}</strong><span>{m.label}</span></li>)}
              </ul>
            ) : null}

            {/* ── research: headline finding, then problem and solution side by side */}
            {cs.research ? (
              <section className="case-section research reveal" aria-labelledby="s-research">
                <div className="research-labels"><span>{cs.research.label ?? 'Research'}</span>{cs.research.aside ? <span>{cs.research.aside}</span> : null}</div>
                <h2 id="s-research" className="research-head">{cs.research.headline}</h2>
                <ul className="outline-pills" aria-hidden="true"><li>/ Problem</li><li>/ Solution</li></ul>
                <div className="ps-pair">
                  <div className="ps ps--problem">
                    <span className="tile-tag tile-tag--red">Problems people faced</span>
                    <p>{cs.research.problem}</p>
                    {cs.challenge?.length ? <details className="ps-more"><summary>Read the full challenge</summary><Paragraphs items={cs.challenge} placeholder="" /></details> : null}
                  </div>
                  <span className="ps-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 9h11a5 5 0 0 1 0 10H9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M7 5 3 9l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <div className="ps ps--solution">
                    <span className="tile-tag">What I designed</span>
                    <p>{cs.research.solution}</p>
                    {cs.research.image ? <img className="ps-phone" src={cs.research.image.src} alt={cs.research.image.alt} loading="lazy" /> : null}
                  </div>
                </div>
              </section>
            ) : (
              <div className="case-section tile-pair reveal">
                <section className="tile tile--problem" aria-labelledby="s-challenge">
                  <span className="tile-tag tile-tag--red">The problem</span>
                  <h2 id="s-challenge">The challenge</h2>
                  <div><Paragraphs items={cs.challenge} placeholder="Describe the problem, who it affected and why it mattered." /></div>
                </section>
                <section className="tile tile--outcome" aria-labelledby="s-outcome-a">
                  <span className="tile-tag">What I designed</span>
                  <h2 id="s-outcome-a">Outcome</h2>
                  <div><Paragraphs items={cs.outcome} placeholder="Summarise what shipped and what changed for users." /></div>
                </section>
              </div>
            )}

            {cs.journeyMap ? <JourneyMap jm={cs.journeyMap} /> : null}

            {/* ── approach: a real sequence, laid out as a timeline */}
            <section className="case-section reveal" aria-labelledby="s-approach">
              <div className="sec-head">
                <p>How the work came together</p>
                <h2 id="s-approach">Approach</h2>
              </div>
              <ol className="timeline">
                {steps.map((s, i) => (
                  <li key={s.title}>
                    <span className="tl-when">{s.duration ?? `Step ${i + 1}`}</span>
                    <span className={`tl-card ${s.image ? 'has-image' : ''}`} aria-hidden={!s.image}>
                      {s.image ? <img src={s.image.src} alt={s.image.alt} loading="lazy" /> : <b>{String(i + 1).padStart(2, '0')}</b>}
                    </span>
                    <h3>{s.title}</h3>
                    {s.tags?.length ? (
                      <ul className="tl-tags">{s.tags.map((t, k) => <li key={t} className={k === s.tags!.length - 1 ? 'is-key' : undefined}>{t}</li>)}</ul>
                    ) : null}
                    <p className={s.body ? undefined : 'placeholder'}>{s.body || 'Add what happened in this stage.'}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* ── journey map */}
            {cs.journey ? (
              <section className="case-section journey reveal" aria-labelledby="s-journey">
                <div className="journey-top">
                  <div>
                    <h2 id="s-journey" className="big-head">{cs.journey.title}</h2>
                    {cs.journey.body.map((t, i) => <p key={i}>{t}</p>)}
                  </div>
                  {cs.journey.goals?.length ? <ul className="goals" aria-label="Design goals">{cs.journey.goals.map((g) => <li key={g}>{g}</li>)}</ul> : null}
                </div>
                {cs.journey.map?.length ? (
                  <div className="flow" role="img" aria-label={`User flow: ${cs.journey.map.map((g) => `${g.group}: ${g.items.join(', ')}`).join('; ')}`}>
                    <span className="flow-root">{cs.journey.logo ? <img src={cs.journey.logo.src} alt="" /> : p.name.slice(0, 1)}</span>
                    <div className="flow-groups">
                      {cs.journey.map.map((g) => (
                        <div className="flow-col" key={g.group}>
                          <span className="flow-group">{g.group}</span>
                          {g.items.map((it) => <span className="flow-item" key={it}>{it}</span>)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {cs.walkthrough?.length ? <Walkthrough items={cs.walkthrough} /> : null}

            {/* ── feature spotlight */}
            {cs.feature ? (
              <section className="case-section feature reveal" aria-labelledby="s-feature">
                <div className="feature-copy">
                  <h2 id="s-feature" className="big-head">{cs.feature.title}</h2>
                  {cs.feature.body.map((t, i) => <p key={i}>{t}</p>)}
                </div>
                <figure className="feature-art"><img src={cs.feature.image.src} alt={cs.feature.image.alt} loading="lazy" /></figure>
              </section>
            ) : null}

            {/* ── visual style */}
            {cs.style ? (
              <section className="case-section style-guide reveal" aria-labelledby="s-style">
                <div className="style-head">
                  <div>
                    <p className="kicker">Style guide</p>
                    <h2 id="s-style" className="big-head">Visual style</h2>
                  </div>
                  {cs.style.intro ? <p>{cs.style.intro}</p> : null}
                </div>
                <div className="style-grid">
                  <div className="sg-logos">
                    <div className="sg-logo">{cs.style.logo ? <img src={cs.style.logo.src} alt={cs.style.logo.alt} /> : <b>{p.name}</b>}</div>
                    {cs.style.logoColor ? <div className="sg-logo is-light"><img src={cs.style.logoColor.src} alt={cs.style.logoColor.alt} /></div> : null}
                  </div>
                  <div className="sg-type">
                    <span className="sg-label">Type</span>
                    <span className="sg-font">{cs.style.font ?? 'Sans serif, three weights'}</span>
                    <span className="sg-weights"><i>Regular</i><i>Medium</i><i>Bold</i></span>
                    <span className="sg-aa" aria-hidden="true">Aa</span>
                  </div>
                  <ul className="sg-colors" aria-label="Colour palette">
                    {cs.style.colors.map((c) => (
                      <li key={c.hex} style={{ ['--c' as string]: c.hex }}><span>{c.name}</span><code>{c.hex}</code></li>
                    ))}
                  </ul>
                </div>
                {cs.components ? <Components c={cs.components} /> : null}
              </section>
            ) : null}

            {/* ── gallery: one wide board, then a bento of the rest */}
            {firstShot ? (
              <section className="case-section case-gallery reveal" aria-label="Project images">
                <figure className="is-wide">
                  <img src={firstShot.src} alt={firstShot.alt} loading="lazy" />
                  {firstShot.caption && <figcaption>{firstShot.caption}</figcaption>}
                </figure>
                {restShots.map((g) => (
                  <figure key={g.src}>
                    <img src={g.src} alt={g.alt} loading="lazy" />
                    {g.caption && <figcaption>{g.caption}</figcaption>}
                  </figure>
                ))}
              </section>
            ) : null}

            {cs.why ? <WhyItMatters w={cs.why} outcome={cs.outcome} /> : null}
            {cs.stack ? <Stack s={cs.stack} /> : null}

            {cs.research && !cs.why ? (
              <section className="case-section outcome reveal" aria-labelledby="s-outcome">
                <span className="tile-tag">Outcome</span>
                <h2 id="s-outcome" className="sr-only">Outcome</h2>
                <div className="outcome-text"><Paragraphs items={cs.outcome} placeholder="Summarise what shipped and what changed for users." /></div>
              </section>
            ) : null}

            {cs.tools?.length || cs.links?.length ? (
              <section className="case-section reveal" aria-labelledby="s-tools">
                <div className="sec-head"><h2 id="s-tools">Tools and links</h2></div>
                {cs.tools?.length ? <ul className="pill-row">{cs.tools.map((t) => <li key={t}>{t}</li>)}</ul> : null}
                {cs.links?.length ? (
                  <p className="case-links">
                    {cs.links.map((l) => (
                      <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}<span aria-hidden="true">↗</span></a>
                    ))}
                  </p>
                ) : null}
              </section>
            ) : null}

            <nav className="case-next reveal" aria-label="More projects">
              <Link href={`/work/${prev.slug}`} className="case-next-link">
                <span>Previous project</span>{prev.name}
              </Link>
              <Link href={`/work/${next.slug}`} className="case-next-link case-next-link--right">
                <span>Next project</span>{next.name}
              </Link>
            </nav>
          </div>
        </CaseReveal>
      </main>
      <ScrollTop />
    </div>
  );
}
