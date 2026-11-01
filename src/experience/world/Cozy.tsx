'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudio } from '@/lib/audio';
import type { QualitySettings } from '@/lib/quality';

/**
 * Warmth and life inside the café: fairy lights across the window, a flickering candle,
 * the table lamp's glow, two patrons at the bistro tables and rain streaks on the glass.
 * Window opening in three.js space: x 0.15..2.75, y 0.78..2.62, wall at z -3.8.
 */
const WIN = { x0: 0.15, x1: 2.75, y0: 0.78, y1: 2.62, z: -3.8 };

function Garland({ count = 64 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    // three soft swags under the window head, then down both sides
    const swags = 3;
    const top = WIN.y1 - 0.06;
    const n = Math.floor(count * 0.7);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const x = WIN.x0 + 0.05 + u * (WIN.x1 - WIN.x0 - 0.1);
      const local = (u * swags) % 1;
      const sag = Math.sin(local * Math.PI) * 0.14;
      pts.push(new THREE.Vector3(x, top - sag, WIN.z + 0.16));
    }
    const side = count - n;
    for (let i = 0; i < side; i++) {
      const left = i % 2 === 0;
      const k = Math.floor(i / 2) / Math.ceil(side / 2);
      pts.push(new THREE.Vector3(left ? WIN.x0 + 0.06 : WIN.x1 - 0.06, top - 0.05 - k * 1.25, WIN.z + 0.17 + Math.sin(k * 9) * 0.01));
    }
    return pts;
  }, [count]);
  const wire = useMemo(() => {
    const top = points.slice(0, Math.floor(count * 0.7));
    return new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(top).getPoints(160));
  }, [points, count]);
  const seeds = useMemo(() => points.map(() => Math.random() * 10), [points]);
  const base = useMemo(() => new THREE.Color(1, 0.72, 0.38), []);
  const col = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const m = mesh.current!;
    const o = new THREE.Object3D();
    points.forEach((p, i) => {
      o.position.copy(p);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, base);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [points, base]);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < points.length; i++) {
      // slow, gentle shimmer (never a disco blink)
      const k = 3.2 + 1.6 * Math.sin(t * 0.9 + seeds[i]) + 0.8 * Math.sin(t * 2.3 + seeds[i] * 3);
      m.setColorAt(i, col.copy(base).multiplyScalar(Math.max(1.2, k)));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, points.length]}>
        <sphereGeometry args={[0.013, 10, 8]} />
        <meshBasicMaterial toneMapped />
      </instancedMesh>
      <line>
        <primitive object={wire} attach="geometry" />
        <lineBasicMaterial color="#2a1f18" />
      </line>
    </group>
  );
}

type Person = { root: THREE.Group; head: THREE.Object3D; torso: THREE.Object3D; seed: number };

/** A capsule-ish limb running from a to b (in the parent's space). */
function limb(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, mat: THREE.Material) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, 14, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  parent.add(m);
  for (const [p, r] of [[a, r0], [b, r1]] as const) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
    j.position.copy(p);
    parent.add(j);
  }
}

/**
 * Seated café patron: a soft, stylised figure (tapered torso, shoulders, elbows resting on
 * the table, hands together) kept low in contrast so it reads as ambience, not as a character.
 */
function makePerson(opts: { sweater: string; skin: string; hair: string; long?: boolean; holding: 'book' | 'cup' }): Person {
  const root = new THREE.Group();
  const sweater = new THREE.MeshStandardMaterial({ color: opts.sweater, roughness: 0.95 });
  const skin = new THREE.MeshStandardMaterial({ color: opts.skin, roughness: 0.7 });
  const hair = new THREE.MeshStandardMaterial({ color: opts.hair, roughness: 0.85 });
  const torso = new THREE.Group();
  torso.position.y = 0.47;
  root.add(torso);
  // tapered torso: waist, chest, rounded shoulders
  const profile = [[0.0, 0], [0.13, 0.0], [0.145, 0.12], [0.16, 0.3], [0.185, 0.41], [0.17, 0.48], [0.11, 0.53], [0.05, 0.555], [0, 0.56]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), sweater);
  body.scale.set(1, 1, 0.68);
  torso.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.09, 12), skin);
  neck.position.y = 0.59;
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.7;
  torso.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.092, 24, 18), skin);
  face.scale.set(0.9, 1.12, 0.98);
  head.add(face);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), hair);
  hairCap.scale.set(0.95, 1.05, 1.02);
  hairCap.position.set(0, 0.018, -0.012);
  hairCap.rotation.x = -0.3;
  head.add(hairCap);
  if (opts.long) {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.14, 6, 14), hair);
    back.scale.set(1.1, 1, 0.7);
    back.position.set(0, -0.09, -0.055);
    head.add(back);
  }
  // arms: shoulder -> elbow resting forward -> hands meeting in front of the chest
  for (const sx of [-1, 1]) {
    const sh = new THREE.Vector3(sx * 0.165, 0.45, 0);
    const el = new THREE.Vector3(sx * 0.19, 0.2, 0.17);
    const wr = new THREE.Vector3(sx * 0.06, 0.3, 0.33);
    limb(torso, sh, el, 0.05, 0.042, sweater);
    limb(torso, el, wr, 0.042, 0.034, sweater);
    const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.035, 4, 10), skin);
    hand.position.copy(wr).add(new THREE.Vector3(-sx * 0.012, 0.01, 0.035));
    hand.rotation.set(1.2, 0, sx * 0.5);
    torso.add(hand);
  }
  if (opts.holding === 'book') {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.15), new THREE.MeshStandardMaterial({ color: '#d9cdb8', roughness: 0.9 }));
    book.position.set(0, 0.33, 0.39);
    book.rotation.x = -0.95;
    torso.add(book);
  } else {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.08, 16), new THREE.MeshStandardMaterial({ color: '#d8d0c3', roughness: 0.4 }));
    cup.position.set(0, 0.35, 0.39);
    torso.add(cup);
  }
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });
  return { root, head, torso, seed: Math.random() * 100 };
}

