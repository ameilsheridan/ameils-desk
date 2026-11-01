import resume from '@/data/resume.json';
import contact from '@/data/contact.json';
import { projects } from '@/lib/projects';

export type Answer = { text: string; links?: { label: string; href: string }[]; /** follow-up questions to offer (set when the question was not understood) */ suggest?: string[]; intent?: string };

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


type Kw = [string, number]; // [word or word-stem, weight]
type Intent = { id: string; q: string; kw: Kw[]; next: string[]; answer: (q: string) => Omit<Answer, 'intent'> };

const mail = { label: 'Email Ameil', href: `mailto:${contact.email}` };
const exp0 = resume.experience[0];
const exp1 = resume.experience[1];

/** Every question the assistant can answer. `q` is the canonical wording shown on chips; `next` are natural follow-ups. */
const INTENTS: Intent[] = [
  { id: 'about', q: 'What does Ameil do?', kw: [['what does', 3], ['who', 2], ['about', 1], ['introduce', 3], ['summary', 3], ['designer', 1], ['tell me about ameil', 3]], next: ['roles', 'projects', 'contact'],
    answer: () => ({ text: `${resume.name} is a ${resume.title.toLowerCase()} in ${resume.location}. ${resume.summary}`, links: [{ label: 'About', href: '/about' }] }) },
  { id: 'roles', q: 'Is Ameil open to new roles?', kw: [['hire', 3], ['hiring', 3], ['available', 3], ['availab', 3], ['open to', 3], ['looking for', 2], ['job', 2], ['role', 1], ['remote', 2], ['relocat', 2], ['freelance', 2], ['join', 1], ['opportunit', 2]], next: ['contact', 'experience', 'tools'],
    answer: () => ({ text: `Yes. Ameil is open to ${resume.lookingFor.roles.join(' or ')} roles. ${resume.lookingFor.setup}. Strongest fit: ${resume.lookingFor.strengths}.`, links: [mail, { label: 'About Ameil', href: '/about' }] }) },
  { id: 'medup', q: 'Tell me about the MedUP project', kw: [['medup', 5]], next: ['phis', 'projects', 'process'],
    answer: () => projectAnswer('medup')! },
  { id: 'phis', q: 'Tell me about PhIS 3.0', kw: [['phis', 5], ['pharmacy', 4], ['npra', 4], ['cmg', 3]], next: ['medup', 'experience', 'process'],
    answer: () => ({ text: exp1.about + ' ' + exp1.highlights.join(' '), links: [{ label: 'PhIS 3.0 case study', href: '/work/phis' }] }) },
  { id: 'ai', q: 'Does Ameil design for AI products?', kw: [['ai', 3], ['artificial', 3], ['llm', 3], ['genai', 3], ['smart fill', 3], ['geni', 3], ['machine learning', 3]], next: ['now', 'tools', 'projects'],
    answer: () => ({ text: `At Vistra, Ameil designs AI-assisted workflows: ${exp0.highlights[0]} He also builds GeniOS, the design library for those AI patterns.`, links: [{ label: 'Geni 2.0', href: '/work/geni' }] }) },
  { id: 'now', q: 'What is Ameil working on now?', kw: [['vistra', 4], ['current', 3], ['right now', 3], ['now', 1], ['today', 1], ['working on', 3], ['recent', 2], ['latest', 2]], next: ['ai', 'experience', 'projects'],
    answer: () => ({ text: `Ameil is a ${exp0.role} at Vistra (${exp0.when}). ${exp0.about}`, links: [{ label: 'Experience', href: '/about' }] }) },
  { id: 'experience', q: 'How much experience does Ameil have?', kw: [['experience', 3], ['years', 3], ['background', 3], ['career', 3], ['worked', 2], ['history', 2], ['seniority', 2], ['senior', 2], ['level', 1]], next: ['now', 'phis', 'education'],
    answer: () => ({ text: `4+ years in product and UX design: ${resume.experience.map((e) => `${e.role} at ${e.org} (${e.when})`).join('; ')}.`, links: [{ label: 'Full experience', href: '/about' }] }) },
  { id: 'tools', q: 'What tools does Ameil use?', kw: [['tool', 3], ['figma', 3], ['software', 3], ['skill', 3], ['stack', 3], ['framer', 2], ['prototype', 2], ['design system', 2], ['code', 1]], next: ['process', 'ai', 'roles'],
    answer: () => ({ text: Object.entries(resume.skills).map(([k, v]) => `${k}: ${v.join(', ')}`).join('. ') + '.' }) },
  { id: 'process', q: 'How does Ameil work with engineers?', kw: [['process', 3], ['approach', 3], ['method', 3], ['how do', 2], ['how does', 2], ['work with', 2], ['engineer', 3], ['develop', 2], ['collaborat', 3], ['workflow', 2], ['team', 1]], next: ['tools', 'projects', 'roles'],
    answer: () => ({ text: 'Ameil works in four steps: discover the real problem with users, define the outcome and constraints, design flows then high-fidelity prototypes, and deliver alongside engineers until it ships.' }) },
  { id: 'projects', q: 'Which projects should I look at first?', kw: [['project', 3], ['work', 1], ['portfolio', 3], ['case stud', 3], ['best', 2], ['show me', 2], ['examples', 3], ['highlights', 3]], next: ['medup', 'phis', 'ai'],
    answer: () => ({ text: `Highlights: ${projects.slice(0, 6).map((x) => x.name).join(', ')}. MedUP has the most complete case study right now.`, links: [{ label: 'See all work', href: '/work' }, { label: 'MedUP', href: '/work/medup' }] }) },
  { id: 'where', q: 'Where is Ameil based?', kw: [['where', 3], ['location', 3], ['based', 3], ['timezone', 3], ['time zone', 3], ['city', 2], ['country', 2], ['malaysia', 3], ['kuala lumpur', 3], ['live', 2]], next: ['roles', 'contact', 'languages'],
    answer: () => ({ text: `${resume.location}, UTC+8. Ameil works daily with teams across Asia Pacific and Europe.` }) },
  { id: 'languages', q: 'Which languages does Ameil speak?', kw: [['language', 4], ['speak', 3], ['english', 2], ['malay', 2], ['bahasa', 2]], next: ['where', 'contact', 'roles'],
    answer: () => ({ text: `Languages: ${resume.languages.join(', ')}.` }) },
  { id: 'education', q: 'What has Ameil studied?', kw: [['education', 3], ['degree', 3], ['study', 3], ['studied', 3], ['university', 3], ['certific', 3], ['school', 2], ['graduate', 2], ['course', 2]], next: ['experience', 'tools', 'roles'],
    answer: () => ({ text: `${resume.education[0].title}, ${resume.education[0].org} (${resume.education[0].when}). Certificates: ${resume.certificates.map((c) => `${c.title} (${c.org}, ${c.when})`).join('; ')}.` }) },
  { id: 'resume', q: 'Can I see his résumé?', kw: [['resume', 4], ['résumé', 4], ['cv', 4], ['curriculum', 3]], next: ['experience', 'contact', 'roles'],
    answer: () => ({ text: 'The résumé is lying on the desk on the home page, and the full version is on the About page.', links: [{ label: 'About and experience', href: '/about' }] }) },
  { id: 'contact', q: 'How can I contact Ameil?', kw: [['contact', 3], ['email', 3], ['reach', 3], ['talk', 2], ['linkedin', 3], ['behance', 3], ['figma community', 3], ['touch', 3], ['message', 2], ['call', 2], ['book', 1], ['meeting', 2], ['interview', 2]], next: ['roles', 'resume', 'where'],
    answer: () => ({ text: `The quickest way is email: ${contact.email}. Ameil is in Kuala Lumpur (UTC+8).`, links: [mail, ...contact.links.filter((l) => l.href)] }) },
  { id: 'salary', q: 'What are his salary expectations?', kw: [['salary', 5], ['rate', 3], ['pay', 3], ['compensation', 5], ['expected', 2], ['expectation', 4], ['how much', 2]], next: ['roles', 'contact', 'experience'],
    answer: () => ({ text: 'Compensation is best discussed directly. Send Ameil a note with the role and range and he will get back to you.', links: [mail] }) },
];

