'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { detectTier, type Tier } from '@/lib/quality';
import { projects } from '@/lib/projects';
import { asset } from '@/lib/asset';

const Experience = dynamic(() => import('@/experience/Experience'), { ssr: false });

/** Picks a quality tier on the client and loads the 3D desk, or a static fallback. */
export default function ExperienceLoader() {
  const [tier, setTier] = useState<Tier | null>(null);

  // the desk now stays mounted across routes (see DeskHost), so this runs once
  useEffect(() => {
    setTier(detectTier());
  }, []);

  if (!tier) return <div className="experience-placeholder" aria-hidden="true" />;
  if (tier === 'static') return <StaticDesk />;
  return <Experience tier={tier} restore={null} />;
}

/** No-WebGL fallback: a still of the desk plus the same projects as plain links. */
function StaticDesk() {
  return (
    <div className="static-desk">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset('/poster.jpg')} alt="A warm café desk with an open laptop, a phone, a notebook and a coffee tumbler." />
      <nav aria-label="Projects" className="static-links">
        {projects.map((p) => <Link key={p.slug} href={`/work/${p.slug}`}>{p.name}</Link>)}
      </nav>
    </div>
  );
}
