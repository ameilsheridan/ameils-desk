const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  // 1) direct project URL: no WebGL engine, no model download
  const reqs = [];
  p.on('request', (r) => reqs.push(r.url()));
  await p.goto('http://localhost:3000/work/kl-transit', { waitUntil: 'networkidle' });
  const heavy = reqs.filter((u) => /desk\.glb|textures\//.test(u));
  const jsBytes = await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'script').reduce((a, e) => a + (e.transferSize || 0), 0));
  const hasCanvas = await p.evaluate(() => !!document.querySelector('canvas'));
  console.log('direct /work/kl-transit:', JSON.stringify({ heavyRequests: heavy.length, canvas: hasCanvas, jsKB: Math.round(jsBytes / 1024), h1: await p.textContent('h1') }));
  // 2) keyboard-only journey on the desk
  await p.goto('http://localhost:3000/?quality=light', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 300000 });
  const seq = [];
  for (let i = 0; i < 12; i++) {
    await p.keyboard.press('Tab');
    const t = await p.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40));
    seq.push(t);
    if (t && t.startsWith('Pick up the phone')) break;
  }
  console.log('tab order:', JSON.stringify(seq));
  await p.waitForTimeout(500);
  console.log('hover on focus:', await p.evaluate(() => window.__desk.store.getState().hover));
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__desk.store.getState().mode === 'phone', null, { timeout: 300000 });
  await p.waitForTimeout(800);
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(400);
  console.log('carousel after → →:', await p.evaluate(() => window.__desk.store.getState().carousel));
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => window.__desk.store.getState().mode === 'desk', null, { timeout: 300000 });
  await p.waitForTimeout(500);
  console.log('focus after Esc:', await p.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40)));
  await p.keyboard.press('Shift+Tab');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__desk.store.getState().mode === 'laptop', null, { timeout: 300000 });
  await p.waitForTimeout(800);
  console.log('laptop focus:', await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 90)));
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => window.__desk.store.getState().mode === 'desk', null, { timeout: 300000 });
  console.log('back to desk OK');
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
