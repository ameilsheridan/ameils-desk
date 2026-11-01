import { toHash } from './route';

export function useRouter() {
  return {
    push: (href: string) => { location.hash = toHash(href); },
    replace: (href: string) => { location.replace(toHash(href)); },
    back: () => history.back(),
    prefetch: () => {},
  };
}
export function notFound(): never {
  throw new Error('not found');
}
