import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural, articulated stylised hand.
 *
 * Hand space (right hand): wrist at origin, fingers point +Y, back of the hand faces +Z,
 * palm faces -Z, thumb on -X. The left hand is the mirror (scale.x = -1).
 * Each finger is a chain of 3 joints (MCP, PIP, DIP); positive flex curls toward the palm.
 * The forearm is a separate object aimed from the wrist toward an off-screen elbow anchor,
 * which acts as a simple IK so the arm always enters from the bottom of the viewport.
 */

export const HAND_SCALE = 1.25;
export type FingerName = 'index' | 'middle' | 'ring' | 'pinky';
export const FINGERS: FingerName[] = ['index', 'middle', 'ring', 'pinky'];

export type Pose = {
  index: [number, number, number];
  middle: [number, number, number];
  ring: [number, number, number];
  pinky: [number, number, number];
  thumb: [number, number, number]; // flex of the 3 thumb joints
  thumbRot: [number, number, number]; // thumb base orientation (euler, radians)
  spread: number; // finger fan
  wristFlex: number; // small wrist bend toward palm
};

const SPEC: Record<FingerName, { x: number; len: [number, number, number]; r: number; splay: number }> = {
  index: { x: -0.0255, len: [0.044, 0.027, 0.022], r: 0.0098, splay: 0.06 },
  middle: { x: -0.0075, len: [0.048, 0.03, 0.023], r: 0.0102, splay: 0.0 },
  ring: { x: 0.0105, len: [0.045, 0.028, 0.022], r: 0.0097, splay: -0.06 },
  pinky: { x: 0.0275, len: [0.036, 0.022, 0.019], r: 0.0088, splay: -0.13 },
};

function capsule(r: number, len: number, r2 = r) {
  // tapered capsule along +Y, base at y=0
  const pts: THREE.Vector2[] = [];
  const seg = 16;
  for (let i = 0; i <= seg; i++) {
    const a = -Math.PI / 2 + (i / seg) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r * 0.9 - r * 0.25));
  }
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r2, len - r2 * 0.4 + Math.sin(a) * r2 * 0.85));
  }
  const g = new THREE.LatheGeometry(pts, 40);
  g.scale(1, 1, 0.9); // slightly flattened like a real finger
  g.computeVertexNormals();
  return g;
}

export class HandRig {
  readonly root = new THREE.Group(); // wrist frame
  readonly hand = new THREE.Group(); // mirrored content
  readonly forearm = new THREE.Group();
  readonly joints: Record<FingerName, THREE.Group[]> = { index: [], middle: [], ring: [], pinky: [] };
  readonly thumbJoints: THREE.Group[] = [];
  readonly thumbBase = new THREE.Group();
  readonly tip = new THREE.Object3D(); // index fingertip
  readonly palmCentre = new THREE.Object3D();
  private wristBend = new THREE.Group();
  readonly side: 'left' | 'right';
  private meshes: THREE.Mesh[] = [];

