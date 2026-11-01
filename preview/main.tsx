import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './model';
import '@fontsource-variable/instrument-sans/wdth.css';
import '@/app/globals.css';
import HomeView from '@/components/HomeView';
import WorkIndexView from '@/components/WorkIndexView';
import CaseStudyView from '@/components/CaseStudyView';
import AboutView from '@/components/AboutView';
import ContactView from '@/components/ContactView';
import TransitionLayer from '@/components/TransitionLayer';
import { getProject } from '@/lib/projects';
import { useDesk } from '@/lib/store';

/** Static preview build: same components as the Next.js site, routed on the URL hash. */
function route(hash: string) {
  const h = hash.replace(/^#/, '');
  if (h === 'work') return { view: 'work' as const };
  if (h === 'about') return { view: 'about' as const };
  if (h === 'contact') return { view: 'contact' as const };
  if (h.startsWith('work-') && getProject(h.slice(5))) return { view: 'case' as const, slug: h.slice(5) };
  if (h === '' || h === 'home') return { view: 'home' as const };
  return null; // e.g. #main from the skip link: stay on the current view
}

function App() {
  const [r, setR] = useState(() => route(location.hash) ?? { view: 'home' as const });
  useEffect(() => {
    const on = () => {
      const next = route(location.hash);
      if (next) {
        setR(next);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const p = r.view === 'case' ? getProject(r.slug)! : null;
  const home = r.view === 'home';
  useEffect(() => {
    useDesk.getState().setPaused(!home);
  }, [home]);
  return (
    <>
      {/* the desk stays mounted while a case study is open, so Back returns instantly to the same state */}
      <div className={home ? undefined : 'spa-hidden'} aria-hidden={!home} inert={!home}><HomeView /></div>
      {r.view === 'work' && <WorkIndexView />}
      {r.view === 'about' && <AboutView />}
      {r.view === 'contact' && <ContactView />}
      {p && <CaseStudyView key={p.slug} p={p} />}
      <TransitionLayer />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
