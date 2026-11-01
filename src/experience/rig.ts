import * as THREE from 'three';

/**
 * Shared mutable scene state. Animated values live here (not in React state) so per-frame
 * systems (camera, phone, hands, DOM overlays, depth of field) read them without re-rendering.
 */
export const rig = {
  camera: null as THREE.PerspectiveCamera | null,
  scene: null as THREE.Scene | null,
  phone: null as THREE.Object3D | null,
  phoneScreen: null as THREE.Mesh | null,
  laptopScreen: null as THREE.Mesh | null,
  laptop: null as THREE.Object3D | null,
  /** cup, coffee and handle, lifted together (the saucer stays on the desk) */
  cup: null as THREE.Object3D | null,
  notebook: null as THREE.Object3D | null,
  notebookCover: null as THREE.Object3D | null,
  deskPhone: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() },
  holdPhone: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() },
  pointer: new THREE.Vector3(),
  pointerNdc: new THREE.Vector2(),
  anim: {
    phoneT: 0, // 0 on desk, 1 held in front of the camera
    camLaptop: 0, // 0 desk view, 1 aligned with laptop screen
    camPhone: 0, // lean-in while holding the phone
    dof: 0, // 0 desk focus, 1 phone focus
    overlay: 0, // DOM screen opacity
    sipT: 0, // 0 cup on saucer, 1 raised in front of the camera
    sipTilt: 0, // extra tilt while sipping
    camNote: 0, // lean over the notebook
    noteOpen: 0, // notebook cover, 0 closed, 1 open
  },
  holdDistance: 0.33,
  reduced: false,
  ready: false,
};

export type ScreenInfo = {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  width: number;
  height: number;
};

const _box = new THREE.Box3();
const _m = new THREE.Matrix3();
const _lin = new THREE.Matrix3();

/** World-space frame of a flat screen mesh (centre, facing normal, right/up axes, size). */
export function screenInfo(mesh: THREE.Mesh, out?: ScreenInfo): ScreenInfo {
  const info = out ?? {
    center: new THREE.Vector3(), normal: new THREE.Vector3(), right: new THREE.Vector3(),
    up: new THREE.Vector3(), width: 0, height: 0,
  };
  const geo = mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  _box.copy(geo.boundingBox!);
  const size = _box.getSize(new THREE.Vector3());
  _box.getCenter(info.center);
  mesh.updateWorldMatrix(true, false);
  info.center.applyMatrix4(mesh.matrixWorld);
  _m.getNormalMatrix(mesh.matrixWorld);
  // measure the box axes in world space (quantised glTF meshes carry their scale on the node)
  _lin.setFromMatrix4(mesh.matrixWorld);
  const axes = [new THREE.Vector3(size.x, 0, 0), new THREE.Vector3(0, size.y, 0), new THREE.Vector3(0, 0, size.z)]
    .map((v) => v.applyMatrix3(_lin));
  const dims = axes.map((v) => v.length());
  const flat = dims.indexOf(Math.min(...dims));
  const n = geo.attributes.normal;
  const local = new THREE.Vector3(n.getX(0), n.getY(0), n.getZ(0));
  info.normal.copy(local).applyMatrix3(_m).normalize();
  const others = [0, 1, 2].filter((i) => i !== flat);
  const a = axes[others[0]].clone().normalize();
  const b = axes[others[1]].clone().normalize();
  // "up" = the in-plane axis closest to world up (or, when lying flat, to -Z = away)
  const ref = Math.abs(info.normal.y) > 0.8 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const aUp = Math.abs(a.dot(ref)) > Math.abs(b.dot(ref));
  info.up.copy(aUp ? a : b);
  if (info.up.dot(ref) < 0) info.up.negate();
  info.right.crossVectors(info.up, info.normal).normalize();
  info.width = aUp ? dims[others[1]] : dims[others[0]];
  info.height = aUp ? dims[others[0]] : dims[others[1]];
  return info;
}

const _v = new THREE.Vector3();
/** Screen-space bounding rect (CSS px) of a mesh's bounding box. */
export function projectRect(mesh: THREE.Mesh, camera: THREE.Camera, w: number, h: number) {
  const geo = mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const b = geo.boundingBox!;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)
      .applyMatrix4(mesh.matrixWorld).project(camera);
    const x = (_v.x * 0.5 + 0.5) * w;
    const y = (-_v.y * 0.5 + 0.5) * h;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Converts a CSS-pixel point on a screen overlay into a world point on that screen's plane. */
export function screenPointToWorld(mesh: THREE.Mesh, camera: THREE.Camera, px: number, py: number, w: number, h: number) {
  const ndc = new THREE.Vector2((px / w) * 2 - 1, -(py / h) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const info = screenInfo(mesh);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(info.normal, info.center);
  const hit = new THREE.Vector3();
  return ray.ray.intersectPlane(plane, hit) ? hit : info.center.clone();
}
