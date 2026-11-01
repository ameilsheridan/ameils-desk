// usage: node shot.js <out.png> [w] [h] [script-name]
const { chromium } = require('playwright');
const [out, W = 1440, H = 900, action = 'desk', extra = ''] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  const logs = []; global.__logs = logs;
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await p.goto('http://localhost:3000/' + extra, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 240000 });
  await p.waitForTimeout(1500);
  const t0 = Date.now();
  const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  if (action === 'hoverPhone') {
    await p.evaluate(() => window.__desk.store.getState().setHover('phone'));
    await p.waitForTimeout(2500);
  } else if (action === 'hoverLaptop') {
    await p.evaluate(() => window.__desk.store.getState().setHover('laptop'));
    await p.waitForTimeout(2500);
  } else if (action === 'phone') {
    await p.evaluate(() => window.__desk.openPhone());
    await p.waitForFunction(() => window.__desk.store.getState().mode === 'phone', null, { timeout: 60000 });
    await p.waitForTimeout(2500);
  } else if (action === 'laptop') {
    await p.evaluate(() => window.__desk.openLaptop());
    await p.waitForFunction(() => window.__desk.store.getState().mode === 'laptop', null, { timeout: 60000 });
    await p.waitForTimeout(1500);
  }
  await p.screenshot({ path: out, timeout: 180000 });
  if (process.env.DEBUG_OVERLAY) console.log(JSON.stringify(await p.evaluate(() => {
    const d = window.__desk; const el = d.overlayEls.phone; const r = el.getBoundingClientRect();
    return { size: d.overlaySize, transform: el.style.transform.slice(0, 200), rect: [r.x, r.y, r.width, r.height].map(Math.round),
      opacity: getComputedStyle(el).opacity, cls: el.className, phoneT: d.rig.anim.phoneT, hold: d.rig.holdDistance };
  })));
  console.log(JSON.stringify({ fps, hands: await p.evaluate(() => window.__hands), mode: await p.evaluate(() => window.__desk.store.getState().mode) }));
  console.log(logs.slice(0, 12).join('\n'));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); console.error((global.__logs||[]).slice(0,15).join('\n')); process.exit(1); });
