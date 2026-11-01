import * as THREE from 'three';
import contact from '@/data/contact.json';

const W = 1024, H = 1472; // matches the page aspect (0.136 x 0.196 m)
const INK = '#14245a';
const HAND = '"Caveat", "Segoe Print", "Bradley Hand", cursive';

function doodleCup(c: CanvasRenderingContext2D, x: number, y: number) {
  c.beginPath();
  c.moveTo(x, y); c.lineTo(x + 8, y + 70); c.quadraticCurveTo(x + 45, y + 84, x + 82, y + 70); c.lineTo(x + 90, y);
  c.moveTo(x - 6, y); c.lineTo(x + 96, y);
  c.moveTo(x + 90, y + 14); c.bezierCurveTo(x + 125, y + 12, x + 125, y + 52, x + 86, y + 50);
  for (const dx of [25, 47, 69]) { c.moveTo(x + dx, y - 14); c.bezierCurveTo(x + dx - 10, y - 30, x + dx + 10, y - 42, x + dx, y - 58); }
  c.stroke();
}

function doodleStar(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.stroke();
}

function doodleEnvelope(c: CanvasRenderingContext2D, x: number, y: number) {
  c.beginPath();
  c.rect(x, y, 150, 98);
  c.moveTo(x, y); c.lineTo(x + 75, y + 56); c.lineTo(x + 150, y);
  c.stroke();
  // small heart seal
  c.beginPath();
  c.moveTo(x + 75, y + 76); c.bezierCurveTo(x + 50, y + 58, x + 62, y + 40, x + 75, y + 54); c.bezierCurveTo(x + 88, y + 40, x + 100, y + 58, x + 75, y + 76);
  c.fillStyle = '#e0605a'; c.fill();
}

/** Handwritten notes on the open notebook page, nudging visitors to get in touch. */
export function createNotebookPage() {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const draw = () => {
    c.clearRect(0, 0, W, H);
    // faint ruled lines
    c.strokeStyle = 'rgba(80, 110, 170, .16)'; c.lineWidth = 2;
    for (let y = 230; y < H - 60; y += 74) { c.beginPath(); c.moveTo(60, y); c.lineTo(W - 60, y); c.stroke(); }
    c.strokeStyle = 'rgba(220, 90, 90, .25)';
    c.beginPath(); c.moveTo(130, 40); c.lineTo(130, H - 40); c.stroke();

    c.fillStyle = INK; c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
    c.font = `700 112px ${HAND}`;
    c.fillText('Hello there!', 160, 200);
    c.lineWidth = 5; c.beginPath(); c.moveTo(165, 222); c.bezierCurveTo(330, 236, 480, 210, 640, 226); c.stroke();
    c.font = `700 78px ${HAND}`;
    c.fillText('Got a messy problem?', 160, 375);
    c.fillText('Let’s discover it,', 160, 449);
    c.fillText('then design the fix.', 160, 523);
    c.lineWidth = 6;
    doodleStar(c, 860, 360, 46);
    doodleCup(c, 800, 600);
    c.font = `700 72px ${HAND}`;
    c.fillText('Roles, projects or', 160, 745);
    c.fillText('just a design chat:', 160, 819);
    c.fillText('all welcome :)', 160, 893);
    doodleEnvelope(c, 170, 1000);
    c.font = `700 70px ${HAND}`;
    c.fillText('write to me', 370, 1060);
    // arrow toward the contact card
    c.lineWidth = 5; c.beginPath(); c.moveTo(380, 1090); c.bezierCurveTo(560, 1180, 720, 1150, 880, 1040); c.stroke();
    c.beginPath(); c.moveTo(880, 1040); c.lineTo(842, 1046); c.moveTo(880, 1040); c.lineTo(872, 1078); c.stroke();
    c.font = `700 60px ${HAND}`;
    c.fillText(contact.email, 160, 1300);
    tex.needsUpdate = true;
  };
  draw();
  if (typeof document !== 'undefined' && document.fonts) {
    Promise.all([document.fonts.load(`700 60px Caveat`), document.fonts.load(`500 60px Caveat`), document.fonts.load(`600 60px Caveat`)]).then(draw, draw);
  }
  return tex;
}
