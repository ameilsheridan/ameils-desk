'use client';
import { useState } from 'react';
import contact from '@/data/contact.json';
import { sfx } from '@/lib/audio';

/** "Say hello" card: shown on the open notebook and on /contact. Links without an href are hidden. */
export default function ContactCard({ onClose, headingId = 'contact-title' }: { onClose?: () => void; headingId?: string }) {
  const [copied, setCopied] = useState(false);
  const links = contact.links.filter((l) => l.href);
  return (
    <div className="contact-card">
      {onClose ? (
        <button type="button" className="contact-close" onClick={onClose} aria-label="Close the notebook">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      ) : null}
      <h2 id={headingId} tabIndex={-1}>Say hello</h2>
      <p className="contact-intro">{contact.intro}</p>
      <div className="contact-actions">
        <a className="contact-primary" href={`mailto:${contact.email}`} onClick={() => sfx('tap')}>Email me</a>
        <button
          type="button"
          className="contact-copy"
          onClick={async () => {
            try { await navigator.clipboard.writeText(contact.email); setCopied(true); sfx('tap'); setTimeout(() => setCopied(false), 1800); } catch {}
          }}
        >
          {copied ? 'Copied' : 'Copy email'}
        </button>
      </div>
      <p className="contact-email">{contact.email}</p>
      {links.length ? (
        <ul className="contact-links">
          {links.map((l) => (
            <li key={l.label}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}<span aria-hidden="true">↗</span></a></li>
          ))}
        </ul>
      ) : null}
      <p className="contact-where">{contact.location}</p>
      <span className="sr-only" role="status">{copied ? 'Email address copied' : ''}</span>
    </div>
  );
}