  constructor(side: 'left' | 'right', mats: { skin: THREE.Material; cuff: THREE.Material; sleeve: THREE.Material }) {
    this.side = side;
    this.root.name = `Hand_${side}`;
    // stylised proportions: slightly larger than life, like the reference character's hands
    this.hand.scale.setScalar(HAND_SCALE);
    this.forearm.scale.setScalar(HAND_SCALE);
    this.root.add(this.hand);
    if (side === 'left') this.hand.scale.x = -HAND_SCALE;
    this.hand.add(this.wristBend);

    // palm: rounded block + soft thenar pad + knuckle ridge
    const palm = new RoundedBoxGeometry(0.074, 0.082, 0.031, 6, 0.0148);
    palm.translate(0, 0.05, 0);
    const thenar = new THREE.SphereGeometry(0.021, 20, 14);
    thenar.scale(1, 1.35, 0.85);
    thenar.translate(-0.02, 0.03, -0.005);
    const heel = new THREE.SphereGeometry(0.03, 20, 14);
    heel.scale(1.15, 0.8, 0.62);
    heel.translate(0.002, 0.016, -0.001);
    const knuckles = new THREE.CapsuleGeometry(0.0145, 0.05, 6, 16);
    knuckles.rotateZ(Math.PI / 2);
    knuckles.translate(0.001, 0.088, 0.0);
    // keep each part's own smooth normals (recomputing on merged non-indexed data would facet it)
    const palmGeo = mergeGeometries([palm, thenar, heel, knuckles].map((g) => (g.index ? g.toNonIndexed() : g)));
    this.addMesh(this.wristBend, palmGeo, mats.skin);
    this.palmCentre.position.set(0, 0.05, -0.02);
    this.wristBend.add(this.palmCentre);

    // wrist joint ball (hides the join to the forearm)
    const wrist = new THREE.SphereGeometry(0.027, 20, 14);
    wrist.scale(1.12, 1, 0.78);
    this.addMesh(this.hand, wrist, mats.skin);

    for (const f of FINGERS) {
      const s = SPEC[f];
      let parent: THREE.Object3D = this.wristBend;
      let y = 0.088;
      s.len.forEach((len, i) => {
        const j = new THREE.Group();
        j.position.set(i === 0 ? s.x : 0, i === 0 ? y : y, 0);
        if (i === 0) j.rotation.z = s.splay;
        parent.add(j);
        const r = s.r * (1 - i * 0.07);
        const r2 = s.r * (1 - (i + 1) * 0.07);
        this.addMesh(j, capsule(r, len, r2), mats.skin);
        this.joints[f].push(j);
        parent = j;
        y = len;
      });
      if (f === 'index') {
        this.tip.position.set(0, s.len[2] - 0.002, -0.004);
        parent.add(this.tip);
      }
    }

    // thumb: base sits low on the palm and is angled out and forward
    this.thumbBase.position.set(-0.03, 0.026, -0.008);
    this.wristBend.add(this.thumbBase);
    let tp: THREE.Object3D = this.thumbBase;
    [0.036, 0.03, 0.024].forEach((len, i) => {
      const j = new THREE.Group();
      j.position.y = i === 0 ? 0 : [0.036, 0.03][i - 1];
      tp.add(j);
      const r = 0.0122 - i * 0.0009;
      this.addMesh(j, capsule(r, len, r - 0.0009), mats.skin);
      this.thumbJoints.push(j);
      tp = j;
    });

    // forearm: skin, then ribbed cuff, then sleeve (built along +Z, aimed with lookAt)
    const arm = new THREE.CylinderGeometry(0.026, 0.031, 0.12, 24, 1, true);
    arm.rotateX(Math.PI / 2);
    arm.translate(0, 0, 0.06);
    this.addMesh(this.forearm, arm, mats.skin);
    const cuff = new THREE.CylinderGeometry(0.037, 0.039, 0.075, 40, 4);
    cuff.rotateX(Math.PI / 2);
    cuff.translate(0, 0, 0.068);
    this.addMesh(this.forearm, cuff, mats.cuff);
    const lip = new THREE.TorusGeometry(0.0368, 0.0035, 10, 40);
    lip.translate(0, 0, 0.031);
    this.addMesh(this.forearm, lip, mats.cuff);
    const sleeve = new THREE.CylinderGeometry(0.046, 0.068, 0.62, 40, 6);
    sleeve.rotateX(Math.PI / 2);
    sleeve.translate(0, 0, 0.105 + 0.31);
    this.addMesh(this.forearm, sleeve, mats.sleeve);
    const sleeveEnd = new THREE.TorusGeometry(0.044, 0.006, 10, 40);
    sleeveEnd.translate(0, 0, 0.106);
    this.addMesh(this.forearm, sleeveEnd, mats.sleeve);
  }

  private addMesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = false; // avoids shadow-map aliasing on surfaces this close to the camera
    m.frustumCulled = false;
    parent.add(m);
    this.meshes.push(m);
    return m;
  }

  setVisible(v: boolean) {
    this.root.visible = v;
    this.forearm.visible = v;
  }

  applyPose(p: Pose) {
    for (const f of FINGERS) {
      const j = this.joints[f];
      const flex = p[f];
      j[0].rotation.x = -flex[0];
      j[1].rotation.x = -flex[1];
      j[2].rotation.x = -flex[2];
      j[0].rotation.z = SPEC[f].splay * (0.4 + p.spread);
    }
    this.thumbBase.rotation.set(p.thumbRot[0], p.thumbRot[1], p.thumbRot[2]);
    this.thumbJoints[0].rotation.x = -p.thumb[0] * 0.5;
    this.thumbJoints[1].rotation.x = -p.thumb[1];
    this.thumbJoints[2].rotation.x = -p.thumb[2];
    this.wristBend.rotation.x = -p.wristFlex;
  }

  /** Aims the forearm from the wrist toward an elbow anchor (off-screen, below the camera). */
  updateForearm(elbow: THREE.Vector3) {
    this.root.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3().setFromMatrixPosition(this.root.matrixWorld);
    this.forearm.position.copy(wp);
    this.forearm.lookAt(elbow);
  }

  tipWorld(out: THREE.Vector3) {
    this.tip.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.tip.matrixWorld);
  }

  dispose() {
    this.meshes.forEach((m) => m.geometry.dispose());
  }
}

