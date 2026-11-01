'use client';
import { use, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useDesk, type Prop } from '@/lib/store';
import DeskProps, { setupProps } from './DeskProps';
import type { QualitySettings } from '@/lib/quality';
import { createMaterialLibrary, prepareTextures, TEXTURE_URLS, type TexSet } from './materials';
import { createLaptopTexture, createPhoneTexture } from './screenTextures';
import { rig } from './rig';
import { asset, ASSET_BASE } from '@/lib/asset';

// the site ships a meshopt-compressed model; the static preview ships an uncompressed one
// (its host's security policy disallows the WebAssembly decoder)
const MESHOPT = ASSET_BASE === '';
const MODEL = asset('/models/desk.glb');
// the static preview inlines its model into the bundle (see preview/model.ts)
const PREVIEW_MODEL = typeof window !== 'undefined'
  ? (window as unknown as { __deskModel?: Promise<{ scene: THREE.Group }> }).__deskModel
  : undefined;

function useDeskModel(): { scene: THREE.Group } {
  // the branch is fixed for the lifetime of the app, so hook order never changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return PREVIEW_MODEL ? use(PREVIEW_MODEL) : (useGLTF(MODEL, false, MESHOPT) as unknown as { scene: THREE.Group });
}
import { openLaptop, openNotebook, openPhone, sipCoffee } from './director';
import Lighting from './Lighting';
import Street from './world/Street';
import Cozy from './world/Cozy';

const DESK_OBJECTS = ['Laptop', 'Phone', 'Tumbler', 'Notebook', 'PenBody', 'PenTip', 'StickyNotes', 'Plant', 'TableLamp', 'Candle', 'Latte'];

function rootName(o: THREE.Object3D) {
  let p: THREE.Object3D | null = o;
  while (p && p.parent && p.parent.type !== 'Scene' && p.parent.parent) p = p.parent;
  return p?.name ?? '';
}

