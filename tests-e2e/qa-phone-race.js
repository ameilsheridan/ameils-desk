// QA: aggressive timing. Back clicked the instant the case page shows (mid-transition), then real mouse clicks.
const { chromium } = require('playwright');
const wait = (p, f, t = 90000) => p.waitForFunction(f, null, { timeout: t });
const BASE = process.env.BASE || 'http://localhost:3000';
const Q = process.env.QUALITY || 'light';
let step = 'start';
const log = (m) => { step = m; console.log('[step]', m); };
const snap = (p) => p.evaluate(() => { const s = window.__desk && window.__desk.store.getState(); const a = window.__desk && window.__desk.rig.anim;
  return s ? { path: location.pathname, mode: s.mode, phase: s.phase, overlay: s.overlayVisible, phoneT: +a.phoneT.toFixed(2), camPhone: +a.camPhone.toFixed(2), ready: window.__desk.rig.ready, tPhase: document.querySelector('.transition-layer') ? 'layer-visible' : 'no-layer' } : { path: location.pathname, desk: false }; });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto(`${BASE}/?quality=${Q}`, { waitUntil: 'domcontentloaded' });
  await wait(p, () => window.__desk && window.__desk.store.getState().mode === 'desk');
  log('open phone'); await p.locator('.hotspot').nth(1).evaluate((el) => el.click());
  await wait(p, () => window.__desk.store.getState().mode === 'phone'); await p.waitForTimeout(600);
  log('open project'); await p.locator('.phone-card.is-current .phone-open').evaluate((el) => el.click());
  await wait(p, () => !!document.querySelector('.back-link'));
  log('back immediately'); await p.locator('.back-link').evaluate((el) => el.click());
  for (const t of [500, 2000, 6000, 12000]) { await p.waitForTimeout(t === 500 ? 500 : t - [500, 2000, 6000, 12000][[500, 2000, 6000, 12000].indexOf(t) - 1]); console.log(t + 'ms', JSON.stringify(await snap(p))); }
  await p.screenshot({ path: '/tmp/qa_race_after_back.png' });
  console.log('errors:', errs.join(' | ') || 'none');
  await b.close();
})().catch((e) => { console.error('FAIL at step:', step, '-', e.message.split('\n')[0]); process.exit(1); });
