'use client';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig } from './rig';
import { cameraPose } from './cameraPoses';
import { createNotebookPage } from './notebookPage';
import { createResumePage } from './resumePage';

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
      // swap the stepped handle for a smooth ring (it is right in view during a sip)
      const old = latte.getObjectByName('LatteHandle') as THREE.Mesh | undefined;
      const cupMesh = latte.getObjectByName('LatteCup') as THREE.Mesh | undefined;
      if (old && cupMesh) {
        old.visible = false;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0135, 0.0036, 12, 28, Math.PI * 1.15), cupMesh.material);
        ring.name = 'LatteHandleSmooth';
        ring.rotation.z = -Math.PI * 0.575;
        ring.position.set(0.0465, 0.035, 0);
        ring.castShadow = true;
        lift.add(ring);
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
  let paper = scene.getObjectByName('Resume');
  if (!paper) {
    // a printed A4 résumé, tucked partly under the notebook between it and the laptop
    paper = new THREE.Mesh(
      new THREE.PlaneGeometry(0.21, 0.297),
      new THREE.MeshStandardMaterial({ map: createResumePage(), color: '#d9d3c8', roughness: 0.95 }),
    );
    paper.name = 'Resume';
    paper.rotation.set(-Math.PI / 2, 0, 0.14);
    paper.position.set(-0.255, 0.7504, -0.205);
    paper.receiveShadow = true;
    scene.add(paper);
  }
  rig.resume = paper;
}

const _hold = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _tilt = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _yaw = new THREE.Quaternion();
const _cam = new THREE.Vector3();
const _back = new THREE.Vector3();
const _m = new THREE.Matrix4();

/**
 * Where the cup is held for a sip — framed like Satisfactory's coffee cup: a first-person
 * "viewmodel" placed relative to the camera, not the world. The cup sits at the bottom centre
 * of the view, cut off by the frame edge, so you see the rim and the coffee; the hand stays
 * mostly below the frame on the right. Sipping tips the rim up toward you.
 */
export function cupHoldWorld(_aspect: number, tilt: number, outPos: THREE.Vector3, outQuat: THREE.Quaternion) {
  const cam = rig.camera;
  if (!cam) {
    const pose = cameraPose(_aspect, 0);
    _fwd.copy(pose.target).sub(pose.position).normalize();
    _cam.copy(pose.position);
  } else {
    cam.getWorldDirection(_fwd);
    _cam.copy(cam.position);
  }
  _right.crossVectors(_fwd, UP).normalize();
  _up.crossVectors(_right, _fwd).normalize();
  _back.copy(_fwd).negate();
  // cup origin is its base; the rim is ~0.062 above it
  outPos.copy(_cam)
    .addScaledVector(_fwd, 0.26 + tilt * 0.01)
    .addScaledVector(_up, -0.12 + tilt * 0.022)
    .addScaledVector(_right, 0.004);
  // camera-aligned basis (handle = +X points to screen right), then tip the rim toward the viewer
  _m.makeBasis(_right, _up, _back);
  outQuat.setFromRotationMatrix(_m);
  _tilt.setFromAxisAngle(_right, 0.42 + tilt * 0.32);
  _yaw.setFromAxisAngle(_up, 0.35); // handle turned slightly toward the camera
  outQuat.premultiply(_yaw).premultiply(_tilt);
}

/** Viewmodel pose for the right hand while the cup is up: back of the hand peeking in at bottom right. */
export function cupHandViewmodel(tilt: number, cupPos: THREE.Vector3, outPos: THREE.Vector3, outQuat: THREE.Quaternion) {
  outPos.copy(cupPos)
    .addScaledVector(_right, 0.15)
    .addScaledVector(_up, -0.115 + tilt * 0.01)
    .addScaledVector(_back, 0.01);
  // fingers point left across the handle, knuckles up, back of hand toward the camera
  const finger = _right.clone().multiplyScalar(-0.6).addScaledVector(_up, 0.8).normalize();
  const dorsal = _back.clone().addScaledVector(_up, 0.5).normalize();
  const y = finger;
  const z = dorsal.addScaledVector(y, -dorsal.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  outQuat.setFromRotationMatrix(_m.makeBasis(x, y, z));
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
        rig.cupWorld.copy(pos);
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
