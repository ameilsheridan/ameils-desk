'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { useDesk, type Prop } from '@/lib/store';
import ContactCard from '@/components/ContactCard';
import { prefersReducedMotion, settingsFor, type Tier } from '@/lib/quality';
import type { ReturnContext } from '@/lib/restore';
import Scene from './Scene';
import CameraRig from './CameraRig';
import Effects from './Effects';
import { OverlaySync, overlayEls, overlaySize, updateOverlaySizes } from './overlaySync';
import { rig } from './rig';
import { backToDesk, computeHoldPose, openLaptop, openNotebook, openPhone, restoreFrom, sipCoffee } from './director';
import { cameraPose } from './cameraPoses';
import PhoneUI from './ui/PhoneUI';
import LaptopBrowser from './ui/LaptopBrowser';
import HandsLayer from './hands/HandsLayer';

function Ready({ restore }: { restore: ReturnContext | null }) {
  const done = useRef(false);
  const frames = useRef(0);
  useFrame(() => {
    if (done.current || !rig.ready) return;
    if (++frames.current < 3) return; // let materials compile before revealing
    done.current = true;
    const s = useDesk.getState();
    s.setMode('desk');
    if (restore && (restore.device === 'phone' || restore.device === 'laptop')) restoreFrom(restore);
  });
  return null;
}

function ToneSetup({ post }: { post: boolean }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = post ? THREE.NoToneMapping : THREE.AgXToneMapping;
    gl.toneMappingExposure = 1;
  }, [gl, post]);
  return null;
}

/** Keeps DOM screen sizes in sync with the viewport. */
function useOverlaySizing() {
  const [key, setKey] = useState('0');
  useEffect(() => {
    const update = () => {
      const aspect = innerWidth / innerHeight;
      computeHoldPose(aspect);
      updateOverlaySizes(innerWidth, innerHeight, cameraPose(aspect).fov, rig.holdDistance);
      setKey(`${innerWidth}x${innerHeight}`);
    };
    update();
    const t = setTimeout(update, 400);
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', update);
    };
  }, []);
  return key;
}

function DeviceHotspots() {
  const mode = useDesk((s) => s.mode);
  const setHover = useDesk((s) => s.setHover);
  const active = mode === 'desk';
  const btn = (d: Prop, label: string, ref: 'hotLaptop' | 'hotPhone' | 'hotCup' | 'hotNote') => (
    <button
      ref={(el) => { overlayEls[ref] = el; }}
      type="button"
      className="hotspot"
      tabIndex={active ? 0 : -1}
      aria-hidden={!active}
      onFocus={() => active && setHover(d)}
      onBlur={() => useDesk.getState().hover === d && setHover(null)}
      onClick={() => (d === 'laptop' ? openLaptop() : d === 'phone' ? openPhone() : d === 'cup' ? sipCoffee() : openNotebook())}
    >
      <span className="hotspot-ring" aria-hidden="true" />
      <span className="hotspot-label">{label}</span>
    </button>
  );
  return (
    <div className="hotspots" aria-label="Interactive devices">
      {btn('laptop', 'Open the laptop — browse work', 'hotLaptop')}
      {btn('phone', 'Pick up the phone — browse projects', 'hotPhone')}
      {btn('notebook', 'Open the notebook — contact', 'hotNote')}
      {btn('cup', 'Take a sip of coffee', 'hotCup')}
    </div>
  );
}

function NoteCard() {
  const mode = useDesk((s) => s.mode);
  const open = mode === 'note';
  useEffect(() => {
    if (open) document.getElementById('note-contact-title')?.focus({ preventScroll: true });
  }, [open]);
  return (
    <section className={`note-card ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={!open} aria-labelledby="note-contact-title">
      <ContactCard onClose={() => void backToDesk().then(() => overlayEls.hotNote?.focus({ preventScroll: true }))} headingId="note-contact-title" />
    </section>
  );
}

function DeviceBar() {
  const mode = useDesk((s) => s.mode);
  const show = mode === 'phone' || mode === 'laptop' || mode === 'note';
  return (
    <div className={`device-bar ${show ? 'is-visible' : ''}`}>
      <button type="button" tabIndex={show ? 0 : -1} aria-hidden={!show} onClick={() => backToDesk()}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {mode === 'phone' ? 'Put phone down' : mode === 'note' ? 'Close notebook' : 'Back to desk'}
        <kbd>Esc</kbd>
      </button>
    </div>
  );
}

function Loader() {
  const { progress } = useProgress();
  const mode = useDesk((s) => s.mode);
  return (
    <div className={`loader ${mode === 'loading' ? '' : 'is-done'}`} aria-hidden={mode !== 'loading'}>
      <div className="loader-bar"><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
      <span>Setting up the desk…</span>
    </div>
  );
}

export default function Experience({ tier, restore }: { tier: Exclude<Tier, 'static'>; restore: ReturnContext | null }) {
  const q = settingsFor(tier);
  const [dpr, setDpr] = useState(q.dpr[1]);
  const sizeKey = useOverlaySizing();
  const mode = useDesk((s) => s.mode);
  const paused = useDesk((s) => s.paused);

  useEffect(() => {
    rig.reduced = prefersReducedMotion();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useDesk.getState().paused) {
        const m = useDesk.getState().mode;
        if (m !== 'desk' && m !== 'loading') {
          e.preventDefault();
          void backToDesk().then(() => {
            const el = m.toLowerCase().includes('phone') ? overlayEls.hotPhone : m.toLowerCase().includes('note') ? overlayEls.hotNote : overlayEls.hotLaptop;
            el?.focus({ preventScroll: true });
          });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    (window as unknown as { __desk: unknown }).__desk = { openPhone, openLaptop, openNotebook, sipCoffee, backToDesk, rig, store: useDesk, overlayEls, overlaySize };
    return () => {
      window.removeEventListener('keydown', onKey);
      useDesk.setState({ mode: 'loading', phase: 'idle', hover: null, overlayVisible: false });
      Object.assign(rig.anim, { phoneT: 0, camLaptop: 0, camPhone: 0, dof: 0 });
      rig.ready = false;
    };
  }, []);

  return (
    <div className={`experience mode-${mode}`}>
      <Canvas
        className="experience-canvas"
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={dpr}
        flat={q.postprocessing}
        gl={{ antialias: !q.postprocessing, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 40, near: 0.01, far: 30, position: [-0.09, 1.16, 0.6] }}
        frameloop={paused ? 'never' : 'always'}
        onPointerMissed={() => {
          const s = useDesk.getState();
          // ignore stray/ghost taps right after the phone settles (common on touch screens)
          if ((s.mode === 'phone' || s.mode === 'note') && !s.paused && performance.now() - s.modeSince > 700) void backToDesk();
        }}
        role="img"
        aria-label="Interactive 3D desk with a laptop and a phone"
      >
        <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.25))} />
        <ToneSetup post={q.postprocessing} />
        <Suspense fallback={null}>
          <CameraRig />
          <Scene q={q} />
          <OverlaySync />
          {q.postprocessing && <Effects q={q} />}
          <Ready restore={restore} />
        </Suspense>
      </Canvas>
      <DeviceHotspots />
      <PhoneUI sizeKey={sizeKey} />
      <LaptopBrowser sizeKey={sizeKey} />
      <HandsLayer q={q} paused={paused} />
      <NoteCard />
      <DeviceBar />
      <Loader />
    </div>
  );
}

