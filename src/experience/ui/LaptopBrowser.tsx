'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { projects, categories, type Project } from '@/lib/projects';
import { useDesk, type BrowserState } from '@/lib/store';
import { engine, sfx, useAudio, type Mood } from '@/lib/audio';
import { startProjectTransition } from '@/lib/transition';
import { overlayEls, overlaySize } from '../overlaySync';

type GroupId = 'music' | 'hobby' | 'ideas' | 'work';
type Kind = 'music' | 'playlist' | 'listening' | 'golf' | 'interests' | 'link' | 'portfolio' | 'cases' | 'experiments';
type Tab = { id: string; group: GroupId; title: string; url: string; kind: Kind; href?: string; blurb?: string };

const GROUPS: { id: GroupId; label: string; color: string }[] = [
  { id: 'music', label: 'Music', color: '#f25c78' },
  { id: 'hobby', label: 'Hobby', color: '#1f9d63' },
  { id: 'ideas', label: 'Ideas', color: '#f5b700' },
  { id: 'work', label: 'Work', color: '#2563eb' },
];

const TABS: Tab[] = [
  { id: 'fav-music', group: 'music', title: 'Favourite music', url: 'ameil.design/music', kind: 'music' },
  { id: 'calm', group: 'music', title: 'Calm work playlist', url: 'ameil.design/music/calm-work', kind: 'playlist' },
  { id: 'listening', group: 'music', title: 'Listening inspiration', url: 'ameil.design/music/inspiration', kind: 'listening' },
  { id: 'golf', group: 'hobby', title: 'Golf', url: 'ameil.design/hobbies/golf', kind: 'golf' },
  { id: 'youtube', group: 'hobby', title: 'YouTube', url: 'youtube.com', kind: 'link', href: 'https://www.youtube.com', blurb: 'Tutorials, design talks and the occasional golf swing breakdown.' },
  { id: 'interests', group: 'hobby', title: 'Personal interests', url: 'ameil.design/interests', kind: 'interests' },
  { id: 'behance', group: 'ideas', title: 'Behance', url: 'behance.net/ameilsheridan', kind: 'link', href: 'https://www.behance.net/ameilsheridan', blurb: 'Published project boards and visual explorations.' },
  { id: 'figma', group: 'ideas', title: 'Figma Community', url: 'figma.com/@sheridan1', kind: 'link', href: 'https://www.figma.com/@sheridan1', blurb: 'Files, kits and experiments shared with the community.' },
  { id: 'mobbin', group: 'ideas', title: 'Mobbin', url: 'mobbin.com', kind: 'link', href: 'https://mobbin.com', blurb: 'Reference library of real-world app flows.' },
  { id: 'medium', group: 'ideas', title: 'Medium', url: 'medium.com', kind: 'link', href: 'https://medium.com', blurb: 'Reading list: product design, research and systems thinking.' },
  { id: 'portfolio', group: 'work', title: 'Product Design Portfolio', url: 'ameil.design/work/portfolio', kind: 'portfolio' },
  { id: 'cases', group: 'work', title: 'Selected Case Studies', url: 'ameil.design/work/case-studies', kind: 'cases' },
  { id: 'experiments', group: 'work', title: 'Experiments', url: 'ameil.design/work/experiments', kind: 'experiments' },
];
const byId = (id: string | null) => TABS.find((t) => t.id === id) ?? null;
const groupOf = (id: GroupId) => GROUPS.find((g) => g.id === id)!;

function openTabs(b: BrowserState) {
  return TABS.filter((t) => !b.closed.includes(t.id));
}