function Patrons() {
  const people = useMemo(() => {
    const a = makePerson({ sweater: '#7d5a3e', skin: '#b98a6b', hair: '#231812', long: true, holding: 'book' });
    a.root.position.set(1.85, 0, -3.62);
    a.root.rotation.y = 2.25; // gazing out of the window
    const b = makePerson({ sweater: '#3a4744', skin: '#9a6b52', hair: '#17110e', holding: 'cup' });
    b.root.position.set(-1.75, 0, -3.48);
    b.root.rotation.y = 1.25; // in profile, cup in hand
    return [a, b];
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const p of people) {
      const s = p.seed;
      p.torso.scale.y = 1 + Math.sin(t * 1.1 + s) * 0.008; // breathing
      // reading posture with the occasional glance up / toward the window
      const glance = Math.max(0, Math.sin(t * 0.13 + s)) ** 6;
      p.head.rotation.x = 0.35 - glance * 0.35 + Math.sin(t * 0.7 + s) * 0.02;
      p.head.rotation.y = Math.sin(t * 0.21 + s) * 0.08 + glance * 0.35;
    }
  });
  return <>{people.map((p, i) => <primitive key={i} object={p.root} />)}</>;
}

/** Streaks of rain running down the window when rain is enabled. */
function RainOnGlass() {
  const rain = useAudio((s) => s.rain && s.enabled);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 1024;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 512, 1024);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * 512, y = Math.random() * 1024, len = 20 + Math.random() * 90;
      const grad = g.createLinearGradient(x, y, x, y + len);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,0.55)');
      g.strokeStyle = grad;
      g.lineWidth = 1 + Math.random() * 1.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 4, y + len);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.arc(x, y + len, 1.6 + Math.random() * 1.5, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.5, 1.5);
    return t;
  }, []);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, dt) => {
    tex.offset.y += dt * 0.06;
    if (mat.current) mat.current.opacity += ((rain ? 0.35 : 0) - mat.current.opacity) * Math.min(1, dt * 2);
  });
  return (
    <mesh position={[(WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, WIN.z + 0.03]}>
      <planeGeometry args={[WIN.x1 - WIN.x0, WIN.y1 - WIN.y0]} />
      <meshBasicMaterial ref={mat} map={tex} transparent opacity={0} depthWrite={false} color="#cfd8e6" />
    </mesh>
  );
}

/** Candle flame flicker + table lamp glow. */
function WarmLights({ q }: { q: QualitySettings }) {
  const scene = useThree((s) => s.scene);
  const candle = useRef<THREE.PointLight>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const flame = useMemo(() => scene.getObjectByName('CandleFlame') ?? null, [scene]);
  useLayoutEffect(() => {
    scene.updateMatrixWorld(true);
    const f = scene.getObjectByName('CandleFlame');
    if (f && candle.current) candle.current.position.copy(f.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0.02, 0));
    const b = scene.getObjectByName('Bulb_TableLamp');
    if (b && lamp.current) lamp.current.position.copy(b.getWorldPosition(new THREE.Vector3()));
  }, [scene]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flick = 0.85 + 0.1 * Math.sin(t * 11) + 0.06 * Math.sin(t * 23.7) + 0.05 * Math.sin(t * 5.3);
    if (candle.current) candle.current.intensity = 0.3 * flick;
    if (flame) flame.scale.set(1, 0.9 + 0.12 * flick, 1);
  });
  return (
    <>
      <pointLight ref={lamp} color="#ffb260" intensity={q.tier === 'light' ? 2.2 : 1.8} distance={2.6} decay={2} />
      {q.tier !== 'light' && <pointLight ref={candle} color="#ff9a48" intensity={0.3} distance={0.6} decay={2} />}
    </>
  );
}

/** Smoked-glass tint: keeps the street atmospheric and turns passers-by into soft silhouettes. */
function WindowTint() {
  return (
    <mesh position={[(WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, WIN.z + 0.015]} renderOrder={2}>
      <planeGeometry args={[WIN.x1 - WIN.x0, WIN.y1 - WIN.y0]} />
      <meshBasicMaterial color="#1a0f0c" transparent opacity={0.52} depthWrite={false} />
    </mesh>
  );
}

export default function Cozy({ q }: { q: QualitySettings }) {
  return (
    <>
      <WindowTint />
      <Garland count={q.tier === 'light' ? 40 : 64} />
      <Patrons />
      <RainOnGlass />
      <WarmLights q={q} />
    </>
  );
}
