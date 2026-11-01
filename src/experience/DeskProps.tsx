'use client';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig } from './rig';
import { cameraPose } from './cameraPoses';
import { createNotebookPage } from './notebookPage';

/**
 * Small interactive props: the latte cup (lifted for a sip) and the notebook (cover opens).
 * The cup, coffee and handle are regrouped so they leave the saucer together, and the
 * notebook cover gets a pivot on its spine.
 */
export function setupProps(scene: THREE.Object3D) {
  const latte = scene.getObjectByName('Latte');
  if (latte) {
    let lift = latte.getObjectByName('CupLift');
    if (!lift) {
      lift = new THREE.Group();
      lift.name = 'CupLift';
      latte.add(lift);
      for (const n of ['LatteCup', 'LatteCoffee', 'LatteHandle']) {
        const o = latte.getObjectByName(n);
        if (o) lift.attach(o);
      }
    }
    rig.cup = lift;
  }
  const nb = scene.getObjectByName('Notebook');
  if (nb) {
    let pivot = nb.getObjectByName('CoverPivot');
    if (!pivot) {
      pivot = new THREE.Group();
      pivot.name = 'CoverPivot';
      pivot.position.set(-0.074, 0.0127, 0); // spine edge, top of the pages (notebook-local)
      nb.add(pivot);
      for (const n of ['NotebookCover', 'NotebookElastic']) {
        const o = nb.getObjectByName(n);
        if (o) pivot.attach(o);
      }
    }
    if (!nb.getObjectByName('NotebookNotes')) {
      // handwritten notes sit just above the top page (revealed when the cover opens)
      const notes = new THREE.Mesh(
        new THREE.PlaneGeometry(0.134, 0.194),
        new THREE.MeshStandardMaterial({ map: createNotebookPage(), transparent: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }),
      );
      notes.name = 'NotebookNotes';
      notes.rotation.x = -Math.PI / 2;
      notes.position.set(0.002, 0.0113, 0);
      nb.add(notes);
    }
    rig.notebook = nb;
    rig.notebookCover = pivot;
  }
}

const _hold = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _tilt = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _yaw = new THREE.Quaternion();

/**
 * Where the cup is held for a sip. Like a first-person game "viewmodel", the pose is defined
 * relative to the camera, not the world: the cup rises to just below the centre of view, close
 * enough that the rim fills the lower frame, and tips toward you while the hand stays mostly
 * below the frame edge. This reads as drinking without needing a perfect hand-to-handle grip.
 */
export function cupHoldWorld(aspect: number, tilt: number, outPos: THREE.Vector3, outQuat: THREE.Quaternion) {
  const pose = cameraPose(aspect, 0);
  _fwd.copy(pose.target).sub(pose.position).normalize();
  _right.crossVectors(_fwd, UP).normalize();
  _up.crossVectors(_right, _fwd).normalize();
  const cam = rig.camera;
  if (cam) {
    // follow the live camera (it tilts back a little while sipping)
    cam.getWorldDirection(_fwd);
    _right.crossVectors(_fwd, UP).normalize();
    _up.crossVectors(_right, _fwd).normalize();
    pose.position.copy(cam.position);
  }
  outPos.copy(pose.position).addScaledVector(_fwd, 0.29 - tilt * 0.03).addScaledVector(_right, -0.01).addScaledVector(_up, -0.1 + tilt * 0.014);
  // handle toward the right hand, rim tipped toward the camera (more while sipping)
  _yaw.setFromAxisAngle(UP, -0.35);
  outQuat.setFromAxisAngle(_right, 0.3 + tilt * 0.55).multiply(_yaw);
}

export default function DeskProps() {
  useFrame((state) => {
    const a = rig.anim;
    const cup = rig.cup;
    if (cup?.parent) {
      const t = a.sipT;
      if (t <= 0.0001) {
        cup.position.set(0, 0, 0);
        cup.quaternion.identity();
      } else {
        const aspect = state.size.width / state.size.height;
        cupHoldWorld(aspect, a.sipTilt, _hold, _q);
        cup.parent.updateWorldMatrix(true, false);
        const home = new THREE.Vector3().setFromMatrixPosition(cup.parent.matrixWorld);
        const pos = home.clone().lerp(_hold, t);
        pos.y += Math.sin(Math.PI * t) * 0.03; // a small lift arc, like a real reach
        cup.position.copy(cup.parent.worldToLocal(pos));
        const pq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(cup.parent.matrixWorld));
        _tilt.identity().slerp(_q, THREE.MathUtils.smoothstep(t, 0.15, 1));
        cup.quaternion.copy(pq.invert().multiply(_tilt));
      }
    }
    if (rig.notebookCover) {
      // cover swings over to the left of the spine
      const o = a.noteOpen;
      rig.notebookCover.rotation.set(0, 0, Math.PI * 0.97 * THREE.MathUtils.smoothstep(o, 0, 1));
    }
  });
  return null;
}
