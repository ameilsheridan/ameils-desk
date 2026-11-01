import { notFound } from 'next/navigation';
import CaseStudyView from '@/components/CaseStudyView';
import { getProject, projects } from '@/lib/projects';

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);
  return { title: p ? `${p.name} — Ameil Sheridan` : 'Project — Ameil Sheridan', description: p?.summary };
}

export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();
  return <CaseStudyView p={p} />;
}
