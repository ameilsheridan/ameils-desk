import type { PoseName } from '@/experience/hands/HandRig';
import LabClient from './LabClient';

export const metadata = { title: 'Hand lab', robots: { index: false } };

export default async function Lab({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <LabClient
      pose={(sp.pose ?? 'hold') as PoseName}
      grip={sp.grip === 'desk' ? 'desk' : 'hold'}
      left={(sp.left as PoseName) ?? null}
      override={sp.o ?? null}
    />
  );
}
