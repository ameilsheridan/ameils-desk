/** Prefix for public assets: '' on the Next.js site, '.' in the relative static preview build. */
export const ASSET_BASE: string = process.env.NEXT_PUBLIC_ASSET_BASE ?? '';
export const asset = (p: string) => `${ASSET_BASE}${p}`;
