const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 600 } });
  await p.goto('http://localhost:3000/?quality=light', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__desk && window.__desk.store.getState().mode === 'desk', null, { timeout: 120000 });
  const res = await p.evaluate(async () => {
    const { rig } = window.__desk;
    const THREE = await import('/_next/static/chunks/does-not-exist.js').catch(() => null);
    return null;
  });
  // use the three objects already in the page: walk up from the phone to the scene
  const out = await p.evaluate(() => {
    const { rig } = window.__desk;
    const root = rig.phone.parent;
    const cam = rig.camera;
    const Ray = rig.phone.position.constructor; // Vector3 ctor
    const pts = [[900, 300], [880, 260], [930, 330]];
    const res = [];
    for (const [x, y] of pts) {
      const ndc = new Ray((x / 960) * 2 - 1, -(y / 600) * 2 + 1, 0.5).unproject(cam);
      const dir = ndc.sub(cam.position).normalize();
      // brute force: test meshes' bounding spheres along the ray
      const hits = [];
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.computeBoundingSphere();
        const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);
        const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
        const oc = c.clone().sub(cam.position);
        const t = oc.dot(dir);
        const d2 = oc.lengthSq() - t * t;
        if (t > 0 && d2 < r * r) hits.push([o.name, +t.toFixed(2), +r.toFixed(2)]);
      });
      hits.sort((a, b) => a[1] - b[1]);
      res.push(hits.slice(0, 6));
    }
    return res;
  });
  console.log(JSON.stringify(out));
  await b.close();
})();
