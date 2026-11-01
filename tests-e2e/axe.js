const { chromium } = require('playwright');
const axeSrc = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  for (const url of ['/work', '/work/phis', '/?quality=light']) {
    await p.goto('http://localhost:3000' + url, { waitUntil: 'networkidle' });
    if (url.startsWith('/?')) await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 300000 });
    await p.addScriptTag({ content: axeSrc });
    const r = await p.evaluate(async () => {
      const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] });
      return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target.join(' ') }));
    });
    console.log(url, JSON.stringify(r));
  }
  // the desk stays mounted (hidden, inert) under other pages: audit a page reached from the desk
  await p.close();
  p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://localhost:3000/?quality=light', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 300000 });
  await p.locator('.topnav nav a[href="/work"]:visible').click();
  await p.waitForFunction(() => location.pathname === '/work');
  await p.addScriptTag({ content: axeSrc });
  const r2 = await p.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] });
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target.join(' ') }));
  });
  console.log('/work (desk hidden underneath)', JSON.stringify(r2));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
