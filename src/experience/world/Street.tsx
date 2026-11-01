'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useAudio } from '@/lib/audio';
import type { QualitySettings } from '@/lib/quality';

/**
 * The street seen through the café window (scene units, three.js space: window plane at z ≈ -3.8).
 * Everything here is original and procedural: a lit building facade across the road, street lamps,
 * a damp road, and a small pool of pedestrians and cars that pass by every few seconds.
 * Passers-by carry umbrellas when rain is switched on.
 */

const SIDEWALK_Z = -4.7;
const LANES = [{ z: -7.0, dir: 1 }, { z: -8.6, dir: -1 }];
const FACADE_Z = -12.5;
const X_RANGE = 9;

function facadeTexture() {
  const W = 2048, H = 768;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  // dusk sky band at the top
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2a2f55');
  sky.addColorStop(0.35, '#4a3e63');
  sky.addColorStop(0.6, '#20182a');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  let x = 0;
  while (x < W) {
    const bw = 220 + rnd() * 260;
    const top = 40 + rnd() * 160;
    const tone = ['#2b2230', '#33262c', '#272535', '#3a2a28'][Math.floor(rnd() * 4)];
    g.fillStyle = tone;
    g.fillRect(x, top, bw, H - top);
    // upper-floor windows
    for (let wy = top + 30; wy < H - 230; wy += 70) {
      for (let wx = x + 22; wx < x + bw - 40; wx += 54) {
        const lit = rnd() < 0.55;
        g.fillStyle = lit ? (rnd() < 0.8 ? `rgba(255,${180 + rnd() * 40},${110 + rnd() * 40},${0.75 + rnd() * 0.25})` : 'rgba(170,200,255,0.7)') : 'rgba(20,16,24,0.9)';
        g.fillRect(wx, wy, 30, 40);
      }
    }
    // ground-floor shopfront glow + awning
    const shopTop = H - 200;
    const glow = g.createLinearGradient(0, shopTop, 0, H);
    glow.addColorStop(0, rnd() < 0.5 ? '#ffcf8a' : '#ffb48a');
    glow.addColorStop(1, '#a2593a');
    g.fillStyle = glow;
    g.fillRect(x + 18, shopTop + 30, bw - 36, 150);
    g.fillStyle = 'rgba(30,20,20,0.55)';
    for (let m = x + 18 + (bw - 36) / 3; m < x + bw - 30; m += (bw - 36) / 3) g.fillRect(m, shopTop + 30, 6, 150);
    g.fillStyle = ['#7c3a3a', '#2f4f4a', '#5b4a2c'][Math.floor(rnd() * 3)];
    g.beginPath();
    g.moveTo(x + 10, shopTop + 30);
    g.lineTo(x + bw - 10, shopTop + 30);
    g.lineTo(x + bw - 26, shopTop);
    g.lineTo(x + 26, shopTop);
    g.closePath();
    g.fill();
    x += bw + 8;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

type Walker = { g: THREE.Group; legs: THREE.Object3D[]; arms: THREE.Object3D[]; umbrella: THREE.Object3D; active: boolean; speed: number; dir: number; phase: number };
type Car = { g: THREE.Group; active: boolean; speed: number; dir: number; light?: THREE.PointLight };

function makeWalker(coat: string, skin: string): Walker {
  const g = new THREE.Group();
  const coatM = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.9 });
  const darkM = new THREE.MeshStandardMaterial({ color: '#1b1716', roughness: 0.9 });
  const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 6, 16), coatM);
  body.position.y = 1.15;
  body.scale.set(1, 1, 0.7);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skinM);
  head.position.y = 1.62;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), darkM);
  hair.position.y = 1.64;
  g.add(body, head, hair);
  const legs: THREE.Object3D[] = [];
  for (const sx of [-0.08, 0.08]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.85, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.7, 4, 10), darkM);
    leg.position.y = -0.42;
    pivot.add(leg);
    g.add(pivot);
    legs.push(pivot);
  }
  const arms: THREE.Object3D[] = [];
  for (const sx of [-0.23, 0.23]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 1.38, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.5, 4, 10), coatM);
    arm.position.y = -0.3;
    pivot.add(arm);
    g.add(pivot);
    arms.push(pivot);
  }
  // umbrella (shown when it rains)
  const umbrella = new THREE.Group();
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.22, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#2b2f3f', roughness: 0.6, side: THREE.DoubleSide }));
  canopy.position.y = 2.05;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 6), darkM);
  shaft.position.y = 1.7;
  umbrella.add(canopy, shaft);
  umbrella.position.x = 0.1;
  g.add(umbrella);
  g.visible = false;
  return { g, legs, arms, umbrella, active: false, speed: 1.2, dir: 1, phase: 0 };
}

