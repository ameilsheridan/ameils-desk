'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { easing } from 'maath';
import { useDesk } from '@/lib/store';
import { handBus, type HandSide } from '../handBus';
import { rig, screenInfo, screenPointToWorld, type ScreenInfo } from '../rig';
import { HandRig, POSES, clonePose, dampPose, type Pose, type PoseName } from './HandRig';
import type { TexSet } from '../materials';
import { cupHandViewmodel, cupHoldWorld } from '../DeskProps';
import { GRIP, basisQuat } from './grips';
import { createHandMaterials } from '../materials';

/** The 11 controller states from the brief. */
export type HandState =
  | 'hidden' | 'entering' | 'hovering' | 'reaching' | 'pointing' | 'grabbing'
  | 'holding' | 'swiping' | 'tapping' | 'releasing' | 'exiting';

type Action =
  | { kind: 'swipe'; dir: 1 | -1; t0: number; dur: number; resolve: () => void }
  | { kind: 'tap'; point: THREE.Vector3; t0: number; dur: number; contact: number; touched: boolean; resolve: () => void };

type HandRuntime = {
  rig: HandRig;
  state: HandState;
  pose: Pose;
  wrist: THREE.Vector3;
  quat: THREE.Quaternion;
  visible: boolean;
  arrive: { resolve: () => void; until: number }[];
  action: Action | null;
};

