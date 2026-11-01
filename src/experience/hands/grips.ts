import * as THREE from 'three';

// Grip frames in phone-local space (+X right, +Y out of the screen, -Z toward the top).
export const GRIP = {
  desk: frame(new THREE.Vector3(0.062, 0.004, 0.098), new THREE.Vector3(-0.33, 0, -0.94), new THREE.Vector3(0.97, 0.24, 0)),
  hold: frame(new THREE.Vector3(0.124, -0.06, 0.07), new THREE.Vector3(-1, 0, -0.12), new THREE.Vector3(0.04, -1, 0)),
  // cup-local (+X toward the handle, +Y up, +Z toward the viewer): fingers through the handle,
  // back of the hand facing out, thumb resting on top of the handle
  cup: frame(new THREE.Vector3(0.062, 0.006, 0.104), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0.12, 0)),
};

function frame(pos: THREE.Vector3, finger: THREE.Vector3, dorsal: THREE.Vector3) {
  return { pos, quat: basisQuat(finger, dorsal) };
}

/** Quaternion whose +Y is the finger direction and +Z (back of hand) follows the hint. */
export function basisQuat(finger: THREE.Vector3, dorsalHint: THREE.Vector3, out = new THREE.Quaternion()) {
  const y = finger.clone().normalize();
  const z = dorsalHint.clone().addScaledVector(y, -dorsalHint.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

