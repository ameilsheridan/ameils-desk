import type { MetadataRoute } from 'next';
import { projects } from '@/lib/projects';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return ['', '/work', '/about', '/contact', ...projects.map((p) => `/work/${p.slug}`)].map((path) => ({ url: `${site}${path}` }));
}
