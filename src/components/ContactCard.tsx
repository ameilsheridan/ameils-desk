'use client';
import { useState } from 'react';
import contact from '@/data/contact.json';
import { sfx } from '@/lib/audio';
import { asset } from '@/lib/asset';
import EmailMe from '@/components/EmailMe';

/** "Say hello" card: shown on the open notebook and on /contact. Empty links and résumé are hidden. */
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
      <p className="contact-scribble" aria-hidden="true">psst, my inbox is open</p>
      <h2 id={headingId} tabIndex={-1}>Say hello</h2>
      <p className="contact-intro">{contact.intro}</p>
      <div className="contact-actions">
        <EmailMe
          className="contact-primary"
          icon={<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3 5h14v10H3z" /><path d="M3.5 5.5L10 11l6.5-5.5" /></svg>}
        />
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
      {contact.resume ? (
        <a className="contact-resume" href={asset(`/${contact.resume}`)} download target="_blank" rel="noopener noreferrer">
          <span className="contact-resume-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 9l4 4 4-4M4 16h12" /></svg>
          </span>
          <span><b>Download my résumé</b><small>PDF</small></span>
        </a>
      ) : null}
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
