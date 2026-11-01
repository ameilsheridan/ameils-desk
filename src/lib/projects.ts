import data from '@/data/projects.json';
import { asset } from './asset';

export type Category = 'Enterprise' | 'AI' | 'Healthcare' | 'GIS' | 'Personal';

type Img = { src: string; alt: string }; // src: a file in public/projects/

/** Optional case-study content. Sections without content are simply not shown (core ones show a placeholder). */
export type CaseStudy = {
  /** hero artwork that sits on the brand colour (e.g. a framed phone, transparent background) */
  heroImage?: Img;
  /** big two-tone intro line: lead is dark, rest is grey */
  statement?: { lead: string; rest?: string; image?: Img };
  challenge?: string[]; // paragraphs
  research?: { label?: string; aside?: string; headline: string; problem: string; solution: string; image?: Img };
  approach?: { title: string; body: string; duration?: string; tags?: string[]; image?: Img }[];
  journey?: { title: string; body: string[]; goals?: string[]; map?: { group: string; items: string[] }[]; logo?: Img };
  feature?: { title: string; body: string[]; image: Img };
  style?: { intro?: string; colors: { name: string; hex: string }[]; font?: string; logo?: Img; logoColor?: Img; image?: Img };
  /** link to a clickable prototype, shown as a button near the top */
  prototype?: { label: string; href: string };
  /** as-is journey with a before/after feeling score (1 = frustrated, 5 = at ease) */
  journeyMap?: {
    title: string; intro?: string; note?: string;
    stages: { stage: string; doing: string; thinking: string; pain: string; opportunity: string; before: number; after: number }[];
  };
  /** annotated key screens: what it is and why it was designed that way */
  walkthrough?: { title: string; subtitle: string; body: string; why: string; images: Img[]; wide?: boolean; detail?: boolean }[];
  components?: { intro?: string; items: (Img & { label: string })[] };
  /** end goals: who benefits and how success would be measured */
  why?: { title: string; lead: string; body?: string; goals: { who: string; goal: string; measure: string }[]; note?: string };
  stack?: { title: string; intro?: string; items: { tag: string; name: string; use: string }[] };
  outcome?: string[]; // paragraphs
  impact?: { value: string; label: string }[]; // e.g. { value: "40%", label: "faster filing" }
  gallery?: { src: string; alt: string; caption?: string }[]; // files in public/projects/
  tools?: string[];
  links?: { label: string; href: string }[];
};

export type Project = {
  slug: string;
  name: string;
  category: Category;
  client: string;
  year: string;
  role: string;
  summary: string;
  palette: string[];
  /** Hero colour for the case study (white text sits on it) */
  brand: string;
  nda: boolean;
  cover: string;
  caseStudy?: CaseStudy;
};

/** Prefixes every image src in a case study with the asset base. */
function resolveImages(cs: CaseStudy): CaseStudy {
  const fix = <T extends { src: string } | undefined>(i: T): T => (i ? { ...i, src: asset(`/projects/${i.src}`) } : i);
  return {
    ...cs,
    heroImage: fix(cs.heroImage),
    statement: cs.statement && { ...cs.statement, image: fix(cs.statement.image) },
    research: cs.research && { ...cs.research, image: fix(cs.research.image) },
    approach: cs.approach?.map((s) => ({ ...s, image: fix(s.image) })),
    journey: cs.journey && { ...cs.journey, logo: fix(cs.journey.logo) },
    feature: cs.feature && { ...cs.feature, image: fix(cs.feature.image) },
    style: cs.style && { ...cs.style, logo: fix(cs.style.logo), logoColor: fix(cs.style.logoColor), image: fix(cs.style.image) },
    walkthrough: cs.walkthrough?.map((w) => ({ ...w, images: w.images.map((i) => fix(i)) })),
    components: cs.components && { ...cs.components, items: cs.components.items.map((i) => fix(i)) },
    gallery: cs.gallery?.map((g) => fix(g)),
  };
}

/** Single project registry shared by the laptop, the phone, /work and every case study. */
type Raw = Omit<Project, 'category' | 'cover'> & { category: string; coverImage?: string };

export const projects: Project[] = (data as Raw[]).map(({ coverImage, ...p }) => ({
  ...p,
  category: p.category as Category,
  // "coverImage": "phis-cover.jpg" (a file in public/projects/) replaces the generated cover art
  cover: asset(`/projects/${coverImage ?? `${p.slug}.svg`}`),
  caseStudy: p.caseStudy ? resolveImages(p.caseStudy) : undefined,
}));

export const categories: Category[] = ['Enterprise', 'AI', 'Healthcare', 'GIS', 'Personal'];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function neighbours(slug: string) {
  const i = projects.findIndex((p) => p.slug === slug);
  return {
    prev: projects[(i - 1 + projects.length) % projects.length],
    next: projects[(i + 1) % projects.length],
  };
}
