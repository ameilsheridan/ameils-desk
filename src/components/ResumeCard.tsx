'use client';
import Link from 'next/link';
import resume from '@/data/resume.json';
import contact from '@/data/contact.json';
import EmailMe from '@/components/EmailMe';
import { asset } from '@/lib/asset';

/** Readable résumé summary shown when the camera leans over the printed page on the desk. */
export default function ResumeCard({ onClose, headingId = 'resume-title' }: { onClose?: () => void; headingId?: string }) {
  const pdf = contact.resume ? asset(`/${contact.resume}`) : null;
  return (
    <div className="contact-card resume-card">
      {onClose ? (
        <button type="button" className="contact-close" onClick={onClose} aria-label="Put the résumé down">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      ) : null}
      <p className="contact-scribble" aria-hidden="true">the short version</p>
      <h2 id={headingId} tabIndex={-1}>Résumé</h2>
      <p className="contact-intro">{resume.summary}</p>
      <ol className="resume-roles">
        {resume.experience.map((e) => (
          <li key={e.org}>
            <span className="rr-when">{e.when}</span>
            <b>{e.role}</b>
            <span>{e.org}</span>
          </li>
        ))}
      </ol>
      <div className="contact-actions">
        {pdf ? <a className="contact-primary" href={pdf} download>Download PDF</a> : null}
        <Link className={pdf ? 'contact-copy' : 'contact-primary'} href="/about">Full experience</Link>
        <EmailMe className="contact-copy" />
      </div>
    </div>
  );
}