const byId = (id: string) => INTENTS.find((i) => i.id === id)!;
/** Questions shown on chips (salary stays reachable by typing, but is not advertised). */
const POOL = INTENTS.filter((i) => i.id !== 'salary');

function norm(text: string) {
  return ` ${text.toLowerCase().replace(/[^a-z0-9é\s']/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

/** Score each intent against free text. Whole words must match; a trailing-stem keyword ("relocat") matches the prefix. */
function score(text: string): { intent: Intent; score: number }[] {
  const q = norm(text);
  return INTENTS.map((intent) => {
    let sc = 0;
    for (const [w, weight] of intent.kw) {
      const stem = w.length >= 6 && !w.includes(' ');
      if (q.includes(` ${w} `) || q.includes(` ${w}s `) || (stem && q.includes(` ${w}`))) sc += weight;
    }
    return { intent, score: sc };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}

function projectAnswer(slug: string): Omit<Answer, 'intent'> | null {
  const p = projects.find((x) => x.slug === slug);
  return p ? { text: `${p.name}: ${p.summary} Ameil's role: ${p.role}.`, links: [{ label: `Open the ${p.name} case study`, href: `/work/${p.slug}` }] } : null;
}

const GREETING = /^\s*(hi+|hai+|hello+|hey+|yo|hola|good (morning|afternoon|evening)|sup|salam|assalamualaikum)\b/i;
const THANKS = /\b(thanks|thank you|thx|terima kasih|cheers|great|awesome|nice)\b/i;
const BYE = /\b(bye|goodbye|see you|cya)\b/i;

