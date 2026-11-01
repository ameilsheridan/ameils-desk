// QA: the 3D desk survives navigation. Return is instant, state is kept, and the hidden desk never reacts while away.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const ok = [];
const check = (name, pass, extra = '') => { ok.push(pass); console.log(pass ? 'PASS' : 'FAIL', name, extra); };
const wait = (p, f, t = 120000) => p.waitForFunction(f, null, { timeout: t });
const st = (p) => p.evaluate(() => { const s = window.__desk?.store.getState(); return s ? { mode: s.mode, paused: s.paused, carousel: s.carousel } : null; });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
  await p.goto(`${BASE}/?quality=light`, { waitUntil: 'domcontentloaded' });
  await wait(p, () => window.__desk && window.__desk.store.getState().mode === 'desk');
  const canvasBefore = await p.evaluate(() => { const c = document.querySelector('canvas'); window.__canvasMark = Math.random(); c.__mark = window.__canvasMark; return true; });
  // client-side navigation to other pages
  for (const [sel, path] of [['.topnav nav a[href="/about"]:visible', '/about'], ['.topnav nav a[href="/work"]:visible', '/work']]) {
    await p.click(sel); await wait(p, (x) => location.pathname === x, 30000).catch(() => {});
    await p.waitForFunction((x) => location.pathname === x, path, { timeout: 30000 });
    const s = await st(p);
    check(`on ${path}: desk paused`, s && s.paused === true, JSON.stringify(s));
    check(`on ${path}: only one #main`, (await p.locator('#main').count()) === 1);
    const tabbable = await p.evaluate(() => [...document.querySelectorAll('.spa-hidden button, .spa-hidden a')].filter((e) => e.tabIndex >= 0 && !e.closest('[inert]')).length);
    check(`on ${path}: hidden desk has nothing focusable`, tabbable === 0, String(tabbable));
    await p.goto; // no-op
    await p.evaluate(() => history.back());
    await wait(p, () => location.pathname === '/', 30000);
    const t0 = Date.now();
    await wait(p, () => window.__desk.store.getState().mode === 'desk' && !window.__desk.store.getState().paused, 5000);
    check(`back from ${path}: desk live again instantly`, Date.now() - t0 < 1500, `${Date.now() - t0}ms`);
    check(`back from ${path}: no loader shown`, await p.evaluate(() => !!document.querySelector('.loader.is-done')));
    check(`back from ${path}: same canvas element (not rebuilt)`, await p.evaluate(() => document.querySelector('canvas').__mark === window.__canvasMark));
  }
  // Contact in the nav must go to /contact from another page, not open the hidden notebook
  await p.click('.topnav nav a[href="/about"]:visible'); await p.waitForFunction(() => location.pathname === '/about');
  await p.click('.topnav nav a[href="/contact"]:visible'); await p.waitForFunction(() => location.pathname === '/contact', null, { timeout: 15000 }).catch(() => {});
  check('nav Contact on /about goes to /contact', p.url().endsWith('/contact'), p.url());
  check('hidden desk stayed in desk mode', (await st(p)).mode === 'desk');
  // keys must not reach the hidden desk
  await p.keyboard.press('Escape'); await p.keyboard.press('ArrowRight');
  check('keys ignored by hidden desk', (await st(p)).mode === 'desk');
  // phone state survives a trip to a case study via the nav
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await wait(p, () => window.__desk && window.__desk.store.getState().mode === 'desk');
  await p.locator('.hotspot').nth(1).evaluate((el) => el.click());
  await wait(p, () => window.__desk.store.getState().mode === 'phone');
  await p.waitForTimeout(500); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  await p.locator('.phone-card.is-current .phone-open').evaluate((el) => el.click());
  await p.waitForFunction(() => location.pathname.startsWith('/work/'), null, { timeout: 30000 });
  check('on case page: back label says phone', (await p.locator('.back-link').innerText()).includes('Back to phone'));
  await p.locator('.back-link').evaluate((el) => el.click());
  await wait(p, () => location.pathname === '/');
  await p.waitForTimeout(800);
  const s2 = await st(p);
  check('back to phone: still holding the phone on the same card', s2.mode === 'phone' && s2.carousel === 1 && !s2.paused, JSON.stringify(s2));
  check('no transition ghost left', (await p.locator('.transition-layer').count()) === 0);
  console.log('page errors:', errs.join(' | ') || 'none');
  await b.close();
  const bad = ok.filter((x) => !x).length;
  console.log(bad ? `RESULT: ${bad} FAILED` : 'RESULT: ALL PASS');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message.split('\n')[0]); process.exit(1); });
