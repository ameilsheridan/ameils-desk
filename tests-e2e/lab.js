const { chromium } = require('playwright');
const [q = 'pose=hold', out = '/tmp/lab.png'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1290, height: 440 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:3000/lab?' + q, { waitUntil: 'networkidle' });
  await p.waitForTimeout(6000);
  await p.screenshot({ path: out, timeout: 120000 });
  console.log(errs.join('\n') || 'ok');
  await b.close();
})();
