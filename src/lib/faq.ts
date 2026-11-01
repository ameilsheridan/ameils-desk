import resume from '@/data/resume.json';
import contact from '@/data/contact.json';
import { projects } from '@/lib/projects';

export type Answer = { text: string; links?: { label: string; href: string }[] };

export const SUGGESTED = [
  'What does Ameil do?',
  'Is Ameil open to new roles?',
  'Tell me about the MedUP project',
  'What tools does Ameil use?',
  'How can I contact Ameil?',
];

/** Plain-text knowledge given to the language model (and the source of the local answers). */
export function knowledge() {
  const exp = resume.experience.map((e) => `- ${e.role} at ${e.org} (${e.when}): ${e.about} ${e.highlights.join(' ')}`).join('\n');
  const work = projects.map((p) => `- ${p.name} [${p.category}] (/work/${p.slug}): ${p.summary} Role: ${p.role}. Context: ${p.client}.`).join('\n');
  return `NAME: ${resume.name}, ${resume.title}, ${resume.location} (UTC+8)
SUMMARY: ${resume.summary}
MOTTO: Discover the problem. Design the solution.
LOOKING FOR: ${resume.lookingFor.roles.join(' or ')}. ${resume.lookingFor.setup}. Strengths: ${resume.lookingFor.strengths}.
EXPERIENCE:
${exp}
EDUCATION: ${resume.education.map((e) => `${e.title}, ${e.org}, ${e.when}`).join('; ')}
CERTIFICATES: ${resume.certificates.map((c) => `${c.title} (${c.org}, ${c.when})`).join('; ')}
SKILLS: ${Object.entries(resume.skills).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' | ')}
LANGUAGES: ${resume.languages.join(', ')}
PROJECTS:
${work}
CONTACT: email ${contact.email}; ${contact.links.filter((l) => l.href).map((l) => `${l.label} ${l.href}`).join('; ')}`;
}

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

/** Rule-based answers used when no model is configured (and as a safety net). */
export function localAnswer(question: string): Answer {
  const q = ` ${question.toLowerCase()} `;
  const mail = { label: 'Email Ameil', href: `mailto:${contact.email}` };
  const p = projects.find((x) => q.includes(x.name.toLowerCase().split(' ')[0]) || q.includes(x.slug.replace(/-/g, ' ')));
  if (p) return { text: `${p.name}: ${p.summary} Ameil's role: ${p.role}.`, links: [{ label: `Open the ${p.name} case study`, href: `/work/${p.slug}` }] };
  if (has(q, 'salary', 'rate', 'pay', 'compensation', 'expected'))
    return { text: 'Compensation is best discussed directly. Send Ameil a note with the role and range and he will get back to you.', links: [mail] };
  if (has(q, 'hire', 'hiring', 'available', 'availability', 'open to', 'looking for', 'job', 'role', 'remote', 'relocat', 'freelance'))
    return { text: `Yes. Ameil is open to ${resume.lookingFor.roles.join(' or ')} roles. ${resume.lookingFor.setup}. Strongest fit: ${resume.lookingFor.strengths}.`, links: [mail, { label: 'About Ameil', href: '/about' }] };
  if (has(q, 'contact', 'email', 'reach', 'talk', 'linkedin', 'behance', 'figma community', 'touch'))
    return { text: `The quickest way is email: ${contact.email}. Ameil is in Kuala Lumpur (UTC+8).`, links: [mail, ...contact.links.filter((l) => l.href)] };
  if (has(q, 'resume', 'résumé', ' cv'))
    return { text: 'The résumé is lying on the desk on the home page, and the full version is on the About page.', links: [{ label: 'About and experience', href: '/about' }] };
  if (has(q, 'phis', 'pharmacy', 'npra'))
    return { text: resume.experience[1].about + ' ' + resume.experience[1].highlights.join(' '), links: [{ label: 'PhIS 3.0 case study', href: '/work/phis' }] };
  if (has(q, ' ai', 'artificial', 'llm', 'genai', 'smart fill'))
    return { text: `At Vistra, Ameil designs AI-assisted workflows: ${resume.experience[0].highlights[0]} He also builds GeniOS, the design library for those AI patterns.`, links: [{ label: 'Geni 2.0', href: '/work/geni' }] };
  if (has(q, 'vistra', 'current', 'now', 'today'))
    return { text: `Ameil is a ${resume.experience[0].role} at Vistra (${resume.experience[0].when}). ${resume.experience[0].about}`, links: [{ label: 'Experience', href: '/about' }] };
  if (has(q, 'experience', 'years', 'background', 'career', 'worked', 'history'))
    return { text: `4+ years in product and UX design: ${resume.experience.map((e) => `${e.role} at ${e.org} (${e.when})`).join('; ')}.`, links: [{ label: 'Full experience', href: '/about' }] };
  if (has(q, 'tool', 'figma', 'software', 'skill', 'stack'))
    return { text: Object.entries(resume.skills).map(([k, v]) => `${k}: ${v.join(', ')}`).join('. ') + '.' };
  if (has(q, 'education', 'degree', 'study', 'studied', 'university', 'certific'))
    return { text: `${resume.education[0].title}, ${resume.education[0].org} (${resume.education[0].when}). Certificates: ${resume.certificates.map((c) => `${c.title} (${c.org}, ${c.when})`).join('; ')}.` };
  if (has(q, 'process', 'approach', 'how do', 'how does', 'method', 'work with'))
    return { text: 'Ameil works in four steps: discover the real problem with users, define the outcome and constraints, design flows then high-fidelity prototypes, and deliver alongside engineers until it ships.' };
  if (has(q, 'project', 'work', 'portfolio', 'case', 'best'))
    return { text: `Highlights: ${projects.slice(0, 6).map((x) => x.name).join(', ')}. MedUP has the most complete case study right now.`, links: [{ label: 'See all work', href: '/work' }, { label: 'MedUP', href: '/work/medup' }] };
  if (has(q, 'where', 'location', 'based', 'timezone', 'time zone'))
    return { text: `${resume.location}, UTC+8. Ameil works daily with teams across Asia Pacific and Europe.` };
  if (has(q, 'who', 'what does', 'about', 'hello', 'hi ', 'hey'))
    return { text: `${resume.name} is a ${resume.title.toLowerCase()} in ${resume.location}. ${resume.summary}`, links: [{ label: 'About', href: '/about' }] };
  return { text: "I can answer questions about Ameil's experience, projects, skills, availability and how to get in touch. For anything else, email works best.", links: [mail] };
}
