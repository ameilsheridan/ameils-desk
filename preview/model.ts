// Preview build only: the uncompressed model is inlined into the bundle (the preview host
// serves no .glb files), parsed once, and handed to the Scene through a global promise.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import deskB64 from './assets/deskModel';

function toBuffer(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

(window as unknown as { __deskModel?: Promise<unknown> }).__deskModel = new Promise((resolve, reject) => {
  new GLTFLoader().parse(toBuffer(deskB64), './', resolve, reject);
});
