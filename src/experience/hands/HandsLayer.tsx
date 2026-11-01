'use client';
import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { QualitySettings } from '@/lib/quality';
import { prepareTextures, TEXTURE_URLS, type TexSet } from '../materials';
import { rig } from '../rig';
import HandController from './HandController';

/**
 * The first-person hands render in their own transparent layer ABOVE the DOM screens, so a
 * fingertip can visibly touch the phone UI. A depth-only copy of the phone hides any part of
 * the hand that is behind the device. The camera mirrors the main scene camera every frame.
 */
function CameraMirror() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useFrame(() => {
    const src = rig.camera;
    if (!src) return;
    camera.position.copy(src.position);
    camera.quaternion.copy(src.quaternion);
    if (camera.fov !== src.fov || camera.aspect !== src.aspect) {
      camera.fov = src.fov;
      camera.aspect = src.aspect;
      camera.near = src.near;
      camera.far = src.far;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  });
  return null;
}

function PhoneOccluder() {
  const mesh = useMemo(() => {
    const m = new THREE.Mesh(
      new RoundedBoxGeometry(0.0716, 0.0082, 0.1476, 3, 0.0035),
      typeof window !== 'undefined' && location.search.includes('debug=occluder')
        ? new THREE.MeshBasicMaterial({ color: '#ff0040', transparent: true, opacity: 0.5 })
        : new THREE.MeshBasicMaterial({ colorWrite: false }),
    );
    m.renderOrder = -1;
    m.matrixAutoUpdate = false;
    return m;
  }, []);
  useFrame(() => {
    if (!rig.phone) return;
    rig.phone.updateWorldMatrix(true, false);
    mesh.matrix.copy(rig.phone.matrixWorld);
    mesh.matrixWorldNeedsUpdate = true;
  });
  return <primitive object={mesh} />;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#ffd9b5', '#2b1a12', 0.75]} />
      <spotLight position={[-0.95, 2.05, 0.35]} color="#ffc088" intensity={24} angle={0.9} penumbra={0.9} decay={2} distance={6} />
      <directionalLight position={[1.6, 1.8, 1.4]} color="#efe9e2" intensity={0.5} />
      <directionalLight position={[0, 0.9, -1.2]} color="#cfdcff" intensity={0.35} />
      <Environment resolution={64} frames={1} environmentIntensity={0.5}>
        <Lightformer form="rect" intensity={2.2} color="#ffcf9f" position={[0, 3, 0]} rotation-x={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffb070" position={[-3, 1.6, 0]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} />
      </Environment>
    </>
  );
}

function Hands() {
  const textures = useTexture(TEXTURE_URLS) as unknown as TexSet;
  const gl = useThree((s) => s.gl);
  const prepared = useMemo(() => prepareTextures(textures, Math.min(8, gl.capabilities.getMaxAnisotropy())), [textures, gl]);
  return <HandController textures={prepared} />;
}

function Tone() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = THREE.AgXToneMapping;
    gl.setClearColor(0x000000, 0);
  }, [gl]);
  return null;
}

export default function HandsLayer({ q, paused = false }: { q: QualitySettings; paused?: boolean }) {
  return (
    <Canvas
      className="hands-canvas"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9 }}
      dpr={Math.max(q.dpr[1], Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1))}
      frameloop={paused ? 'never' : 'always'}
      gl={{ alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 40, near: 0.01, far: 30 }}
      aria-hidden="true"
    >
      <CameraMirror />
      <Tone />
      <Lights />
      <PhoneOccluder />
      <Suspense fallback={null}>
        <Hands />
      </Suspense>
    </Canvas>
  );
}
