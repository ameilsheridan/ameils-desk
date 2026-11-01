/**
 * Bridge between DOM UI (phone carousel, director) and the 3D hand controller.
 * If hands are unavailable (reduced motion, light tier), every request resolves immediately.
 */
export type HandSide = 'left' | 'right';
type Impl = {
  arrive: (side: HandSide, timeoutMs: number) => Promise<void>;
  swipe: (dir: 1 | -1) => Promise<void>;
  tap: (x: number, y: number) => Promise<void>;
};

let impl: Impl | null = null;

export const handBus = {
  register(i: Impl) {
    impl = i;
    return () => {
      if (impl === i) impl = null;
    };
  },
  arrive(side: HandSide, timeoutMs = 450) {
    return impl ? impl.arrive(side, timeoutMs) : Promise.resolve();
  },
  swipe(dir: 1 | -1) {
    return impl ? impl.swipe(dir) : Promise.resolve();
  },
  /** Resolves at the moment the fingertip touches the given CSS-pixel point. */
  tap(x: number, y: number) {
    return impl ? impl.tap(x, y) : Promise.resolve();
  },
};
