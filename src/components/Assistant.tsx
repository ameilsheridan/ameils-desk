'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { followUps, localAnswer, predict, type Answer } from '@/lib/faq';
import EmailMe from '@/components/EmailMe';

type Msg = { role: 'user' | 'assistant'; content: string; links?: Answer['links']; suggest?: string[] };

/** Floating "Ask about Ameil" assistant (FAQ). */
export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: "Hi! I'm Ameil's portfolio assistant. Ask me about his experience, projects or availability." }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const [lastIntent, setLastIntent] = useState<string | undefined>();
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, busy]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput('');
    setAsked((a) => [...a, question]);
    const history = msgs.slice(1).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: 'user', content: question }]);
    setBusy(true);
    let ans: Answer;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question, history }), signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok && res.status !== 429) throw new Error();
      ans = (await res.json()) as Answer;
    } catch {
      ans = localAnswer(question); // static hosting or offline
    }
    // a model answer carries no intent; derive it locally so the follow-up chips still make sense
    setLastIntent(ans.intent ?? localAnswer(question).intent ?? lastIntent);
    setMsgs((m) => [...m, { role: 'assistant', content: ans.text, links: ans.links, suggest: ans.suggest }]);
    setBusy(false);
  };

  const predicted = predict(input);
  const chips = predicted.length ? { typing: true, list: predicted } : { typing: false, list: followUps(lastIntent, asked, 4) };

  return (
    <div className={`assistant ${open ? 'is-open' : ''}`}>
      {open ? (
        <section className="assistant-panel" role="dialog" aria-label="Ask about Ameil">
          <header>
            <span className="assistant-dot" aria-hidden="true" />
            <div><b>Ask about Ameil</b><small>Answers from his portfolio and résumé</small></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </header>
          <ol className="assistant-log" ref={listRef} aria-live="polite">
            {msgs.map((m, i) => (
              <li key={i} className={`msg msg--${m.role}`}>
                <p>{m.content}</p>
                {m.links?.length ? (
                  <span className="msg-links">
                    {m.links.map((l) => (l.href.startsWith('/') ? <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link> : l.href.startsWith('mailto:') ? <EmailMe key={l.href} inline>{l.label}</EmailMe> : <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>))}
                  </span>
                ) : null}
                {m.suggest?.length ? (
                  <span className="msg-suggest">
                    {m.suggest.map((s) => <button key={s} type="button" onClick={() => ask(s)} disabled={busy}>{s}</button>)}
                  </span>
                ) : null}
              </li>
            ))}
            {busy ? <li className="msg msg--assistant msg--typing" aria-label="Thinking"><i /><i /><i /></li> : null}
          </ol>
          {/* always visible: follow-ups to the last answer, or live predictions while the visitor types */}
          <ul className="assistant-suggest" aria-label={chips.typing ? 'Did you mean' : 'Suggested questions'}>
            {chips.typing ? <li className="assistant-suggest-label" aria-hidden="true">Did you mean</li> : null}
            {chips.list.map((s) => <li key={s}><button type="button" onClick={() => ask(s)} disabled={busy}>{s}</button></li>)}
          </ul>
          <form className="assistant-form" onSubmit={(e) => { e.preventDefault(); void ask(input); }}>
            <label className="sr-only" htmlFor="assistant-input">Your question</label>
            <input id="assistant-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" maxLength={500} autoComplete="off" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Send">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M11 5l5 5-5 5" /></svg>
            </button>
          </form>
        </section>
      ) : null}
      <button type="button" className="assistant-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close assistant' : 'Ask about Ameil'}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" /></svg>
        <span>Ask about me</span>
      </button>
    </div>
  );
}
