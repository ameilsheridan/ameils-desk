'use client';
import gsap from 'gsap';
import * as THREE from 'three';
import { sfx } from '@/lib/audio';
import { useDesk, type BrowserState } from '@/lib/store';
import type { ReturnContext } from '@/lib/restore';
import { handBus } from './handBus';
import { rig } from './rig';
import { cameraPose } from './cameraPoses';

/**
 * Sequences the physical interactions: hands reach, devices move, camera travels.
 * Every sequence carries a token; starting a new one (e.g. Escape mid-pickup) interrupts it
 * and the new sequence animates from wherever things currently are.
 */
let token = 0;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tween = (vars: gsap.TweenVars) =>
  new Promise<void>((resolve) => {
    gsap.to(rig.anim, { ...vars, overwrite: 'auto', onComplete: () => resolve(), onInterrupt: () => resolve() });
  });

/** Where the phone is held: in front of the leaning-in camera, right of centre on wide screens. */
export function computeHoldPose(aspect = typeof window !== 'undefined' ? innerWidth / innerHeight : 1.6) {
  const pose = cameraPose(aspect, 1);
  const forward = pose.target.clone().sub(pose.position).normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(pose.fov / 2));
  // keep the phone comfortably readable: ~62% of viewport height, never wider than ~70% width
  const d = Math.max(0.29, 0.1476 / (0.62 * 2 * tanHalf), 0.0716 / (0.7 * 2 * tanHalf * aspect));
  rig.holdDistance = d;
  const side = aspect > 1.15 ? Math.min(0.085, d * tanHalf * aspect * 0.32) : 0;
  rig.holdPhone.pos.copy(pose.position).addScaledVector(forward, d).addScaledVector(right, side).addScaledVector(up, -0.004);
  // phone local axes: +X right, +Y screen normal, -Z top of phone
  const back = forward.clone().negate();
  const m = new THREE.Matrix4().makeBasis(right, back, up.clone().negate());
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  // a natural, slightly angled hold
  q.premultiply(new THREE.Quaternion().setFromAxisAngle(up, THREE.MathUtils.degToRad(side ? -7 : 0)));
  q.premultiply(new THREE.Quaternion().setFromAxisAngle(right, THREE.MathUtils.degToRad(4)));
  rig.holdPhone.quat.copy(q);
}

export async function openPhone() {
  const s = useDesk.getState();
  if (s.mode !== 'desk') return;
  const my = ++token;
  s.dismissHint();
  s.setMode('toPhone');
  computeHoldPose();
  if (rig.reduced) {
    gsap.set(rig.anim, { phoneT: 1, camPhone: 1, dof: 1 });
    sfx('pickup', 0.4);
    s.setMode('phone');
    s.setPhase('hold');
    s.setOverlayVisible(true);
    return;
  }
  s.setPhase('reach');
  await handBus.arrive('right', 520);
  if (my !== token) return;
  s.setPhase('grip');
  await wait(170);
  if (my !== token) return;
  sfx('pickup', 0.45);
  s.setPhase('lift');
  await Promise.all([
    tween({ phoneT: 1, duration: 0.85, ease: 'power2.inOut' }),
    tween({ camPhone: 1, dof: 1, duration: 0.95, ease: 'power2.inOut' }),
  ]);
  if (my !== token) return;
  s.setMode('phone');
  s.setPhase('hold');
  s.setOverlayVisible(true);
}

export async function openLaptop() {
  const s = useDesk.getState();
  if (s.mode !== 'desk') return;
  const my = ++token;
  s.dismissHint();
  s.setMode('toLaptop');
  if (!rig.reduced) {
    s.setPhase('press');
    await handBus.arrive('right', 480);
    if (my !== token) return;
    sfx('click', 0);
    await wait(110);
    if (my !== token) return;
  } else {
    sfx('click', 0);
  }
  s.setPhase('zoom');
  if (rig.reduced) {
    gsap.set(rig.anim, { camLaptop: 1 });
  } else {
    let shown = false;
    await new Promise<void>((resolve) => {
      gsap.to(rig.anim, {
        camLaptop: 1, duration: 1.15, ease: 'power3.inOut', overwrite: 'auto',
        onUpdate: () => {
          if (!shown && rig.anim.camLaptop > 0.82 && my === token) {
            shown = true;
            useDesk.getState().setOverlayVisible(true);
          }
        },
        onComplete: () => resolve(),
        onInterrupt: () => resolve(),
      });
    });
  }
  if (my !== token) return;
  s.setMode('laptop');
  s.setPhase('idle');
  s.setOverlayVisible(true);
}

