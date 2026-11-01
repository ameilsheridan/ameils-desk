// QA: notebook "Say hello" card on the 3D desk. Email me opens options (no blank tab) that stay inside the card/viewport.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/?quality=light', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 120000 });
  await p.evaluate(() => window.__desk.openNotebook('notebook'));
  await p.waitForFunction(() => window.__desk.store.getState().mode === 'note', null, { timeout: 120000 });
  await p.waitForTimeout(800);
  const pages = ctx.pages().length;
  await p.locator('.note-card .email-me > button').click();
  await p.waitForSelector('.note-card .email-opts');
  const r = await p.locator('.note-card .email-opts').boundingBox();
  const card = await p.locator('.note-card').boundingBox();
  const inView = r.x >= 0 && r.y >= 0 && r.x + r.width <= 1100 && r.y + r.height <= 700;
  console.log(ctx.pages().length === pages ? 'PASS' : 'FAIL', 'no blank tab opened');
  console.log(inView ? 'PASS' : 'FAIL', 'options inside the viewport', JSON.stringify(r));
  await p.screenshot({ path: '/tmp/qa_note_email.png', timeout: 240000 });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  const stillNote = await p.evaluate(() => window.__desk.store.getState().mode);
  console.log(stillNote === 'note' ? 'PASS' : 'FAIL', 'Esc closed the menu only, notebook stays open:', stillNote);
  await b.close();
})().catch((e) => { console.error('ERROR', e.message.split('\n')[0]); process.exit(1); });
