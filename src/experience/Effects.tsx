'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import * as THREE from 'three';
import type { QualitySettings } from '@/lib/quality';
import { rig, screenInfo } from './rig';

const DESK_FOCUS = new THREE.Vector3(-0.02, 0.82, -0.18);

/** Selective post-processing: gentle DOF, bloom limited to real light sources (HDR > 1), AgX. */
export default function Effects({ q }: { q: QualitySettings }) {
  const dof = useRef<DepthOfFieldEffect>(null);
  const focus = useRef(DESK_FOCUS.clone());
  const tmp = useRef(new THREE.Vector3());

  useFrame(() => {
    const d = dof.current;
    if (!d) return;
    const a = rig.anim;
    // focus target: desk -> held phone, or -> laptop screen while zooming
    tmp.current.copy(DESK_FOCUS);
    if (a.dof > 0 && rig.phone) tmp.current.lerp(rig.phone.getWorldPosition(new THREE.Vector3()), a.dof);
    if (a.camLaptop > 0 && rig.laptopScreen) tmp.current.lerp(screenInfo(rig.laptopScreen).center, a.camLaptop);
    focus.current.lerp(tmp.current, 0.25);
    if (!d.target) d.target = new THREE.Vector3();
    d.target.copy(focus.current);
    const range = THREE.MathUtils.lerp(1.5, 0.3, a.dof) * (1 + a.camLaptop);
    const coc = d.cocMaterial as unknown as { worldFocusRange?: number; focusRange?: number };
    if ('worldFocusRange' in coc) coc.worldFocusRange = range;
    else coc.focusRange = range;
    d.bokehScale = rig.reduced ? 0.6 : THREE.MathUtils.lerp(1.6, 3.2, a.dof) * (1 - 0.6 * a.camLaptop);
  });

  const effects = [
    q.dof ? <DepthOfField key="dof" ref={dof} target={DESK_FOCUS.clone()} bokehScale={1.6} resolutionScale={0.5} /> : null,
    q.bloom ? <Bloom key="bloom" mipmapBlur intensity={0.5} luminanceThreshold={1.0} luminanceSmoothing={0.2} /> : null,
    <Vignette key="vig" offset={0.3} darkness={0.5} />,
    <ToneMapping key="tm" mode={ToneMappingMode.AGX} />,
  ].filter(Boolean) as React.ReactElement[];

  return (
    <EffectComposer multisampling={q.multisampling} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  );
}
