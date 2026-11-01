'use client';
import { useRouter } from 'next/navigation';
import { projects } from '@/lib/projects';
import { startProjectTransition } from '@/lib/transition';

/** Accessible, WebGL-free index of all projects (same registry, same transition). */
export default function WorkGrid() {
  const router = useRouter();
  return (
    <ul className="work-grid">
      {projects.map((p) => (
        <li key={p.slug} style={{ ['--brand' as string]: p.brand }}>
          <a
            href={`/work/${p.slug}`}
            className="work-card"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              const img = e.currentTarget.querySelector('img')!;
              startProjectTransition(p.slug, img, { device: 'index' }, (h) => router.push(h));
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover} alt="" />
            <span className="work-card-meta">
              <span className="chip">{p.category}</span>
              <strong>{p.name}</strong>
              <span>{p.summary}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
