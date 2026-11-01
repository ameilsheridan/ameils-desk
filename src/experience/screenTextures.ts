import * as THREE from 'three';
import { projects } from '@/lib/projects';

const FONT = '"Instrument Sans Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const fontsReady = () => (typeof document !== 'undefined' && document.fonts ? document.fonts.ready : Promise.resolve());

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function loadImages() {
  return Promise.all(
    projects.map((p) => new Promise<HTMLImageElement | null>((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = p.cover;
    })),
  );
}

/** Idle preview of the laptop browser (the live DOM browser takes over after the zoom). */
export function createLaptopTexture() {
  const W = 1280, H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  const draw = (imgs: (HTMLImageElement | null)[]) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    // tab strip
    ctx.fillStyle = '#ececf0';
    ctx.fillRect(0, 0, W, 56);
    [['#f25c78', 'Music'], ['#1f9d63', 'Hobby'], ['#f5b700', 'Ideas'], ['#2563eb', 'Work']].forEach(([c, label], i) => {
      ctx.fillStyle = c;
      rr(ctx, 60 + i * 150, 14, 84, 28, 14);
      ctx.fill();
      ctx.fillStyle = i === 2 ? '#111216' : '#fff';
      ctx.font = `600 15px ${FONT}`;
      ctx.fillText(label, 76 + i * 150, 33);
    });
    ctx.fillStyle = '#ffffff';
    rr(ctx, 650, 8, 230, 48, 12);
    ctx.fill();
    ctx.fillStyle = '#111216';
    ctx.font = `500 15px ${FONT}`;
    ctx.fillText('Product Design Portfolio', 670, 38);
    // toolbar + address bar
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 56, W, 54);
    ctx.fillStyle = '#f1f1f4';
    rr(ctx, 150, 66, 760, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#6b6e76';
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText('ameil.design/work/portfolio', 176, 88);
    // page
    ctx.fillStyle = '#111216';
    ctx.font = `600 56px ${FONT}`;
    ctx.letterSpacing = '-2px';
    ctx.fillText('Selected work', 64, 185);
    ctx.letterSpacing = '0px';
    const cats = ['All', 'Enterprise', 'AI', 'Healthcare', 'Personal'];
    let cx = 64;
    cats.forEach((c, i) => {
      ctx.font = `500 15px ${FONT}`;
      const w = ctx.measureText(c).width + 32;
      ctx.fillStyle = i === 0 ? '#111216' : '#f1f1f4';
      rr(ctx, cx, 206, w, 32, 16);
      ctx.fill();
      ctx.fillStyle = i === 0 ? '#fff' : '#111216';
      ctx.fillText(c, cx + 16, 227);
      cx += w + 10;
    });
    const cw = 368, ch = 230;
    projects.slice(0, 6).forEach((p, i) => {
      const x = 64 + (i % 3) * (cw + 24);
      const y = 270 + Math.floor(i / 3) * (ch + 86);
      ctx.save();
      rr(ctx, x, y, cw, ch, 14);
      ctx.clip();
      const img = imgs[i];
      if (img) ctx.drawImage(img, x, y, cw, ch);
      else {
        ctx.fillStyle = p.palette[0];
        ctx.fillRect(x, y, cw, ch);
      }
      ctx.restore();
      ctx.fillStyle = '#111216';
      ctx.font = `600 19px ${FONT}`;
      ctx.fillText(p.name, x, y + ch + 30);
      ctx.fillStyle = '#6b6e76';
      ctx.font = `400 14px ${FONT}`;
      ctx.fillText(p.category, x, y + ch + 52);
    });
    tex.needsUpdate = true;
  };
  draw([]);
  Promise.all([loadImages(), fontsReady()]).then(([imgs]) => draw(imgs));
  return tex;
}

/** Lock-screen look for the phone while it rests on the desk. */
export function createPhoneTexture() {
  const W = 480, H = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const draw = (imgs: (HTMLImageElement | null)[]) => {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1d1b4b');
    g.addColorStop(0.55, '#3d5af1');
    g.addColorStop(1, '#55d6c2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText('Saturday', W / 2, 150);
    ctx.font = `600 116px ${FONT}`;
    ctx.fillText('21:40', W / 2, 270);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    rr(ctx, 36, 640, W - 72, 210, 28);
    ctx.fill();
    if (imgs[0]) {
      ctx.save();
      rr(ctx, 60, 664, 160, 100, 14);
      ctx.clip();
      ctx.drawImage(imgs[0], 60, 664, 160, 100);
      ctx.restore();
    }
    ctx.fillStyle = '#111216';
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText('Projects', 240, 704);
    ctx.font = `400 19px ${FONT}`;
    ctx.fillStyle = '#6b6e76';
    ctx.fillText(`${projects.length} case studies`, 240, 734);
    ctx.fillStyle = '#111216';
    rr(ctx, 60, 784, W - 120, 44, 22);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText('Pick up to browse', W / 2, 813);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    rr(ctx, W / 2 - 70, H - 30, 140, 8, 4);
    ctx.fill();
    tex.needsUpdate = true;
  };
  draw([]);
  Promise.all([loadImages(), fontsReady()]).then(([imgs]) => draw(imgs));
  return tex;
}
