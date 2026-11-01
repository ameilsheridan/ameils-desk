// QA: desk framing at many viewport sizes. Usage: SIZES="1526x758,1920x950" TAG=before node tests-e2e/qa-viewports.js
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const SIZES = (process.env.SIZES || '1526x758,1366x657,1920x950,1280x620,1024x768,820x1180,390x844').split(',');
const TAG = process.env.TAG || 'shot';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const sz of SIZES) {
    const [w, h] = sz.split('x').map(Number);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(`${BASE}/?quality=light`, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 120000 });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `/tmp/vp_${TAG}_${sz}.png`, timeout: 240000 });
    console.log('shot', sz);
    await p.close();
  }
  await b.close();
})().catch((e) => { console.error('FAIL', e.message.split('\n')[0]); process.exit(1); });
