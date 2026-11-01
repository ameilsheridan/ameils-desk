import { NextResponse } from 'next/server';
import { knowledge, localAnswer } from '@/lib/faq';

/**
 * Portfolio assistant. Uses Claude when ANTHROPIC_API_KEY is set (answers grounded only in the
 * portfolio's own data); otherwise, or on any error, falls back to the built-in answers.
 */
const hits = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'anon';
  const now = Date.now();
  const h = hits.get(ip) ?? { n: 0, t: now };
  if (now - h.t > 60_000) { h.n = 0; h.t = now; }
  h.n++;
  hits.set(ip, h);
  if (h.n > 12) return NextResponse.json({ text: 'Lots of questions! Give it a minute, or email Ameil directly.' }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { question?: string; history?: { role: 'user' | 'assistant'; content: string }[] };
  const question = String(body.question ?? '').slice(0, 500).trim();
  if (!question) return NextResponse.json({ text: 'Ask me anything about Ameil and his work.' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ ...localAnswer(question), source: 'local' });

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ASSISTANT_MODEL ?? 'claude-haiku-5-5',
        max_tokens: 350,
        system: `You are the assistant on Ameil Sheridan's design portfolio, answering visitors such as recruiters and hiring managers.
Answer ONLY from the facts below. If something is not covered (salary, notice period, personal life, opinions), say you don't know and suggest emailing Ameil. Never invent employers, metrics, dates or results.
Refer to Ameil in the third person (he/him). Be warm, concise (2 to 4 sentences), plain text, no markdown. When useful, mention a page path like /work/medup or /about.

FACTS:
${knowledge()}`,
        messages: [...(body.history ?? []).slice(-6), { role: 'user', content: question }],
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
    if (!text) throw new Error('empty');
    return NextResponse.json({ text, source: 'model' });
  } catch {
    return NextResponse.json({ ...localAnswer(question), source: 'local' });
  }
}
