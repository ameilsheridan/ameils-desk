const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://localhost:3000/?quality=light&debug=occluder', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 300000 });
  await p.evaluate(() => window.__desk.openPhone());
  await p.waitForFunction(() => window.__desk.store.getState().mode === 'phone', null, { timeout: 300000 });
  await p.waitForTimeout(9000);
  await p.screenshot({ path: '/tmp/o_ready.png', timeout: 300000 });
  console.log(JSON.stringify(await p.evaluate(() => window.__hands)));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
