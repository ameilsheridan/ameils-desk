'use client';
import { useEffect, useRef, useState } from 'react';
import contact from '@/data/contact.json';
import { sfx } from '@/lib/audio';

/**
 * "Email me" without ever opening a blank tab. A bare mailto: link does nothing (or opens an empty tab)
 * when the visitor has no desktop mail app, so the button offers three options that always work:
 * write in Gmail, open the mail app (same tab), or copy the address.
 */
export default function EmailMe({
  className,
  children = 'Email me',
  icon,
  inline = false,
}: {
  className?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  /** show the options in the flow (inside scrolling panels) instead of as a floating menu */
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flip, setFlip] = useState(false); // open leftwards when the button is near the right edge
  const box = useRef<HTMLSpanElement>(null);
  const email = contact.email;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent('Hello Ameil')}`;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // closes this menu, not the notebook / laptop behind it
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const t = document.createElement('textarea');
      t.value = email;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch {}
      t.remove();
    }
    setCopied(true);
    sfx('tap', 0);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <span className={`email-me ${inline ? 'is-inline' : ''}`} ref={box}>
      <button type="button" className={className} aria-expanded={open} aria-haspopup="true" onClick={() => {
        sfx('tap', 0);
        const r = box.current?.getBoundingClientRect();
        if (r) setFlip(r.left + 262 > window.innerWidth - 12);
        setOpen((o) => !o);
      }}>
        {icon}
        {children}
      </button>
      {open ? (
        <span className={`email-opts ${flip ? 'is-flip' : ''}`} role="group" aria-label="Ways to email Ameil">
          <a href={gmail} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Write in Gmail</a>
          <a href={`mailto:${email}`} onClick={() => setOpen(false)}>Open my mail app</a>
          <button type="button" onClick={copy}>{copied ? 'Copied ✓' : `Copy ${email}`}</button>
        </span>
      ) : null}
      <span className="sr-only" role="status">{copied ? 'Email address copied' : ''}</span>
    </span>
  );
}
