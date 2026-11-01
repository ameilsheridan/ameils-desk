// QA: assistant chips/prediction/unrelated replies, and Email me never opens a blank tab.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', name, extra); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/about`, { waitUntil: 'networkidle' });
  const chipCount = () => p.locator('.assistant-suggest button').count();
  await p.click('.assistant-fab');
  check('chips visible on open', (await chipCount()) >= 3, String(await chipCount()));
  await p.locator('.assistant-suggest button').first().click();
  await p.waitForSelector('.msg--assistant:nth-child(3)');
  check('chips still visible after 1st answer', (await chipCount()) >= 3, String(await chipCount()));
  const asked1 = await p.locator('.msg--user').first().innerText();
  const labels = await p.locator('.assistant-suggest button').allInnerTexts();
  check('already-asked question not offered again', !labels.includes(asked1), asked1);
  // two more questions, chips must remain
  await p.locator('.assistant-suggest button').first().click();
  await p.waitForSelector('.msg--assistant:nth-child(5)');
  await p.locator('.assistant-suggest button').first().click();
  await p.waitForSelector('.msg--assistant:nth-child(7)');
  check('chips still visible after 3 answers', (await chipCount()) >= 3, String(await chipCount()));
  // unrelated message: no repeated canned line, offers clickable options
  const send = async (t) => { await p.fill('#assistant-input', t); await p.press('#assistant-input', 'Enter'); };
  const n0 = await p.locator('.msg--assistant').count();
  await send('what is the weather today');
  await p.waitForFunction((n) => document.querySelectorAll('.msg--assistant').length > n && !document.querySelector('.msg--typing'), n0);
  const un1 = await p.locator('.msg--assistant').last().innerText();
  const unBtns = await p.locator('.msg--assistant').last().locator('.msg-suggest button').count();
  check('unrelated: honest reply with inline options', /not sure/i.test(un1) && unBtns >= 2, `${unBtns} options`);
  await send('hai');
  await p.waitForFunction((n) => document.querySelectorAll('.msg--assistant').length > n + 1 && !document.querySelector('.msg--typing'), n0);
  const hai = await p.locator('.msg--assistant').last().innerText();
  check('greeting gets a greeting, not the canned line', /^Hi!/.test(hai), hai.slice(0, 40));
  // prediction while typing
  await p.fill('#assistant-input', 'reloc');
  const pred = await p.locator('.assistant-suggest button').allInnerTexts();
  check('typing predicts a matching question', pred.some((x) => /open to new roles/i.test(x)), pred.join(' | '));
  await p.fill('#assistant-input', '');
  // clicking a prediction/chip sends it
  await p.locator('.assistant-suggest button').first().click();
  await p.waitForTimeout(600);
  check('input cleared and chips restored', (await p.inputValue('#assistant-input')) === '' && (await chipCount()) >= 3);
  // email from assistant: ask contact, click Email Ameil
  await send('how can I contact ameil');
  await p.waitForSelector('.msg-links .email-me button');
  const pagesBefore = ctx.pages().length;
  await p.locator('.msg-links .email-me button').last().click();
  await p.waitForSelector('.msg-links .email-opts');
  check('assistant Email: options shown, no new tab', ctx.pages().length === pagesBefore);
  await p.screenshot({ path: '/tmp/qa_assistant.png' });
  await p.click('.assistant-panel header button');
  // About page Email me
  const pagesA = ctx.pages().length;
  await p.locator('.glance-actions .email-me > button').first().click();
  await p.waitForSelector('.glance-actions .email-opts');
  check('About Email me opens options, no blank tab', ctx.pages().length === pagesA);
  const gm = await p.locator('.glance-actions .email-opts a').first().getAttribute('href');
  const mt = await p.locator('.glance-actions .email-opts a').nth(1).getAttribute('href');
  check('options: gmail compose + mailto (same tab)', /mail\.google\.com.*ameilsheridan%40gmail\.com/.test(gm) && /^mailto:ameilsheridan@gmail\.com$/.test(mt) && !(await p.locator('.glance-actions .email-opts a').nth(1).getAttribute('target')));
  await p.locator('.glance-actions .email-opts button').click();
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  check('copy puts the address on the clipboard', clip === 'ameilsheridan@gmail.com', clip);
  await p.screenshot({ path: '/tmp/qa_about_email.png' });
  // contact page
  await p.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  const pagesC = ctx.pages().length;
  await p.locator('.contact-card .email-me > button').click();
  await p.waitForSelector('.contact-card .email-opts');
  check('Contact page Email me opens options, no blank tab', ctx.pages().length === pagesC);
  await p.keyboard.press('Escape');
  check('Escape closes the email menu', (await p.locator('.contact-card .email-opts').count()) === 0);
  await b.close();
  const bad = results.filter((r) => !r).length;
  console.log(bad ? `RESULT: ${bad} FAILED` : 'RESULT: ALL PASS');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message.split('\n')[0]); process.exit(1); });
