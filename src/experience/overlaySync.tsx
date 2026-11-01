'use client';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig, screenInfo, type ScreenInfo } from './rig';
import { laptopFill } from './cameraPoses';

/** DOM elements that are pinned onto 3D screens / devices. Registered by the overlay components. */
export const overlayEls = {
  phone: null as HTMLElement | null,
  laptop: null as HTMLElement | null,
  hotLaptop: null as HTMLElement | null,
  hotPhone: null as HTMLElement | null,
  hotCup: null as HTMLElement | null,
  hotNote: null as HTMLElement | null,
  hotResume: null as HTMLElement | null,
};

/** Pixel size the DOM screens are laid out at (≈ their final on-screen size, so text stays crisp). */
export const overlaySize = { phone: { w: 300, h: 636 }, laptop: { w: 1200, h: 750 }, fullscreen: false };

// --- 2D projective transform (maps a w×h element onto 4 projected corners) --------------
type M3 = number[];
const adj = (m: M3): M3 => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
];
const mul = (a: M3, b: M3): M3 => {
  const c: M3 = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0;
    for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
    c[3 * i + j] = s;
  }
  return c;
};
const mulv = (m: M3, v: number[]) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
const basis = (p: number[]) => {
  const m = [p[0], p[2], p[4], p[1], p[3], p[5], 1, 1, 1];
  const v = mulv(adj(m), [p[6], p[7], 1]);
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
};
export function matrix3d(w: number, h: number, dst: number[]) {
  const t = mul(basis(dst), adj(basis([0, 0, w, 0, 0, h, w, h])));
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`;
}

const _v = new THREE.Vector3();
const _info: { phone?: ScreenInfo; laptop?: ScreenInfo } = {};

function corners(info: ScreenInfo, camera: THREE.Camera, W: number, H: number): number[] | null {
  const out: number[] = [];
  const pts = [[-1, 1], [1, 1], [-1, -1], [1, -1]]; // TL, TR, BL, BR
  for (const [sx, sy] of pts) {
    _v.copy(info.center).addScaledVector(info.right, (sx * info.width) / 2).addScaledVector(info.up, (sy * info.height) / 2).project(camera);
    if (_v.z > 1 || _v.z < -1) return null;
    out.push((_v.x * 0.5 + 0.5) * W, (-_v.y * 0.5 + 0.5) * H);
  }
  return out;
}

/** Runs every frame inside the Canvas after the camera has moved. */
export function OverlaySync() {
  useFrame(({ camera, size }) => {
    const W = size.width, H = size.height;
    if (overlayEls.phone && rig.phoneScreen) {
      const info = (_info.phone = screenInfo(rig.phoneScreen, _info.phone));
      const c = corners(info, camera, W, H);
      if (c) overlayEls.phone.style.transform = matrix3d(overlaySize.phone.w, overlaySize.phone.h, c);
    }
    if (overlayEls.laptop && rig.laptopScreen) {
      if (overlaySize.fullscreen) overlayEls.laptop.style.transform = '';
      else {
        const info = (_info.laptop = screenInfo(rig.laptopScreen, _info.laptop));
        const c = corners(info, camera, W, H);
        if (c) overlayEls.laptop.style.transform = matrix3d(overlaySize.laptop.w, overlaySize.laptop.h, c);
      }
    }
    const place = (el: HTMLElement | null, obj: THREE.Object3D | null, dy = 0) => {
      if (!el || !obj) return;
      obj.getWorldPosition(_v);
      _v.y += dy;
      _v.project(camera);
      const x = (_v.x * 0.5 + 0.5) * W;
      el.style.transform = `translate(${x}px, ${(-_v.y * 0.5 + 0.5) * H}px) translate(-50%, -50%)`;
      el.dataset.side = x > W * 0.72 ? 'end' : x < W * 0.28 ? 'start' : 'center';
    };
    place(overlayEls.hotLaptop, rig.laptopScreen);
    place(overlayEls.hotPhone, rig.phone, 0.01);
    place(overlayEls.hotCup, rig.cup, 0.04);
    place(overlayEls.hotNote, rig.notebook, 0.01);
    place(overlayEls.hotResume, rig.resume, 0.01);
  });
  return null;
}

/** Recomputes DOM screen sizes for the current viewport (call on resize / pose change). */
export function updateOverlaySizes(W: number, H: number, fov: number, holdDistance: number) {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const aspect = W / H;
  // phone: on-screen height of the held screen (0.1440 m tall)
  const ph = Math.round((0.144 / (2 * holdDistance * tanHalf)) * H);
  overlaySize.phone = { w: Math.round(ph * (0.068 / 0.144)), h: ph };
  // laptop: screen fills `fill` of the limiting viewport dimension (see laptopPose)
  overlaySize.fullscreen = aspect < 1.1;
  const fill = laptopFill(aspect);
  const lw = aspect > 1.6 ? 1.6 * fill * H : fill * W;
  overlaySize.laptop = { w: Math.round(lw), h: Math.round(lw / 1.6) };
}