export default function LaptopBrowser({ sizeKey }: { sizeKey: string }) {
  const router = useRouter();
  const mode = useDesk((s) => s.mode);
  const visible = useDesk((s) => s.overlayVisible) && (mode === 'laptop' || mode === 'toLaptop');
  const b = useDesk((s) => s.browser);
  const setB = useDesk((s) => s.setBrowser);
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const { w, h } = overlaySize.laptop;
  const full = overlaySize.fullscreen;

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => root.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [visible]);

  const navigate = (id: string, push = true) => {
    sfx('tab', 0);
    setB((s) => {
      const tab = byId(id);
      const closed = s.closed.filter((c) => c !== id);
      const collapsed = tab ? s.collapsed.filter((g) => g !== tab.group) : s.collapsed;
      if (!push) return { ...s, activeTab: id, closed, collapsed };
      const history = [...s.history.slice(0, s.cursor + 1), id];
      return { ...s, activeTab: id, closed, collapsed, history, cursor: history.length - 1 };
    });
  };

  const close = (id: string) => {
    sfx('tab', 0);
    setB((s) => {
      const list = openTabs(s).filter((t) => !s.collapsed.includes(t.group) || t.id === s.activeTab);
      const i = list.findIndex((t) => t.id === id);
      let active = s.activeTab;
      if (active === id) {
        const neighbour = list[i + 1] ?? list[i - 1];
        active = neighbour && neighbour.id !== id ? neighbour.id : 'newtab';
      }
      return { ...s, closed: [...s.closed, id], activeTab: active };
    });
  };

  const toggleGroup = (g: GroupId) => {
    sfx('tab', 0);
    setB((s) => {
      const collapsing = !s.collapsed.includes(g);
      let active = s.activeTab;
      if (collapsing && byId(active)?.group === g) {
        const other = openTabs(s).find((t) => t.group !== g && !s.collapsed.includes(t.group));
        active = other?.id ?? active;
      }
      return { ...s, activeTab: active, collapsed: collapsing ? [...s.collapsed, g] : s.collapsed.filter((x) => x !== g) };
    });
  };

  const historyMove = (d: -1 | 1) => {
    const cursor = b.cursor + d;
    if (cursor < 0 || cursor >= b.history.length) return;
    sfx('tab', 0);
    const id = b.history[cursor];
    setB((s) => ({ ...s, cursor, activeTab: id, closed: s.closed.filter((c) => c !== id) }));
  };

  const reload = () => {
    sfx('tab', 0);
    setLoading(true);
    setTimeout(() => setLoading(false), 550);
  };

  const openProject = (p: Project, img: HTMLImageElement) => {
    sfx('click', 0);
    startProjectTransition(p.slug, img, { device: 'laptop', browser: useDesk.getState().browser }, (href) => router.push(href));
  };

  const active = b.activeTab === 'newtab' ? null : byId(b.activeTab);
  const tabsOpen = openTabs(b);

  const setRoot = (el: HTMLDivElement | null) => {
    root.current = el;
    overlayEls.laptop = el;
  };

  return (
    <div
      ref={setRoot}
      key={sizeKey}
      className={`screen-overlay browser ${visible ? 'is-visible' : ''} ${full ? 'is-full' : ''}`}
      style={(full ? { ['--u' as string]: 1 } : { width: w, height: h, ['--u' as string]: w / 1200 }) as React.CSSProperties}
      role="region"
      aria-label="Laptop browser"
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="br-tabs" role="tablist" aria-label="Browser tabs">
        <span className="br-lights" aria-hidden="true"><i /><i /><i /></span>
        {GROUPS.map((g) => {
          const tabs = tabsOpen.filter((t) => t.group === g.id);
          if (!tabs.length) return null;
          const collapsed = b.collapsed.includes(g.id);
          return (
            <div key={g.id} className={`br-group ${collapsed ? 'is-collapsed' : ''}`} style={{ ['--g' as string]: g.color }}>
              <button type="button" className="br-group-label" aria-expanded={!collapsed}
                aria-label={`${g.label} tab group, ${tabs.length} tabs, ${collapsed ? 'collapsed' : 'expanded'}`}
                onClick={() => toggleGroup(g.id)}>
                {g.label}
                {collapsed && <span className="br-count">{tabs.length}</span>}
              </button>
              {!collapsed && tabs.map((t) => (
                <div key={t.id} className={`br-tab ${t.id === b.activeTab ? 'is-active' : ''}`}>
                  <button type="button" role="tab" aria-selected={t.id === b.activeTab} className="br-tab-btn"
                    onClick={() => navigate(t.id)} title={t.title}>
                    <span className="br-fav" aria-hidden="true" />
                    <span className="br-tab-title">{t.title}</span>
                  </button>
                  <button type="button" className="br-close" aria-label={`Close ${t.title}`} onClick={() => close(t.id)}>
                    <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" /></svg>
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        <button type="button" className="br-new" aria-label="New tab" onClick={() => navigate('newtab')}>+</button>
      </div>
      <div className="br-toolbar">
        <button type="button" aria-label="Back" disabled={b.cursor <= 0} onClick={() => historyMove(-1)}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
        </button>
        <button type="button" aria-label="Forward" disabled={b.cursor >= b.history.length - 1} onClick={() => historyMove(1)}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
        </button>
        <button type="button" aria-label="Refresh" onClick={reload} className={loading ? 'is-spinning' : ''}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5V5h-2.5" /></svg>
        </button>
        <div className="br-address" role="textbox" aria-readonly="true" aria-label="Address">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v6H4z" /></svg>
          <span>{active ? active.url : 'New tab'}</span>
        </div>
      </div>
      <nav className="br-bookmarks" aria-label="Bookmarks">
        {['portfolio', 'cases', 'experiments', 'behance', 'figma', 'calm'].map((id) => {
          const t = byId(id)!;
          return (
            <button key={id} type="button" onClick={() => navigate(id)}>
              <i style={{ background: groupOf(t.group).color }} aria-hidden="true" />{t.title}
            </button>
          );
        })}
      </nav>
      <div className={`br-page ${loading ? 'is-loading' : ''}`} role="tabpanel" aria-label={active?.title ?? 'New tab'}>
        {!loading && <Page tab={active} b={b} setB={setB} onOpen={openProject} navigate={navigate} />}
      </div>
    </div>
  );
}

function Page({ tab, b, setB, onOpen, navigate }: {
  tab: Tab | null; b: BrowserState; setB: (fn: (b: BrowserState) => BrowserState) => void;
  onOpen: (p: Project, img: HTMLImageElement) => void; navigate: (id: string) => void;
}) {
  if (!tab) {
    return (
      <div className="pg pg-new">
        <h1>New tab</h1>
        {b.closed.length > 0 && (
          <>
            <h2>Recently closed</h2>
            <ul className="pg-links">
              {[...b.closed].reverse().map((id) => (
                <li key={id}><button type="button" onClick={() => navigate(id)}>Reopen {byId(id)?.title}</button></li>
              ))}
            </ul>
          </>
        )}
        <h2>All pages</h2>
        <ul className="pg-links">
          {TABS.map((t) => <li key={t.id}><button type="button" onClick={() => navigate(t.id)}>{t.title}</button></li>)}
        </ul>
      </div>
    );
  }
  const card = (p: Project, big = false) => (
    <li key={p.slug} style={{ ['--brand' as string]: p.brand }}>
      <button type="button" className={`pg-card ${big ? 'is-big' : ''}`}
        onClick={(e) => onOpen(p, e.currentTarget.querySelector('img')!)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.cover} alt="" />
        <span className="pg-card-meta">
          <span className="chip">{p.category}</span>
          <strong>{p.name}</strong>
          {big && <span>{p.summary}</span>}
        </span>
      </button>
    </li>
  );
  switch (tab.kind) {
    case 'portfolio': {
      const list = b.filter === 'All' ? projects : projects.filter((p) => p.category === b.filter);
      return (
        <div className="pg">
          <h1>Selected work</h1>
          <div className="pg-filters" role="group" aria-label="Filter by category">
            {['All', ...categories].map((c) => (
              <button key={c} type="button" aria-pressed={b.filter === c} onClick={() => {
                sfx('tab', 0);
                setB((s) => ({ ...s, filter: c }));
              }}>{c}</button>
            ))}
          </div>
          <ul className="pg-grid">{list.map((p) => card(p))}</ul>
        </div>
      );
    }
    case 'cases':
      return (
        <div className="pg">
          <h1>Selected case studies</h1>
          <ul className="pg-list">{['phis', 'medup', 'mrts-dashboard'].map((s) => card(projects.find((p) => p.slug === s)!, true))}</ul>
        </div>
      );
    case 'experiments':
      return (
        <div className="pg">
          <h1>Experiments</h1>
          <p className="pg-lede">Side projects where I test ideas end to end, including this desk.</p>
          <ul className="pg-grid">{projects.filter((p) => p.category === 'Personal' || p.slug === 'kl-transit').map((p) => card(p))}</ul>
        </div>
      );
    case 'music':
    case 'playlist':
      return <MusicPage playlist={tab.kind === 'playlist'} />;
    case 'link':
      return (
        <div className="pg pg-link">
          <div className="pg-bookmark">
            <p className="pg-url">{tab.url}</p>
            <h1>{tab.title}</h1>
            <p>{tab.blurb}</p>
            <a href={tab.href} target="_blank" rel="noopener noreferrer" className="pg-btn" onClick={() => sfx('click', 0)}>
              Open {tab.url.split('/')[0]} in a new tab <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      );
    default:
      return (
        <div className="pg">
          <h1>{tab.title}</h1>
          <p className="pg-lede placeholder">Placeholder page. Add personal notes, photos or links for “{tab.title}”.</p>
        </div>
      );
  }
}

const MOODS: { id: Mood; title: string; note: string }[] = [
  { id: 'evening', title: 'Evening espresso', note: 'Warm electric piano, slow chords' },
  { id: 'rain', title: 'Rain on the window', note: 'Minor key, adds rain to the room' },
  { id: 'focus', title: 'Deep focus', note: 'Sparse and slow, for long sessions' },
];

function MusicPage({ playlist }: { playlist: boolean }) {
  const a = useAudio();
  const [mood, setMood] = useState<Mood>(engine?.mood ?? 'evening');
  const pick = (m: Mood) => {
    if (!a.enabled) a.enable();
    engine.setMood(m);
    a.set({ rain: m === 'rain' });
    setMood(m);
  };
  return (
    <div className="pg">
      <h1>{playlist ? 'Calm work playlist' : 'Café radio'}</h1>
      <p className="pg-lede">
        Generative music made for this desk. It plays through the site&rsquo;s own sound system and stays off until you choose it.
      </p>
      <button type="button" className="pg-btn" onClick={() => (a.enabled ? a.disable() : a.enable())}>
        {a.enabled ? 'Pause café radio' : 'Play café radio'}
      </button>
      <ul className="pg-tracks">
        {MOODS.map((m) => (
          <li key={m.id}>
            <button type="button" aria-pressed={a.enabled && mood === m.id} onClick={() => pick(m.id)}>
              <span className="eq" aria-hidden="true"><i /><i /><i /></span>
              <strong>{m.title}</strong><span>{m.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
