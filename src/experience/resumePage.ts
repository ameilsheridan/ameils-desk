import * as THREE from 'three';
import resume from '@/data/resume.json';

const W = 1240, H = 1754; // A4
const SANS = '"Instrument Sans Variable", "Instrument Sans", ui-sans-serif, sans-serif';

function wrap(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 3) {
  const words = text.split(' ');
  let line = '', n = 0;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (c.measureText(t).width > maxW && line) {
      c.fillText(line, x, y); y += lh; line = w; n++;
      if (n >= maxLines) return y;
    } else line = t;
  }
  if (line) { c.fillText(line, x, y); y += lh; }
  return y;
}

/** A printed one-page résumé lying on the desk (readable when the camera leans in). */
export function createResumePage() {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const draw = () => {
    c.fillStyle = '#fbf8f2'; c.fillRect(0, 0, W, H);
    const L = 110, R = W - 110;
    c.fillStyle = '#1b1712';
    c.font = `600 96px ${SANS}`; c.fillText(resume.name, L, 210);
    c.font = `500 40px ${SANS}`; c.fillStyle = '#c2683f'; c.fillText(`${resume.title} · ${resume.location}`, L, 275);
    c.fillStyle = '#4a4239'; c.font = `400 30px ${SANS}`;
    let y = wrap(c, resume.summary, L, 350, R - L, 44, 3) + 30;
    c.fillStyle = '#1b1712'; c.fillRect(L, y, R - L, 3); y += 70;
    c.font = `600 34px ${SANS}`; c.fillStyle = '#c2683f'; c.fillText('EXPERIENCE', L, y); y += 64;
    for (const e of resume.experience) {
      c.fillStyle = '#1b1712'; c.font = `600 40px ${SANS}`; c.fillText(e.org, L, y);
      c.font = `500 28px ${SANS}`; c.fillStyle = '#6b6258';
      const w = c.measureText(e.when).width; c.fillText(e.when, R - w, y);
      y += 44; c.fillStyle = '#3a332c'; c.font = `500 30px ${SANS}`; c.fillText(e.role, L, y); y += 48;
      c.font = `400 27px ${SANS}`; c.fillStyle = '#4a4239';
      for (const h of e.highlights.slice(0, 2)) { c.fillText('•', L, y); y = wrap(c, h, L + 30, y, R - L - 30, 38, 2) + 8; }
      y += 34;
    }
    c.font = `600 34px ${SANS}`; c.fillStyle = '#c2683f'; c.fillText('EDUCATION', L, y); y += 56;
    for (const e of [...resume.education, ...resume.certificates]) {
      c.fillStyle = '#1b1712'; c.font = `500 28px ${SANS}`; c.fillText(`${e.title}, ${e.org}`, L, y);
      c.fillStyle = '#6b6258'; const w = c.measureText(e.when).width; c.fillText(e.when, R - w, y); y += 42;
    }
    tex.needsUpdate = true;
  };
  draw();
  if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(draw);
  return tex;
}
