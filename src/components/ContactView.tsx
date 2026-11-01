import TopNav from '@/components/TopNav';
import ContactCard from '@/components/ContactCard';

export default function ContactView() {
  return (
    <div className="case page" style={{ ['--brand' as string]: '#2b1d17' }}>
      <TopNav tone="light" current="contact" />
      <main id="main" tabIndex={-1} className="wrap contact-page">
        <section className="case-hero-panel page-hero contact-hero" aria-labelledby="contact-page-title">
          <div className="chp-copy">
            <h1 id="contact-page-title">Contact</h1>
            <p className="chp-summary">On the desk, this lives in the notebook. Here it is without the coffee.</p>
          </div>
          <ContactCard headingId="contact-card-title" />
        </section>
      </main>
    </div>
  );
}
