import * as THREE from 'three';
import { asset } from '@/lib/asset';

export type TexSet = Record<
  | 'woodAlbedo' | 'woodRough' | 'woodNormal' | 'floorAlbedo' | 'plasterAlbedo' | 'plasterNormal'
  | 'knitNormal' | 'jerseyNormal' | 'brushedNormal' | 'brushedRough' | 'linenNormal' | 'paperNormal'
  | 'corkAlbedo' | 'nightWindow',
  THREE.Texture
>;

export const TEXTURE_URLS: Record<keyof TexSet, string> = {
  woodAlbedo: asset('/textures/wood_albedo.webp'),
  woodRough: asset('/textures/wood_rough.webp'),
  woodNormal: asset('/textures/wood_normal.webp'),
  floorAlbedo: asset('/textures/floor_albedo.webp'),
  plasterAlbedo: asset('/textures/plaster_albedo.webp'),
  plasterNormal: asset('/textures/plaster_normal.webp'),
  knitNormal: asset('/textures/knit_normal.webp'),
  jerseyNormal: asset('/textures/jersey_normal.webp'),
  brushedNormal: asset('/textures/brushed_normal.webp'),
  brushedRough: asset('/textures/brushed_rough.webp'),
  linenNormal: asset('/textures/linen_normal.webp'),
  paperNormal: asset('/textures/paper_normal.webp'),
  corkAlbedo: asset('/textures/cork_albedo.webp'),
  nightWindow: asset('/textures/night_window.webp'),
};

const COLOR_MAPS: (keyof TexSet)[] = ['woodAlbedo', 'floorAlbedo', 'plasterAlbedo', 'corkAlbedo', 'nightWindow'];

export function prepareTextures(t: TexSet, anisotropy: number) {
  (Object.keys(t) as (keyof TexSet)[]).forEach((k) => {
    const tex = t[k];
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = anisotropy;
    tex.colorSpace = COLOR_MAPS.includes(k) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.needsUpdate = true;
  });
  return t;
}

/** Clone a texture with its own repeat (UVs are authored in metres). */
function rep(tex: THREE.Texture, metres: number, rot = 0) {
  const c = tex.clone();
  c.repeat.set(1 / metres, 1 / metres);
  c.rotation = rot;
  c.needsUpdate = true;
  return c;
}

/**
 * Stylised-but-believable material library, keyed by the material names authored in Blender.
 * Warm, soft, restrained: no glassmorphism, no exaggerated reflections.
 */
