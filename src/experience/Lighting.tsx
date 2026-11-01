'use client';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { QualitySettings } from '@/lib/quality';
import { rig, screenInfo } from './rig';

RectAreaLightUniformsLib.init();

const PRACTICAL_ORDER = ['Bulb_PendantC', 'Bulb_PendantB', 'Bulb_PendantA', 'Bulb_SconceM', 'Bulb_SconceL', 'Bulb_SconceR'];

/**
 * Warm evening café lighting:
 *  - key: amber spot from the upper left, the only shadow caster
 *  - fill: soft neutral sky/ground + a low directional so shadows never go black
 *  - laptop screen: subtle cool rect light spilling onto keys and hands
 *  - practicals: small warm point lights at the visible pendants/sconces for depth
 */
export default function Lighting({ q }: { q: QualitySettings }) {
  const scene = useThree((s) => s.scene);
  const key = useRef<THREE.SpotLight>(null);
  const screenLight = useRef<THREE.RectAreaLight>(null);

  const practicals = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (const n of PRACTICAL_ORDER.slice(0, q.practicalLights)) {
      const o = scene.getObjectByName(n);
      if (o) out.push(o.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.06, 0)));
    }
    return out;
  }, [scene, q.practicalLights]);

  useLayoutEffect(() => {
    if (key.current) {
      key.current.target.position.set(0.02, 0.75, -0.14);
      key.current.target.updateMatrixWorld();
      scene.add(key.current.target);
    }
    if (screenLight.current && rig.laptopScreen) {
      const s = screenInfo(rig.laptopScreen);
      screenLight.current.position.copy(s.center).addScaledVector(s.normal, 0.004);
      screenLight.current.lookAt(s.center.clone().add(s.normal));
    }
  }, [scene]);

  return (
    <>
      <color attach="background" args={['#1a120d']} />
      <fog attach="fog" args={['#2b1d15', 7, 26]} />
      <hemisphereLight args={['#ffdcb8', '#3a2418', 0.85]} />
      <spotLight
        ref={key}
        position={[-0.95, 2.05, 0.35]}
        color="#ffc088"
        intensity={30}
        angle={0.62}
        penumbra={0.9}
        decay={2}
        distance={6}
        castShadow
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
        shadow-radius={6}
        shadow-camera-near={0.6}
        shadow-camera-far={3.2}
      />
      <directionalLight position={[1.6, 1.8, 1.4]} color="#efe9e2" intensity={0.38} />
      <rectAreaLight ref={screenLight} color="#cfdcff" intensity={2.2} width={0.283} height={0.177} />
      {practicals.map((p, i) => (
        <pointLight key={i} position={p} color="#ffad62" intensity={i === 0 ? 2.2 : 3.4} distance={5} decay={2} />
      ))}
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.2} color="#ffcf9f" position={[0, 3, 0]} rotation-x={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffb070" position={[-3, 1.6, 0]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#9fb4ff" position={[2, 1.6, -3]} rotation-y={-Math.PI / 4} scale={[2, 1.4, 1]} />
        <Lightformer form="circle" intensity={4} color="#ffd2a1" position={[-0.6, 2.4, 1.2]} scale={0.8} />
      </Environment>
    </>
  );
}
