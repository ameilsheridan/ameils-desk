// Generates original abstract cover art (SVG) for each project in the registry.
// Placeholder art: replace public/projects/<slug>.svg with real (NDA-sanitised) imagery.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const projects = JSON.parse(readFileSync(join(root, 'src/data/projects.json'), 'utf8'));
mkdirSync(join(root, 'public/projects'), { recursive: true });

function rand(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

for (const [i, p] of projects.entries()) {
  // derive everything from the project's brand colour so covers match the case study hero
  const mix = (a, b, t) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(a.slice(1 + i, 3 + i), 16) * (1 - t) + parseInt(b.slice(1 + i, 3 + i), 16) * t).toString(16).padStart(2, '0')).join('');
  const brand = p.brand ?? p.palette[0];
  const bg = mix(brand, '#000000', 0.18), mid = mix(brand, '#ffffff', 0.25), accent = mix(brand, '#ffffff', 0.05), paper = '#ffffff';
  const r = rand(97 + i * 131);
  const W = 1600, H = 1000;
  const layout = i % 3;
  let ui = '';
  // a floating "screen" composition, different per project
  const sx = 260 + r() * 80, sy = 170 + r() * 40, sw = 1080, sh = 680;
  ui += `<rect x="${sx + 24}" y="${sy + 36}" width="${sw}" height="${sh}" rx="34" fill="#000" opacity=".22" filter="url(#blur)"/>`;
  ui += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="30" fill="${paper}"/>`;
  ui += `<rect x="${sx}" y="${sy}" width="${sw}" height="64" rx="30" fill="${mid}" opacity=".18"/>`;
  for (let d = 0; d < 3; d++) ui += `<circle cx="${sx + 40 + d * 26}" cy="${sy + 32}" r="8" fill="${mid}" opacity=".5"/>`;
  if (layout === 0) {
    ui += `<rect x="${sx + 40}" y="${sy + 100}" width="230" height="${sh - 140}" rx="18" fill="${mid}" opacity=".14"/>`;
    for (let k = 0; k < 6; k++) ui += `<rect x="${sx + 64}" y="${sy + 130 + k * 56}" width="${120 + r() * 60}" height="16" rx="8" fill="${mid}" opacity=".45"/>`;
    for (let k = 0; k < 3; k++) {
      const cx = sx + 300 + k * 250;
      ui += `<rect x="${cx}" y="${sy + 100}" width="230" height="160" rx="18" fill="${k === 1 ? accent : '#fff'}" opacity="${k === 1 ? 0.9 : 1}"/>`;
      ui += `<rect x="${cx + 24}" y="${sy + 130}" width="90" height="14" rx="7" fill="${bg}" opacity=".35"/>`;
      ui += `<rect x="${cx + 24}" y="${sy + 170}" width="140" height="34" rx="10" fill="${bg}" opacity=".8"/>`;
    }
    ui += `<rect x="${sx + 300}" y="${sy + 290}" width="730" height="330" rx="18" fill="#fff"/>`;
    let path = `M ${sx + 330} ${sy + 560}`;
    for (let k = 1; k <= 10; k++) path += ` L ${sx + 330 + k * 66} ${sy + 560 - (k * 18 + r() * 110)}`;
    ui += `<path d="${path}" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (layout === 1) {
    for (let k = 0; k < 4; k++) {
      const yy = sy + 110 + k * 132;
      ui += `<rect x="${sx + 40}" y="${yy}" width="${sw - 80}" height="108" rx="18" fill="#fff"/>`;
      ui += `<circle cx="${sx + 100}" cy="${yy + 54}" r="26" fill="${k === 0 ? accent : mid}" opacity="${k === 0 ? 1 : 0.35}"/>`;
      ui += `<rect x="${sx + 150}" y="${yy + 30}" width="${260 + r() * 180}" height="16" rx="8" fill="${bg}" opacity=".75"/>`;
      ui += `<rect x="${sx + 150}" y="${yy + 62}" width="${160 + r() * 120}" height="12" rx="6" fill="${bg}" opacity=".3"/>`;
      ui += `<rect x="${sx + sw - 250}" y="${yy + 34}" width="170" height="40" rx="20" fill="${k === 0 ? bg : mid}" opacity="${k === 0 ? 0.9 : 0.2}"/>`;
    }
  } else {
    ui += `<rect x="${sx + 40}" y="${sy + 100}" width="${sw - 80}" height="${sh - 140}" rx="18" fill="${mid}" opacity=".12"/>`;
    for (let k = 0; k < 26; k++) {
      const cx = sx + 90 + r() * (sw - 180), cy = sy + 150 + r() * (sh - 240);
      ui += `<circle cx="${cx}" cy="${cy}" r="${10 + r() * 34}" fill="${r() > 0.6 ? accent : mid}" opacity="${0.25 + r() * 0.5}"/>`;
    }
    let p2 = `M ${sx + 80} ${sy + sh - 120}`;
    for (let k = 1; k <= 8; k++) p2 += ` Q ${sx + 80 + k * 115 - 60} ${sy + 160 + r() * 380} ${sx + 80 + k * 115} ${sy + 200 + r() * 360}`;
    ui += `<path d="${p2}" fill="none" stroke="${bg}" stroke-width="6" stroke-linecap="round" opacity=".7"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<radialGradient id="g" cx="30%" cy="20%" r="95%"><stop offset="0" stop-color="${mid}"/><stop offset=".65" stop-color="${bg}"/></radialGradient>
<filter id="blur" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="28"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<circle cx="${1300 + r() * 200}" cy="${120 + r() * 120}" r="${260 + r() * 100}" fill="${accent}" opacity=".18"/>
${ui}
</svg>`;
  writeFileSync(join(root, 'public/projects', `${p.slug}.svg`), svg);
}
console.log('covers:', projects.map((p) => p.slug).join(', '));