export function createMaterialLibrary(t: TexSet, screens: { laptop: THREE.Texture; phone: THREE.Texture }) {
  const wood = (tint: string, metres = 0.9, rough = 0.62) =>
    new THREE.MeshPhysicalMaterial({
      color: tint, map: rep(t.woodAlbedo, metres), roughnessMap: rep(t.woodRough, metres),
      normalMap: rep(t.woodNormal, metres), normalScale: new THREE.Vector2(0.22, 0.22), roughness: rough,
      clearcoat: 0.18, clearcoatRoughness: 0.45, envMapIntensity: 0.7,
    });
  const solid = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

  const screen = (tex: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({
      color: '#050505', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.05,
      roughness: 0.12, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 0.35,
    });

  const lib: Record<string, THREE.Material> = {
    Wood: wood('#f0e2d6', 0.6),
    Aluminium: solid('#4a4b50', 0.36, 0.82, {
      roughnessMap: rep(t.brushedRough, 0.15), normalMap: rep(t.brushedNormal, 0.15),
      normalScale: new THREE.Vector2(0.12, 0.12), envMapIntensity: 1,
    }),
    AluminiumDark: solid('#232327', 0.42, 0.8),
    Keys: solid('#151517', 0.78, 0.0),
    Trackpad: solid('#35363b', 0.3, 0.35, { envMapIntensity: 0.8 }),
    Bezel: solid('#060607', 0.22, 0.1),
    LaptopScreen: screen(screens.laptop),
    PhoneFrame: solid('#2e2f33', 0.34, 0.72, { envMapIntensity: 0.9 }),
    PhoneScreen: screen(screens.phone),
    Lens: solid('#050507', 0.12, 0.3),
    TumblerBody: solid('#93a08a', 0.62, 0.0),
    TumblerLid: solid('#2b2623', 0.58, 0),
    Metal: solid('#cfcbc6', 0.24, 1, { envMapIntensity: 1 }),
    Cork: solid('#ffffff', 0.92, 0, { map: rep(t.corkAlbedo, 0.12) }),
    NotebookCover: solid('#3f4a35', 0.86, 0, { normalMap: rep(t.linenNormal, 0.08), normalScale: new THREE.Vector2(0.35, 0.35) }),
    Paper: solid('#efe6d6', 0.92, 0, { normalMap: rep(t.paperNormal, 0.1), normalScale: new THREE.Vector2(0.2, 0.2) }),
    Elastic: solid('#1d1b1a', 0.7),
    PenBody: solid('#22304d', 0.38, 0.1),
    StickyNote: solid('#e2aa52', 0.88, 0, { normalMap: rep(t.paperNormal, 0.08), normalScale: new THREE.Vector2(0.15, 0.15) }),
    Ceramic: new THREE.MeshPhysicalMaterial({ color: '#eae0cf', roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    CeramicTerracotta: solid('#b4634a', 0.82),
    Soil: solid('#2a1c13', 0.98),
    Leaf: solid('#566f3f', 0.55, 0, { side: THREE.DoubleSide }),
    Plaster: solid('#ffffff', 0.96, 0, { map: rep(t.plasterAlbedo, 2.5), normalMap: rep(t.plasterNormal, 1.2), normalScale: new THREE.Vector2(0.4, 0.4) }),
    WallWood: wood('#8b6a58', 1.2, 0.7),
    ShelfWood: wood('#b88f74', 0.9, 0.6),
    Floor: solid('#ffffff', 0.62, 0, { map: rep(t.floorAlbedo, 3) }),
    Brass: solid('#c79a5c', 0.32, 1, { envMapIntensity: 1 }),
    Bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.72, 0.42).multiplyScalar(7) }),
    Cord: solid('#141210', 0.8),
    WindowFrame: solid('#2b1c13', 0.7),
    NightWindow: new THREE.MeshBasicMaterial({ map: t.nightWindow, color: new THREE.Color(1.15, 1.15, 1.15) }),
    DarkMetal: solid('#1e1c1b', 0.5, 0.6),
    ChairWood: wood('#8a6650', 0.7, 0.65),
    Fabric: solid('#ecdcc0', 0.9, 0, { emissive: '#ffb062', emissiveIntensity: 0.55 }),
    LampShade: solid('#f3e3c8', 0.85, 0, { emissive: '#ffb468', emissiveIntensity: 1.3, side: THREE.DoubleSide }),
    Glass: new THREE.MeshPhysicalMaterial({ color: '#efcfa2', roughness: 0.08, transparent: true, opacity: 0.38, depthWrite: false }),
    Wax: solid('#f3e7d2', 0.6, 0, { emissive: '#ff9a50', emissiveIntensity: 0.4 }),
    Flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.72, 0.36).multiplyScalar(9) }),
    Coffee: solid('#c79c6e', 0.45),
    WindowGlass: new THREE.MeshPhysicalMaterial({
      color: '#d6dfe8', roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false, envMapIntensity: 1.4,
    }),
    BookA: solid('#8f5145', 0.85),
    BookB: solid('#c7a170', 0.85),
    BookC: solid('#3d4c52', 0.85),
  };
  return lib;
}

/** Hand + sleeve materials: soft stylised skin (sheen, no plastic shine), knit cuff, jersey sleeve. */
export function createHandMaterials(t: TexSet) {
  const knit = t.knitNormal.clone();
  knit.repeat.set(5, 1);
  knit.needsUpdate = true;
  const jersey = t.jerseyNormal.clone();
  jersey.repeat.set(6, 4);
  jersey.needsUpdate = true;
  return {
    skin: new THREE.MeshPhysicalMaterial({
      color: '#f0b993', roughness: 0.62, sheen: 0.7, sheenColor: new THREE.Color('#ff9f7f'),
      sheenRoughness: 0.55, envMapIntensity: 0.45,
    }),
    cuff: new THREE.MeshStandardMaterial({
      color: '#2c2f4b', roughness: 0.95, normalMap: knit, normalScale: new THREE.Vector2(1.1, 1.1),
    }),
    sleeve: new THREE.MeshStandardMaterial({
      color: '#33375a', roughness: 0.92, normalMap: jersey, normalScale: new THREE.Vector2(0.6, 0.6),
    }),
  };
}
