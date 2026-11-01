'use client';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HandRig, POSES, type Pose, type PoseName } from '@/experience/hands/HandRig';
import { GRIP, basisQuat } from '@/experience/hands/grips';

/** Development lab for tuning hand poses against the phone (not linked from the site). */
type O = { pose?: Partial<Pose>; pos?: [number, number, number]; finger?: [number, number, number]; dorsal?: [number, number, number] };
function Rig({ pose, grip, left, o }: { pose: PoseName; grip: 'hold' | 'desk' | 'cup'; left: PoseName | null; o: O | null }) {
  const objs = useMemo(() => {
    const mats = {
      skin: new THREE.MeshPhysicalMaterial({ color: '#f0b993', roughness: 0.62, sheen: 0.7, sheenColor: new THREE.Color('#ff9f7f') }),
      cuff: new THREE.MeshStandardMaterial({ color: '#2c2f4b', roughness: 0.95 }),
      sleeve: new THREE.MeshStandardMaterial({ color: '#33375a', roughness: 0.92 }),
    };
    const phone = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.0716, 0.0082, 0.1476, 4, 0.0035), new THREE.MeshStandardMaterial({ color: '#2e2f33', metalness: 0.6, roughness: 0.35 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.144), new THREE.MeshBasicMaterial({ color: '#f3ebe0' }));
    screen.rotation.x = -Math.PI / 2;
    screen.position.y = 0.0042;
    phone.add(body, screen);
    if (grip === 'cup') {
      phone.clear();
      const ceramic = new THREE.MeshStandardMaterial({ color: '#f1ebe2', roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.03, 0.056, 40, 1, true), ceramic);
      body.position.y = 0.034;
      const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.043, 40), new THREE.MeshStandardMaterial({ color: '#9b6a45' }));
      coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.052;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 10, 24, Math.PI), ceramic);
      handle.position.set(0.05, 0.035, 0); handle.rotation.z = -Math.PI / 2;
      phone.add(body, coffee, handle);
      phone.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.35));
    }
    if (grip === 'hold') {
      // upright, screen toward the camera (+Z), top up
      phone.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
        new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)));
    }
    phone.updateMatrixWorld(true);
    const right = new HandRig('right', mats);
    right.applyPose({ ...POSES[pose], ...(o?.pose ?? {}) });
    const g0 = GRIP[grip];
    const g = {
      pos: o?.pos ? new THREE.Vector3(...o.pos) : g0.pos,
      quat: o?.finger && o?.dorsal ? basisQuat(new THREE.Vector3(...o.finger), new THREE.Vector3(...o.dorsal)) : g0.quat,
    };
    right.root.position.copy(g.pos.clone().applyMatrix4(phone.matrixWorld));
    right.root.quaternion.copy(phone.quaternion.clone().multiply(g.quat));
    right.root.updateMatrixWorld(true);
    right.updateForearm(new THREE.Vector3(0.3, -0.62, 0.25));
    const out: THREE.Object3D[] = [phone, right.root, right.forearm];
    if (left) {
      const l = new HandRig('left', mats);
      l.applyPose(POSES[left]);
      l.root.position.set(-0.05, -0.12, 0.06);
      const dir = new THREE.Vector3(0.35, 1, -0.3).normalize();
      const hint = new THREE.Vector3(0, 0.55, 0.8);
      const y = dir;
      const z = hint.clone().addScaledVector(y, -hint.dot(y)).normalize();
      const x = new THREE.Vector3().crossVectors(y, z);
      l.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      l.root.updateMatrixWorld(true);
      l.updateForearm(new THREE.Vector3(-0.3, -0.62, 0.25));
      out.push(l.root, l.forearm);
    }
    return out;
  }, [pose, grip, left, o]);
  return (
    <>
      {objs.map((o, i) => <primitive key={i} object={o} />)}
    </>
  );
}

function View({ position, children }: { position: [number, number, number]; children: React.ReactNode }) {
  return (
    <Canvas camera={{ position, fov: 40, near: 0.01 }} onCreated={({ camera }) => camera.lookAt(0.02, -0.01, 0)}
      style={{ width: 420, height: 420, flex: 'none', background: '#2a1d16' }} gl={{ toneMapping: THREE.AgXToneMapping }}>
      <hemisphereLight args={['#ffe2c6', '#3a2418', 0.9]} />
      <directionalLight position={[-1, 1.5, 1]} intensity={2.4} color="#ffcf9a" />
      <directionalLight position={[1, 0.5, 1]} intensity={0.6} />
      <Environment resolution={64} frames={1}><Lightformer form="rect" intensity={2} position={[0, 2, 1]} scale={[3, 3, 1]} /></Environment>
      {children}
    </Canvas>
  );
}

export default function HandLab({ pose, grip, left, override }: { pose: PoseName; grip: 'hold' | 'desk' | 'cup'; left: PoseName | null; override: string | null }) {
  const o: O | null = override ? JSON.parse(override) : null;
  const rig = <Rig pose={pose} grip={grip} left={left} o={o} />;
  return (
    <div style={{ display: 'flex', gap: 8, padding: 8, background: '#111', flexWrap: 'nowrap' }}>
      <View position={[0, 0, 0.42]}>{rig}</View>
      <View position={[-0.12, 0.01, 0.3]}><Rig pose={pose} grip={grip} left={left} o={o} /></View>
      <View position={[-0.36, 0.02, 0.02]}><Rig pose={pose} grip={grip} left={left} o={o} /></View>
    </div>
  );
}
