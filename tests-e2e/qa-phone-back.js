// QA regression: phone -> project -> Back (link or browser back) must land on a held phone, repeatedly.
// Usage: QUALITY=light|balanced|high BACK=link|browser LOOPS=2 node tests-e2e/qa-phone-back.js
const { chromium } = require('playwright');
let step = 'start';
const wait = (p, f, t = 90000) => p.waitForFunction(f, null, { timeout: t });
const log = (m) => { step = m; console.log('[step]', m); };
const Q = process.env.QUALITY || 'light';
const BACK = process.env.BACK || 'link';
const LOOPS = Number(process.env.LOOPS || 2);
const BASE = process.env.BASE || 'http://localhost:3000';
const snap = (p) => p.evaluate(() => {
  const s = window.__desk && window.__desk.store.getState();
  const a = window.__desk && window.__desk.rig.anim;
  return s ? { mode: s.mode, phase: s.phase, overlay: s.overlayVisible, carousel: s.carousel, phoneT: +a.phoneT.toFixed(2), camPhone: +a.camPhone.toFixed(2), ready: window.__desk.rig.ready,
    phoneUiVisible: !!document.querySelector('.phone-ui.is-visible'), loaderDone: !!document.querySelector('.loader.is-done') } : null;
});
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: Number(process.env.VW || 960), height: Number(process.env.VH || 600) } });
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error') logs.push('console: ' + m.text().slice(0, 200)); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await p.goto(`${BASE}/?quality=${Q}`, { waitUntil: 'networkidle' });
  await wait(p, () => window.__desk && window.__desk.store.getState().mode === 'desk');
  let failed = false;
  for (let i = 0; i < LOOPS; i++) {
    log('click phone hotspot'); await p.locator('.hotspot').nth(1).evaluate((el) => el.click()); // real DOM click on the phone hotspot
    await wait(p, () => window.__desk.store.getState().mode === 'phone');
    await p.waitForTimeout(800);
    log('open project'); await p.locator('.phone-card.is-current .phone-open').evaluate((el) => el.click());
    await wait(p, () => location.pathname.startsWith('/work/'));
    await wait(p, () => document.querySelector('.case-body.is-revealed'));
    await p.waitForTimeout(800);
    log('back (' + BACK + ')'); if (BACK === 'browser') await p.goBack(); else await p.locator('.back-link').evaluate((el) => el.click());
    await wait(p, () => location.pathname === '/');
    console.log('back done, path', await p.evaluate(() => location.pathname));
    await p.waitForTimeout(Number(process.env.SETTLE || 8000));
    const st = await snap(p);
    console.log(`loop ${i + 1} (${Q}/${BACK}) after back`, JSON.stringify(st));
    const good = st && st.mode === 'phone' && st.phoneT === 1 && st.camPhone === 1 && st.phoneUiVisible && st.loaderDone;
    if (!good) { failed = true; await p.screenshot({ path: `/tmp/qa_phone_${Q}_${BACK}_${i}.png` }); }
    if (!good) break;
    await p.keyboard.press('Escape');
    await wait(p, () => window.__desk.store.getState().mode === 'desk');
  }
  console.log(logs.slice(0, 8).join('\n') || 'no console errors');
  console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FAIL at step:', step, '-', e.message.split(String.fromCharCode(10))[0]); process.exit(1); });
