const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 500 } });
  await p.goto('http://localhost:3000/?quality=light', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 240000 });
  await p.evaluate(() => window.__desk.openPhone());
  await p.waitForFunction(() => window.__desk.store.getState().mode === 'phone', null, { timeout: 240000 });
  await p.waitForTimeout(1500);
  const before = await p.evaluate(() => ({ c: window.__desk.store.getState().carousel, active: document.activeElement?.outerHTML.slice(0, 80), vis: window.__desk.store.getState().overlayVisible }));
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => ({ c: window.__desk.store.getState().carousel, tr: document.querySelector('.phone-track').style.transform }));
  console.log(JSON.stringify({ before, after }));
  await b.close();
})();
