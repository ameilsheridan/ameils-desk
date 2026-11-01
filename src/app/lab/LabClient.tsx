'use client';
import dynamic from 'next/dynamic';
import type { PoseName } from '@/experience/hands/HandRig';

const HandLab = dynamic(() => import('./HandLab'), { ssr: false });

export default function LabClient(props: { pose: PoseName; grip: 'hold' | 'desk'; left: PoseName | null; override: string | null }) {
  return <HandLab {...props} />;
}