function makeCar(paint: string, withLight: boolean): Car {
  const g = new THREE.Group();
  const paintM = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.35, metalness: 0.4 });
  const glassM = new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.15, metalness: 0.2 });
  const tyreM = new THREE.MeshStandardMaterial({ color: '#0e0e10', roughness: 0.9 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.75, 1.8, 3, 0.25), paintM);
  body.position.y = 0.62;
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.6, 1.62, 3, 0.25), glassM);
  cabin.position.set(-0.2, 1.18, 0);
  g.add(body, cabin);
  for (const sx of [-1.35, 1.35]) for (const sz of [-0.82, 0.82]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 16), tyreM);
    t.rotation.x = Math.PI / 2;
    t.position.set(sx, 0.34, sz);
    g.add(t);
  }
  const head = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.92, 0.75).multiplyScalar(9) });
  const tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.08, 0.05).multiplyScalar(6) });
  for (const sz of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), head);
    h.position.set(2.1, 0.72, sz);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.3), tail);
    tl.position.set(-2.1, 0.75, sz);
    g.add(h, tl);
  }
  let light: THREE.PointLight | undefined;
  if (withLight) {
    light = new THREE.PointLight('#ffe2b0', 6, 9, 2);
    light.position.set(3.2, 0.8, 0);
    g.add(light);
  }
  g.visible = false;
  return { g, active: false, speed: 9, dir: 1, light };
}

export default function Street({ q }: { q: QualitySettings }) {
  const rain = useAudio((s) => s.rain && s.enabled);
  const facade = useMemo(() => facadeTexture(), []);
  const walkers = useMemo(() => [
    makeWalker('#5a3b32', '#c08a68'), makeWalker('#2f3d4f', '#e0b48f'),
    makeWalker('#6b5a3a', '#8a5a3c'), makeWalker('#3d2d3a', '#f0c49e'),
  ], []);
  const cars = useMemo(() => [
    makeCar('#7a2e2a', q.tier === 'high'), makeCar('#2c3f55', q.tier === 'high'), makeCar('#c9c2b4', false),
  ], [q.tier]);
  const timers = useRef({ walker: 4, car: 9 });
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1);
    const t = timers.current;
    t.walker -= d;
    t.car -= d;
    if (t.walker <= 0) {
      const w = walkers.find((x) => !x.active);
      if (w) {
        w.active = true;
        w.dir = Math.random() < 0.5 ? 1 : -1;
        w.speed = rnd(1.0, 1.5);
        w.g.position.set(-w.dir * X_RANGE, 0, SIDEWALK_Z + rnd(-0.5, 0.5));
        w.g.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        w.g.visible = true;
      }
      t.walker = rnd(10, 22); // an occasional passer-by, not a crowd
    }
    if (t.car <= 0) {
      const c = cars.find((x) => !x.active);
      if (c) {
        const lane = LANES[Math.floor(Math.random() * LANES.length)];
        c.active = true;
        c.dir = lane.dir;
        c.speed = rnd(7, 11);
        c.g.position.set(-c.dir * (X_RANGE + 6), 0, lane.z);
        c.g.rotation.y = c.dir > 0 ? 0 : Math.PI;
        c.g.visible = true;
      }
      t.car = rnd(12, 28);
    }
    for (const w of walkers) {
      if (!w.active) continue;
      w.g.position.x += w.dir * w.speed * d;
      w.phase += d * w.speed * 5.5;
      const s = Math.sin(w.phase) * 0.45;
      w.legs[0].rotation.x = s;
      w.legs[1].rotation.x = -s;
      w.arms[0].rotation.x = rain ? -0.9 : -s * 0.6;
      w.arms[1].rotation.x = s * 0.6;
      w.g.position.y = Math.abs(Math.cos(w.phase)) * 0.03;
      w.umbrella.visible = rain;
      if (Math.abs(w.g.position.x) > X_RANGE + 0.5) {
        w.active = false;
        w.g.visible = false;
      }
    }
    for (const c of cars) {
      if (!c.active) continue;
      c.g.position.x += c.dir * c.speed * d;
      if (Math.abs(c.g.position.x) > X_RANGE + 7) {
        c.active = false;
        c.g.visible = false;
      }
    }
  });

  return (
    <group>
      {/* sky + building facade across the road (self-lit) */}
      <mesh position={[3, 4, FACADE_Z]}>
        <planeGeometry args={[34, 12.75]} />
        <meshBasicMaterial map={facade} color={new THREE.Color(1.05, 1.0, 0.95)} fog={false} toneMapped />
      </mesh>
      {/* road and pavement, slightly glossy so lamps and headlights reflect */}
      <mesh rotation-x={-Math.PI / 2} position={[3, -0.02, -8]}>
        <planeGeometry args={[34, 9]} />
        <meshStandardMaterial color="#17151a" roughness={rain ? 0.12 : 0.45} metalness={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[3, 0, -4.6]}>
        <planeGeometry args={[34, 1.9]} />
        <meshStandardMaterial color="#3a332f" roughness={rain ? 0.2 : 0.7} />
      </mesh>
      <mesh position={[3, 0.06, -5.55]}>
        <boxGeometry args={[34, 0.12, 0.18]} />
        <meshStandardMaterial color="#4a423c" roughness={0.8} />
      </mesh>
      {/* street lamps */}
      {[-1.5, 4.2].map((x) => (
        <group key={x} position={[x, 0, -5.4]}>
          <mesh position={[0, 1.9, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 3.8, 10]} />
            <meshStandardMaterial color="#1c1b1d" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 3.85, 0]}>
            <sphereGeometry args={[0.18, 16, 12]} />
            <meshBasicMaterial color={new THREE.Color(1, 0.78, 0.48).multiplyScalar(6)} />
          </mesh>
          <pointLight position={[0, 3.6, 0]} color="#ffbe78" intensity={14} distance={9} decay={2} />
        </group>
      ))}
      {walkers.map((w, i) => <primitive key={`w${i}`} object={w.g} />)}
      {cars.map((c, i) => <primitive key={`c${i}`} object={c.g} />)}
    </group>
  );
}