/**
 * Chips to show under the conversation. Always returns up to `n` questions: natural follow-ups to the last
 * answer first, then anything not asked yet, and once everything has been asked it simply starts over.
 */
export function followUps(lastIntent: string | undefined, asked: string[], n = 4): string[] {
  const unasked = (i: Intent) => !asked.includes(i.q);
  const out: Intent[] = [];
  const push = (i?: Intent) => { if (i && !out.includes(i) && i.id !== 'salary') out.push(i); };
  if (lastIntent) byId(lastIntent).next.forEach((id) => { const i = byId(id); if (unasked(i)) push(i); });
  POOL.filter(unasked).forEach(push);
  if (out.length < n) POOL.forEach(push);
  return out.slice(0, n).map((i) => i.q);
}

/** Lightweight prediction while typing: the questions this text is most likely heading towards. */
export function predict(input: string, n = 3): string[] {
  if (norm(input).trim().length < 2) return [];
  const words = norm(input).trim().split(' ').filter((w) => w.length >= 2);
  const last = words[words.length - 1] ?? '';
  const full = score(input).map((r) => r.intent);
  // also match the word still being typed ("rela" -> relocate, "sal" -> salary) against keyword prefixes and question text
  const partial = INTENTS.filter((i) => last.length >= 3 && (i.q.toLowerCase().includes(last) || i.kw.some(([w]) => w.startsWith(last)))).filter((i) => !full.includes(i));
  return [...full, ...partial].slice(0, n).map((i) => i.q);
}

/** Rule-based answers used when no model is configured (and as a safety net). */
export function localAnswer(question: string): Answer {
  const q = norm(question);
  // a named project always wins
  const p = projects.find((x) => q.includes(` ${x.name.toLowerCase().split(' ')[0]} `) || q.includes(` ${x.slug.replace(/-/g, ' ')} `));
  if (p && p.slug !== 'medup' && p.slug !== 'phis') return { ...projectAnswer(p.slug)!, intent: 'projects' };
  if (GREETING.test(question) && q.trim().split(' ').length <= 4)
    return { text: "Hi! I can tell you about Ameil's experience, projects, tools and availability. Pick a question below or type your own.", suggest: followUps(undefined, []), intent: 'about' };
  if (BYE.test(question)) return { text: 'Thanks for stopping by! If you would like to talk, email works best.', links: [mail], intent: 'contact' };
  const ranked = score(question);
  if (ranked.length && ranked[0].score >= 2) return { ...ranked[0].intent.answer(q), intent: ranked[0].intent.id };
  if (THANKS.test(question) && !ranked.length) return { text: 'Happy to help! Anything else you would like to know?', suggest: followUps(undefined, []), intent: 'about' };
  // not understood: say so honestly and hand over clickable options instead of repeating the same sentence
  return {
    text: "I'm not sure about that one. I only know Ameil's work, experience and availability. Here are some things you can ask, or email him directly:",
    links: [mail],
    suggest: [...new Set([...ranked.slice(0, 2).map((r) => r.intent.q), ...followUps(undefined, [])])].filter((x) => x !== byId('salary').q).slice(0, 3),
    intent: undefined,
  };
}