export default function Scene({ q }: { q: QualitySettings }) {
  const { scene } = useDeskModel();
  const textures = useTexture(TEXTURE_URLS) as unknown as TexSet;
  const gl = useThree((s) => s.gl);

  const screens = useMemo(() => ({ laptop: createLaptopTexture(), phone: createPhoneTexture() }), []);
  const lib = useMemo(
    () => createMaterialLibrary(prepareTextures(textures, Math.min(8, gl.capabilities.getMaxAnisotropy())), screens),
    [textures, screens, gl],
  );

  const hit = useRef<Record<Prop, THREE.Box3> | null>(null);

  useLayoutEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = (mesh.material as THREE.Material).name;
      if (lib[name]) mesh.material = lib[name];
      const root = rootName(mesh);
      const onDesk = DESK_OBJECTS.some((n) => root.startsWith(n) || mesh.name.startsWith(n));
      mesh.castShadow = onDesk;
      mesh.receiveShadow = onDesk || mesh.name === 'Table' || mesh.name === 'TableApron';
    });
    rig.phone = scene.getObjectByName('Phone') ?? null;
    rig.phoneScreen = (scene.getObjectByName('PhoneScreen') as THREE.Mesh) ?? null;
    rig.laptopScreen = (scene.getObjectByName('LaptopScreen') as THREE.Mesh) ?? null;
    rig.laptop = scene.getObjectByName('Laptop') ?? null;
    setupProps(scene);
    if (rig.phone) {
      rig.deskPhone.pos.copy(rig.phone.position);
      rig.deskPhone.quat.copy(rig.phone.quaternion);
    }
    scene.updateMatrixWorld(true);
    hit.current = {
      laptop: new THREE.Box3().setFromObject(rig.laptop!).expandByScalar(0.015),
      phone: new THREE.Box3().setFromObject(rig.phone!).expandByVector(new THREE.Vector3(0.035, 0.03, 0.035)),
      cup: new THREE.Box3().setFromObject(scene.getObjectByName('Latte')!).expandByScalar(0.01),
      notebook: new THREE.Box3().setFromObject(scene.getObjectByName('Notebook')!).expandByVector(new THREE.Vector3(0.01, 0.02, 0.01)),
      resume: new THREE.Box3().setFromObject(scene.getObjectByName('Resume')!).expandByVector(new THREE.Vector3(0, 0.01, 0)),
    };
    rig.ready = true;
  }, [scene, lib]);

  // phone travels between the desk and the held pose (with a small lift arc)
  const p = useRef({ pos: new THREE.Vector3(), q: new THREE.Quaternion() });
  useFrame((state) => {
    const phone = rig.phone;
    if (!phone) return;
    const m = useDesk.getState().mode;
    const an = rig.anim;
    if (m === 'desk' && (an.phoneT > 0 || an.camLaptop > 0 || an.camNote > 0 || an.noteOpen > 0 || an.sipT > 0) && !gsap.isTweening(rig.anim)) {
      gsap.to(rig.anim, { phoneT: 0, camPhone: 0, camLaptop: 0, dof: 0, camNote: 0, noteOpen: 0, sipT: 0, sipTilt: 0, duration: rig.reduced ? 0.01 : 0.6, ease: 'power2.inOut' });
    }
    const tt = rig.anim.phoneT;
    const v = p.current;
    if (tt <= 0.0001) {
      phone.position.copy(rig.deskPhone.pos);
      phone.quaternion.copy(rig.deskPhone.quat);
      return;
    }
    v.pos.copy(rig.deskPhone.pos).lerp(rig.holdPhone.pos, tt);
    v.pos.y += Math.sin(Math.PI * Math.min(1, tt * 1.1)) * 0.045;
    const rt = THREE.MathUtils.smoothstep(tt, 0.05, 0.9);
    v.q.copy(rig.deskPhone.quat).slerp(rig.holdPhone.quat, rt);
    if (tt > 0.98 && !rig.reduced) {
      // a held object is never perfectly still
      const time = state.clock.elapsedTime;
      v.pos.y += Math.sin(time * 1.3) * 0.0007;
      v.pos.x += Math.sin(time * 0.8) * 0.0005;
    }
    phone.position.copy(v.pos);
    phone.quaternion.copy(v.q);
  });

  const mode = useDesk((s) => s.mode);
  const setHover = useDesk((s) => s.setHover);
  const interactive = mode === 'desk';

  const handlers = (device: Prop) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!interactive) return;
      setHover(device);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      if (useDesk.getState().hover === device) setHover(null);
      document.body.style.cursor = '';
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      rig.pointer.copy(e.point);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!interactive) return;
      document.body.style.cursor = '';
      if (device === 'laptop') void openLaptop();
      else if (device === 'phone') void openPhone();
      else if (device === 'cup') void sipCoffee();
      else if (device === 'resume') void openNotebook('resume');
      else void openNotebook('notebook');
    },
  });

  const boxes = hit.current;
  return (
    <>
      <primitive object={scene} />
      <Lighting q={q} />
      <Street q={q} />
      <Cozy q={q} />
      <DeskProps />
      {q.tier !== 'light' && (
        <ContactShadows
          position={[0, 0.7504, -0.2]} scale={[1.6, 0.9]} far={0.35} blur={2.4} opacity={0.55}
          resolution={q.contactShadowRes} color="#2a1206" frames={Infinity}
        />
      )}
      {boxes && interactive && (['laptop', 'phone', 'cup', 'notebook', 'resume'] as const).map((d) => {
        const b = boxes[d];
        const c = b.getCenter(new THREE.Vector3());
        const s = b.getSize(new THREE.Vector3());
        return (
          <mesh key={d} position={c} {...handlers(d)} name={`Hit_${d}`}>
            <boxGeometry args={[s.x, s.y, s.z]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

if (!PREVIEW_MODEL) useGLTF.preload(MODEL, false, MESHOPT);