const P = (
  index: Pose['index'], middle: Pose['middle'], ring: Pose['ring'], pinky: Pose['pinky'],
  thumb: Pose['thumb'], thumbRot: Pose['thumbRot'], spread: number, wristFlex = 0,
): Pose => ({ index, middle, ring, pinky, thumb, thumbRot, spread, wristFlex });

/** Authored pose library. Values are joint flex in radians. */
export const POSES = {
  relaxed: P([0.35, 0.45, 0.3], [0.42, 0.5, 0.32], [0.5, 0.55, 0.35], [0.58, 0.6, 0.38], [0.3, 0.25, 0.2], [-0.43, -0.34, 1.0], 0.3, 0.1),
  reach: P([0.3, 0.4, 0.22], [0.36, 0.45, 0.25], [0.42, 0.5, 0.28], [0.5, 0.55, 0.3], [0.25, 0.18, 0.1], [-0.4, -0.3, 1.0], 0.25, 0.08),
  point: P([0.06, 0.06, 0.04], [1.35, 1.5, 0.9], [1.4, 1.5, 0.9], [1.4, 1.45, 0.85], [0.5, 0.45, 0.3], [-0.64, -0.56, 0.82], 0.2, 0.0),
  press: P([0.22, 0.18, 0.06], [1.35, 1.5, 0.9], [1.4, 1.5, 0.9], [1.4, 1.45, 0.85], [0.5, 0.45, 0.3], [-0.64, -0.56, 0.82], 0.2, 0.05),
  grip: P([1.05, 1.0, 0.55], [1.1, 1.05, 0.55], [1.15, 1.05, 0.55], [1.2, 1.0, 0.5], [0.35, 0.2, 0.15], [-0.78, -0.71, 0.7], 0.15, 0.15),
  // holding a phone from behind: palm and fingers stay behind the device, fingertips hug its left edge
  // (never over the screen) and the thumb rests up the right edge
  hold: P([0.2, 0.8, 0.5], [0.18, 0.8, 0.5], [0.2, 0.78, 0.5], [0.35, 0.8, 0.55], [0.45, 0.7, 0.5], [-0.3, 0.15, 0.95], 0.0, 0.05),
  // index hooked through a mug handle, other fingers tucked under it, thumb resting on top
  mug: P([0.9, 1.2, 0.6], [1.3, 1.4, 0.8], [1.4, 1.4, 0.8], [1.4, 1.3, 0.8], [0.3, 0.6, 0.5], [-0.3, 0.5, 1.1], 0.0, 0.05),
  open: P([0.16, 0.2, 0.12], [0.18, 0.22, 0.12], [0.22, 0.26, 0.14], [0.28, 0.3, 0.16], [0.1, 0.08, 0.06], [-0.32, -0.22, 1.08], 0.4, 0.0),
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

export function clonePose(p: Pose): Pose {
  return {
    index: [...p.index], middle: [...p.middle], ring: [...p.ring], pinky: [...p.pinky],
    thumb: [...p.thumb], thumbRot: [...p.thumbRot], spread: p.spread, wristFlex: p.wristFlex,
  };
}

/** Frame-rate independent blend toward a target pose. */
export function dampPose(cur: Pose, target: Pose, lambda: number, dt: number) {
  const k = 1 - Math.exp(-lambda * dt);
  for (const f of [...FINGERS, 'thumb', 'thumbRot'] as const) {
    for (let i = 0; i < 3; i++) cur[f][i] += (target[f][i] - cur[f][i]) * k;
  }
  cur.spread += (target.spread - cur.spread) * k;
  cur.wristFlex += (target.wristFlex - cur.wristFlex) * k;
}
