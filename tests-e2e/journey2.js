// Shared transition + restoration: phone -> open project -> case study -> back -> phone restored;
// laptop -> card -> case -> back -> laptop restored with same tab.
const { chromium } = require('playwright');
const wait = (p, f, t = 300000) => p.waitForFunction(f, null, { timeout: t });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 } });
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error') logs.push('console: ' + m.text().slice(0, 200)); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  const shot = (n) => p.screenshot({ path: `/tmp/k_${n}.png`, timeout: 300000 });
  const flow = process.env.FLOW || 'phone';
  await p.goto('http://localhost:3000/?quality=light', { waitUntil: 'networkidle' });
  await wait(p, () => window.__desk && window.__desk.store.getState().mode === 'desk');
  if (flow === 'phone') {
    await p.evaluate(() => window.__desk.openPhone());
    await wait(p, () => window.__desk.store.getState().mode === 'phone');
    await p.waitForTimeout(1000);
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(600);
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(800);
    console.log('carousel', await p.evaluate(() => window.__desk.store.getState().carousel));
    await p.click('.phone-card.is-current .phone-open', { force: true });
  } else {
    await p.evaluate(() => window.__desk.openLaptop());
    await wait(p, () => window.__desk.store.getState().mode === 'laptop');
    await p.waitForTimeout(1000);
    await p.click('.br-group:nth-of-type(4) .br-tab:nth-of-type(2) .br-tab-btn').catch(() => {});
    await p.click('text=Selected Case Studies').catch(() => {});
    await p.waitForTimeout(600);
    await shot('laptop_cases');
    await p.click('.pg-card >> nth=0');
  }
  await p.waitForTimeout(250);
  await shot(flow + '_mid');
  await wait(p, () => location.pathname.startsWith('/work/'));
  await wait(p, () => document.querySelector('.case-body.is-revealed'));
  await p.waitForTimeout(1200);
  console.log('case url', p.url());
  await shot(flow + '_case');
  await p.click('.back-link');
  await wait(p, () => location.pathname === '/');
  await wait(p, () => window.__desk && ['phone', 'laptop'].includes(window.__desk.store.getState().mode));
  await p.waitForTimeout(2500);
  console.log('restored', JSON.stringify(await p.evaluate(() => { const s = window.__desk.store.getState(); return { mode: s.mode, carousel: s.carousel, tab: s.browser.activeTab }; })));
  await shot(flow + '_restored');
  console.log(logs.slice(0, 8).join('\n'));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
