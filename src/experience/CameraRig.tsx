'use client';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { easing } from 'maath';
import { useDesk } from '@/lib/store';
import { rig } from './rig';
import { cameraPose, laptopPose } from './cameraPoses';

const _nb = new THREE.Vector3();
const _np = new THREE.Vector3();
const _nt = new THREE.Vector3();

/** Calm seated camera: small damped pointer response, interruptible blends between poses. */
export default function CameraRig() {
  const ptr = useRef(new THREE.Vector2());
  const target = useRef(new THREE.Vector3());

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      rig.pointerNdc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    rig.camera = cam;
    const aspect = state.size.width / state.size.height;
    const a = rig.anim;
    const pose = cameraPose(aspect, a.camPhone);
    if (a.camLaptop > 0) {
      const lp = laptopPose(aspect, pose.fov);
      if (lp) {
        pose.position.lerp(lp.position, a.camLaptop);
        pose.target.lerp(lp.target, a.camLaptop);
      }
    }
    if (a.camNote > 0 && rig.notebook) {
      // lean over the open notebook; on wide screens it sits left of centre, leaving room for the card
      const c = rig.notebook.getWorldPosition(_nb);
      const wide = aspect > 1.15;
      _np.set(c.x + (wide ? 0.2 : 0.06), c.y + (wide ? 0.4 : 0.5), c.z + (wide ? 0.34 : 0.3));
      _nt.set(c.x + (wide ? 0.17 : -0.06), c.y, c.z + (wide ? -0.02 : 0.08));
      const k = THREE.MathUtils.smoothstep(a.camNote, 0, 1);
      pose.position.lerp(_np, k);
      pose.target.lerp(_nt, k);
    }
    const mode = useDesk.getState().mode;
    const weight = rig.reduced ? 0 : (1 - a.camLaptop) * (1 - 0.8 * a.camPhone) * (1 - 0.8 * a.camNote) * (mode === 'desk' ? 1 : 0.5);
    easing.damp2(ptr.current, rig.pointerNdc, 0.6, Math.min(dt, 0.05));
    pose.position.x += ptr.current.x * 0.028 * weight;
    pose.position.y += ptr.current.y * 0.014 * weight;
    pose.target.x += ptr.current.x * 0.01 * weight;
    cam.position.copy(pose.position);
    target.current.copy(pose.target);
    cam.lookAt(target.current);
    if (Math.abs(cam.fov - pose.fov) > 0.01) {
      cam.fov = pose.fov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}