/** `?slowmo=4` slows hand gestures for review/recording. */
const SLOW = typeof window !== 'undefined' ? Math.max(1, Number(new URLSearchParams(location.search).get('slowmo')) || 1) : 1;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export default function HandController({ textures }: { textures: TexSet }) {
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const mats = useMemo(() => createHandMaterials(textures), [textures]);
  const hands = useMemo(() => {
    const make = (side: HandSide): HandRuntime => {
      const r = new HandRig(side, mats);
      r.setVisible(false);
      return {
        rig: r, state: 'hidden', pose: clonePose(POSES.relaxed), wrist: new THREE.Vector3(),
        quat: new THREE.Quaternion(), visible: false, arrive: [], action: null,
      };
    };
    return { right: make('right'), left: make('left') };
  }, [mats]);

  const tmp = useRef({
    fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(),
    tip: new THREE.Vector3(), target: new THREE.Vector3(), q: new THREE.Quaternion(),
    phoneInfo: null as ScreenInfo | null, laptopInfo: null as ScreenInfo | null,
    vmPos: new THREE.Vector3(), vmQuat: new THREE.Quaternion(),
    m: new THREE.Matrix4(),
  });

  useEffect(() => {
    for (const h of [hands.right, hands.left]) {
      scene.add(h.rig.root);
      scene.add(h.rig.forearm);
    }
    return () => {
      for (const h of [hands.right, hands.left]) {
        scene.remove(h.rig.root);
        scene.remove(h.rig.forearm);
        h.rig.dispose();
      }
    };
  }, [scene, hands]);

  // Public API for the director + phone UI
  useEffect(() => {
    return handBus.register({
      arrive: (side, timeoutMs) => new Promise<void>((resolve) => {
        if (rig.reduced) return resolve();
        hands[side].arrive.push({ resolve, until: performance.now() + timeoutMs });
      }),
      swipe: (dir) => new Promise<void>((resolve) => {
        if (rig.reduced) return resolve();
        hands.left.action?.resolve();
        hands.left.action = { kind: 'swipe', dir, t0: performance.now(), dur: 360 * SLOW, resolve };
      }),
      tap: (x, y) => new Promise<void>((resolve) => {
        if (rig.reduced || !rig.phoneScreen || !rig.camera) return resolve();
        const point = screenPointToWorld(rig.phoneScreen, rig.camera, x, y, size.width, size.height);
        hands.left.action?.resolve();
        hands.left.action = { kind: 'tap', point, t0: performance.now(), dur: 520 * SLOW, contact: 0.55, touched: false, resolve };
      }),
    });
  }, [hands, size.width, size.height]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const cam = state.camera as THREE.PerspectiveCamera;
    const t = tmp.current;
    const { mode, phase, hover } = useDesk.getState();
    cam.getWorldDirection(t.fwd);
    t.right.crossVectors(t.fwd, cam.up).normalize();
    t.up.crossVectors(t.right, t.fwd).normalize();
    const now = performance.now();

    const rest = (side: HandSide) =>
      cam.position.clone().addScaledVector(t.fwd, 0.3).addScaledVector(t.right, side === 'right' ? 0.24 : -0.24).addScaledVector(t.up, -0.4);
    const elbow = (side: HandSide) =>
      cam.position.clone().addScaledVector(t.fwd, 0.02).addScaledVector(t.right, side === 'right' ? 0.3 : -0.3).addScaledVector(t.up, -0.62);

    if (rig.laptopScreen) t.laptopInfo = screenInfo(rig.laptopScreen, t.laptopInfo ?? undefined);
    if (rig.phoneScreen) t.phoneInfo = screenInfo(rig.phoneScreen, t.phoneInfo ?? undefined);

    type Desire = {
      state: HandState;
      pose: PoseName;
      pos?: THREE.Vector3; // wrist target
      tip?: THREE.Vector3; // fingertip target (wrist solved from it)
      quat: THREE.Quaternion;
      smooth: number;
      attached?: boolean;
    };

    const hiddenDesire = (side: HandSide): Desire => ({
      state: hands[side].visible ? 'exiting' : 'hidden', pose: 'relaxed', pos: rest(side),
      quat: basisQuat(t.fwd.clone().addScaledVector(t.up, 0.6), t.up.clone().addScaledVector(t.fwd, -0.4)), smooth: 0.2,
    });

    // ---------------- right hand: phone grab/hold, laptop pointing
    const right = (): Desire => {
      const phone = rig.phone;
      if (!phone) return hiddenDesire('right');
      const gripWorld = (blend: number) => {
        phone.updateWorldMatrix(true, false);
        const local = GRIP.desk.pos.clone().lerp(GRIP.hold.pos, blend);
        local.x += Math.sin(Math.PI * blend) * 0.02;
        const pos = local.applyMatrix4(phone.matrixWorld);
        const lq = GRIP.desk.quat.clone().slerp(GRIP.hold.quat, easeInOut(blend));
        const pq = new THREE.Quaternion().setFromRotationMatrix(t.m.extractRotation(phone.matrixWorld));
        return { pos, quat: pq.multiply(lq) };
      };
      if (mode === 'desk' && hover === 'phone') {
        const g = gripWorld(0);
        const follow = rig.pointer.clone().sub(g.pos).multiplyScalar(0.18).clampLength(0, 0.025);
        return { state: 'hovering', pose: 'reach', pos: g.pos.add(new THREE.Vector3(0.012, 0.055, 0.03)).add(follow), quat: g.quat, smooth: 0.22 };
      }
      if (mode === 'toPhone' && phase === 'reach') {
        const g = gripWorld(0);
        return { state: 'reaching', pose: 'open', pos: g.pos, quat: g.quat, smooth: 0.11 };
      }
      if ((mode === 'toPhone' && (phase === 'grip' || phase === 'lift')) || mode === 'phone' || (mode === 'returning' && phase === 'lower')) {
        const g = gripWorld(rig.anim.phoneT);
        const grabbing = mode === 'toPhone' && phase === 'grip';
        return { state: grabbing ? 'grabbing' : 'holding', pose: grabbing ? 'grip' : 'hold', pos: g.pos, quat: g.quat, smooth: grabbing ? 0.06 : 0, attached: !grabbing };
      }
      if (mode === 'returning' && phase === 'release') {
        const g = gripWorld(0);
        return { state: 'releasing', pose: 'open', pos: g.pos.add(new THREE.Vector3(0.03, 0.04, 0.03)), quat: g.quat, smooth: 0.12 };
      }
      // cup: reach the handle, then follow the cup while it is lifted for a sip
      const cup = rig.cup;
      if (mode === 'sipping' && cup) {
        cup.updateWorldMatrix(true, false);
        const pos = GRIP.cup.pos.clone().applyMatrix4(cup.matrixWorld);
        const cq = new THREE.Quaternion().setFromRotationMatrix(t.m.extractRotation(cup.matrixWorld)).multiply(GRIP.cup.quat);
        if (phase === 'reach') return { state: 'reaching', pose: 'reach', pos: pos.add(new THREE.Vector3(0.015, 0.025, 0.02)), quat: cq, smooth: 0.16 };
        if (phase === 'grip') return { state: 'grabbing', pose: 'mug', pos, quat: cq, smooth: 0.05 };
        if (phase === 'release') return { state: 'releasing', pose: 'reach', pos: pos.add(new THREE.Vector3(0.02, 0.035, 0.03)), quat: cq, smooth: 0.14 };
        if (phase === 'lift' || phase === 'hold' || phase === 'lower') {
          // blend from the real grip on the desk to the camera-relative viewmodel pose
          const k = THREE.MathUtils.smoothstep(rig.anim.sipT, 0.35, 0.95);
          if (k > 0) {
            cupHoldWorld(1, rig.anim.sipTilt, t.vmPos, t.vmQuat);
            cupHandViewmodel(rig.anim.sipTilt, rig.cupWorld, t.vmPos, t.vmQuat);
            pos.lerp(t.vmPos, k);
            cq.slerp(t.vmQuat, k);
          }
          return { state: 'holding', pose: 'mug', pos, quat: cq, smooth: 0, attached: true };
        }
      }
      // notebook: the right hand drifts over to rest a finger near the cover's corner
      const nbk = hover === 'resume' ? rig.resume : rig.notebook;
      if (nbk && mode === 'desk' && (hover === 'notebook' || hover === 'resume')) {
        nbk.updateWorldMatrix(true, false);
        const corner = (hover === 'resume' ? new THREE.Vector3(0.06, -0.09, 0.003) : new THREE.Vector3(0.05, 0.012, 0.08)).applyMatrix4(nbk.matrixWorld);
        const rel = rig.pointer.clone().sub(corner);
        corner.x += THREE.MathUtils.clamp(rel.x * 0.08, -0.015, 0.015);
        corner.z += THREE.MathUtils.clamp(rel.z * 0.08, -0.015, 0.015);
        const tip = corner.add(new THREE.Vector3(0, 0.03, 0));
        const dir = tip.clone().sub(elbow('right')).normalize();
        return { state: 'pointing', pose: 'point', tip, quat: basisQuat(dir, new THREE.Vector3(0, 1, 0).addScaledVector(t.fwd, -0.2)), smooth: 0.18 };
      }
      // laptop: the index finger hovers over the trackpad (and taps it when opening)
      const lap = rig.laptop;
      if (lap && ((mode === 'desk' && hover === 'laptop') || (mode === 'toLaptop' && phase === 'press'))) {
        const press = mode === 'toLaptop';
        lap.updateWorldMatrix(true, false);
        const pad = new THREE.Vector3(0.012, 0.0142, 0.07).applyMatrix4(lap.matrixWorld);
        if (!press) {
          // drift a little with the pointer so it feels alive, but stay over the pad
          const rel = rig.pointer.clone().sub(pad);
          pad.x += THREE.MathUtils.clamp(rel.x * 0.08, -0.02, 0.02);
          pad.z += THREE.MathUtils.clamp(rel.z * 0.08, -0.012, 0.012);
        }
        const tip = pad.clone().add(new THREE.Vector3(0, press ? 0.003 : 0.028, 0));
        const dir = tip.clone().sub(elbow('right')).normalize();
        return {
          state: press ? 'tapping' : 'pointing', pose: press ? 'press' : 'point', tip,
          quat: basisQuat(dir, new THREE.Vector3(0, 1, 0).addScaledVector(t.fwd, -0.2)), smooth: press ? 0.07 : 0.16,
        };
      }
      return hiddenDesire('right');
    };

    // ---------------- left hand: swipes and taps on the held phone
    const left = (): Desire => {
      const pi = t.phoneInfo;
      const h = hands.left;
      if (!pi || mode !== 'phone') {
        if (h.action) {
          h.action.resolve();
          h.action = null;
        }
        return hiddenDesire('left');
      }
      const toward = (tip: THREE.Vector3) => {
        const dir = tip.clone().sub(elbow('left')).normalize().addScaledVector(t.up, 0.35);
        return basisQuat(dir, t.up.clone().multiplyScalar(0.55).addScaledVector(t.fwd, -0.8));
      };
      const a = h.action;
      if (a) {
        const s = Math.min(1, (now - a.t0) / a.dur);
        if (a.kind === 'swipe') {
          const from = pi.center.clone().addScaledVector(pi.right, 0.024 * a.dir).addScaledVector(pi.up, -0.012);
          const to = pi.center.clone().addScaledVector(pi.right, -0.024 * a.dir).addScaledVector(pi.up, -0.008);
          const slide = THREE.MathUtils.clamp((s - 0.18) / 0.62, 0, 1);
          const lift = s < 0.18 ? 1 - s / 0.18 : s > 0.8 ? (s - 0.8) / 0.2 : 0;
          const tip = from.lerp(to, easeInOut(slide)).addScaledVector(pi.normal, 0.003 + lift * 0.016);
          if (s >= 1) {
            a.resolve();
            h.action = null;
          }
          return { state: 'swiping', pose: 'press', tip, quat: toward(tip), smooth: 0.035 };
        }
        // tap: approach -> contact -> release
        let off: number;
        if (s < a.contact) off = 0.022 - 0.0195 * easeInOut(s / a.contact);
        else off = 0.0025 + 0.03 * easeInOut((s - a.contact) / (1 - a.contact));
        if (!a.touched && s >= a.contact) {
          a.touched = true;
          a.resolve();
        }
        if (s >= 1) h.action = null;
        const tip = a.point.clone().addScaledVector(pi.normal, off);
        return { state: 'tapping', pose: 'press', tip, quat: toward(tip), smooth: 0.04 };
      }
      // ready pose: fingertip rests just below the screen, never over labels or buttons
      const tip = pi.center.clone().addScaledVector(pi.right, -0.012).addScaledVector(pi.up, -pi.height / 2 - 0.022).addScaledVector(pi.normal, 0.03);
      return { state: 'hovering', pose: 'point', tip, quat: toward(tip), smooth: 0.25 };
    };

    for (const side of ['right', 'left'] as const) {
      const h = hands[side];
      const d = side === 'right' ? right() : left();
      // entering from the lower edge of the viewport
      if (d.state !== 'hidden' && d.state !== 'exiting' && !h.visible) {
        h.wrist.copy(rest(side));
        h.quat.copy(d.quat);
        h.visible = true;
        h.rig.setVisible(true);
        h.state = 'entering';
      }
      if (h.state === 'entering' && d.state !== 'exiting') {
        const target = d.pos ?? d.tip!;
        if (h.wrist.distanceTo(target) > 0.06) d.state = 'entering';
      }
      h.state = d.state;
      dampPose(h.pose, POSES[d.pose], d.state === 'grabbing' ? 22 : 12, dt);
      h.rig.applyPose(h.pose);

      let goal: THREE.Vector3;
      if (d.tip) {
        // solve the wrist position that puts the index fingertip on target
        h.rig.root.position.copy(h.wrist);
        h.rig.root.quaternion.copy(h.quat);
        h.rig.tipWorld(t.tip);
        goal = d.tip.clone().sub(t.tip.sub(h.wrist));
      } else goal = d.pos!;

      if (d.attached) {
        h.wrist.copy(goal);
        h.quat.copy(d.quat);
      } else {
        const smooth = h.state === 'entering' ? Math.max(d.smooth, 0.16) : d.smooth;
        easing.damp3(h.wrist, goal, smooth, dt);
        easing.dampQ(h.quat, d.quat, Math.max(smooth, 0.05), dt);
      }
      h.rig.root.position.copy(h.wrist);
      h.rig.root.quaternion.copy(h.quat);
      h.rig.updateForearm(elbow(side));

      // arrival notifications (director waits on these)
      if (h.arrive.length) {
        let arrived: boolean;
        if (d.tip) {
          h.rig.tipWorld(t.tip);
          arrived = t.tip.distanceTo(d.tip) < 0.012;
        } else arrived = h.wrist.distanceTo(goal) < 0.014;
        h.arrive = h.arrive.filter((w) => {
          if (arrived || now > w.until) {
            w.resolve();
            return false;
          }
          return true;
        });
      }

      if ((d.state === 'exiting' || d.state === 'hidden') && h.visible && h.wrist.distanceTo(goal) < 0.05) {
        h.visible = false;
        h.rig.setVisible(false);
        h.state = 'hidden';
      }
    }
    // expose for debugging/tests
    (window as unknown as { __hands?: unknown }).__hands = { right: hands.right.state, left: hands.left.state };
  });

  return null;
}
