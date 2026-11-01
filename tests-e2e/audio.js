const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto('http://localhost:3000/work', { waitUntil: 'networkidle' });
  const rms = () => p.evaluate(async () => {
    const e = window.__audio;
    if (!e.ctx) return { state: 'no-context' };
    if (!window.__an) { window.__an = e.ctx.createAnalyser(); window.__an.fftSize = 2048; e.master.connect(window.__an); }
    await new Promise((r) => setTimeout(r, 400));
    const d = new Float32Array(2048); window.__an.getFloatTimeDomainData(d);
    let s = 0; for (const v of d) s += v * v;
    return { state: e.ctx.state, rms: +Math.sqrt(s / d.length).toFixed(5), master: +e.master.gain.value.toFixed(3) };
  });
  const before = await p.evaluate(() => ({ ctx: !!window.__audio.ctx }));
  await p.click('.sound-toggle');                        // real user gesture
  await p.waitForTimeout(1500);
  const on = await rms();
  const label = await p.textContent('.sound-toggle .sound-label');
  await p.click('.sound-more');
  await p.click('.btn-test');
  await p.waitForTimeout(150);
  const test = await rms();
  await p.click('.sound-toggle');                        // mute
  await p.waitForTimeout(1500);
  const off = await rms();
  console.log(JSON.stringify({ before, on, label, test, off }, null, 1));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
