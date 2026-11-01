import * as THREE from 'three';
import { rig, screenInfo } from './rig';

export type Pose = { position: THREE.Vector3; target: THREE.Vector3; fov: number };

/**
 * Seated first-person framing. Wide screens keep the laptop slightly right of centre so the
 * introduction can sit on the left; portrait screens pull back and recentre on laptop + phone.
 * lean: 0 = sitting back, 1 = leaning in to look at the phone.
 */
export function cameraPose(aspect: number, lean = 0): Pose {
  let position: THREE.Vector3, target: THREE.Vector3, fov: number;
  if (aspect >= 1.15) {
    const hfov = 66;
    fov = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov / 2)) / aspect)), 34, 52);
    position = new THREE.Vector3(-0.07, 1.17, 0.6);
    target = new THREE.Vector3(-0.04, 0.86, -0.38);
  } else {
    fov = aspect < 0.8 ? 60 : 54;
    // look across the room toward the street window rather than down at the table
    position = new THREE.Vector3(0.06, 1.3, 0.92);
    target = new THREE.Vector3(0.13, 0.95, -0.9);
  }
  if (lean) {
    const fwd = target.clone().sub(position).normalize();
    position.addScaledVector(fwd, 0.05 * lean).y -= 0.03 * lean;
  }
  return { position, target, fov };
}

/** Camera aligned with the laptop screen so the screen fills the viewport with a small margin. */
export function laptopPose(aspect: number, fov: number): Pose | null {
  if (!rig.laptopScreen) return null;
  const s = screenInfo(rig.laptopScreen);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const fill = laptopFill(aspect);
  const d = Math.max(s.height / 2 / tanHalf, s.width / 2 / (tanHalf * aspect)) / fill;
  return {
    position: s.center.clone().addScaledVector(s.normal, d),
    target: s.center.clone(),
    fov,
  };
}

/** Fraction of the limiting viewport dimension the laptop screen fills (clears nav + device bar). */
export function laptopFill(aspect: number) {
  if (aspect < 1.1) return 0.98;
  const H = typeof window !== 'undefined' ? window.innerHeight : 900;
  return Math.min(0.9, 1 - (2 * 70) / H);
}
