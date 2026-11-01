// Full interaction journey with screenshots at each step.
const { chromium } = require('playwright');
const [W = 960, H = 600, q = 'balanced', prefix = '/tmp/j'] = process.argv.slice(2);
const wait = (p, f, t = 240000) => p.waitForFunction(f, null, { timeout: t });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error') logs.push('console: ' + m.text().slice(0, 240)); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  const shot = async (name) => { await p.screenshot({ path: `${prefix}_${name}.png`, timeout: 240000 }); console.log('shot', name, JSON.stringify(await p.evaluate(() => ({ mode: window.__desk?.store.getState().mode, hands: window.__hands })))); };
  await p.goto(`http://localhost:3000/?quality=${q}`, { waitUntil: 'networkidle' });
  await wait(p, () => window.__desk && window.__desk.store.getState().mode === 'desk');
  for (const step of (process.env.STEPS || 'hoverPhone,phone,next,back,hoverLaptop,laptop').split(',')) {
    if (step === 'desk') { await p.waitForTimeout(800); }
    if (step === 'hoverPhone') { await p.evaluate(() => window.__desk.store.getState().setHover('phone')); await p.waitForTimeout(6000); }
    if (step === 'hoverLaptop') { await p.evaluate(() => window.__desk.store.getState().setHover('laptop')); await p.waitForTimeout(6000); }
    if (step === 'phone') { await p.evaluate(() => { window.__desk.store.getState().setHover(null); window.__desk.openPhone(); }); await wait(p, () => window.__desk.store.getState().mode === 'phone'); await p.waitForTimeout(5000); }
    if (step === 'next') { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1200); }
    if (step === 'back') { await p.keyboard.press('Escape'); await wait(p, () => window.__desk.store.getState().mode === 'desk'); await p.waitForTimeout(3000); }
    if (step === 'laptop') { await p.evaluate(() => { window.__desk.store.getState().setHover(null); window.__desk.openLaptop(); }); await wait(p, () => window.__desk.store.getState().mode === 'laptop'); await p.waitForTimeout(2500); }
    await shot(step);
  }
  console.log(logs.slice(0, 10).join('\n'));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