/** Reach for the cup, take a sip, put it back. */
export async function sipCoffee() {
  const s = useDesk.getState();
  if (s.mode !== 'desk') return;
  const my = ++token;
  s.setHover(null);
  s.setMode('sipping');
  if (rig.reduced) {
    sfx('sip', 0.4);
    await wait(500);
    if (my === token) s.setMode('desk');
    return;
  }
  s.setPhase('reach');
  await handBus.arrive('right', 900);
  if (my !== token) return;
  s.setPhase('grip');
  await wait(260);
  if (my !== token) return;
  sfx('pickup', 0.4);
  s.setPhase('lift');
  await tween({ sipT: 1, duration: 1.2, ease: 'power3.inOut' });
  if (my !== token) return;
  s.setPhase('hold');
  await tween({ sipTilt: 1, duration: 0.7, ease: 'sine.inOut' });
  sfx('sip', 0.15);
  await wait(850);
  await tween({ sipTilt: 0, duration: 0.6, ease: 'sine.inOut' });
  if (my !== token) return;
  s.setPhase('lower');
  await tween({ sipT: 0, duration: 1.1, ease: 'power3.inOut' });
  if (my !== token) return;
  sfx('cup', 0.4);
  s.setPhase('release');
  await wait(320);
  if (my !== token) return;
  s.setMode('desk');
  s.setPhase('idle');
}

/** Lean over the notebook, open it and show the contact card. */
export async function openNotebook() {
  const s = useDesk.getState();
  if (s.mode !== 'desk') return;
  const my = ++token;
  s.setHover(null);
  s.setMode('toNote');
  sfx('page', -0.5);
  await Promise.all([
    tween({ camNote: 1, duration: rig.reduced ? 0.01 : 1.0, ease: 'power3.inOut' }),
    new Promise<void>((resolve) => gsap.to(rig.anim, { noteOpen: 1, duration: rig.reduced ? 0.01 : 0.9, delay: rig.reduced ? 0 : 0.35, ease: 'power2.inOut', overwrite: 'auto', onComplete: () => resolve(), onInterrupt: () => resolve() })),
  ]);
  if (my !== token) return;
  s.setMode('note');
  s.setPhase('idle');
}

export async function backToDesk() {
  const s = useDesk.getState();
  const m = s.mode;
  if (m === 'desk' || m === 'loading' || m === 'returning' || m === 'sipping') return;
  if (m === 'note' || m === 'toNote') {
    const my = ++token;
    s.setMode('returning');
    sfx('page', -0.5);
    await Promise.all([
      tween({ noteOpen: 0, duration: rig.reduced ? 0.01 : 0.6, ease: 'power2.inOut' }),
      new Promise<void>((resolve) => gsap.to(rig.anim, { camNote: 0, duration: rig.reduced ? 0.01 : 0.95, delay: rig.reduced ? 0 : 0.2, ease: 'power3.inOut', overwrite: 'auto', onComplete: () => resolve(), onInterrupt: () => resolve() })),
    ]);
    if (my !== token) return;
    s.setMode('desk');
    s.setPhase('idle');
    return;
  }
  const my = ++token;
  s.setOverlayVisible(false);
  s.setMode('returning');
  if (m === 'phone' || m === 'toPhone') {
    s.setPhase('lower');
    const dur = rig.reduced ? 0.01 : 0.2 + 0.65 * rig.anim.phoneT;
    await Promise.all([
      tween({ phoneT: 0, duration: dur, ease: 'power2.inOut' }),
      tween({ camPhone: 0, dof: 0, duration: dur + 0.1, ease: 'power2.inOut' }),
    ]);
    if (my !== token) return;
    sfx('place', 0.45);
    s.setPhase('release');
    await wait(rig.reduced ? 0 : 260);
  } else {
    sfx('back', 0);
    await tween({ camLaptop: 0, duration: rig.reduced ? 0.01 : 0.95, ease: 'power3.inOut' });
  }
  if (my !== token) return;
  s.setMode('desk');
  s.setPhase('idle');
}

/** Restores the device state the visitor left from (Back from a case study). */
export function restoreFrom(ret: ReturnContext) {
  const s = useDesk.getState();
  ++token;
  if (ret.device === 'phone') {
    computeHoldPose();
    gsap.set(rig.anim, { phoneT: 1, camPhone: 1, dof: 1 });
    s.setCarousel(ret.carousel ?? 0);
    s.setMode('phone');
    s.setPhase('hold');
    s.setOverlayVisible(true);
  } else if (ret.device === 'laptop') {
    gsap.set(rig.anim, { camLaptop: 1 });
    if (ret.browser) s.setBrowser(() => ret.browser as BrowserState);
    s.setMode('laptop');
    s.setOverlayVisible(true);
  }
}
