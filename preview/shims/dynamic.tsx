import { lazy, Suspense, type ComponentType } from 'react';

export default function dynamic<P extends object>(loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>) {
  const L = lazy(async () => {
    const m = await loader();
    return { default: ((m as { default?: ComponentType<P> }).default ?? m) as ComponentType<P> };
  });
  return function Dynamic(props: P) {
    return <Suspense fallback={null}><L {...props} /></Suspense>;
  };
}
