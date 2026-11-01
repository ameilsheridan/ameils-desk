'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useAudio } from '@/lib/audio';

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="sound-row">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="range" min={0} max={1} step={0.01} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
      <output htmlFor={id}>{Math.round(value * 100)}</output>
    </div>
  );
}

/** Sound toggle + panel (master, ambience, music, effects, rain, Test Sound). Muted by default. */
export default function SoundControl() {
  const a = useAudio();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div className="sound" ref={wrap}>
      <button
        type="button"
        className={`sound-toggle ${a.enabled ? 'is-on' : ''}`}
        aria-pressed={a.enabled}
        aria-label={a.enabled ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
        onClick={() => (a.enabled ? a.disable() : a.enable())}
      >
        <span className="bars" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="sound-label">{a.enabled ? 'Sound on' : 'Sound off'}</span>
      </button>
      <button type="button" className="sound-more" aria-expanded={open} aria-controls="sound-panel"
        aria-label="Sound settings" onClick={() => setOpen((o) => !o)}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div id="sound-panel" className="sound-panel" role="dialog" aria-label="Sound settings">
          <div className="sound-status" role="status">
            <span className={`dot ${a.status}`} />
            {a.status === 'on' && 'Audio enabled'}
            {a.status === 'off' && 'Audio muted'}
            {a.status === 'blocked' && 'Browser blocked audio. Press Test sound.'}
          </div>
          <label className="switch">
            <input type="checkbox" checked={a.enabled} onChange={(e) => (e.target.checked ? a.enable() : a.disable())} />
            <span>Enable sound</span>
          </label>
          <Slider label="Master" value={a.master} onChange={(v) => a.set({ master: v })} />
          <Slider label="Ambience" value={a.ambience} onChange={(v) => a.set({ ambience: v })} />
          <Slider label="Music" value={a.music} onChange={(v) => a.set({ music: v })} />
          <Slider label="Effects" value={a.effects} onChange={(v) => a.set({ effects: v })} />
          <label className="switch">
            <input type="checkbox" checked={a.rain} onChange={(e) => a.set({ rain: e.target.checked })} />
            <span>Rain on the window</span>
          </label>
          <button type="button" className="btn-test" onClick={() => a.test()}>Test sound</button>
        </div>
      )}
    </div>
  );
}
