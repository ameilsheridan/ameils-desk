/** Maps site paths to hash routes for the static preview (the host only passes plain #names). */
export function toHash(href: string) {
  if (href === '/' || href === '') return '#home';
  if (href === '/work') return '#work';
  if (href === '/about') return '#about';
  if (href === '/contact') return '#contact';
  const m = href.match(/^\/work\/([a-z0-9-]+)$/);
  if (m) return `#work-${m[1]}`;
  return href;
}
