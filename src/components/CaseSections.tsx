import type { CaseStudy } from '@/lib/projects';

/* eslint-disable @next/next/no-img-element */

/** As-is journey map with a feeling curve (now vs with the product). */
export function JourneyMap({ jm }: { jm: NonNullable<CaseStudy['journeyMap']> }) {
  const n = jm.stages.length;
  const y = (v: number) => 100 - ((v - 1) / 4) * 100; // 1..5 -> 100..0 (%)
  const pts = (k: 'before' | 'after') => jm.stages.map((s, i) => `${((i + 0.5) / n) * 100},${y(s[k])}`).join(' ');
  return (
    <section className="case-section jmap reveal" aria-labelledby="s-jmap">
      <div className="sec-head">
        <p>Journey map</p>
        <h2 id="s-jmap">{jm.title}</h2>
      </div>
      {jm.intro ? <p className="jmap-intro">{jm.intro}</p> : null}
      <div className="jmap-legend" aria-hidden="true"><span className="is-now">How it feels now</span><span className="is-after">With MedUP</span></div>
      <div className="jmap-scroll" tabIndex={0} aria-label="Journey map, scrolls sideways">
        <div className="jmap-grid" style={{ ['--n' as string]: n }}>
          <span className="jmap-label">Stage</span>
          {jm.stages.map((s, i) => (
            <div className="jmap-stage" key={s.stage}><b>{String(i + 1).padStart(2, '0')}</b>{s.stage}</div>
          ))}

          <span className="jmap-label">Doing</span>
          {jm.stages.map((s) => <p className="jmap-cell" key={s.stage}>{s.doing}</p>)}

          <span className="jmap-label">Thinking</span>
          {jm.stages.map((s) => <p className="jmap-cell jmap-think" key={s.stage}>{s.thinking}</p>)}

          <span className="jmap-label">Feeling</span>
          <div className="jmap-curve" role="img" aria-label={`Feeling at each stage, 1 to 5. Now: ${jm.stages.map((s) => s.before).join(', ')}. With the app: ${jm.stages.map((s) => s.after).join(', ')}.`}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" x2="100" y1="50" y2="50" className="mid" />
              <polyline points={pts('before')} className="now" />
              <polyline points={pts('after')} className="after" />
            </svg>
            {jm.stages.map((s, i) => (
              <span key={s.stage}>
                <i className="dot now" style={{ left: `${((i + 0.5) / n) * 100}%`, top: `${y(s.before)}%` }} />
                <i className="dot after" style={{ left: `${((i + 0.5) / n) * 100}%`, top: `${y(s.after)}%` }} />
              </span>
            ))}
            <span className="face face-top" aria-hidden="true">At ease</span>
            <span className="face face-bottom" aria-hidden="true">Frustrated</span>
          </div>

          <span className="jmap-label">Pain point</span>
          {jm.stages.map((s) => <p className="jmap-cell jmap-pain" key={s.stage}>{s.pain}</p>)}

          <span className="jmap-label">Opportunity</span>
          {jm.stages.map((s) => <p className="jmap-cell jmap-opp" key={s.stage}>{s.opportunity}</p>)}
        </div>
      </div>
      {jm.note ? <p className="jmap-note">{jm.note}</p> : null}
    </section>
  );
}

/** Key screens with what they are and why they were designed that way. */
export function Walkthrough({ items }: { items: NonNullable<CaseStudy['walkthrough']> }) {
  return (
    <section className="case-section walk reveal" aria-labelledby="s-walk">
      <div className="sec-head">
        <p>High-fidelity design</p>
        <h2 id="s-walk">Key screens, and why</h2>
      </div>
      <ol className="walk-list">
        {items.map((w, i) => (
          <li key={w.title} className={`walk-item ${w.wide ? 'is-wide' : ''} ${i % 2 ? 'is-flip' : ''}`}>
            <figure className={`walk-art n-${w.images.length} ${w.detail ? 'has-detail' : ''}`}>
              {w.images.map((im) => <img key={im.src} src={im.src} alt={im.alt} loading="lazy" />)}
            </figure>
            <div className="walk-copy">
              <span className="walk-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{w.title}</h3>
              <p className="walk-sub">{w.subtitle}</p>
              <p>{w.body}</p>
              <div className="walk-why"><span>Why</span><p>{w.why}</p></div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Components({ c }: { c: NonNullable<CaseStudy['components']> }) {
  return (
    <div className="ui-kit">
      <div className="ui-kit-head">
        <h3>Components</h3>
        {c.intro ? <p>{c.intro}</p> : null}
      </div>
      <ul className="ui-kit-grid">
        {c.items.map((it, i) => (
          <li key={it.src} className={`k-${i}`}>
            <span className="ui-kit-art"><img src={it.src} alt={it.alt} loading="lazy" /></span>
            <span className="ui-kit-label">{it.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WhyItMatters({ w, outcome }: { w: NonNullable<CaseStudy['why']>; outcome?: string[] }) {
  return (
    <section className="case-section why reveal" aria-labelledby="s-why">
      <div className="why-top">
        <div>
          <span className="tile-tag">Outcome</span>
          <h2 id="s-why" className="why-lead">{w.title}: <span>{w.lead}</span></h2>
        </div>
        <div className="why-text">
          {w.body ? <p>{w.body}</p> : null}
          {outcome?.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      </div>
      <ul className="why-goals">
        {w.goals.map((g) => (
          <li key={g.who}>
            <span className="why-who">{g.who}</span>
            <p>{g.goal}</p>
            <span className="why-measure"><b>We would measure</b>{g.measure}</span>
          </li>
        ))}
      </ul>
      {w.note ? <p className="jmap-note">{w.note}</p> : null}
    </section>
  );
}

export function Stack({ s }: { s: NonNullable<CaseStudy['stack']> }) {
  return (
    <section className="case-section stack reveal" aria-labelledby="s-stack">
      <div className="style-head">
        <div>
          <p className="kicker">Proposed technology</p>
          <h2 id="s-stack" className="big-head">{s.title}</h2>
        </div>
        {s.intro ? <p>{s.intro}</p> : null}
      </div>
      <ul className="stack-grid">
        {s.items.map((it) => (
          <li key={it.name}>
            <span className="stack-tag">{it.tag}</span>
            <strong>{it.name}</strong>
            <p>{it.use}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
